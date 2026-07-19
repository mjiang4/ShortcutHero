import {
  DIFFICULTIES,
  EFFECTS,
  GUIDANCE,
  LABELS,
  PACES,
  SESSIONS,
  SOUND,
  cycleValue,
} from "./title-config";
import type { LaunchSettings } from "./settings";
import { BackButton, TitlePanel } from "./TitleShell";

export function OptionsView({
  settings,
  draft,
  selectedIndex,
  onSelect,
  onChange,
  onConfirm,
  onCancel,
}: {
  readonly settings: LaunchSettings;
  readonly draft: LaunchSettings;
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
  readonly onChange: (settings: LaunchSettings) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(draft);

  return (
    <TitlePanel title="options" subtitle="shape the next run">
      <div className="option-list">
        <OptionRow
          label="difficulty"
          value={LABELS.difficulty[draft.difficulty]}
          active={selectedIndex === 0}
          onFocus={() => onSelect(0)}
          onPrevious={() =>
            onChange({
              ...draft,
              difficulty: cycleValue(DIFFICULTIES, draft.difficulty, -1),
            })
          }
          onNext={() =>
            onChange({
              ...draft,
              difficulty: cycleValue(DIFFICULTIES, draft.difficulty, 1),
            })
          }
        />
        <OptionRow
          label="guidance"
          value={LABELS.guidance[draft.guidance]}
          active={selectedIndex === 1}
          onFocus={() => onSelect(1)}
          onPrevious={() =>
            onChange({
              ...draft,
              guidance: cycleValue(GUIDANCE, draft.guidance, -1),
            })
          }
          onNext={() =>
            onChange({
              ...draft,
              guidance: cycleValue(GUIDANCE, draft.guidance, 1),
            })
          }
        />
        <OptionRow
          label="pace"
          value={LABELS.pace[draft.pace]}
          active={selectedIndex === 2}
          onFocus={() => onSelect(2)}
          onPrevious={() =>
            onChange({
              ...draft,
              pace: cycleValue(PACES, draft.pace, -1),
            })
          }
          onNext={() =>
            onChange({
              ...draft,
              pace: cycleValue(PACES, draft.pace, 1),
            })
          }
        />
        <OptionRow
          label="session"
          value={`${draft.session} seconds`}
          active={selectedIndex === 3}
          onFocus={() => onSelect(3)}
          onPrevious={() =>
            onChange({
              ...draft,
              session: cycleValue(SESSIONS, draft.session, -1),
            })
          }
          onNext={() =>
            onChange({
              ...draft,
              session: cycleValue(SESSIONS, draft.session, 1),
            })
          }
        />
        <OptionRow
          label="music"
          value={draft.sound === "on" ? "original score on" : "music off"}
          active={selectedIndex === 4}
          onFocus={() => onSelect(4)}
          onPrevious={() =>
            onChange({
              ...draft,
              sound: cycleValue(SOUND, draft.sound, -1),
            })
          }
          onNext={() =>
            onChange({
              ...draft,
              sound: cycleValue(SOUND, draft.sound, 1),
            })
          }
        />
        <OptionRow
          label="effects"
          value={LABELS.effects[draft.effects]}
          active={selectedIndex === 5}
          onFocus={() => onSelect(5)}
          onPrevious={() =>
            onChange({
              ...draft,
              effects: cycleValue(EFFECTS, draft.effects, -1),
            })
          }
          onNext={() =>
            onChange({
              ...draft,
              effects: cycleValue(EFFECTS, draft.effects, 1),
            })
          }
        />
        <button
          type="button"
          className={`option-confirm${
            selectedIndex === 6 ? " is-active" : ""
          }`}
          aria-current={selectedIndex === 6 ? "true" : undefined}
          onFocus={() => onSelect(6)}
          onClick={onConfirm}
        >
          {hasChanges ? "confirm changes" : "confirm settings"}
        </button>
      </div>
      <BackButton onClick={onCancel} />
    </TitlePanel>
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
  readonly label: string;
  readonly value: string;
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
