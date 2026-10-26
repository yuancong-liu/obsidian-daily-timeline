import { moment as obsidianMoment } from "obsidian";

// Obsidian bundles moment, but its typings come from a transitive dependency that
// isn't always resolvable, so describe the small surface this plugin uses.
interface MomentLike {
	isValid(): boolean;
	format(format: string): string;
}

type MomentFn = (input?: string, format?: string, strict?: boolean) => MomentLike;

export const moment = obsidianMoment as unknown as MomentFn;
