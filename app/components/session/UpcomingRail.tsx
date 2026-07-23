"use client";

type UpcomingRailProps = {
  readonly items: readonly {
    readonly id: string;
    readonly action: string;
    readonly shortcut?: string;
    readonly active?: boolean;
  }[];
  readonly showShortcuts: boolean;
};

export function UpcomingRail({ items, showShortcuts }: UpcomingRailProps) {
  if (items.length === 0) return null;
  return (
    <aside className="upcoming-rail" aria-label="Upcoming shortcuts">
      <p className="upcoming-rail__title">Coming up</p>
      <ol>
        {items.map((item, index) => (
          <li
            key={item.id}
            className={item.active ? "is-active" : undefined}
            style={{ opacity: Math.max(0.45, 1 - index * 0.12) }}
          >
            <span className="upcoming-rail__action">{item.action}</span>
            {showShortcuts && item.shortcut ? (
              <span className="upcoming-rail__keys">{item.shortcut}</span>
            ) : null}
          </li>
        ))}
      </ol>
    </aside>
  );
}
