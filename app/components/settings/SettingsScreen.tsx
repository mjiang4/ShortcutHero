"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { primeGameAudio } from "../../audio/use-game-audio";
import {
  createPlayHref,
  DEFAULT_LAUNCH_SETTINGS,
  type EffectsMode,
  type GameDifficulty,
  type GuidanceMode,
  type LaunchSettings,
  type SessionLength,
  type SoundMode,
  type TempoPreset,
} from "./settings";

const DIFFICULTY_OPTIONS: readonly {
  value: GameDifficulty;
  level: string;
  skill: string;
  description: string;
  keys: readonly string[];
}[] = [
  {
    value: "easy",
    level: "Novice",
    skill: "Single key",
    description: "Build recall one action at a time.",
    keys: ["C"],
  },
  {
    value: "medium",
    level: "Medium",
    skill: "Sequence",
    description: "Play two keys in order.",
    keys: ["G", "I"],
  },
  {
    value: "hard",
    level: "Hard",
    skill: "Chord",
    description: "Strike keys together.",
    keys: ["⇧", "E"],
  },
];

const GUIDANCE_OPTIONS: readonly {
  value: GuidanceMode;
  label: string;
  description: string;
}[] = [
  {
    value: "novice",
    label: "Learn",
    description: "Show the shortcut and illuminate its keys.",
  },
  {
    value: "pro",
    label: "Recall",
    description: "Show the action only. Supply the shortcut from memory.",
  },
];

const PACE_OPTIONS: readonly {
  value: TempoPreset;
  label: string;
  bpm: number;
}[] = [
  { value: "relaxed", label: "Focus", bpm: 140 },
  { value: "standard", label: "Fast", bpm: 180 },
  { value: "turbo", label: "Turbo", bpm: 220 },
];

const SESSION_OPTIONS: readonly SessionLength[] = [30, 45, 60];

const SOUND_OPTIONS: readonly { value: SoundMode; label: string }[] = [
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
];

const EFFECTS_OPTIONS: readonly {
  value: EffectsMode;
  label: string;
  description: string;
}[] = [
  { value: "full", label: "Full", description: "Maximum impact" },
  { value: "system", label: "System", description: "Match motion preference" },
  { value: "reduced", label: "Reduced", description: "Minimal motion" },
];

function ChoiceKeys({ keys }: { readonly keys: readonly string[] }) {
  return (
    <span className="settings-choice__keys" aria-hidden="true">
      {keys.map((key, index) => (
        <span className="settings-choice__key-group" key={`${key}-${index}`}>
          {index > 0 ? (
            <span className="settings-choice__key-joiner">
              {keys.length === 2 && keys[0] === "⇧" ? "+" : "→"}
            </span>
          ) : null}
          <kbd className="settings-choice__key">{key}</kbd>
        </span>
      ))}
    </span>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<LaunchSettings>(
    DEFAULT_LAUNCH_SETTINGS,
  );

  function updateSetting<Key extends keyof LaunchSettings>(
    key: Key,
    value: LaunchSettings[Key],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function startGame() {
    // Prime Web Audio synchronously inside the user gesture before route teardown.
    void primeGameAudio(settings.pace, settings.sound === "off");
    router.push(createPlayHref(settings));
  }

  return (
    <main className="settings-screen">
      <div className="settings-screen__frame">
        <header className="settings-header">
          <div className="settings-brand" aria-label="Shortcut Hero">
            <span className="settings-brand__mark" aria-hidden="true">SH</span>
            <span className="settings-brand__name">Shortcut Hero</span>
          </div>
          <div className="settings-header__status" aria-label="Platform macOS">
            <span className="settings-header__status-light" aria-hidden="true" />
            macOS training deck
          </div>
        </header>

        <section className="settings-intro" aria-labelledby="settings-title">
          <p className="settings-intro__eyebrow">Linear shortcut trainer</p>
          <h1 className="settings-intro__title" id="settings-title">
            Set the run.
            <br />
            Build the reflex.
          </h1>
          <p className="settings-intro__copy">
            Turn keyboard shortcuts into muscle memory on a rhythm-driven action highway.
          </p>
        </section>

        <form className="settings-console">
          <fieldset className="settings-group settings-group--difficulty">
            <legend className="settings-group__legend">
              <span className="settings-group__index">01</span>
              <span>Difficulty</span>
            </legend>
            <div className="settings-choice-grid settings-choice-grid--difficulty">
              {DIFFICULTY_OPTIONS.map((option) => (
                <label className="settings-choice settings-choice--difficulty" key={option.value}>
                  <input
                    className="settings-choice__input"
                    type="radio"
                    name="difficulty"
                    value={option.value}
                    checked={settings.difficulty === option.value}
                    onChange={() => updateSetting("difficulty", option.value)}
                  />
                  <span className="settings-choice__surface">
                    <span className="settings-choice__topline">
                      <span className="settings-choice__title">{option.level}</span>
                      <span className="settings-choice__skill">{option.skill}</span>
                    </span>
                    <span className="settings-choice__description">{option.description}</span>
                    <ChoiceKeys keys={option.keys} />
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="settings-console__secondary-grid">
            <fieldset className="settings-group">
              <legend className="settings-group__legend">
                <span className="settings-group__index">02</span>
                <span>Guidance</span>
              </legend>
              <div className="settings-choice-grid settings-choice-grid--split">
                {GUIDANCE_OPTIONS.map((option) => (
                  <label className="settings-choice settings-choice--compact" key={option.value}>
                    <input
                      className="settings-choice__input"
                      type="radio"
                      name="guidance"
                      value={option.value}
                      checked={settings.guidance === option.value}
                      onChange={() => updateSetting("guidance", option.value)}
                    />
                    <span className="settings-choice__surface">
                      <span className="settings-choice__title">{option.label}</span>
                      <span className="settings-choice__description">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="settings-group">
              <legend className="settings-group__legend">
                <span className="settings-group__index">03</span>
                <span>Pace</span>
              </legend>
              <div className="settings-choice-grid settings-choice-grid--three">
                {PACE_OPTIONS.map((option) => (
                  <label className="settings-choice settings-choice--compact" key={option.value}>
                    <input
                      className="settings-choice__input"
                      type="radio"
                      name="pace"
                      value={option.value}
                      checked={settings.pace === option.value}
                      onChange={() => updateSetting("pace", option.value)}
                    />
                    <span className="settings-choice__surface">
                      <span className="settings-choice__title">{option.label}</span>
                      <span className="settings-choice__metric">{option.bpm} BPM</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="settings-group">
              <legend className="settings-group__legend">
                <span className="settings-group__index">04</span>
                <span>Session</span>
              </legend>
              <div className="settings-choice-grid settings-choice-grid--three">
                {SESSION_OPTIONS.map((duration) => (
                  <label className="settings-choice settings-choice--compact" key={duration}>
                    <input
                      className="settings-choice__input"
                      type="radio"
                      name="session"
                      value={duration}
                      checked={settings.session === duration}
                      onChange={() => updateSetting("session", duration)}
                    />
                    <span className="settings-choice__surface">
                      <span className="settings-choice__title">{duration}</span>
                      <span className="settings-choice__metric">seconds</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="settings-group">
              <legend className="settings-group__legend">
                <span className="settings-group__index">05</span>
                <span>Sound</span>
              </legend>
              <div className="settings-choice-grid settings-choice-grid--split">
                {SOUND_OPTIONS.map((option) => (
                  <label className="settings-choice settings-choice--compact" key={option.value}>
                    <input
                      className="settings-choice__input"
                      type="radio"
                      name="sound"
                      value={option.value}
                      checked={settings.sound === option.value}
                      onChange={() => updateSetting("sound", option.value)}
                    />
                    <span className="settings-choice__surface">
                      <span className="settings-choice__title">{option.label}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="settings-group settings-group--effects">
              <legend className="settings-group__legend">
                <span className="settings-group__index">06</span>
                <span>Effects</span>
              </legend>
              <div className="settings-choice-grid settings-choice-grid--three">
                {EFFECTS_OPTIONS.map((option) => (
                  <label className="settings-choice settings-choice--compact" key={option.value}>
                    <input
                      className="settings-choice__input"
                      type="radio"
                      name="effects"
                      value={option.value}
                      checked={settings.effects === option.value}
                      onChange={() => updateSetting("effects", option.value)}
                    />
                    <span className="settings-choice__surface">
                      <span className="settings-choice__title">{option.label}</span>
                      <span className="settings-choice__metric">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <footer className="settings-launch">
            <p className="settings-launch__summary" aria-live="polite">
              <span>{DIFFICULTY_OPTIONS.find((option) => option.value === settings.difficulty)?.level}</span>
              <span aria-hidden="true"> / </span>
              <span>{GUIDANCE_OPTIONS.find((option) => option.value === settings.guidance)?.label}</span>
              <span aria-hidden="true"> / </span>
              <span>{PACE_OPTIONS.find((option) => option.value === settings.pace)?.bpm} BPM</span>
              <span aria-hidden="true"> / </span>
              <span>{settings.session} SEC</span>
            </p>
            <button
              className="settings-launch__button"
              type="button"
              onClick={startGame}
            >
              <span>New game</span>
              <span className="settings-launch__button-icon" aria-hidden="true">↗</span>
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}
