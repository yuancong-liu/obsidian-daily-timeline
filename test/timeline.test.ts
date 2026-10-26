import assert from "node:assert/strict";
import { test } from "node:test";
import { parseEntries, planInsert } from "../src/timeline.ts";

const apply = (source: string, time: string, body: string) => {
	const { offset, text } = planInsert(source, time, body);
	return source.slice(0, offset) + text + source.slice(offset);
};

test("parses entries and trims trailing blank lines", () => {
	const lines = ["# Day", "", "### 09:35", "", "first", "", "### 10:07", "second", "", "", "## Planner", "### 11:00", "x"];
	assert.deepEqual(parseEntries(lines), [
		{ head: 2, end: 4, time: "09:35" },
		{ head: 6, end: 7, time: "10:07" },
		{ head: 11, end: 12, time: "11:00" },
	]);
});

test("ignores headings inside code fences", () => {
	const lines = ["```md", "### 09:00", "```", "### 10:00", "body"];
	assert.deepEqual(parseEntries(lines), [{ head: 3, end: 4, time: "10:00" }]);
});

test("inserts at the end of the composer section", () => {
	const src = "# Day\n\n```daily-timeline\n```\n\n### 09:00\n\nold\n\n## Planner\n\n- task\n";
	assert.equal(
		apply(src, "12:34", "new"),
		"# Day\n\n```daily-timeline\n```\n\n### 09:00\n\nold\n\n### 12:34\n\nnew\n\n## Planner\n\n- task\n",
	);
});

test("inserts right after the composer when there are no entries", () => {
	const src = "```daily-timeline\n```\n\n## Planner\n";
	assert.equal(apply(src, "08:00", "hi"), "```daily-timeline\n```\n\n### 08:00\n\nhi\n\n## Planner\n");
});

test("without a composer, inserts after the last entry", () => {
	const src = "### 09:00\nold\n\n## Notes\n";
	assert.equal(apply(src, "10:00", "new"), "### 09:00\nold\n\n### 10:00\n\nnew\n\n## Notes\n");
});

test("without a composer or entries, appends to the end", () => {
	assert.equal(apply("# Day\nsome text", "10:00", "new"), "# Day\nsome text\n\n### 10:00\n\nnew\n");
});
