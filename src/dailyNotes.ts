import { App, TFile, moment, normalizePath } from "obsidian";
import type { DailyTimelineSettings } from "./settings";

export interface DailyNoteConfig {
	folder: string;
	format: string;
}

interface CoreDailyNotes {
	enabled?: boolean;
	instance?: { options?: { folder?: string; format?: string } };
}

/** Settings override the core Daily notes plugin; empty settings fall back to it. */
export function getDailyNoteConfig(app: App, settings: DailyTimelineSettings): DailyNoteConfig {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const core: CoreDailyNotes | undefined = (app as any).internalPlugins?.getPluginById?.("daily-notes");
	const options = core?.instance?.options ?? {};

	let folder = (settings.dailyFolder.trim() || options.folder || "").trim();
	folder = folder ? normalizePath(folder) : "";
	if (folder === "/") folder = "";

	const format = settings.dailyFormat.trim() || options.format?.trim() || "YYYY-MM-DD";
	return { folder, format };
}

const lastSegment = (s: string) => s.split("/").pop() ?? s;

export function isDailyNote(path: string, config: DailyNoteConfig): boolean {
	if (!path.endsWith(".md")) return false;

	let rel = path;
	if (config.folder) {
		if (!path.startsWith(config.folder + "/")) return false;
		rel = path.slice(config.folder.length + 1);
	}
	rel = rel.slice(0, -3);

	if (moment(rel, config.format, true).isValid()) return true;
	// Notes are often kept in sub-folders (e.g. YYYY/MM/) that the format doesn't describe.
	return moment(lastSegment(rel), lastSegment(config.format), true).isValid();
}

export function getTodayNote(app: App, config: DailyNoteConfig): TFile | null {
	const now = moment();
	const prefix = config.folder ? config.folder + "/" : "";

	const direct = app.vault.getAbstractFileByPath(normalizePath(`${prefix}${now.format(config.format)}.md`));
	if (direct instanceof TFile) return direct;

	const basename = now.format(lastSegment(config.format));
	return (
		app.vault.getMarkdownFiles().find((f) => f.basename === basename && isDailyNote(f.path, config)) ?? null
	);
}
