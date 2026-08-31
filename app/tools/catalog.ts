import type { KeyboardPlatform, LetterCode, ShortcutDefinition, ShortcutInput } from "../game/types";
import type { ShortcutTrack } from "./types";

export interface CatalogBinding {
  /** Ordered strokes; keys within a stroke are pressed together. */
  readonly steps: readonly (readonly string[])[];
  readonly display: string;
}

export interface CatalogShortcut {
  readonly id: string;
  readonly action: string;
  readonly context?: string;
  readonly source: {
    readonly url: string;
    readonly checkedAt: string;
    readonly verification: "current" | "historical";
  };
  readonly bindings: Readonly<Record<KeyboardPlatform, CatalogBinding | null>>;
}

export interface CatalogApp {
  readonly name: string;
  readonly description: string;
  readonly surface: string;
  readonly coverage: string;
  readonly releasedPlatforms: readonly KeyboardPlatform[];
  readonly shortcuts: readonly CatalogShortcut[];
}

export interface ShortcutCatalog {
  readonly schemaVersion: 1;
  readonly apps: Readonly<Record<string, CatalogApp>>;
}

const PLATFORMS: readonly KeyboardPlatform[] = ["macos", "windows"];
const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Used by both the game and the import command; bad packs never load silently. */
export function validateCatalog(value: unknown): ShortcutCatalog {
  const catalog = object(value, "catalog");
  requireValue(catalog.schemaVersion === 1, "Unsupported catalog schemaVersion");
  const apps = object(catalog.apps, "apps");
  requireValue(Object.keys(apps).length > 0, "Catalog must contain an app");
  for (const [appId, rawApp] of Object.entries(apps)) {
    requireValue(IDENTIFIER.test(appId), `Invalid app id: ${appId}`);
    const app = object(rawApp, appId);
    for (const field of ["name", "description", "surface", "coverage"]) {
      requireValue(hasText(app[field]), `${appId}.${field} is required`);
    }
    requireValue(Array.isArray(app.releasedPlatforms) && app.releasedPlatforms.every(
      (platform) => PLATFORMS.includes(platform),
    ), `${appId}.releasedPlatforms must list macos and/or windows`);
    requireValue(Array.isArray(app.shortcuts), `${appId}.shortcuts must be an array`);
    const ids = new Set<string>();
    for (const rawShortcut of app.shortcuts) {
      const shortcut = object(rawShortcut, `${appId}.shortcut`);
      requireValue(hasText(shortcut.id) && IDENTIFIER.test(shortcut.id), `Invalid shortcut id in ${appId}`);
      requireValue(!ids.has(shortcut.id), `Duplicate shortcut: ${appId}/${shortcut.id}`);
      ids.add(shortcut.id);
      const path = `${appId}/${shortcut.id}`;
      requireValue(hasText(shortcut.action), `${path}.action is required`);
      requireValue(shortcut.context === undefined || hasText(shortcut.context), `${path}.context must be text`);
      const source = object(shortcut.source, `${path}.source`);
      requireValue(hasText(source.url), `${path} needs a source URL`);
      requireValue(new URL(source.url).protocol === "https:", `${path} needs an HTTPS source URL`);
      requireValue(typeof source.checkedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt) && Number.isFinite(Date.parse(source.checkedAt)), `${path} needs a source check date`);
      requireValue(source.verification === "current" || source.verification === "historical", `${path} needs source verification status`);
      const bindings = object(shortcut.bindings, `${path}.bindings`);
      for (const platform of PLATFORMS) {
        if (bindings[platform] === null) continue;
        const binding = object(bindings[platform], `${path}.${platform}`);
        requireValue(hasText(binding.display), `${path}.${platform}.display is required`);
        requireValue(Array.isArray(binding.steps) && binding.steps.length > 0 && binding.steps.every(
          (stroke) => Array.isArray(stroke) && stroke.length > 0 && stroke.every(hasText) && new Set(stroke).size === stroke.length,
        ), `${path}.${platform}.steps must contain nonempty key strokes`);
      }
    }
  }
  return value as ShortcutCatalog;
}

function isLetter(code: string | undefined): code is LetterCode {
  return code !== undefined && /^Key[A-Z]$/.test(code);
}

/** Only browser-safe, engine-supported bindings become playable. No OS fallback. */
function playableInput(binding: CatalogBinding): ShortcutInput | null {
  const { steps, display } = binding;
  const first = steps[0];
  if (steps.length === 1 && first.length === 1 && isLetter(first[0])) {
    return { kind: "single", code: first[0], display };
  }
  if (steps.length === 2 && first.length === 1 && steps[1].length === 1 && isLetter(first[0]) && isLetter(steps[1][0])) {
    return { kind: "sequence", codes: [first[0], steps[1][0]], display, maxGapMs: 1_200 };
  }
  if (steps.length === 1 && first.length === 2 && first.includes("Shift")) {
    const letter = first.find(isLetter);
    if (letter) return { kind: "chord", code: letter, shift: true, display };
  }
  return null;
}

export function loadCatalogTrack(catalog: ShortcutCatalog, appId: string, platform: KeyboardPlatform): ShortcutTrack {
  const app = catalog.apps[appId];
  if (!app) throw new Error(`Unknown shortcut app: ${appId}`);
  const decks: Record<"easy" | "medium" | "hard", ShortcutDefinition[]> = { easy: [], medium: [], hard: [] };
  for (const shortcut of app.shortcuts) {
    const binding = shortcut.bindings[platform];
    const input = binding ? playableInput(binding) : null;
    if (!input) continue;
    const difficulty = input.kind === "single" ? "easy" : input.kind === "sequence" ? "medium" : "hard";
    decks[difficulty].push({ id: shortcut.id, action: shortcut.action, context: shortcut.context ?? app.name, input, difficulty });
  }
  const groups = Object.values(decks);
  const showcase = Array.from({ length: Math.max(...groups.map((group) => group.length)) })
    .flatMap((_, index) => groups.flatMap((group) => group[index] ? [group[index]] : []));
  return {
    id: appId,
    name: app.name,
    description: app.description,
    editionLabel: `${app.name.toLowerCase()} edition`,
    platform: platform === "macos" ? "macOS" : "Windows",
    decks,
    showcase,
  };
}
