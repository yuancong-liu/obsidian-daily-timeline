// Pure parsing / insertion logic for timeline entries. No Obsidian imports, so it can be unit-tested.

export const CODE_BLOCK_LANG = "daily-timeline";

export interface Entry {
	/** 0-based line of the `### HH:mm` heading */
	head: number;
	/** 0-based last non-blank line of the entry */
	end: number;
	time: string;
}

const HEAD_RE = /^###\s+(\d{1,2}:\d{2})(?::\d{2})?\s*$/;
const STOP_RE = /^#{1,3}\s/;
const FENCE_RE = /^(`{3,}|~{3,})/;
const ANCHOR_RE = new RegExp(`^(\`{3,}|~{3,})\\s*${CODE_BLOCK_LANG}\\s*$`);

export function parseEntries(lines: string[]): Entry[] {
	const entries: Entry[] = [];
	let cur: { head: number; time: string } | null = null;
	let fence: string | null = null;

	const close = (last: number) => {
		if (!cur) return;
		let end = last;
		while (end > cur.head && lines[end].trim() === "") end--;
		entries.push({ head: cur.head, end, time: cur.time });
		cur = null;
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const f = FENCE_RE.exec(line);
		if (f) {
			if (!fence) fence = f[1];
			else if (line.startsWith(fence)) fence = null;
			continue;
		}
		if (fence) continue;
		const m = HEAD_RE.exec(line);
		if (m) {
			close(i - 1);
			cur = { head: i, time: m[1] };
		} else if (cur && STOP_RE.test(line)) {
			close(i - 1);
		}
	}
	close(lines.length - 1);
	return entries;
}

/**
 * Work out where a new entry goes:
 * - after the composer block, at the end of its section (before the next `#`/`##` heading)
 * - otherwise right after the last existing entry
 * - otherwise at the end of the note
 */
export function planInsert(source: string, time: string, body: string): { offset: number; text: string } {
	const lines = source.split("\n");
	let stop = -1;

	let anchorEnd = -1;
	for (let i = 0; i < lines.length; i++) {
		const m = ANCHOR_RE.exec(lines[i]);
		if (!m) continue;
		for (let j = i + 1; j < lines.length; j++) {
			if (lines[j].startsWith(m[1])) {
				anchorEnd = j;
				break;
			}
		}
		break;
	}

	if (anchorEnd >= 0) {
		stop = lines.findIndex((l, i) => i > anchorEnd && /^#{1,2}\s/.test(l));
	} else {
		const entries = parseEntries(lines);
		if (entries.length) stop = entries[entries.length - 1].end + 1;
	}
	if (stop < 0) stop = lines.length;

	let at = stop;
	while (at > 0 && lines[at - 1].trim() === "") at--;

	let text = `\n### ${time}\n\n${body.trim()}\n`;
	if (at < lines.length && lines[at].trim() !== "") text += "\n";

	let offset = 0;
	for (let i = 0; i < at; i++) offset += lines[i].length + 1;
	if (offset > source.length) {
		offset = source.length;
		if (!source.endsWith("\n")) text = "\n" + text;
	}
	return { offset, text };
}
