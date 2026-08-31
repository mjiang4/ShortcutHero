import type { Dispatch, SetStateAction } from "react";

import { supportMessage } from "./platform";
import { OnboardingDemo } from "./OnboardingDemo";
import { HintSelector } from "./HintSelector";
import type { HintMode } from "../../game/types";
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
  onDemoComplete,
  hints,
  onHintsChange,
  onComplete,
}: {
  readonly view: OnboardingView;
  readonly userName: string;
  readonly setUserName: Dispatch<SetStateAction<string>>;
  readonly systemInfo: SystemInfo;
  readonly restored: boolean;
  readonly onContinueName: () => void;
  readonly onContinueSystem: () => void;
  readonly onDemoComplete: () => void;
  readonly hints: HintMode;
  readonly onHintsChange: (hints: HintMode) => void;
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
          <p className="title-panel__note">{supportMessage(systemInfo)}</p>
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

  if (view === "onboarding-hints") {
    return (
      <TitlePanel title="choose your hints" subtitle="ready to play" onboarding>
        <form onSubmit={(event) => { event.preventDefault(); onComplete(); }}>
          <HintSelector value={hints} onChange={onHintsChange} autoFocus />
          <p className="title-panel__note">Hints stay fixed for the round. Change them later in Options.</p>
          <button type="submit" className="primary-button onboarding-action">Start playing</button>
        </form>
      </TitlePanel>
    );
  }

  return (
    <TitlePanel title="try the keys" subtitle="three quick steps" onboarding>
      <OnboardingDemo onComplete={onDemoComplete} />
    </TitlePanel>
  );
}
