// ONE REPLY RULE FOR A START (cinatra#2935, lifecycle-b W5d).
//
// From the plan ("The card is the visible truth"):
//
//   "After the action fires, the card re-reads its state from the server and
//    settles in place. The assistant's line reports what came back and adds
//    nothing. Where the sentence and the card could disagree, the card is
//    right."
//
// The card is what shows a run's progress, so this bundle does not tell the
// model to chase it. Until this change the run-polling reference ordered a
// follow-up read after every start ("You MUST follow up with `agent_run_get`
// BEFORE summarising the result", "a chat bug"), and the model obeyed it: it
// fetched a status and then answered in prose of its own instead of relaying
// the platform's sentence. These cases pin the replacement and stay red if the
// mandate comes back, in this file or in any other page this package ships.
//
// Every assertion reads WHITESPACE-NORMALIZED text, so a line rewrap is not a
// failure; only the words are pinned.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_DIR = path.join(ROOT, "skills", "chat-assistant-core");
const REFERENCES_DIR = path.join(SKILL_DIR, "references");
const POLLING_REFERENCE = path.join(REFERENCES_DIR, "chat-run-polling.md");

/** One line-wrap-insensitive reading of a file. */
const read = (p) => readFileSync(p, "utf8").replace(/\s+/g, " ");

/**
 * Every markdown page this package SHIPS, as { name, text }.
 *
 * README.md is in the list because npm publishes it whatever `files` says, so
 * it is a page of the bundle for this purpose too.
 */
function shippedPages() {
  const pages = [
    { name: "README.md", text: read(path.join(ROOT, "README.md")) },
    { name: "SKILL.md", text: read(path.join(SKILL_DIR, "SKILL.md")) },
  ];
  for (const entry of readdirSync(REFERENCES_DIR).sort()) {
    if (entry.endsWith(".md")) {
      pages.push({ name: `references/${entry}`, text: read(path.join(REFERENCES_DIR, entry)) });
    }
  }
  return pages;
}

/**
 * A polling MANDATE, as text: an order to follow a start with the read
 * primitive. Written as separate readings rather than one clever regex so a
 * failure names which shape came back. A PROHIBITION ("do not poll the run
 * after a start") is not a mandate and none of these may match one.
 */
const POLL_MANDATE = [
  /MUST be followed by/i,
  /MUST follow up with/i,
  /\bpoll(?:ing)?\b[^.]*\buntil\b/i,
  /\bpoll this\b/i,
  /mandatory[^.]*\bpoll/i,
  /\bpoll[^.]*\bmandatory\b/i,
  // the read primitive ordered as a follow-up, in either word order
  /`?agent_run_get`?[^.]{0,80}\bafter (?:every|each|any|a|the)\s+(?:start|dispatch|run|`?agent_run`?)\b/i,
  /\bafter (?:every|each|any|a|the)\s+(?:start|dispatch|`?agent_run`?)[^.]{0,80}`?agent_run_get`?/i,
  // an obligation attached to the read primitive or to polling at all
  /\b(?:must|always|be sure to|make sure to|remember to)\b[^.]{0,120}(?:`agent_run_get`|\bpoll(?:ing)?\b)/i,
];

describe("the reply rule a start answers with", () => {
  it("the reference says the platform's sentence IS the reply", () => {
    const text = read(POLLING_REFERENCE);
    assert.match(text, /say it back exactly as it is written/);
    assert.match(text, /add nothing/);
    assert.match(text, /Do not poll the run after a start/);
  });

  it("the reference orders NO poll after a start", () => {
    const text = read(POLLING_REFERENCE);
    for (const shape of POLL_MANDATE) {
      assert.doesNotMatch(text, shape, `poll mandate came back as ${shape}`);
    }
  });

  it("the reference no longer calls the missing poll a chat bug", () => {
    const text = read(POLLING_REFERENCE);
    assert.doesNotMatch(text, /without a follow-up poll/i);
    assert.doesNotMatch(text, /"run queued" status[^.]*is a chat bug/i);
  });

  it("no page this package ships re-introduces the mandate", () => {
    for (const page of shippedPages()) {
      for (const shape of POLL_MANDATE) {
        assert.doesNotMatch(page.text, shape, `${page.name} carries a poll mandate: ${shape}`);
      }
    }
  });

  it("the hold is relayed, not narrated", () => {
    // The platform's message already says what the card waits for, so the
    // assistant composes no sentence of its own for a `pending_input` start.
    const text = read(POLLING_REFERENCE);
    assert.match(text, /no sentence of your own about what the card is waiting for/);
    assert.match(text, /The card releases it, not you/);
  });

  it("structured rejections are still surfaced verbatim", () => {
    const text = read(POLLING_REFERENCE);
    assert.match(text, /WAYFLOW_AGENT_NOT_REGISTERED/);
    assert.match(text, /WAYFLOW_NOT_CONFIGURED/);
    assert.match(text, /Surface the `error` field verbatim/);
  });

  it("agent_run_get is a read the person can ask for, not a follow-up a start owes", () => {
    const text = read(POLLING_REFERENCE);
    assert.match(text, /`agent_run_get \{ runId \}` when the person asks how a run is doing/);
    assert.match(text, /A run started in this conversation needs none of it/);
  });

  it("the status vocabulary matches the platform's own", () => {
    // Kept in step with the `agent_run_get` tool description in the host
    // (packages/agents/src/mcp/schemas.ts): the same two groups, the same words.
    const text = read(POLLING_REFERENCE);
    assert.match(text, /ENDS at `completed`, `failed` or `stopped`/);
    assert.match(text, /WAITS ON A PERSON at `pending_approval` or `pending_input`/);
    assert.match(text, /moves again only when somebody acts, never on its own/);
  });

  it("the SKILL.md entry routes to the reply rule, not to a polling discipline", () => {
    const text = read(path.join(SKILL_DIR, "SKILL.md"));
    assert.doesNotMatch(text, /polling discipline/i);
    assert.doesNotMatch(text, /mandatory run-polling/i);
    assert.match(text, /the run reply rule/);
  });
});
