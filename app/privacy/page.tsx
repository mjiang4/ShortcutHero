import type { Metadata } from "next";

import {
  LegalPage,
  LegalSection,
} from "../components/legal/LegalPage";
import { DeleteDataButton } from "./DeleteDataButton";

export const metadata: Metadata = { title: "Privacy — Shortcut Hero" };

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="shortcut hero" title="privacy">
      <LegalSection title="What stays on your device">
        <p>
          Your name, game settings, and local high scores stay in this browser.
          Shortcut Hero never sends your name to analytics, and only stores it
          on the server when you choose “Post to public board” on a results screen.
        </p>
      </LegalSection>
      <LegalSection title="Public board">
        <p>
          Posting a score publishes the name you entered, the score, and the
          game settings for that board. Your anonymous visitor ID and hashed
          deletion secret are stored with it so that you can remove it below.
          Public board entries expire after 90 days.
        </p>
      </LegalSection>
      <LegalSection title="What the service stores">
        <ul>
          <li>An anonymous random visitor ID and a hashed deletion secret.</li>
          <li>Round scores, timing totals, settings, and shortcut IDs.</li>
          <li>Aggregate shortcut mastery and anonymous referral conversion.</li>
          <li>Typed product events and sanitized error type, route, and release.</li>
        </ul>
      </LegalSection>
      <LegalSection title="What is never collected">
        <p>
          No email, raw keystrokes, entered shortcut sequence, action text, or
          session replay is collected. Error reports exclude messages and
          component data that could contain user input.
        </p>
      </LegalSection>
      <LegalSection title="Retention">
        <p>
          Raw round summaries expire after 90 days. Aggregate mastery, referral
          records, and product analytics expire after 12 months. Sanitized error
          reports expire after 30 days.
        </p>
      </LegalSection>
      <LegalSection title="Delete saved progress">
        <p>
          This browser holds the private key needed to delete its anonymous
          server progress. Deletion also clears Shortcut Hero data stored on this
          device. Anonymous product events remain until their retention period
          ends.
        </p>
        <DeleteDataButton />
      </LegalSection>
      <LegalSection title="Questions">
        <p>
          Open an issue in the{" "}
          <a
            href="https://github.com/mjiang4/ShortcutHero/issues"
            rel="noreferrer"
            target="_blank"
          >
            public project repository
          </a>
          . Do not include personal or sensitive information.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
