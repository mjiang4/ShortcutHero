import type { LaunchSettings } from "./settings";
import type { SystemInfo as LaunchSystemInfo } from "../../platform/launch-compatibility";

export type TitleView =
  | "menu"
  | "options"
  | "scores"
  | "help"
  | "credits"
  | "compatibility";
export type OnboardingView =
  | "onboarding-name"
  | "onboarding-system"
  | "onboarding-guide";
export type ScreenView = TitleView | OnboardingView;
export type MenuAction =
  | Exclude<TitleView, "menu" | "compatibility">
  | "start";

export type ScoreEntry = {
  readonly label: string;
  readonly score: number;
};

export type SystemInfo = LaunchSystemInfo;

export type TitleSettingsState = {
  readonly saved: LaunchSettings;
  readonly draft: LaunchSettings;
};
