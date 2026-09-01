import {
  DIFFICULTIES,
  DIFFICULTY_DESCRIPTIONS,
  EFFECTS,
  HINT_DESCRIPTIONS,
  HINT_MODES,
  LABELS,
  PACES,
  SOUND,
  cycleValue,
} from "./title-config";
import type { LaunchSettings } from "./settings";
import { LESSON_SIZE } from "../../game/curriculum";
import { deckForMode, getToolTrack } from "../../tools";
import { BackButton, TitlePanel } from "./TitleShell";

export function OptionsView({
  settings,
  selectedIndex,
  onSelect,
  onChange,
  onBack,
}: {
  readonly settings: LaunchSettings;
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
  readonly onChange: (settings: LaunchSettings) => void;
  readonly onBack: () => void;
}) {
  const track = getToolTrack(settings.tool);
  const catalog = deckForMode(track, settings.difficulty);
  const inputKinds = new Set(catalog.map(shortcut => shortcut.input.kind));
  const difficultyDescription = inputKinds.size === 1 ? "single-key shortcuts in this pack"
    : !inputKinds.has("sequence") ? "single keys + Shift chords"
      : DIFFICULTY_DESCRIPTIONS[settings.difficulty];

  return (
    <TitlePanel title="options" subtitle="shape the next run">
      <p className="option-curriculum">
        {Math.min(LESSON_SIZE, catalog.length)} shortcuts per lesson · {catalog.length} available
        <small>Changes save automatically. Hints stay fixed during a round.</small>
      </p>
      <div className="option-list">
        <OptionRow
          label="difficulty"
          value={LABELS.difficulty[settings.difficulty]}
          description={difficultyDescription}
          active={selectedIndex === 0}
          onFocus={() => onSelect(0)}
          onPrevious={() =>
            onChange({
              ...settings,
              difficulty: cycleValue(DIFFICULTIES, settings.difficulty, -1),
            })
          }
          onNext={() =>
            onChange({
              ...settings,
              difficulty: cycleValue(DIFFICULTIES, settings.difficulty, 1),
            })
          }
        />
        <OptionRow
          label="hints"
          value={LABELS.hints[settings.hints]}
          description={HINT_DESCRIPTIONS[settings.hints]}
          active={selectedIndex === 1}
          onFocus={() => onSelect(1)}
          onPrevious={() =>
            onChange({
              ...settings,
              hints: cycleValue(HINT_MODES, settings.hints, -1),
            })
          }
          onNext={() =>
            onChange({
              ...settings,
              hints: cycleValue(HINT_MODES, settings.hints, 1),
            })
          }
        />
        <OptionRow
          label="speed"
          value={LABELS.pace[settings.pace]}
          active={selectedIndex === 2}
          onFocus={() => onSelect(2)}
          onPrevious={() =>
            onChange({
              ...settings,
              pace: cycleValue(PACES, settings.pace, -1),
            })
          }
          onNext={() =>
            onChange({
              ...settings,
              pace: cycleValue(PACES, settings.pace, 1),
            })
          }
        />
        <OptionRow
          label="music"
          value={settings.sound === "on" ? "original score on" : "music off"}
          active={selectedIndex === 3}
          onFocus={() => onSelect(3)}
          onPrevious={() =>
            onChange({
              ...settings,
              sound: cycleValue(SOUND, settings.sound, -1),
            })
          }
          onNext={() =>
            onChange({
              ...settings,
              sound: cycleValue(SOUND, settings.sound, 1),
            })
          }
        />
        <OptionRow
          label="effects"
          value={LABELS.effects[settings.effects]}
          active={selectedIndex === 4}
          onFocus={() => onSelect(4)}
          onPrevious={() =>
            onChange({
              ...settings,
              effects: cycleValue(EFFECTS, settings.effects, -1),
            })
          }
          onNext={() =>
            onChange({
              ...settings,
              effects: cycleValue(EFFECTS, settings.effects, 1),
            })
          }
        />
      </div>
      <BackButton onClick={onBack} />
    </TitlePanel>
  );
}

export function OptionRow({
  label,
  value,
  description,
  active,
  onFocus,
  onPrevious,
  onNext,
}: {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
  readonly active: boolean;
  readonly onFocus: () => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
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
        <span className="option-row__value">
          <strong>{value}</strong>
          {description ? <small>{description}</small> : null}
        </span>
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
