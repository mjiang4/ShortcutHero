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
import { HomeLeaderboard } from "../session/HomeLeaderboard";
import {
  persistOnboarding,
  restoreOnboarding,
} from "../../gameplay/result-storage";
import { ToolIcon } from "./ToolIcon";
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

type TitleView = "menu" | "options" | "scores" | "help";
type MenuAction = "play" | "speed" | "options" | "scores" | "help";

const SETTINGS_STORAGE_KEY = "shortcut-hero:launch-settings";
const SCORE_PREFIX = "shortcut-hero:high-score:";

const DIFFICULTIES: readonly GameDifficulty[] = ["easy", "medium", "hard"];
const GUIDANCE: readonly GuidanceMode[] = ["novice", "pro"];
const PACES: readonly TempoPreset[] = ["relaxed", "standard", "turbo"];
const SESSIONS: readonly SessionLength[] = [30, 45, 60];
const SOUND: readonly SoundMode[] = ["on", "off"];
const EFFECTS: readonly EffectsMode[] = ["full", "system", "reduced"];
const TOOLS: readonly AvailableToolId[] = AVAILABLE_TOOL_IDS;
const OPTION_COUNT = 6;

const MENU_ITEMS: readonly { action: MenuAction; label: string }[] = [
  { action: "play", label: "play" },
  { action: "speed", label: "speed round" },
  { action: "options", label: "options" },
  { action: "scores", label: "my scores" },
  { action: "help", label: "how to play" },
];

const LABELS = {
  difficulty: {
    easy: "single keys",
    medium: "sequences",
    hard: "chords",
  },
  guidance: {
    novice: "learn → fade keys",
    pro: "recall · hidden",
  },
  pace: {
    relaxed: "slow",
    standard: "steady",
    turbo: "brisk",
  },
  effects: {
    full: "full",
    system: "system",
    reduced: "reduced",
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
  const [bootingDemo, setBootingDemo] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const restored = restoreSettings();
      setSettings(restored);
      setScores(readHighScores());
      const onboarding = restoreOnboarding();
      if (!onboarding.demoCompleted && !onboarding.demoSkipped) {
        setBootingDemo(true);
        persistOnboarding({ demoCompleted: true, demoSkipped: false });
        void primeGameAudio(restored.pace, restored.sound === "off");
        router.replace(createPlayHref(restored, { mode: "demo" }));
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [router]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // optional
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

  const openMenuAction = useCallback(
    (action: MenuAction) => {
      switch (action) {
        case "play":
          startGame();
          break;
        case "speed":
          startSpeedRound();
          break;
        case "options":
          setOptionIndex(0);
          setView("options");
          break;
        case "scores":
          setScores(readHighScores());
          setView("scores");
          break;
        case "help":
          setView("help");
          break;
      }
    },
    [startGame, startSpeedRound],
  );

  const adjustOption = useCallback((index: number, direction: -1 | 1) => {
    setSettings((current) => {
      switch (index) {
        case 0:
          return {
            ...current,
            difficulty: cycleValue(DIFFICULTIES, current.difficulty, direction),
          };
        case 1:
          return {
            ...current,
            guidance: cycleValue(GUIDANCE, current.guidance, direction),
          };
        case 2:
          return {
            ...current,
            pace: cycleValue(PACES, current.pace, direction),
          };
        case 3:
          return {
            ...current,
            session: cycleValue(SESSIONS, current.session, direction),
          };
        case 4:
          return {
            ...current,
            sound: cycleValue(SOUND, current.sound, direction),
          };
        case 5:
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
        } else if (event.code === "ArrowLeft" || event.code === "KeyA") {
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
        setMenuIndex(
          (index) => (index - 1 + MENU_ITEMS.length) % MENU_ITEMS.length,
        );
      } else if (event.code === "Enter" || event.code === "Space") {
        event.preventDefault();
        const item = MENU_ITEMS[menuIndex];
        if (item) openMenuAction(item.action);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [adjustOption, menuIndex, openMenuAction, optionIndex, view]);

  const activeTrack = getToolTrack(settings.tool);
  const summary = useMemo(
    () =>
      `${activeTrack.name} · ${LABELS.difficulty[settings.difficulty]} · ${LABELS.pace[settings.pace]} · ${settings.session}s`,
    [activeTrack.name, settings.difficulty, settings.pace, settings.session],
  );

  function updateSetting<Key extends keyof LaunchSettings>(
    key: Key,
    value: LaunchSettings[Key],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  if (bootingDemo) {
    return (
      <main className="title-screen title-screen--booting">
        <p className="title-boot">Loading demo…</p>
      </main>
    );
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
        <>
          <section className="title-menu" aria-label="Main menu">
            <p className="title-menu__prelude">
              learn {activeTrack.name} through play
            </p>
            <p className="title-menu__description">
              Build real {activeTrack.name} shortcut muscle memory on a rhythm
              highway.
            </p>

            <div className="title-menu__tools" role="group" aria-label="App track">
              {TOOLS.map((tool) => {
                const track = getToolTrack(tool);
                const active = settings.tool === tool;
                return (
                  <button
                    key={tool}
                    type="button"
                    className={`tool-chip tool-chip--compact${active ? " is-active" : ""}`}
                    aria-pressed={active}
                    onClick={() => updateSetting("tool", tool)}
                  >
                    <ToolIcon tool={tool} className="tool-chip__icon" />
                    <span>{track.name}</span>
                  </button>
                );
              })}
            </div>

            <nav className="title-menu__items">
              {MENU_ITEMS.map((item, index) => (
                <button
                  type="button"
                  className={`title-menu__item${index === menuIndex ? " is-active" : ""}`}
                  key={item.action}
                  aria-current={index === menuIndex ? "true" : undefined}
                  onMouseEnter={() => setMenuIndex(index)}
                  onFocus={() => setMenuIndex(index)}
                  onClick={() => openMenuAction(item.action)}
                >
                  <span className="title-menu__cursor" aria-hidden="true">
                    ›
                  </span>
                  {item.label}
                </button>
              ))}
            </nav>
          </section>

          <HomeLeaderboard
            key={settings.tool}
            trackId={settings.tool}
            compact
          />
        </>
      ) : null}

      {view === "options" ? (
        <TitlePanel title="options" subtitle="fine-tune the next run">
          <div className="option-list">
            <OptionRow
              label="difficulty"
              value={LABELS.difficulty[settings.difficulty]}
              active={optionIndex === 0}
              onFocus={() => setOptionIndex(0)}
              onPrevious={() => adjustOption(0, -1)}
              onNext={() => adjustOption(0, 1)}
            />
            <OptionRow
              label="guidance"
              value={LABELS.guidance[settings.guidance]}
              active={optionIndex === 1}
              onFocus={() => setOptionIndex(1)}
              onPrevious={() => adjustOption(1, -1)}
              onNext={() => adjustOption(1, 1)}
            />
            <OptionRow
              label="pace"
              value={LABELS.pace[settings.pace]}
              active={optionIndex === 2}
              onFocus={() => setOptionIndex(2)}
              onPrevious={() => adjustOption(2, -1)}
              onNext={() => adjustOption(2, 1)}
            />
            <OptionRow
              label="session"
              value={`${settings.session}s`}
              active={optionIndex === 3}
              onFocus={() => setOptionIndex(3)}
              onPrevious={() => adjustOption(3, -1)}
              onNext={() => adjustOption(3, 1)}
            />
            <OptionRow
              label="music"
              value={settings.sound}
              active={optionIndex === 4}
              onFocus={() => setOptionIndex(4)}
              onPrevious={() => adjustOption(4, -1)}
              onNext={() => adjustOption(4, 1)}
            />
            <OptionRow
              label="effects"
              value={LABELS.effects[settings.effects]}
              active={optionIndex === 5}
              onFocus={() => setOptionIndex(5)}
              onPrevious={() => adjustOption(5, -1)}
              onNext={() => adjustOption(5, 1)}
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
                  <span className="score-list__rank">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="score-list__label">{entry.label}</span>
                  <strong>{entry.score.toLocaleString("en-US")}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="title-panel__empty">No runs yet.</p>
          )}
          <BackButton onClick={() => setView("menu")} />
        </TitlePanel>
      ) : null}

      {view === "help" ? (
        <TitlePanel title="how to play" subtitle="match the action to its shortcut">
          <ol className="instruction-list">
            <li>
              <span>01</span>Read the approaching action.
            </li>
            <li>
              <span>02</span>Press at the strike line.
            </li>
            <li>
              <span>03</span>Keys fade as you improve — learn them.
            </li>
            <li>
              <span>04</span>Speed rounds interrupt the highway.
            </li>
          </ol>
          <button
            type="button"
            className="secondary-button"
            style={{ marginTop: "1rem" }}
            onClick={startDemo}
          >
            Replay demo
          </button>
          <BackButton onClick={() => setView("menu")} />
        </TitlePanel>
      ) : null}

      <footer className="title-footer title-footer--rich">
        <span>{summary}</span>
        <span className="title-footer__credits">
          Built for muscle memory · Inspired by Linear, Slack, Spotify & rhythm
          games
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
        <button
          type="button"
          aria-label={`Previous ${label}`}
          onFocus={onFocus}
          onClick={onPrevious}
        >
          ‹
        </button>
        <strong>{value}</strong>
        <button
          type="button"
          aria-label={`Next ${label}`}
          onFocus={onFocus}
          onClick={onNext}
        >
          ›
        </button>
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
