import type { CSSProperties } from "react";
import type { HintMode } from "../../game/types";

export type KeyboardFeedbackTone = "hit" | "miss" | "wrong";

export interface KeyboardInstrumentProps {
  readonly pressedKeys: readonly string[];
  readonly hintKeys: readonly string[];
  readonly feedbackKeys?: readonly string[];
  readonly feedbackTone?: KeyboardFeedbackTone | null;
  readonly status: string;
  readonly guidance: HintMode;
  readonly availableKeys?: readonly string[];
}

type KeySpec = {
  readonly id: string;
  readonly label: string;
  readonly flex?: number;
};

const KEY_ROWS: readonly (readonly KeySpec[])[] = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map((key) => ({
    id: key,
    label: key,
  })),
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"].map((key) => ({
    id: key,
    label: key,
  })),
  [
    { id: "SHIFT", label: "⇧ shift", flex: 1.75 },
    ...["Z", "X", "C", "V", "B", "N", "M"].map((key) => ({
      id: key,
      label: key,
    })),
  ],
] as const;

const NAVIGATION_KEYS: readonly KeySpec[] = [
  { id: "TAB", label: "Tab" },
  { id: "BACKSPACE", label: "Delete", flex: 1.5 },
  { id: "ENTER", label: "Enter", flex: 1.5 },
  { id: "SPACE", label: "Space", flex: 2 },
  { id: "ARROWLEFT", label: "←" },
  { id: "ARROWUP", label: "↑" },
  { id: "ARROWDOWN", label: "↓" },
  { id: "ARROWRIGHT", label: "→" },
];

export function normalizeInstrumentKey(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (
    normalized === "SHIFT" ||
    normalized === "SHIFTLEFT" ||
    normalized === "SHIFTRIGHT" ||
    normalized === "⇧"
  ) {
    return "SHIFT";
  }
  return normalized.startsWith("KEY") && normalized.length === 4
    ? normalized.slice(3)
    : normalized;
}

export function KeyboardInstrument({
  pressedKeys,
  hintKeys,
  feedbackKeys = [],
  feedbackTone = null,
  status,
  guidance,
  availableKeys = [],
}: KeyboardInstrumentProps) {
  const pressed = new Set(pressedKeys.map(normalizeInstrumentKey));
  const hints = new Set(hintKeys.map(normalizeInstrumentKey));
  const feedback = new Set(feedbackKeys.map(normalizeInstrumentKey));
  const available = new Set(availableKeys.map(normalizeInstrumentKey));
  const navigation = NAVIGATION_KEYS.filter(key => available.has(key.id));
  const rows = navigation.length ? [...KEY_ROWS, navigation] : KEY_ROWS;

  return (
    <section
      className={`keyboard-instrument is-${guidance}${navigation.length ? " is-extended" : ""}`}
      aria-label="Shortcut keyboard"
    >
      <header className="keyboard-instrument__header">
        <span>keyboard</span>
        <strong>{status}</strong>
        <span>{guidance === "off" ? "hints off" : guidance === "near-line" ? "late hints" : "hints on"}</span>
      </header>
      <div className="keyboard-instrument__deck" aria-hidden="true">
        {rows.map((row, rowIndex) => (
          <div className="keyboard-instrument__row" key={rowIndex}>
            {row.map((key) => {
              const isPressed = pressed.has(key.id);
              const isHinted = hints.has(key.id);
              const hasFeedback = feedback.has(key.id);
              const classNames = [
                "keyboard-key",
                isPressed ? "is-pressed" : "",
                isHinted ? "is-hinted" : "",
                hasFeedback && feedbackTone ? `is-${feedbackTone}` : "",
              ]
                .filter(Boolean)
                .join(" ");
              const style = {
                "--key-flex": key.flex ?? 1,
              } as CSSProperties;

              return (
                <span className={classNames} style={style} key={key.id}>
                  {key.label}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
