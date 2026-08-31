"use client";

import type { ReactNode } from "react";

import styles from "./system-screen.module.css";

export function SystemScreen({
  eyebrow,
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel = "return home",
  secondaryHref = "/",
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly message: ReactNode;
  readonly primaryLabel?: string;
  readonly onPrimary?: () => void;
  readonly secondaryLabel?: string;
  readonly secondaryHref?: string;
}) {
  return (
    <main className={styles.screen}>
      <div className={styles.glow} aria-hidden="true" />
      <section className={styles.card} aria-labelledby="system-screen-title">
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 id="system-screen-title">{title}</h1>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          {primaryLabel && onPrimary ? (
            <button type="button" onClick={onPrimary}>
              {primaryLabel}
            </button>
          ) : null}
          <a href={secondaryHref}>{secondaryLabel}</a>
        </div>
      </section>
    </main>
  );
}

export function GameLoadingScreen() {
  return (
    <main className={styles.screen} aria-busy="true">
      <div className={styles.glow} aria-hidden="true" />
      <section className={styles.loading} aria-live="polite">
        <span className={styles.pulse} aria-hidden="true" />
        <p>preparing the highway</p>
      </section>
    </main>
  );
}
