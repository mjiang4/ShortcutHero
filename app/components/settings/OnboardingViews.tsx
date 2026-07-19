import type { Dispatch, SetStateAction } from "react";

import { TitlePanel } from "./TitleShell";
import type { OnboardingView, SystemInfo } from "./title-types";

export function OnboardingViews({
  view,
  userName,
  setUserName,
  systemInfo,
  restored,
  onContinueName,
  onContinueSystem,
  onComplete,
}: {
  readonly view: OnboardingView;
  readonly userName: string;
  readonly setUserName: Dispatch<SetStateAction<string>>;
  readonly systemInfo: SystemInfo;
  readonly restored: boolean;
  readonly onContinueName: () => void;
  readonly onContinueSystem: () => void;
  readonly onComplete: () => void;
}) {
  if (view === "onboarding-name") {
    return (
      <TitlePanel
        title="your name"
        subtitle="welcome to shortcut hero"
        onboarding
      >
        <div className="onboarding-copy">
          <p>What should we call you?</p>
          <label className="onboarding-field">
            <span>name</span>
            <input
              autoFocus
              disabled={!restored}
              maxLength={32}
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="Your name"
            />
          </label>
          <button
            type="button"
            className="primary-button onboarding-action"
            disabled={!restored || !userName.trim()}
            onClick={onContinueName}
          >
            continue
          </button>
        </div>
      </TitlePanel>
    );
  }

  if (view === "onboarding-system") {
    return (
      <TitlePanel title="your system" subtitle="quick check" onboarding>
        <div className="onboarding-copy">
          <p>We detected your setup.</p>
          <dl className="system-summary">
            <div>
              <dt>system</dt>
              <dd>{systemInfo.operatingSystem}</dd>
            </div>
            <div>
              <dt>browser</dt>
              <dd>{systemInfo.browser}</dd>
            </div>
          </dl>
          <p className="title-panel__note">
            This prototype uses the Mac shortcut layout.
          </p>
          <button
            type="button"
            className="primary-button onboarding-action"
            onClick={onContinueSystem}
          >
            looks right
          </button>
        </div>
      </TitlePanel>
    );
  }

  return (
    <TitlePanel title="how it works" subtitle="one simple loop" onboarding>
      <ol className="onboarding-guide">
        <li>
          <span>01</span>Read the action on the highway.
        </li>
        <li>
          <span>02</span>Press its shortcut at the strike line.
        </li>
        <li>
          <span>03</span>Hit on time to build a combo.
        </li>
      </ol>
      <button
        type="button"
        className="primary-button onboarding-action"
        onClick={onComplete}
      >
        open main menu
      </button>
    </TitlePanel>
  );
}
