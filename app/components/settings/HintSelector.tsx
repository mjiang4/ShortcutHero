import { useId } from "react";
import type { HintMode } from "../../game/types";
import { HINT_DESCRIPTIONS, HINT_MODES, LABELS } from "./title-config";

export function HintSelector({ value, onChange, onFocus, active = false, autoFocus = false }: {
  readonly value: HintMode;
  readonly onChange: (value: HintMode) => void;
  readonly onFocus?: () => void;
  readonly active?: boolean;
  readonly autoFocus?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className={`hint-selector${active ? " is-active" : ""}`} onFocus={onFocus}
      onKeyDown={(event) => {
        // Native radio arrow navigation owns these keys when focused.
        if (event.key.startsWith("Arrow") || event.key === " ") event.stopPropagation();
      }}>
      <legend>hints</legend>
      <div className="hint-selector__choices">
        {HINT_MODES.map((mode) => (
          <label key={mode} className={`hint-choice${value === mode ? " is-selected" : ""}`}>
            <input type="radio" name={name} value={mode} checked={value === mode} autoFocus={autoFocus && value === mode}
              onChange={() => onChange(mode)} />
            <strong>{LABELS.hints[mode]}</strong>
            <span>{HINT_DESCRIPTIONS[mode]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
