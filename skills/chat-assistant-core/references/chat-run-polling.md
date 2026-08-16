### Step 6.1 — Poll for run completion (mandatory after every `agent_run` that comes back `queued`)

`agent_run` is async. A normal dispatch returns `{ runId, status: "queued" }` — a job has been enqueued, not that the agent succeeded. The agent may still fail (e.g. WayFlow runtime missing the agent, BullMQ worker not dispatched, runtime error). You MUST follow up with `agent_run_get` BEFORE summarising the result to the user. A request that fails validation or preflight returns a structured error instead of a status at all (see step 5 below) — that is a third possible outcome of the call, not a second status value.

A chat-origin dispatch can instead return `{ runId, status: "pending_input" }`: the run is held on the recommendation card in this conversation, paused for the person to Confirm or Skip before it starts. Tell the user: "The run is waiting for your Confirm or Skip on the recommendation card in this conversation." Do NOT poll that result to a terminal state, and do NOT tell the user it is running — the card releases it, not you. `pending_input` is an OVERLOADED status, though: elsewhere it also covers setup, trigger editing, a failed-run reset, and enqueue compensation, and a run you dispatched as `queued` can transition INTO `pending_input` mid-execution for a genuine but different human-wait gate (see step 4). Only the value `agent_run` itself returns at dispatch means the recommendation card — never assume that meaning for a `pending_input` you see later, from `agent_run_get`.

Confirm/Skip happens on the card, in the person's own action, not in your turn. Nothing automatically hands control back to you when they decide. If the conversation continues and you still have the runId, call `agent_run_get` yourself to check on it — do not assume the run finished, and do not assume you will be told.

Polling rule (apply after every `agent_run` call that comes back `queued` — smoke tests, lifecycle helper dispatches, any async run without a hold):

1. **Short bounded poll.** Call `agent_run_get { runId }` up to 3 times (one shortly after dispatch, two follow-ups). Wait briefly between calls. The chat conversation has a small tool-call budget; aggressive polling here exhausts it and aborts the turn before the run finishes.
2. **Terminal statuses** (stop polling): `completed`, `failed`, `pending_approval`, `pending_input`, `stopped`.
3. **In-progress statuses** (keep polling within the 3-call budget): `queued`, `running`.
4. **Final reporting after the 3 polls:**
   - `completed` → optionally fetch `agent_run_messages_list { runId }` for the structured output, then summarise.
   - `failed` → surface the `error` field verbatim. Don't paper over it ("the smoke run failed: <error>" is correct; "the smoke run is queued" is wrong).
   - `pending_approval` → tell the user the run is paused for human input and surface the HITL screen if known.
   - `pending_input` (reached here, from `agent_run_get`, on a run that started `queued`) → this is NOT the dispatch-time recommendation hold; that only ever arrives as the initial `agent_run` result. It means the run paused on a different human-wait gate mid-execution (for example, an optional sub-agent needs installing). Tell the user the run is paused and needs their attention; do not guess which gate, and do not call it the recommendation card.
   - `stopped` → tell the user the run was stopped (typically by `agent_run_stop` or org policy).
   - `queued` / `running` after 3 polls → DO NOT claim success. Report that the run is still in progress, include the `runId`, and offer to check again in this conversation.
5. **Structured `agent_run` rejections** (e.g. `code: "WAYFLOW_AGENT_NOT_REGISTERED"`, `code: "WAYFLOW_NOT_CONFIGURED"`, or a plain validation `error`) → surface the `error` field IMMEDIATELY. Do NOT poll. The job was rejected before queueing, or never created, and there's nothing to poll for.

A user-visible "run queued" status without a follow-up poll (or without surfacing the run id and offering a follow-up) is a chat bug. Don't ship that. Polling a "pending_input" run to a terminal state, or telling the user it is running, is the same bug in the other direction: the run is waiting on a person, not on the system — whichever gate it is.

