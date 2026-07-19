import type { LaunchSettings } from "./settings";

export type TitleView = "menu" | "options" | "scores" | "help" | "credits";
export type OnboardingView =
  | "onboarding-name"
  | "onboarding-system"
  | "onboarding-guide";
export type ScreenView = TitleView | OnboardingView;
export type MenuAction = Exclude<TitleView, "menu"> | "start";

export type ScoreEntry = {
  readonly label: string;
  readonly score: number;
};

export type SystemInfo = {
  readonly operatingSystem: "macOS" | "Windows" | "Other";
  readonly browser: string;
};

export type TitleSettingsState = {
  readonly saved: LaunchSettings;
  readonly draft: LaunchSettings;
};
