import { MarkdownPostProcessorContext, MarkdownView, Notice, Plugin, TFile, moment } from "obsidian";
import { ComposeModal, Composer } from "./composer";
import { getDailyNoteConfig, getTodayNote, isDailyNote } from "./dailyNotes";
import { renderHeader } from "./header";
import { buildLivePreviewExtension } from "./livePreview";
import { DEFAULT_SETTINGS, DailyTimelineSettingTab, DailyTimelineSettings } from "./settings";
import { CODE_BLOCK_LANG, parseEntries, planInsert } from "./timeline";

export default class DailyTimelinePlugin extends Plugin {
	settings!: DailyTimelineSettings;
	/** Bumped on every settings change so editor decorations know to re-render. */
	settingsStamp = 0;
	private refocusPath: string | null = null;

	async onload() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		this.registerEditorExtension(buildLivePreviewExtension(this));

		this.registerMarkdownCodeBlockProcessor(CODE_BLOCK_LANG, (_source, el, ctx) => {
			const composer = new Composer(this, el, () => {
				const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
				return file instanceof TFile ? file : null;
			});
			if (this.refocusPath === ctx.sourcePath) {
				this.refocusPath = null;
				window.setTimeout(() => composer.focus(), 0);
			}
		});

		this.registerMarkdownPostProcessor((el, ctx) => this.decorateReadingView(el, ctx));

		this.addCommand({
			id: "post-to-today",
			name: "Post to today's timeline",
			callback: () => this.openComposer(),
		});
		this.addRibbonIcon("message-square-plus", "Post to today's timeline", () => this.openComposer());

		this.addSettingTab(new DailyTimelineSettingTab(this.app, this));
	}

	isDailyNote(path: string): boolean {
		return isDailyNote(path, getDailyNoteConfig(this.app, this.settings));
	}

	private openComposer() {
		const file = getTodayNote(this.app, getDailyNoteConfig(this.app, this.settings));
		if (!file) {
			new Notice("Today's daily note doesn't exist yet");
			return;
		}
		new ComposeModal(this, file).open();
	}

	async postEntry(file: TFile, body: string) {
		const time = moment().format("HH:mm");
		const view = this.findSourceView(file);
		if (view) {
			const { editor } = view;
			const { offset, text } = planInsert(editor.getValue(), time, body);
			this.refocusPath = file.path;
			editor.replaceRange(text, editor.offsetToPos(offset));
		} else {
			await this.app.vault.process(file, (data) => {
				const { offset, text } = planInsert(data, time, body);
				return data.slice(0, offset) + text + data.slice(offset);
			});
		}
	}

	private findSourceView(file: TFile): MarkdownView | null {
		for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
			const view = leaf.view;
			if (view instanceof MarkdownView && view.file?.path === file.path && view.getMode() === "source") {
				return view;
			}
		}
		return null;
	}

	private decorateReadingView(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		if (!this.isDailyNote(ctx.sourcePath)) return;
		const info = ctx.getSectionInfo(el);
		if (!info) return;
		const entry = parseEntries(info.text.split("\n")).find(
			(e) => info.lineStart >= e.head && info.lineStart <= e.end,
		);
		if (!entry) return;
		if (info.lineStart === entry.head) {
			el.addClass("dtl-line", "dtl-head");
			if (entry.head === entry.end) el.addClass("dtl-last");
			el.appendChild(renderHeader(this.settings, entry.time));
		} else {
			el.addClass("dtl-line", "dtl-body");
			if (info.lineEnd >= entry.end) el.addClass("dtl-last");
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.settingsStamp++;
		this.app.workspace.updateOptions();
	}
}
