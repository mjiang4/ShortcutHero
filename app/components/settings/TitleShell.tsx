import { useState, type ReactNode } from "react";
import Link from "next/link";

import { TOOL_CATALOG } from "../../tools/registry";
import type { ShortcutTrack } from "../../tools/types";
import type { ScreenView } from "./title-types";

export function TitleShell({
  track,
  view,
  summary,
  children,
}: {
  readonly track: ShortcutTrack;
  readonly view: ScreenView;
  readonly summary: string;
  readonly children: ReactNode;
}) {
  return (
    <main className={`title-screen title-screen--flow${view === "menu" ? " title-screen--home" : " title-screen--options"}`}>
      <TitleWorld />
      <header className="title-brand">
        <div className="title-brand__identity">
          <div className="title-brand__wordmark">
            <span className="title-brand__name">shortcut hero</span>
            {view === "menu" ? <span className="title-brand__description">learn keyboard shortcuts</span> : null}
          </div>
          {view === "menu" ? <SupportedApps /> : null}
        </div>
        {view !== "menu" && view !== "setup" ? (
          <span className="title-brand__edition">
            Current app: <strong>{track.name}</strong>
            <span className="title-brand__platform"> · {track.platform}</span>
          </span>
        ) : null}
      </header>

      {children}

      <footer className="title-footer">
        <span>{view === "setup" || view === "menu" ? null : summary}</span>
        <span className="title-footer__actions">
          <span className="title-footer__instructions">
            {footerInstructions(view)}
          </span>
          <Link href="/privacy">privacy</Link>
          <Link href="/terms">terms</Link>
        </span>
      </footer>
    </main>
  );
}

function SupportedApps() {
  const [index, setIndex] = useState(0);
  const names = TOOL_CATALOG.filter((app) => app.status === "available").map((app) => app.name);
  if (names.length === 0) return null;

  return (
    <h1
      className="title-apps"
      aria-label={`Learn keyboard shortcuts for ${names.join(", ")}.`}
    >
      <span className="title-apps__motion" aria-hidden="true">
        Learn{" "}
        <span className="title-apps__names">
          <span className="title-apps__current"
            onAnimationIteration={() => setIndex((current) => (current + 1) % names.length)}>
            {names[index % names.length]}
          </span>
        </span>
        {" "}shortcuts
      </span>
      <span className="title-apps__static" aria-hidden="true">Learn shortcuts for {names.join(" · ")}</span>
    </h1>
  );
}

function TitleWorld() {
  return (
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
  );
}

function footerInstructions(view: ScreenView): string {
  if (view === "menu") return "↑ ↓ select · enter confirm";
  if (view === "options") {
    return "↑ ↓ option · ← → change · esc back";
  }
  if (view === "setup") return "↑ ↓ select · ← → change · enter play · esc back";
  if (view === "compatibility") return "choose an action · esc back";
  return "enter or esc back";
}

export function TitlePanel({
  title,
  subtitle,
  children,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
}) {
  return (
    <section
      className={`title-panel${
        title === "options" || title === "game setup" ? " title-panel--options" : ""
      }`}
      aria-labelledby="title-panel-heading"
    >
      {subtitle ? <p className="title-panel__subtitle">{subtitle}</p> : null}
      <h1 id="title-panel-heading">{title}</h1>
      {children}
    </section>
  );
}

export function BackButton({ onClick, onFocus }: {
  readonly onClick: () => void;
  readonly onFocus?: () => void;
}) {
  return (
    <button type="button" className="title-panel__back" onClick={onClick} onFocus={onFocus}>
      <span aria-hidden="true">←</span> back
    </button>
  );
}
