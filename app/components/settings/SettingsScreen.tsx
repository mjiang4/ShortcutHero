"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { primeGameAudio } from "../../audio/use-game-audio";
import {
  createPlayHref,
  DEFAULT_LAUNCH_SETTINGS,
  parseLaunchSettings,
  type EffectsMode,
  type GameDifficulty,
  type GuidanceMode,
  type LaunchSettings,
  type SessionLength,
  type SoundMode,
  type TempoPreset,
} from "./settings";

type TitleView = "menu" | "options" | "scores" | "help" | "credits";
type MenuAction = Exclude<TitleView, "menu"> | "start";

const SETTINGS_STORAGE_KEY = "shortcut-hero:launch-settings";
const SCORE_PREFIX = "shortcut-hero:high-score:";

const MENU_ITEMS: readonly { label: string; action: MenuAction }[] = [
  { label: "start", action: "start" },
  { label: "high scores", action: "scores" },
  { label: "how to play", action: "help" },
  { label: "options", action: "options" },
  { label: "credits", action: "credits" },
];

const DIFFICULTIES: readonly GameDifficulty[] = ["easy", "medium", "hard"];
const GUIDANCE: readonly GuidanceMode[] = ["novice", "pro"];
const PACES: readonly TempoPreset[] = ["relaxed", "standard", "turbo"];
const SESSIONS: readonly SessionLength[] = [30, 45, 60];
const SOUND: readonly SoundMode[] = ["on", "off"];
const EFFECTS: readonly EffectsMode[] = ["full", "system", "reduced"];

const LABELS = {
  difficulty: {
    easy: "single keys",
    medium: "key sequences",
    hard: "shift chords",
  },
  guidance: {
    novice: "show shortcuts",
    pro: "hide shortcuts",
  },
  pace: {
    relaxed: "140 bpm · focus",
    standard: "180 bpm · fast",
    turbo: "220 bpm · turbo",
  },
  effects: {
    full: "full motion + bloom",
    system: "match system motion",
    reduced: "reduced motion",
  },
} as const;

type ScoreEntry = {
  label: string;
  score: number;
};

function cycleValue<T extends string | number>(
  values: readonly T[],
  current: T,
  direction: -1 | 1,
): T {
  const index = Math.max(0, values.indexOf(current));
  return values[(index + direction + values.length) % values.length];
}

function restoreSettings(): LaunchSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_LAUNCH_SETTINGS;
    const saved = JSON.parse(raw) as Record<string, unknown>;
    const params = new URLSearchParams();
    for (const key of [
      "difficulty",
      "guidance",
      "pace",
      "session",
      "sound",
      "effects",
    ]) {
      const value = saved[key];
      if (typeof value === "string" || typeof value === "number") {
        params.set(key, String(value));
      }
    }
    return parseLaunchSettings(params);
  } catch {
    return DEFAULT_LAUNCH_SETTINGS;
  }
}

function readHighScores(): readonly ScoreEntry[] {
  try {
    const entries: ScoreEntry[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(SCORE_PREFIX)) continue;
      const score = Number(window.localStorage.getItem(key) ?? 0);
      if (!Number.isFinite(score) || score <= 0) continue;
      const [mode = "run", assistance = "learn", pace = "fast", duration = "45s"] =
        key.slice(SCORE_PREFIX.length).split(":");
      entries.push({
        score,
        label: `${LABELS.difficulty[mode as GameDifficulty] ?? mode} · ${
          LABELS.guidance[assistance as GuidanceMode] ?? assistance
        } · ${LABELS.pace[pace as TempoPreset] ?? pace} · ${duration}`,
      });
    }
    return entries.sort((a, b) => b.score - a.score).slice(0, 5);
  } catch {
    return [];
  }
}

export function SettingsScreen() {
  const router = useRouter();
  const [view, setView] = useState<TitleView>("menu");
  const [menuIndex, setMenuIndex] = useState(0);
  const [settings, setSettings] = useState<LaunchSettings>(
    DEFAULT_LAUNCH_SETTINGS,
  );
  const [scores, setScores] = useState<readonly ScoreEntry[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSettings(restoreSettings());
      setScores(readHighScores());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Persistence is optional; the title screen remains usable without it.
    }
  }, [settings]);

  const startGame = useCallback(() => {
    void primeGameAudio(settings.pace, settings.sound === "off");
    router.push(createPlayHref(settings));
  }, [router, settings]);

  const openView = useCallback(
    (action: MenuAction) => {
      if (action === "start") {
        startGame();
        return;
      }
      if (action === "scores") setScores(readHighScores());
      setView(action);
    },
    [startGame],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (view !== "menu") {
        if (event.code === "Escape") {
          event.preventDefault();
          setView("menu");
        }
        return;
      }
      if (event.code === "ArrowDown" || event.code === "KeyS") {
        event.preventDefault();
        setMenuIndex((index) => (index + 1) % MENU_ITEMS.length);
      } else if (event.code === "ArrowUp" || event.code === "KeyW") {
        event.preventDefault();
        setMenuIndex((index) => (index - 1 + MENU_ITEMS.length) % MENU_ITEMS.length);
      } else if (event.code === "Enter" || event.code === "Space") {
        event.preventDefault();
        openView(MENU_ITEMS[menuIndex].action);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuIndex, openView, view]);

  const summary = useMemo(
    () =>
      `${LABELS.difficulty[settings.difficulty]} · ${
        LABELS.guidance[settings.guidance]
      } · ${LABELS.pace[settings.pace]} · ${settings.session}s`,
    [settings],
  );

  function updateSetting<Key extends keyof LaunchSettings>(
    key: Key,
    value: LaunchSettings[Key],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="title-screen">
      <div className="title-world" aria-hidden="true">
        <div className="title-world__sky" />
        <div className="title-world__sun" />
        <div className="title-world__haze" />
        <div className="title-world__mountains title-world__mountains--far" />
        <div className="title-world__mountains title-world__mountains--near" />
        <div className="title-world__highway">
          <span className="title-world__rail title-world__rail--left" />
          <span className="title-world__rail title-world__rail--right" />
          <span className="title-world__signal" />
        </div>
        <div className="title-world__grain" />
      </div>

      <header className="title-brand">
        <span className="title-brand__name">shortcut hero</span>
        <span className="title-brand__edition">linear edition · macOS</span>
      </header>

      {view === "menu" ? (
        <section className="title-menu" aria-label="Main menu">
          <p className="title-menu__prelude">enter the flow</p>
          <nav className="title-menu__items">
            {MENU_ITEMS.map((item, index) => (
              <button
                type="button"
                className={`title-menu__item${index === menuIndex ? " is-active" : ""}`}
                key={item.action}
                aria-current={index === menuIndex ? "true" : undefined}
                onMouseEnter={() => setMenuIndex(index)}
                onFocus={() => setMenuIndex(index)}
                onClick={() => openView(item.action)}
              >
                <span className="title-menu__cursor" aria-hidden="true">›</span>
                {item.label}
              </button>
            ))}
          </nav>
        </section>
      ) : null}

      {view === "options" ? (
        <TitlePanel title="options" subtitle="shape the next run">
          <div className="option-list">
            <OptionRow
              label="difficulty"
              value={LABELS.difficulty[settings.difficulty]}
              onPrevious={() => updateSetting("difficulty", cycleValue(DIFFICULTIES, settings.difficulty, -1))}
              onNext={() => updateSetting("difficulty", cycleValue(DIFFICULTIES, settings.difficulty, 1))}
            />
            <OptionRow
              label="guidance"
              value={LABELS.guidance[settings.guidance]}
              onPrevious={() => updateSetting("guidance", cycleValue(GUIDANCE, settings.guidance, -1))}
              onNext={() => updateSetting("guidance", cycleValue(GUIDANCE, settings.guidance, 1))}
            />
            <OptionRow
              label="pace"
              value={LABELS.pace[settings.pace]}
              onPrevious={() => updateSetting("pace", cycleValue(PACES, settings.pace, -1))}
              onNext={() => updateSetting("pace", cycleValue(PACES, settings.pace, 1))}
            />
            <OptionRow
              label="session"
              value={`${settings.session} seconds`}
              onPrevious={() => updateSetting("session", cycleValue(SESSIONS, settings.session, -1))}
              onNext={() => updateSetting("session", cycleValue(SESSIONS, settings.session, 1))}
            />
            <OptionRow
              label="music"
              value={settings.sound === "on" ? "original score on" : "music off"}
              onPrevious={() => updateSetting("sound", cycleValue(SOUND, settings.sound, -1))}
              onNext={() => updateSetting("sound", cycleValue(SOUND, settings.sound, 1))}
            />
            <OptionRow
              label="effects"
              value={LABELS.effects[settings.effects]}
              onPrevious={() => updateSetting("effects", cycleValue(EFFECTS, settings.effects, -1))}
              onNext={() => updateSetting("effects", cycleValue(EFFECTS, settings.effects, 1))}
            />
          </div>
          <BackButton onClick={() => setView("menu")} />
        </TitlePanel>
      ) : null}

      {view === "scores" ? (
        <TitlePanel title="high scores" subtitle="your strongest runs">
          {scores.length > 0 ? (
            <ol className="score-list">
              {scores.map((entry, index) => (
                <li key={`${entry.label}-${entry.score}`}>
                  <span className="score-list__rank">{String(index + 1).padStart(2, "0")}</span>
                  <span className="score-list__label">{entry.label}</span>
                  <strong>{entry.score.toLocaleString("en-US")}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="title-panel__empty">No runs yet. The highway is waiting.</p>
          )}
          <BackButton onClick={() => setView("menu")} />
        </TitlePanel>
      ) : null}

      {view === "help" ? (
        <TitlePanel title="how to play" subtitle="match the action to its shortcut">
          <ol className="instruction-list">
            <li><span>01</span>Read the action.</li>
            <li><span>02</span>Press its shortcut at the strike line.</li>
            <li><span>03</span>Chain hits for a higher score.</li>
          </ol>
          <BackButton onClick={() => setView("menu")} />
        </TitlePanel>
      ) : null}

      {view === "credits" ? (
        <TitlePanel title="credits" subtitle="built in one improbable sprint">
          <div className="credit-copy">
            <p>Designed and built as a shortcut-learning experiment.</p>
            <p>Inspired by Linear, musical games, golden-hour skies, and the pleasure of remembering without looking.</p>
          </div>
          <BackButton onClick={() => setView("menu")} />
        </TitlePanel>
      ) : null}

      <footer className="title-footer">
        <span>{summary}</span>
        <span>↑ ↓ select · enter confirm · esc back</span>
      </footer>
    </main>
  );
}

function TitlePanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`title-panel${title === "options" ? " title-panel--options" : ""}`}
      aria-labelledby="title-panel-heading"
    >
      <p className="title-panel__subtitle">{subtitle}</p>
      <h1 id="title-panel-heading">{title}</h1>
      {children}
    </section>
  );
}

function OptionRow({
  label,
  value,
  onPrevious,
  onNext,
}: {
  label: string;
  value: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="option-row">
      <span className="option-row__label">{label}</span>
      <span className="option-row__control">
        <button type="button" aria-label={`Previous ${label}`} onClick={onPrevious}>‹</button>
        <strong>{value}</strong>
        <button type="button" aria-label={`Next ${label}`} onClick={onNext}>›</button>
      </span>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="title-panel__back" onClick={onClick}>
      <span aria-hidden="true">←</span> back
    </button>
  );
}
