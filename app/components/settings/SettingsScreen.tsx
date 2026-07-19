"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { primeGameAudio } from "../../audio/use-game-audio";
import { getToolTrack, isAvailableToolId } from "../../tools";
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
type OnboardingView = "onboarding-name" | "onboarding-system" | "onboarding-guide";
type ScreenView = TitleView | OnboardingView;
type MenuAction = Exclude<TitleView, "menu"> | "start";

const SETTINGS_STORAGE_KEY = "shortcut-hero:launch-settings";
const ONBOARDING_STORAGE_KEY = "shortcut-hero:onboarding";
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
const OPTION_COUNT = 7;

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
    relaxed: "112 bpm · focus",
    standard: "144 bpm · fast",
    turbo: "176 bpm · turbo",
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

type SystemInfo = {
  readonly operatingSystem: "macOS" | "Windows" | "Other";
  readonly browser: string;
};

const DEFAULT_SYSTEM_INFO: SystemInfo = {
  operatingSystem: "Other",
  browser: "your browser",
};

function detectSystem(): SystemInfo {
  const userAgent = window.navigator.userAgent;
  const operatingSystem = /Mac|iPhone|iPad/i.test(userAgent)
    ? "macOS"
    : /Win/i.test(userAgent)
      ? "Windows"
      : "Other";
  const browser = /Edg\//.test(userAgent)
    ? "Microsoft Edge"
    : /Chrome\//.test(userAgent)
      ? "Google Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "your browser";

  return { operatingSystem, browser };
}

function restoreOnboarding(): { name: string; complete: boolean } {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return { name: "", complete: false };
    const saved = JSON.parse(raw) as Record<string, unknown>;
    return {
      name: typeof saved.name === "string" ? saved.name.slice(0, 32) : "",
      complete: saved.complete === true,
    };
  } catch {
    return { name: "", complete: false };
  }
}

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
  const [view, setView] = useState<ScreenView>("onboarding-name");
  const [menuIndex, setMenuIndex] = useState(0);
  const [optionIndex, setOptionIndex] = useState(0);
  const [userName, setUserName] = useState("");
  const [systemInfo, setSystemInfo] = useState<SystemInfo>(DEFAULT_SYSTEM_INFO);
  const [settings, setSettings] = useState<LaunchSettings>(
    DEFAULT_LAUNCH_SETTINGS,
  );
  const [draftSettings, setDraftSettings] = useState<LaunchSettings>(
    DEFAULT_LAUNCH_SETTINGS,
  );
  const [scores, setScores] = useState<readonly ScoreEntry[]>([]);
  const [hasRestoredSettings, setHasRestoredSettings] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const restored = restoreSettings();
      setSettings(restored);
      setDraftSettings(restored);
      setScores(readHighScores());
      setSystemInfo(detectSystem());
      const onboarding = restoreOnboarding();
      setUserName((current) => current || onboarding.name);
      if (onboarding.complete) setView("menu");
      setHasRestoredSettings(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hasRestoredSettings) return;
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Persistence is optional; the title screen remains usable without it.
    }
  }, [hasRestoredSettings, settings]);

  const startGame = useCallback(() => {
    void primeGameAudio(settings.pace, settings.sound === "off");
    router.push(createPlayHref(settings));
  }, [router, settings]);

  const continueFromName = useCallback(() => {
    if (!userName.trim()) return;
    setView("onboarding-system");
  }, [userName]);

  const completeOnboarding = useCallback(() => {
    try {
      window.localStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({ name: userName.trim(), complete: true }),
      );
    } catch {
      // The game works without local persistence.
    }
    setView("menu");
  }, [userName]);

  const openView = useCallback(
    (action: MenuAction) => {
      if (action === "start") {
        startGame();
        return;
      }
      if (action === "scores") setScores(readHighScores());
      if (action === "options") {
        setDraftSettings(settings);
        setOptionIndex(0);
      }
      setView(action);
    },
    [settings, startGame],
  );

  const adjustOption = useCallback((index: number, direction: -1 | 1) => {
    setDraftSettings((current) => {
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
      if (view === "onboarding-name") {
        if (event.code === "Enter") {
          event.preventDefault();
          continueFromName();
        }
        return;
      }
      if (view === "onboarding-system") {
        if (event.code === "Escape" || event.code === "Backspace") {
          event.preventDefault();
          setView("onboarding-name");
        } else if (event.code === "Enter" || event.code === "Space") {
          event.preventDefault();
          setView("onboarding-guide");
        }
        return;
      }
      if (view === "onboarding-guide") {
        if (event.code === "Escape" || event.code === "Backspace") {
          event.preventDefault();
          setView("onboarding-system");
        } else if (event.code === "Enter" || event.code === "Space") {
          event.preventDefault();
          completeOnboarding();
        }
        return;
      }
      if (view === "options") {
        if (event.code === "Escape" || event.code === "Backspace") {
          event.preventDefault();
          setDraftSettings(settings);
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
        } else if (event.code === "ArrowRight" || event.code === "KeyD") {
          event.preventDefault();
          if (optionIndex < OPTION_COUNT - 1) adjustOption(optionIndex, 1);
        } else if (event.code === "Enter" || event.code === "Space") {
          event.preventDefault();
          setSettings(draftSettings);
          setView("menu");
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
  }, [adjustOption, completeOnboarding, continueFromName, draftSettings, menuIndex, openView, optionIndex, settings, view]);

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
    setDraftSettings((current) => ({ ...current, [key]: value }));
  }

  const hasSettingChanges = JSON.stringify(settings) !== JSON.stringify(draftSettings);

  const confirmSettings = () => {
    setSettings(draftSettings);
    setView("menu");
  };

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

      {view === "onboarding-name" ? (
        <TitlePanel title="your name" subtitle="welcome to shortcut hero" onboarding>
          <div className="onboarding-copy">
            <p>What should we call you?</p>
            <label className="onboarding-field">
              <span>name</span>
              <input
                autoFocus
                disabled={!hasRestoredSettings}
                maxLength={32}
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
                placeholder="Your name"
              />
            </label>
            <button
              type="button"
              className="primary-button onboarding-action"
              disabled={!hasRestoredSettings || !userName.trim()}
              onClick={continueFromName}
            >
              continue
            </button>
          </div>
        </TitlePanel>
      ) : null}

      {view === "onboarding-system" ? (
        <TitlePanel title="your system" subtitle="quick check" onboarding>
          <div className="onboarding-copy">
            <p>We detected your setup.</p>
            <dl className="system-summary">
              <div><dt>system</dt><dd>{systemInfo.operatingSystem}</dd></div>
              <div><dt>browser</dt><dd>{systemInfo.browser}</dd></div>
            </dl>
            <p className="title-panel__note">
              This prototype uses the Mac shortcut layout.
            </p>
            <button type="button" className="primary-button onboarding-action" onClick={() => setView("onboarding-guide")}>
              looks right
            </button>
          </div>
        </TitlePanel>
      ) : null}

      {view === "onboarding-guide" ? (
        <TitlePanel title="how it works" subtitle="one simple loop" onboarding>
          <ol className="onboarding-guide">
            <li><span>01</span>Read the action on the highway.</li>
            <li><span>02</span>Press its shortcut at the strike line.</li>
            <li><span>03</span>Hit on time to build a combo.</li>
          </ol>
          <button type="button" className="primary-button onboarding-action" onClick={completeOnboarding}>
            open main menu
          </button>
        </TitlePanel>
      ) : null}

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

      {view === "options" ? (
        <TitlePanel title="options" subtitle="shape the next run">
          <div className="option-list">
            <OptionRow
              label="difficulty"
              value={LABELS.difficulty[draftSettings.difficulty]}
              active={optionIndex === 0}
              onFocus={() => setOptionIndex(0)}
              onPrevious={() => updateSetting("difficulty", cycleValue(DIFFICULTIES, draftSettings.difficulty, -1))}
              onNext={() => updateSetting("difficulty", cycleValue(DIFFICULTIES, draftSettings.difficulty, 1))}
            />
            <OptionRow
              label="guidance"
              value={LABELS.guidance[draftSettings.guidance]}
              active={optionIndex === 1}
              onFocus={() => setOptionIndex(1)}
              onPrevious={() => updateSetting("guidance", cycleValue(GUIDANCE, draftSettings.guidance, -1))}
              onNext={() => updateSetting("guidance", cycleValue(GUIDANCE, draftSettings.guidance, 1))}
            />
            <OptionRow
              label="pace"
              value={LABELS.pace[draftSettings.pace]}
              active={optionIndex === 2}
              onFocus={() => setOptionIndex(2)}
              onPrevious={() => updateSetting("pace", cycleValue(PACES, draftSettings.pace, -1))}
              onNext={() => updateSetting("pace", cycleValue(PACES, draftSettings.pace, 1))}
            />
            <OptionRow
              label="session"
              value={`${draftSettings.session} seconds`}
              active={optionIndex === 3}
              onFocus={() => setOptionIndex(3)}
              onPrevious={() => updateSetting("session", cycleValue(SESSIONS, draftSettings.session, -1))}
              onNext={() => updateSetting("session", cycleValue(SESSIONS, draftSettings.session, 1))}
            />
            <OptionRow
              label="music"
              value={draftSettings.sound === "on" ? "original score on" : "music off"}
              active={optionIndex === 4}
              onFocus={() => setOptionIndex(4)}
              onPrevious={() => updateSetting("sound", cycleValue(SOUND, draftSettings.sound, -1))}
              onNext={() => updateSetting("sound", cycleValue(SOUND, draftSettings.sound, 1))}
            />
            <OptionRow
              label="effects"
              value={LABELS.effects[draftSettings.effects]}
              active={optionIndex === 5}
              onFocus={() => setOptionIndex(5)}
              onPrevious={() => updateSetting("effects", cycleValue(EFFECTS, draftSettings.effects, -1))}
              onNext={() => updateSetting("effects", cycleValue(EFFECTS, draftSettings.effects, 1))}
            />
            <button
              type="button"
              className={`option-confirm${optionIndex === 6 ? " is-active" : ""}`}
              aria-current={optionIndex === 6 ? "true" : undefined}
              onFocus={() => setOptionIndex(6)}
              onClick={confirmSettings}
            >
              {hasSettingChanges ? "confirm changes" : "confirm settings"}
            </button>
          </div>
          <BackButton onClick={() => {
            setDraftSettings(settings);
            setView("menu");
          }} />
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
              ? "↑ ↓ option · ← → change · enter confirm · esc cancel"
              : view.startsWith("onboarding")
                ? view === "onboarding-name"
                  ? "type your name · enter continue"
                  : "enter continue · esc back"
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
  onboarding = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onboarding?: boolean;
}) {
  return (
    <section
      className={`title-panel${title === "options" ? " title-panel--options" : ""}${onboarding ? " title-panel--onboarding" : ""}`}
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
