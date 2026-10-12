import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("public root opens without the Argus login screen", async () => {
  const appSource = await readFile(resolve(projectRoot, "src", "App.tsx"), "utf8");

  assert.doesNotMatch(appSource, /ArgusLoginScreen|loginArgus|登录朝夕智能/);
});

test("GitHub Pages builds assets below the repository path", async () => {
  const viteConfig = await readFile(resolve(projectRoot, "vite.config.ts"), "utf8");

  assert.match(viteConfig, /process\.env\.GITHUB_ACTIONS\s*\?\s*["']\/work\/["']/);
});
