import type {
  GameKeyEvent,
  InputMatcherState,
  ShortcutDefinition,
  ShortcutInput,
} from "./types";

export const EMPTY_INPUT_STATE: InputMatcherState = {
  sequenceIndex: 0,
  lastInputAtMs: null,
};

export type InputMatchResult =
  | {
      readonly status: "ignored";
      readonly state: InputMatcherState;
    }
  | {
      readonly status: "progress";
      readonly state: InputMatcherState;
      readonly step: number;
      readonly total: number;
    }
  | {
      readonly status: "correct";
      readonly state: InputMatcherState;
    }
  | {
      readonly status: "wrong";
      readonly state: InputMatcherState;
    };

function isLetterCode(code: string): boolean {
  return /^Key[A-Z]$/.test(code);
}

function hasReservedModifier(event: GameKeyEvent): boolean {
  return event.metaKey || event.ctrlKey || event.altKey;
}

function codesForInput(input: ShortcutInput): readonly string[] {
  return input.kind === "sequence" ? input.codes : [input.code];
}

export function getCapturedCodes(
  shortcuts: readonly ShortcutDefinition[],
): readonly string[] {
  return [
    ...new Set(shortcuts.flatMap((shortcut) => codesForInput(shortcut.input))),
  ];
}

/**
 * Only allowlisted, non-system game keys should have their browser default blocked.
 * The UI owns preventDefault() so this module stays pure and testable.
 */
export function shouldCaptureGameKey(
  event: GameKeyEvent,
  capturedCodes: readonly string[],
): boolean {
  return (
    !event.isComposing &&
    !hasReservedModifier(event) &&
    capturedCodes.includes(event.code)
  );
}

export function matchShortcutInput(
  input: ShortcutInput,
  state: InputMatcherState,
  event: GameKeyEvent,
  nowMs: number,
): InputMatchResult {
  if (
    event.repeat ||
    event.isComposing ||
    hasReservedModifier(event) ||
    !isLetterCode(event.code)
  ) {
    return { status: "ignored", state };
  }

  if (input.kind === "single") {
    const correct = event.code === input.code && !event.shiftKey;
    return {
      status: correct ? "correct" : "wrong",
      state: EMPTY_INPUT_STATE,
    };
  }

  if (input.kind === "chord") {
    const correct = event.code === input.code && event.shiftKey;
    return {
      status: correct ? "correct" : "wrong",
      state: EMPTY_INPUT_STATE,
    };
  }

  const gapExpired =
    state.sequenceIndex > 0 &&
    state.lastInputAtMs !== null &&
    nowMs - state.lastInputAtMs > input.maxGapMs;
  const currentIndex = gapExpired ? 0 : state.sequenceIndex;
  const expectedCode = input.codes[currentIndex];

  if (event.code === expectedCode && !event.shiftKey) {
    const nextIndex = currentIndex + 1;
    if (nextIndex === input.codes.length) {
      return { status: "correct", state: EMPTY_INPUT_STATE };
    }

    return {
      status: "progress",
      state: { sequenceIndex: nextIndex, lastInputAtMs: nowMs },
      step: nextIndex,
      total: input.codes.length,
    };
  }

  // If the wrong key is also the sequence opener, retain it as a fresh first step.
  const canRestart = event.code === input.codes[0] && !event.shiftKey;
  return {
    status: "wrong",
    state: canRestart
      ? { sequenceIndex: 1, lastInputAtMs: nowMs }
      : EMPTY_INPUT_STATE,
  };
}
