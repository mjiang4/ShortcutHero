import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadCatalogTrack, validateCatalog } from "../app/tools/catalog";
import { deckForMode } from "../app/tools/types";

const args = process.argv.slice(2);
const source = args.find((arg) => !arg.startsWith("--"));
if (!source || args.some((arg) => arg.startsWith("--") && arg !== "--write")) {
  console.error("Usage: npm run catalog:import -- path/to/catalog.json [--write]");
  process.exitCode = 1;
} else {
  try {
    const incoming = validateCatalog(JSON.parse(await readFile(resolve(source), "utf8")));
    for (const [appId, app] of Object.entries(incoming.apps)) {
      for (const platform of ["macos", "windows"] as const) {
        const track = loadCatalogTrack(incoming, appId, platform);
        console.log(`${app.name} / ${platform}: ${app.shortcuts.length} catalog entries; playable pools: easy ${deckForMode(track, "easy").length}, medium ${deckForMode(track, "medium").length}, hard ${deckForMode(track, "hard").length}`);
      }
    }
    if (args.includes("--write")) {
      const destination = fileURLToPath(new URL("../app/tools/catalog-data.json", import.meta.url));
      const existing = validateCatalog(JSON.parse(await readFile(destination, "utf8")));
      const merged = validateCatalog({ schemaVersion: 1, apps: { ...existing.apps, ...incoming.apps } });
      await writeFile(destination, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
      console.log(`Updated app snapshots: ${Object.keys(incoming.apps).join(", ")}. Review the diff before committing.`);
    } else {
      console.log("Valid catalog. No files changed. Add --write to replace these app snapshots, preserving other apps.");
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
