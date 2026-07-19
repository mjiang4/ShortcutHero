type PauseOverlayProps = {
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onReturnToTitle: () => void;
};

export function PauseOverlay({
  selectedIndex,
  onSelect,
  onResume,
  onRestart,
  onReturnToTitle,
}: PauseOverlayProps) {
  return (
    <div className="pause-overlay">
      <div className="pause-card">
        <h2>Paused</h2>
        <p>Resume, restart, or return to the title screen.</p>
        <div className="pause-actions">
          <MenuButton
            primary
            selected={selectedIndex === 0}
            onSelect={() => onSelect(0)}
            onClick={onResume}
          >
            Resume
          </MenuButton>
          <MenuButton
            selected={selectedIndex === 1}
            onSelect={() => onSelect(1)}
            onClick={onRestart}
          >
            Restart
          </MenuButton>
          <MenuButton
            selected={selectedIndex === 2}
            onSelect={() => onSelect(2)}
            onClick={onReturnToTitle}
          >
            Title
          </MenuButton>
        </div>
      </div>
    </div>
  );
}

function MenuButton({
  children,
  primary = false,
  selected,
  onSelect,
  onClick,
}: {
  readonly children: string;
  readonly primary?: boolean;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${primary ? "primary" : "secondary"}-button${
        selected ? " is-selected" : ""
      }`}
      aria-current={selected ? "true" : undefined}
      onMouseEnter={onSelect}
      onFocus={onSelect}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
