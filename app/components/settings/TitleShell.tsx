import type { ReactNode } from "react";

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
    <main className="title-screen">
      <TitleWorld />
      <header className="title-brand">
        <span className="title-brand__name">shortcut hero</span>
        <span className="title-brand__edition">
          {track.editionLabel} · {track.platform}
        </span>
      </header>

      {children}

      <footer className="title-footer">
        <span>{summary}</span>
        <span>{footerInstructions(view)}</span>
      </footer>
    </main>
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
    return "↑ ↓ option · ← → change · enter confirm · esc cancel";
  }
  if (view === "onboarding-name") {
    return "type your name · enter continue";
  }
  if (view.startsWith("onboarding")) return "enter continue · esc back";
  if (view === "compatibility") return "choose an action · esc back";
  return "enter or esc back";
}

export function TitlePanel({
  title,
  subtitle,
  children,
  onboarding = false,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
  readonly onboarding?: boolean;
}) {
  return (
    <section
      className={`title-panel${
        title === "options" ? " title-panel--options" : ""
      }${onboarding ? " title-panel--onboarding" : ""}`}
      aria-labelledby="title-panel-heading"
    >
      <p className="title-panel__subtitle">{subtitle}</p>
      <h1 id="title-panel-heading">{title}</h1>
      {children}
    </section>
  );
}

export function BackButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <button type="button" className="title-panel__back" onClick={onClick}>
      <span aria-hidden="true">←</span> back
    </button>
  );
}
