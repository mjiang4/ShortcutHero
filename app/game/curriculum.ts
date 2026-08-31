import type { PromptAttempt, ShortcutDefinition } from "./types";

export const LESSON_SIZE = 10;

export interface CurriculumProgress {
  readonly completedLessons: number;
  readonly shortcuts: Readonly<Record<string, {
    readonly lastPractised: number;
    readonly needsReview: boolean;
  }>>;
}

export const EMPTY_CURRICULUM: CurriculumProgress = {
  completedLessons: 0,
  shortcuts: {},
};

/** Missed first, then unseen, then least recently practised. Stable ties keep
 * the catalog's mixed-input order without randomizing away review priorities. */
export function selectLesson(
  catalog: readonly ShortcutDefinition[],
  progress: CurriculumProgress,
): readonly ShortcutDefinition[] {
  const priority = (shortcut: ShortcutDefinition) => {
    const saved = progress.shortcuts[shortcut.id];
    return saved?.needsReview ? 0 : !saved ? 1 : 2;
  };
  return [...catalog].sort((a, b) =>
    priority(a) - priority(b) ||
    (progress.shortcuts[a.id]?.lastPractised ?? 0) -
    (progress.shortcuts[b.id]?.lastPractised ?? 0),
  ).slice(0, LESSON_SIZE);
}

export function recordLesson(
  progress: CurriculumProgress,
  attempts: readonly PromptAttempt[],
): CurriculumProgress {
  if (attempts.length === 0) return progress;
  const completedLessons = progress.completedLessons + 1;
  const shortcuts = { ...progress.shortcuts };
  for (const attempt of attempts) {
    const previous = shortcuts[attempt.shortcut.id];
    shortcuts[attempt.shortcut.id] = {
      lastPractised: completedLessons,
      needsReview: attempt.outcome !== "clean" || attempt.wrongInputs > 0 ||
        (previous?.lastPractised === completedLessons && previous.needsReview),
    };
  }
  return { completedLessons, shortcuts };
}
