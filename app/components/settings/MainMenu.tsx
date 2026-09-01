import { Fragment } from "react";

import { MENU_ITEMS } from "./title-config";
import type { MenuAction } from "./title-types";

export function MainMenu({
  ready,
  summary,
  selectedIndex,
  onSelect,
  onOpen,
  onPreviewFirstVisit,
  previewingFirstVisit = false,
}: {
  readonly ready: boolean;
  readonly summary: string;
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
  readonly onOpen: (action: MenuAction) => void;
  readonly onPreviewFirstVisit?: () => void;
  readonly previewingFirstVisit?: boolean;
}) {
  return (
    <section className="title-menu" aria-label="Main menu">
      <nav className="title-menu__items">
        {MENU_ITEMS.map((item, index) => (
          <Fragment key={item.action}>
            <button
              type="button"
              className={`title-menu__item${
                index === selectedIndex ? " is-active" : ""
              }${item.action === "start" ? " title-menu__item--primary" : ""}`}
              aria-current={index === selectedIndex ? "true" : undefined}
              disabled={item.action === "start" && !ready}
              onMouseEnter={() => onSelect(index)}
              onFocus={() => onSelect(index)}
              onClick={() => onOpen(item.action)}
            >
              <span className="title-menu__cursor" aria-hidden="true">
                ›
              </span>
              {item.label}
            </button>
            {item.action === "start" ? <p className="title-menu__summary">{summary}</p> : null}
          </Fragment>
        ))}
      </nav>
      {onPreviewFirstVisit ? (
        <button type="button" className="first-visit-preview" disabled={!ready}
          onKeyDown={(event) => event.stopPropagation()} onClick={onPreviewFirstVisit}>
          {previewingFirstVisit ? "Exit first-visit preview" : "Preview first visit"}
        </button>
      ) : null}
    </section>
  );
}
