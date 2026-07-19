"use client";

import { useState } from "react";

import { shareGameLink, type ShareResult } from "../../platform/share-game";
import { BackButton, TitlePanel } from "./TitleShell";
import type { SystemInfo } from "./title-types";

export function CompatibilityView({
  systemInfo,
  onContinue,
  onBack,
}: {
  readonly systemInfo: SystemInfo;
  readonly onContinue: () => void;
  readonly onBack: () => void;
}) {
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);

  if (systemInfo.launchSupport === "mobile") {
    const shareLabel =
      shareResult === "copied"
        ? "link copied"
        : shareResult === "shared"
          ? "link sent"
          : shareResult === "unavailable"
            ? "copy this page's URL"
            : "send link to a Mac";

    return (
      <TitlePanel title="play on a Mac" subtitle="bring a keyboard">
        <div className="compatibility-copy">
          <p>
            Learn Linear shortcuts in a fast 3D game. Open Shortcut Hero on a
            Mac with Chrome, Safari, or Firefox to play.
          </p>
          <button
            type="button"
            className="primary-button"
            autoFocus
            onClick={() =>
              void shareGameLink("mobile_title").then(setShareResult)
            }
          >
            {shareLabel}
          </button>
        </div>
      </TitlePanel>
    );
  }

  return (
    <TitlePanel title="browser check" subtitle="this setup is untested">
      <div className="compatibility-copy">
        <p>
          Shortcut Hero is launch-tested on macOS with Chrome, Safari, and
          Firefox. You can continue, but graphics or keyboard input may vary.
        </p>
        <button
          type="button"
          className="primary-button"
          autoFocus
          onClick={onContinue}
        >
          continue anyway
        </button>
      </div>
      <BackButton onClick={onBack} />
    </TitlePanel>
  );
}
