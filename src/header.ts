import type { DailyTimelineSettings } from "./settings";

export function renderHeader(settings: DailyTimelineSettings, time: string): HTMLElement {
	const header = createSpan({ cls: "dtl-header" });
	header.createSpan({ cls: "dtl-name", text: settings.displayName });
	const handle = settings.handle.trim().replace(/^@/, "");
	if (handle) header.createSpan({ cls: "dtl-handle", text: `@${handle}` });
	header.createSpan({ cls: "dtl-dot", text: "·" });
	header.createSpan({ cls: "dtl-time", text: time });
	return header;
}
