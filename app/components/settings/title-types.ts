import type { SystemInfo as LaunchSystemInfo } from "../../platform/launch-compatibility";

export type TitleView =
  | "menu"
  | "setup"
  | "options"
  | "scores"
  | "help"
  | "tutorial"
  | "warmup"
  | "credits"
  | "compatibility";
export type ScreenView = TitleView;
export type MenuAction =
  | Exclude<TitleView, "menu" | "setup" | "compatibility" | "tutorial" | "warmup">
  | "start";

export type ScoreEntry = {
  readonly label: string;
  readonly score: number;
  readonly name: string;
};

export type SystemInfo = LaunchSystemInfo;
