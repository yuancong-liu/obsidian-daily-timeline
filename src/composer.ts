import { Modal, Notice, Platform, Scope, TFile, normalizePath } from "obsidian";
import type DailyTimelinePlugin from "./main";

export class Composer {
	private input!: HTMLTextAreaElement;
	private counter!: HTMLElement;
	private button!: HTMLButtonElement;

	constructor(
		private readonly plugin: DailyTimelinePlugin,
		containerEl: HTMLElement,
		private readonly resolveFile: () => TFile | null,
		private readonly onPosted?: (file: TFile) => void,
	) {
		this.render(containerEl);
	}

	private render(containerEl: HTMLElement) {
		const root = containerEl.createDiv({ cls: "dtl-composer" });
		this.renderAvatar(root);
		const main = root.createDiv({ cls: "dtl-composer-main" });
		this.input = main.createEl("textarea", {
			cls: "dtl-composer-input",
			attr: { placeholder: "What's happening?", rows: "1" },
		});
		const footer = main.createDiv({ cls: "dtl-composer-footer" });
		footer.createSpan({ cls: "dtl-composer-hint", text: Platform.isMacOS ? "⌘ ↵" : "Ctrl ↵" });
		this.counter = footer.createSpan({ cls: "dtl-composer-count" });
		this.button = footer.createEl("button", { cls: "dtl-composer-post mod-cta", text: "Post" });

		const sync = () => {
			this.input.setCssStyles({ height: "auto" });
			this.input.setCssStyles({ height: `${this.input.scrollHeight}px` });
			const len = this.input.value.trim().length;
			this.counter.setText(len ? String(len) : "");
			this.button.disabled = len === 0;
		};
		this.input.addEventListener("input", sync);

		// Obsidian's keymap handles keydown in the capture phase before the textarea sees it,
		// so Mod+Enter has to be claimed through a Scope while the input is focused.
		const { keymap } = this.plugin.app;
		const scope = new Scope(this.plugin.app.scope);
		scope.register(["Mod"], "Enter", (evt) => {
			// The block may be re-rendered while focused, in which case blur never fires.
			if (!this.input.isConnected) {
				keymap.popScope(scope);
				return;
			}
			if (evt.isComposing) return;
			void this.submit();
			return false;
		});
		this.input.addEventListener("focus", () => keymap.pushScope(scope));
		this.input.addEventListener("blur", () => keymap.popScope(scope));
		this.button.addEventListener("click", () => void this.submit());
		sync();
	}

	private renderAvatar(parentEl: HTMLElement) {
		const { app, settings } = this.plugin;
		const avatarEl = parentEl.createDiv({ cls: "dtl-avatar" });
		const path = settings.avatar.trim();
		const file = path ? app.vault.getAbstractFileByPath(normalizePath(path)) : null;
		if (file instanceof TFile) {
			avatarEl.createEl("img", { attr: { src: app.vault.getResourcePath(file), alt: "" } });
		} else {
			avatarEl.setText((settings.displayName.trim()[0] || "?").toUpperCase());
		}
	}

	focus() {
		this.input.focus();
	}

	private async submit() {
		const body = this.input.value.trim();
		if (!body) return;
		const file = this.resolveFile();
		if (!file) return;
		this.input.blur();
		this.button.disabled = true;
		try {
			await this.plugin.postEntry(file, body);
			this.input.value = "";
			this.input.dispatchEvent(new Event("input"));
			this.onPosted?.(file);
		} catch (err) {
			console.error(err);
			new Notice("Failed to post entry");
			this.button.disabled = false;
		}
	}
}

export class ComposeModal extends Modal {
	constructor(
		private readonly plugin: DailyTimelinePlugin,
		private readonly file: TFile,
	) {
		super(plugin.app);
	}

	onOpen() {
		this.modalEl.addClass("dtl-modal");
		this.titleEl.setText(this.file.basename);
		const composer = new Composer(
			this.plugin,
			this.contentEl,
			() => this.file,
			() => {
				new Notice(`Posted to ${this.file.basename}`);
				this.close();
			},
		);
		composer.focus();
	}

	onClose() {
		this.contentEl.empty();
	}
}
