import type { Metadata } from "next";

import { LegalPage, LegalSection } from "../components/legal/LegalPage";

export const metadata: Metadata = { title: "Terms — Shortcut Hero" };

export default function TermsPage() {
  return (
    <LegalPage eyebrow="shortcut hero" title="terms">
      <LegalSection title="Use of the game">
        <p>
          Shortcut Hero is an experimental educational game. You may use it for
          personal learning and share challenge links with others. Do not abuse
          the service, automate requests, or interfere with other players.
        </p>
      </LegalSection>
      <LegalSection title="No account or purchase">
        <p>
          Launch play is anonymous, free, and requires no account. Local scores
          and anonymous progress may be lost when browser data is cleared or the
          service changes.
        </p>
      </LegalSection>
      <LegalSection title="Third-party products">
        <p>
          Linear and other product names belong to their respective owners.
          Shortcut Hero is an independent project and is not endorsed by or
          affiliated with those companies.
        </p>
      </LegalSection>
      <LegalSection title="Availability and results">
        <p>
          The game is provided as-is without a promise of uninterrupted service,
          perfect shortcut coverage, or a particular learning outcome. Verify
          shortcuts against the relevant product documentation before relying on
          them in important work.
        </p>
      </LegalSection>
      <LegalSection title="Changes">
        <p>
          Features and these terms may change as the project develops. Continued
          use after an update means you accept the updated terms.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
