import { App, PluginSettingTab, Setting } from "obsidian";
import type DailyTimelinePlugin from "./main";

export interface DailyTimelineSettings {
	displayName: string;
	handle: string;
	avatar: string;
	dailyFolder: string;
	dailyFormat: string;
}

export const DEFAULT_SETTINGS: DailyTimelineSettings = {
	displayName: "Me",
	handle: "",
	avatar: "",
	dailyFolder: "",
	dailyFormat: "",
};

type TextKey = keyof DailyTimelineSettings;

export class DailyTimelineSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: DailyTimelinePlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		const settings = this.plugin.settings;
		containerEl.empty();

		const text = (name: string, desc: string, key: TextKey, placeholder: string) =>
			new Setting(containerEl)
				.setName(name)
				.setDesc(desc)
				.addText((t) =>
					t
						.setPlaceholder(placeholder)
						.setValue(settings[key])
						.onChange(async (value) => {
							settings[key] = value;
							await this.plugin.saveSettings();
						}),
				);

		text("Display name", "Shown on each entry.", "displayName", DEFAULT_SETTINGS.displayName);
		text("Handle", "Shown as @handle next to the name. Leave empty to hide.", "handle", "username");
		text(
			"Avatar",
			"Vault path to an image shown next to the composer. Leave empty to use the first letter of your name.",
			"avatar",
			"attachments/avatar.png",
		);

		new Setting(containerEl).setName("Daily notes").setHeading();
		text(
			"Folder",
			"Where your daily notes live. Leave empty to use the core Daily notes setting.",
			"dailyFolder",
			"Daily",
		);
		text(
			"Date format",
			"Moment.js format of daily note file names. Leave empty to use the core Daily notes setting.",
			"dailyFormat",
			"YYYY-MM-DD",
		);
	}
}
