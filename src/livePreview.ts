import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import { renderHeader } from "./header";
import type DailyTimelinePlugin from "./main";
import { Entry, parseEntries } from "./timeline";

class HeaderWidget extends WidgetType {
	private readonly stamp: number;

	constructor(
		private readonly plugin: DailyTimelinePlugin,
		private readonly time: string,
	) {
		super();
		this.stamp = plugin.settingsStamp;
	}

	eq(other: HeaderWidget): boolean {
		return other.time === this.time && other.stamp === this.stamp;
	}

	toDOM(): HTMLElement {
		return renderHeader(this.plugin.settings, this.time);
	}

	ignoreEvent(): boolean {
		// Let clicks through so the cursor lands on the line and reveals the raw heading.
		return false;
	}
}

export function buildLivePreviewExtension(plugin: DailyTimelinePlugin) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			private entries: Entry[] | null = null;
			private stamp = -1;

			constructor(view: EditorView) {
				this.decorations = this.build(view);
			}

			update(update: ViewUpdate) {
				const livePreviewChanged =
					update.startState.field(editorLivePreviewField, false) !==
					update.state.field(editorLivePreviewField, false);
				if (update.docChanged) this.entries = null;
				if (
					update.docChanged ||
					update.selectionSet ||
					update.focusChanged ||
					livePreviewChanged ||
					this.stamp !== plugin.settingsStamp
				) {
					this.decorations = this.build(update.view);
				}
			}

			build(view: EditorView): DecorationSet {
				this.stamp = plugin.settingsStamp;
				const state = view.state;
				const file = state.field(editorInfoField, false)?.file;
				if (!file || !plugin.isDailyNote(file.path)) return Decoration.none;
				if (!state.field(editorLivePreviewField, false)) return Decoration.none;

				const doc = state.doc;
				if (!this.entries) this.entries = parseEntries(doc.toString().split("\n"));
				const ranges = state.selection.ranges;
				const builder = new RangeSetBuilder<Decoration>();

				for (const e of this.entries) {
					for (let i = e.head; i <= e.end; i++) {
						const line = doc.line(i + 1);
						if (i === e.head) {
							const cls = "dtl-line dtl-head" + (e.head === e.end ? " dtl-last" : "");
							builder.add(line.from, line.from, Decoration.line({ class: cls }));
							const editing =
								view.hasFocus && ranges.some((r) => r.from <= line.to && r.to >= line.from);
							if (!editing) {
								builder.add(
									line.from,
									line.to,
									Decoration.replace({ widget: new HeaderWidget(plugin, e.time) }),
								);
							}
						} else {
							let cls = "dtl-line dtl-body";
							if (i === e.head + 1 && line.text.trim() === "") cls += " dtl-gap";
							if (i === e.end) cls += " dtl-last";
							builder.add(line.from, line.from, Decoration.line({ class: cls }));
						}
					}
				}
				return builder.finish();
			}
		},
		{ decorations: (v) => v.decorations },
	);
}
