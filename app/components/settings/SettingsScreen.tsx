"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { primeGameAudio } from "../../audio/use-game-audio";
import {
  AVAILABLE_TOOL_IDS,
  getToolTheme,
  getToolTrack,
  isAvailableToolId,
  type AvailableToolId,
} from "../../tools";
import { LeaderboardPanel } from "../session/LeaderboardPanel";
import {
  persistOnboarding,
  restoreOnboarding,
} from "../../gameplay/result-storage";
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

type TitleView =
  | "menu"
  | "options"
  | "scores"
  | "leaderboard"
  | "help"
  | "credits"
  | "demo";
type MenuAction =
  | Exclude<TitleView, "menu" | "demo">
  | "start"
  | "speed"
  | "demo";

const SETTINGS_STORAGE_KEY = "shortcut-hero:launch-settings";
const SCORE_PREFIX = "shortcut-hero:high-score:";

const MENU_ITEMS: readonly { label: string; action: MenuAction }[] = [
  { label: "start", action: "start" },
  { label: "speed round", action: "speed" },
  { label: "world board", action: "leaderboard" },
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
const TOOLS: readonly AvailableToolId[] = AVAILABLE_TOOL_IDS;
const OPTION_COUNT = 7;

const LABELS = {
  difficulty: {
    easy: "single keys · beginner",
    medium: "key sequences · G then I",
    hard: "shift chords · advanced",
  },
  guidance: {
    novice: "learn · show the keys",
    pro: "recall · hide the keys",
  },
  pace: {
    relaxed: "focus · slow approach (tempo still ramps)",
    standard: "standard · balanced approach",
    turbo: "turbo · short approach window",
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
      "tool",
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
      const parts = key.slice(SCORE_PREFIX.length).split(":");
      const hasTrack = parts.length >= 5;
      const [track = "linear", mode = "run", assistance = "learn", pace = "fast", duration = "45s"] =
        hasTrack ? parts : ["linear", ...parts];
      const trackId = isAvailableToolId(track) ? track : "linear";
      entries.push({
        score,
        label: `${getToolTrack(trackId).name} · ${
          LABELS.difficulty[mode as GameDifficulty] ?? mode} · ${
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
  const [optionIndex, setOptionIndex] = useState(0);
  const [settings, setSettings] = useState<LaunchSettings>(
    DEFAULT_LAUNCH_SETTINGS,
  );
  const [scores, setScores] = useState<readonly ScoreEntry[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSettings(restoreSettings());
      setScores(readHighScores());
      const onboarding = restoreOnboarding();
      if (!onboarding.demoCompleted && !onboarding.demoSkipped) {
        setView("demo");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Persistence is optional; the title screen remains usable without it.
    }
    document.documentElement.dataset.tool = settings.tool;
    const theme = getToolTheme(settings.tool);
    document.documentElement.style.setProperty("--tool-accent", theme.accent);
    document.documentElement.style.setProperty("--tool-glow", theme.glow);
  }, [settings]);

  const startGame = useCallback(() => {
    void primeGameAudio(settings.pace, settings.sound === "off");
    router.push(createPlayHref(settings));
  }, [router, settings]);

  const startSpeedRound = useCallback(() => {
    void primeGameAudio(settings.pace, settings.sound === "off");
    router.push(createPlayHref(settings, { mode: "speed_round" }));
  }, [router, settings]);

  const startDemo = useCallback(() => {
    persistOnboarding({ demoCompleted: true, demoSkipped: false });
    void primeGameAudio(settings.pace, settings.sound === "off");
    router.push(createPlayHref(settings, { mode: "demo" }));
  }, [router, settings]);

  const skipDemo = useCallback(() => {
    persistOnboarding({ demoCompleted: false, demoSkipped: true });
    setView("menu");
  }, []);

  const openView = useCallback(
    (action: MenuAction) => {
      if (action === "start") {
        startGame();
        return;
      }
      if (action === "speed") {
        startSpeedRound();
        return;
      }
      if (action === "demo") {
        startDemo();
        return;
      }
      if (action === "scores") setScores(readHighScores());
      if (action === "options") setOptionIndex(0);
      setView(action);
    },
    [startDemo, startGame, startSpeedRound],
  );

  const adjustOption = useCallback((index: number, direction: -1 | 1) => {
    setSettings((current) => {
      switch (index) {
        case 0:
          return {
            ...current,
            tool: cycleValue(TOOLS, current.tool, direction),
          };
        case 1:
          return {
            ...current,
            difficulty: cycleValue(DIFFICULTIES, current.difficulty, direction),
          };
        case 2:
          return {
            ...current,
            guidance: cycleValue(GUIDANCE, current.guidance, direction),
          };
        case 3:
          return {
            ...current,
            pace: cycleValue(PACES, current.pace, direction),
          };
        case 4:
          return {
            ...current,
            session: cycleValue(SESSIONS, current.session, direction),
          };
        case 5:
          return {
            ...current,
            sound: cycleValue(SOUND, current.sound, direction),
          };
        case 6:
          return {
            ...current,
            effects: cycleValue(EFFECTS, current.effects, direction),
          };
        default:
          return current;
      }
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (view === "options") {
        if (event.code === "Escape" || event.code === "Backspace") {
          event.preventDefault();
          setView("menu");
        } else if (event.code === "ArrowDown" || event.code === "KeyS") {
          event.preventDefault();
          setOptionIndex((index) => (index + 1) % OPTION_COUNT);
        } else if (event.code === "ArrowUp" || event.code === "KeyW") {
          event.preventDefault();
          setOptionIndex((index) => (index - 1 + OPTION_COUNT) % OPTION_COUNT);
        } else if (
          event.code === "ArrowLeft" ||
          event.code === "KeyA"
        ) {
          event.preventDefault();
          adjustOption(optionIndex, -1);
        } else if (
          event.code === "ArrowRight" ||
          event.code === "KeyD" ||
          event.code === "Enter" ||
          event.code === "Space"
        ) {
          event.preventDefault();
          adjustOption(optionIndex, 1);
        }
        return;
      }
      if (view !== "menu") {
        if (
          event.code === "Escape" ||
          event.code === "Backspace" ||
          event.code === "Enter" ||
          event.code === "Space"
        ) {
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
  }, [adjustOption, menuIndex, openView, optionIndex, view]);

  const summary = useMemo(
    () =>
      `${getToolTrack(settings.tool).name} · ${LABELS.difficulty[settings.difficulty]} · ${
        LABELS.guidance[settings.guidance]
      } · ${LABELS.pace[settings.pace]} · ${settings.session}s`,
    [settings],
  );
  const activeTrack = getToolTrack(settings.tool);

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
        <span className="title-brand__edition">
          {activeTrack.editionLabel} · {activeTrack.platform}
        </span>
      </header>

      {view === "menu" ? (
        <section className="title-menu" aria-label="Main menu">
          <p className="title-menu__prelude">learn {activeTrack.name} through play</p>
          <p className="title-menu__description">
            Build real {activeTrack.name} shortcut muscle memory on a rhythm-game highway.
          </p>
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

      {view === "demo" ? (
        <TitlePanel title="welcome" subtitle="a 30-second guided demo">
          <p className="title-panel__empty">
            Cards race to the strike line. Press the shortcut in time. Tempo
            climbs as you play. Speed-round interludes interrupt the highway for
            flash drills.
          </p>
          <div className="results-actions" style={{ marginTop: "1.5rem" }}>
            <button type="button" className="primary-button is-selected" onClick={startDemo}>
              play demo
            </button>
            <button type="button" className="secondary-button" onClick={skipDemo}>
              skip
            </button>
          </div>
        </TitlePanel>
      ) : null}

      {view === "options" ? (
        <TitlePanel title="options" subtitle="each setting changes the feel of the run">
          <div className="option-list">
            <OptionRow
              label="tool"
              value={getToolTrack(settings.tool).name}
              active={optionIndex === 0}
              onFocus={() => setOptionIndex(0)}
              onPrevious={() => updateSetting("tool", cycleValue(TOOLS, settings.tool, -1))}
              onNext={() => updateSetting("tool", cycleValue(TOOLS, settings.tool, 1))}
            />
            <OptionRow
              label="difficulty"
              value={LABELS.difficulty[settings.difficulty]}
              active={optionIndex === 1}
              onFocus={() => setOptionIndex(1)}
              onPrevious={() => updateSetting("difficulty", cycleValue(DIFFICULTIES, settings.difficulty, -1))}
              onNext={() => updateSetting("difficulty", cycleValue(DIFFICULTIES, settings.difficulty, 1))}
            />
            <OptionRow
              label="guidance"
              value={LABELS.guidance[settings.guidance]}
              active={optionIndex === 2}
              onFocus={() => setOptionIndex(2)}
              onPrevious={() => updateSetting("guidance", cycleValue(GUIDANCE, settings.guidance, -1))}
              onNext={() => updateSetting("guidance", cycleValue(GUIDANCE, settings.guidance, 1))}
            />
            <OptionRow
              label="pace"
              value={LABELS.pace[settings.pace]}
              active={optionIndex === 3}
              onFocus={() => setOptionIndex(3)}
              onPrevious={() => updateSetting("pace", cycleValue(PACES, settings.pace, -1))}
              onNext={() => updateSetting("pace", cycleValue(PACES, settings.pace, 1))}
            />
            <OptionRow
              label="session"
              value={`${settings.session}s run length`}
              active={optionIndex === 4}
              onFocus={() => setOptionIndex(4)}
              onPrevious={() => updateSetting("session", cycleValue(SESSIONS, settings.session, -1))}
              onNext={() => updateSetting("session", cycleValue(SESSIONS, settings.session, 1))}
            />
            <OptionRow
              label="music"
              value={settings.sound === "on" ? "original score on" : "music off"}
              active={optionIndex === 5}
              onFocus={() => setOptionIndex(5)}
              onPrevious={() => updateSetting("sound", cycleValue(SOUND, settings.sound, -1))}
              onNext={() => updateSetting("sound", cycleValue(SOUND, settings.sound, 1))}
            />
            <OptionRow
              label="effects"
              value={LABELS.effects[settings.effects]}
              active={optionIndex === 6}
              onFocus={() => setOptionIndex(6)}
              onPrevious={() => updateSetting("effects", cycleValue(EFFECTS, settings.effects, -1))}
              onNext={() => updateSetting("effects", cycleValue(EFFECTS, settings.effects, 1))}
            />
          </div>
          <BackButton onClick={() => setView("menu")} />
        </TitlePanel>
      ) : null}

      {view === "leaderboard" ? (
        <TitlePanel title="world board" subtitle="international D1 leaderboard">
          <LeaderboardPanel
            trackId={settings.tool}
            onClose={() => setView("menu")}
          />
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
            <li><span>01</span>Read the approaching action (and the Coming up rail).</li>
            <li><span>02</span>Press its shortcut at the glowing strike line.</li>
            <li><span>03</span>Chain hits — tempo climbs; speed rounds interrupt the highway.</li>
            <li><span>04</span>Share your score from the results screen.</li>
          </ol>
          <button
            type="button"
            className="secondary-button"
            style={{ marginTop: "1rem" }}
            onClick={startDemo}
          >
            replay demo
          </button>
          <BackButton onClick={() => setView("menu")} />
        </TitlePanel>
      ) : null}

      {view === "credits" ? (
        <TitlePanel title="credits" subtitle="built in one improbable sprint">
          <div className="credit-copy">
            <p>100% designed and built by Codex.</p>
            <p>Inspired by Linear, rhythm games, golden-hour skies, and the pleasure of remembering without looking.</p>
          </div>
          <BackButton onClick={() => setView("menu")} />
        </TitlePanel>
      ) : null}

      <footer className="title-footer">
        <span>{summary}</span>
        <span>
          {view === "menu"
            ? "↑ ↓ select · enter confirm"
            : view === "options"
              ? "↑ ↓ option · ← → change · esc back"
              : "enter or esc back"}
        </span>
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
  active,
  onFocus,
  onPrevious,
  onNext,
}: {
  label: string;
  value: string;
  active: boolean;
  onFocus: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className={`option-row${active ? " is-active" : ""}`}>
      <span className="option-row__label">{label}</span>
      <span className="option-row__control">
        <button type="button" aria-label={`Previous ${label}`} onFocus={onFocus} onClick={onPrevious}>‹</button>
        <strong>{value}</strong>
        <button type="button" aria-label={`Next ${label}`} onFocus={onFocus} onClick={onNext}>›</button>
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
