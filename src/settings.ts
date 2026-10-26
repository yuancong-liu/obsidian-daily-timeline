import { App, PluginSettingTab, Setting, SettingDefinitionItem } from "obsidian";
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

type SettingKey = keyof DailyTimelineSettings;

interface TextSetting {
	key: SettingKey;
	name: string;
	desc: string;
	placeholder: string;
}

const PROFILE_SETTINGS: TextSetting[] = [
	{ key: "displayName", name: "Display name", desc: "Shown on each entry.", placeholder: DEFAULT_SETTINGS.displayName },
	{
		key: "handle",
		name: "Handle",
		desc: "Shown as @handle next to the name. Leave empty to hide.",
		placeholder: "username",
	},
	{
		key: "avatar",
		name: "Avatar",
		desc: "Vault path to an image shown next to the composer. Leave empty to use the first letter of your name.",
		placeholder: "attachments/avatar.png",
	},
];

const DAILY_NOTE_SETTINGS: TextSetting[] = [
	{
		key: "dailyFolder",
		name: "Folder",
		desc: "Where your daily notes live. Leave empty to use the core Daily notes setting.",
		placeholder: "Daily",
	},
	{
		key: "dailyFormat",
		name: "Date format",
		desc: "Moment.js format of daily note file names. Leave empty to use the core Daily notes setting.",
		placeholder: "YYYY-MM-DD",
	},
];

const isSettingKey = (key: string): key is SettingKey => key in DEFAULT_SETTINGS;

export class DailyTimelineSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: DailyTimelinePlugin,
	) {
		super(app, plugin);
	}

	// Obsidian 1.13+: declarative settings, rendered by the app and indexed by settings search.
	getSettingDefinitions(): SettingDefinitionItem[] {
		const toDefinition = (s: TextSetting) => ({
			name: s.name,
			desc: s.desc,
			control: { type: "text" as const, key: s.key, placeholder: s.placeholder },
		});
		return [
			{ type: "group", items: PROFILE_SETTINGS.map(toDefinition) },
			{ type: "group", heading: "Daily notes", items: DAILY_NOTE_SETTINGS.map(toDefinition) },
		];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (!isSettingKey(key) || typeof value !== "string") return;
		this.plugin.settings[key] = value;
		await this.plugin.saveSettings();
	}

	// Fallback for Obsidian versions before 1.13, which don't call getSettingDefinitions().
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const render = (s: TextSetting) => {
			new Setting(containerEl)
				.setName(s.name)
				.setDesc(s.desc)
				.addText((t) =>
					t
						.setPlaceholder(s.placeholder)
						.setValue(this.plugin.settings[s.key])
						.onChange((value) => void this.setControlValue(s.key, value)),
				);
		};

		for (const s of PROFILE_SETTINGS) render(s);
		new Setting(containerEl).setName("Daily notes").setHeading();
		for (const s of DAILY_NOTE_SETTINGS) render(s);
	}
}
