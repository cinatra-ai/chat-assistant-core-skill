// THE WORDPRESS WRITE TOOL (cinatra#3745).
//
// The WordPress connector split its site tool proxy in two: the read tool
// `wordpress_site_tool_call` forwards read abilities only and refuses any
// ability that writes or publishes, and the write tool
// `wordpress_site_tool_write` carries every write and publish. The assistant
// still dispatches a post edit to the content-editor agent through `agent_run`,
// and still finds a post's id with a read. These cases pin that the bundle
// names the write tool where a write goes, keeps its reads on the read tool, and
// never sends a write ability through the read tool.
//
// Every assertion reads WHITESPACE-NORMALIZED text, so a line rewrap is not a
// failure; only the words are pinned.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = path.join(ROOT, "skills", "chat-assistant-core", "SKILL.md");

const READ_TOOL = "wordpress_site_tool_call";
const WRITE_TOOL = "wordpress_site_tool_write";
const LIST_TOOL = "wordpress_site_tools_list";

const raw = readFileSync(SKILL, "utf8");
const text = raw.replace(/\s+/g, " ");

/** The primitive names the skill watches, from the `primitives:` list of its frontmatter. */
function watchedPrimitives() {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)?.[1] ?? "";
  const after = frontmatter.split(/^\s*primitives:\s*$/m)[1] ?? "";
  const names = [];
  for (const line of after.split(/\r?\n/).slice(1)) {
    const item = /^\s*-\s+([A-Za-z0-9_]+)\s*$/.exec(line);
    if (!item) break;
    names.push(item[1]);
  }
  return names;
}

describe("the WordPress read tool and write tool", () => {
  it("the skill watches the read tool, the write tool and the list tool", () => {
    const watched = watchedPrimitives();
    for (const name of [READ_TOOL, WRITE_TOOL, LIST_TOOL]) {
      assert.ok(watched.includes(name), `${name} is in the watched primitives`);
    }
  });

  it("a site tool failure is read for the write tool too", () => {
    assert.match(
      text,
      new RegExp(`every \`${READ_TOOL}\` / \`${WRITE_TOOL}\` / \`${LIST_TOOL}\` failure alike`),
    );
  });

  it("a read-only refusal is told apart, and a write goes through the write tool", () => {
    assert.match(text, /Refused as read-only/);
    assert.match(text, new RegExp(`\`${READ_TOOL}\` forwards read abilities only`));
    assert.match(
      text,
      new RegExp(`through \`${WRITE_TOOL}\` with the same \`instanceId\`, \`toolName\` and \`args\``),
    );
    assert.match(text, /An edit of a post goes through `agent_run` of the content-editor agent/);
    assert.match(text, /report a held call as held and never as done/);
  });

  it("the post lookup is a read through the read tool and never names the write tool", () => {
    const line = raw.split(/\r?\n/).find((l) => l.startsWith('- "Make the WordPress post about onboarding more concise"')) ?? "";
    assert.ok(line.length > 0, "the example line exists");
    assert.ok(line.includes(`\`${READ_TOOL}\``), "the lookup reads through the read tool");
    assert.ok(line.includes("`ewpa/get-posts`"), "the lookup names the read ability");
    assert.equal(line.includes(WRITE_TOOL), false, "the lookup does not name the write tool");
    assert.ok(line.includes("`agent_run` `@cinatra-ai/wordpress-agent`"), "the edit is dispatched to the agent");
  });

  it("no line sends a write ability through the read tool", () => {
    for (const line of raw.split(/\r?\n/)) {
      if (!line.includes(`\`${READ_TOOL}\``)) continue;
      assert.doesNotMatch(line, /ewpa\/(?:update|create|delete|publish)-/, `a write ability goes through the read tool: ${line.slice(0, 80)}`);
    }
  });
});
