# Cinatra Chat Assistant Core Skill

The Cinatra chat assistant's always-loaded core: personality, response formatting, charts, platform capabilities, CMS content editing, critical rules, app-page linking, conversational flow, implementation bridging, tool usage, @mention routing, and credential safety. The router also carries five absorbed concern skills as one-hop references — agent dispatch, run replies, extension discovery, artifact creation, and appointment-schedule CTAs — so the assistant resolves them all from one bundle.

**Install:** Install `@cinatra-ai/chat-assistant-core-skill` in your Cinatra instance. Assistants that list the `chat-assistant-core` slug in their skill bundle pick it up from the catalog.

**Usage:** The bundle is the assistant's baseline system behavior — loaded on every turn, never invoked directly. Task-specific guidance is read on demand from the bundled references or from the separate concern-skill bundles the router names.

**Configuration:** None. The skill carries no credentials and reads no settings; the platform supplies the tools it names.

**Development:** Clone the repository and run `node extension-kind-gate.mjs --package-root .` to validate the manifest. The router lives at `skills/chat-assistant-core/SKILL.md`; the absorbed sub-skills are byte-preserved under `skills/chat-assistant-core/references/`.

**Troubleshooting:** If the assistant loses its baseline behavior, the bundle is not mounted — check that the assistant's skill bundle lists `chat-assistant-core`. If dispatch, run-reply, or discovery guidance drifts from the live platform, compare the references against this repository's current revision.

## Works with

- The Cinatra chat assistant (the default responder in Cinatra chat)
- The Cinatra MCP agent, artifact, and extension-discovery tool surfaces

## Capabilities

- Hold the assistant's always-loaded baseline: personality, formatting, charts, and critical rules
- Route CMS prose edits through the content-editor agents and report real terminal results
- Dispatch installed agents by package name, then say the platform's own message back — the run's card in the conversation shows its progress
- Climb the full extension-discovery ladder and scope answers to the surfaces actually probed
- Create semantic artifacts through the installed artifact extension's authoring path
- Persist booking-page URLs as campaign CTAs and keep credential handling safe by default
