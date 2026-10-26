import esbuild from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";
import { builtinModules } from "node:module";
import { join } from "node:path";
import process from "node:process";

const prod = process.argv[2] === "production";

// Set VAULT_PLUGIN_DIR to e.g. "/path/to/vault/.obsidian/plugins/daily-timeline"
// to copy the build output into a vault after every build.
const vaultDir = process.env.VAULT_PLUGIN_DIR;
const copyToVault = {
	name: "copy-to-vault",
	setup(build) {
		build.onEnd((result) => {
			if (!vaultDir || result.errors.length) return;
			mkdirSync(vaultDir, { recursive: true });
			for (const f of ["main.js", "manifest.json", "styles.css"]) copyFileSync(f, join(vaultDir, f));
			console.log(`Copied build to ${vaultDir}`);
		});
	},
};

const context = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtinModules,
	],
	format: "cjs",
	target: "es2018",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	minify: prod,
	outfile: "main.js",
	plugins: [copyToVault],
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
