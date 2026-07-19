import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./legal-page.module.css";

export function LegalPage({
  eyebrow,
  title,
  children,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <article className={styles.shell}>
        <Link className={styles.back} href="/">
          ← shortcut hero
        </Link>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>Effective July 19, 2026</p>
        {children}
      </article>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export { styles as legalStyles };
