import type { EffectsMode } from "../components/settings/settings";
import type { GameResults, GameSettings } from "../game";
import { getSessionDurationSeconds } from "../game";
import type { SharePromptTrigger } from "../referrals/contract";

export type AnalyticsGameContext = {
  readonly track_id: string;
  readonly difficulty: GameSettings["mode"];
  readonly guidance: GameSettings["assistance"];
  readonly pace: GameSettings["speed"];
  readonly session_seconds: number;
  readonly sound_enabled: boolean;
  readonly effects_mode: EffectsMode;
};

export type AnalyticsEventMap = {
  onboarding_started: {
    readonly operating_system: string;
    readonly browser: string;
    readonly launch_support: string;
  };
  onboarding_completed: {
    readonly operating_system: string;
    readonly browser: string;
    readonly launch_support: string;
  };
  game_started: AnalyticsGameContext & {
    readonly run_number: number;
  };
  game_completed: AnalyticsGameContext & AnalyticsResultSummary;
  game_abandoned: AnalyticsGameContext & {
    readonly reason: "restart" | "title" | "page_exit";
    readonly attempts: number;
    readonly score: number;
  };
  personal_best_achieved: AnalyticsGameContext & {
    readonly score: number;
    readonly accuracy_pct: number;
  };
  results_viewed: AnalyticsGameContext & AnalyticsResultSummary;
  share_prompt_shown: {
    readonly surface: ShareSurface;
    readonly trigger: SharePromptTrigger;
  };
  share_clicked: {
    readonly surface: ShareSurface;
    readonly method: "native_share" | "clipboard";
  };
  share_link_copied: {
    readonly surface: ShareSurface;
  };
  referral_landing: {
    readonly referral_present: true;
  };
  referred_player_completed_round: AnalyticsGameContext & {
    readonly referral_present: true;
  };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;
export type ShareSurface = "mobile_title" | "mobile_game" | "results";

type AnalyticsResultSummary = {
  readonly score: number;
  readonly accuracy_pct: number;
  readonly longest_combo: number;
  readonly attempts: number;
  readonly correct_answers: number;
  readonly misses: number;
  readonly unique_shortcuts_correct: number;
  readonly duration_ms: number;
};

export function buildGameAnalyticsContext(
  settings: GameSettings,
  effectsMode: EffectsMode,
  soundEnabled: boolean,
): AnalyticsGameContext {
  return {
    track_id: settings.trackId ?? "linear",
    difficulty: settings.mode,
    guidance: settings.assistance,
    pace: settings.speed,
    session_seconds: getSessionDurationSeconds(settings),
    sound_enabled: soundEnabled,
    effects_mode: effectsMode,
  };
}

export function buildResultAnalyticsSummary(
  results: GameResults,
): AnalyticsResultSummary {
  return {
    score: results.score,
    accuracy_pct: results.accuracyPct,
    longest_combo: results.longestCombo,
    attempts: results.attempts,
    correct_answers: results.correctAnswers,
    misses: results.misses,
    unique_shortcuts_correct: results.uniqueShortcutsCorrect,
    duration_ms: results.durationMs,
  };
}
