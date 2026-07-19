import type { ShortcutTrack } from "../../tools/types";
import { MENU_ITEMS } from "./title-config";
import type { MenuAction } from "./title-types";

export function MainMenu({
  track,
  selectedIndex,
  onSelect,
  onOpen,
}: {
  readonly track: ShortcutTrack;
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
  readonly onOpen: (action: MenuAction) => void;
}) {
  return (
    <section className="title-menu" aria-label="Main menu">
      <p className="title-menu__prelude">learn {track.name} through play</p>
      <p className="title-menu__description">
        Build real {track.name} shortcut muscle memory on a rhythm-game highway.
      </p>
      <nav className="title-menu__items">
        {MENU_ITEMS.map((item, index) => (
          <button
            type="button"
            className={`title-menu__item${
              index === selectedIndex ? " is-active" : ""
            }`}
            key={item.action}
            aria-current={index === selectedIndex ? "true" : undefined}
            onMouseEnter={() => onSelect(index)}
            onFocus={() => onSelect(index)}
            onClick={() => onOpen(item.action)}
          >
            <span className="title-menu__cursor" aria-hidden="true">
              ›
            </span>
            {item.label}
          </button>
        ))}
      </nav>
    </section>
  );
}
