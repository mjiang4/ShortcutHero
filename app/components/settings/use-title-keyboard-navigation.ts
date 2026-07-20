"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

import { MENU_ITEMS, OPTION_COUNT } from "./title-config";
import type { MenuAction, ScreenView } from "./title-types";

type TitleKeyboardNavigationOptions = {
  readonly enabled?: boolean;
  readonly view: ScreenView;
  readonly menuIndex: number;
  readonly optionIndex: number;
  readonly setView: Dispatch<SetStateAction<ScreenView>>;
  readonly setMenuIndex: Dispatch<SetStateAction<number>>;
  readonly setOptionIndex: Dispatch<SetStateAction<number>>;
  readonly onContinueName: () => void;
  readonly onCompleteOnboarding: () => void;
  readonly onOpen: (action: MenuAction) => void;
  readonly onAdjustOption: (index: number, direction: -1 | 1) => void;
  readonly onConfirmOptions: () => void;
  readonly onCancelOptions: () => void;
};

export function useTitleKeyboardNavigation({
  enabled = true,
  view,
  menuIndex,
  optionIndex,
  setView,
  setMenuIndex,
  setOptionIndex,
  onContinueName,
  onCompleteOnboarding,
  onOpen,
  onAdjustOption,
  onConfirmOptions,
  onCancelOptions,
}: TitleKeyboardNavigationOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (view === "onboarding-name") {
        if (event.code === "Enter") {
          event.preventDefault();
          onContinueName();
        }
        return;
      }
      if (view === "onboarding-system") {
        if (event.code === "Escape" || event.code === "Backspace") {
          event.preventDefault();
          setView("onboarding-name");
        } else if (event.code === "Enter" || event.code === "Space") {
          event.preventDefault();
          setView("onboarding-guide");
        }
        return;
      }
      if (view === "onboarding-guide") {
        if (event.code === "Escape" || event.code === "Backspace") {
          event.preventDefault();
          setView("onboarding-system");
        } else if (event.code === "Enter" || event.code === "Space") {
          event.preventDefault();
          onCompleteOnboarding();
        }
        return;
      }
      if (view === "options") {
        if (event.code === "Escape" || event.code === "Backspace") {
          event.preventDefault();
          onCancelOptions();
        } else if (event.code === "ArrowDown" || event.code === "KeyS") {
          event.preventDefault();
          setOptionIndex((index) => (index + 1) % OPTION_COUNT);
        } else if (event.code === "ArrowUp" || event.code === "KeyW") {
          event.preventDefault();
          setOptionIndex(
            (index) => (index - 1 + OPTION_COUNT) % OPTION_COUNT,
          );
        } else if (event.code === "ArrowLeft" || event.code === "KeyA") {
          event.preventDefault();
          onAdjustOption(optionIndex, -1);
        } else if (event.code === "ArrowRight" || event.code === "KeyD") {
          event.preventDefault();
          if (optionIndex < OPTION_COUNT - 1) {
            onAdjustOption(optionIndex, 1);
          }
        } else if (event.code === "Enter" || event.code === "Space") {
          event.preventDefault();
          onConfirmOptions();
        }
        return;
      }
      if (view === "compatibility") {
        if (event.code === "Escape" || event.code === "Backspace") {
          event.preventDefault();
          setView("menu");
        }
        return;
      }
      if (view !== "menu") {
        if (
          event.code === "Escape" ||
          event.code === "Backspace" ||
          event.code === "Enter" ||
          event.code === "Space"
        ) {
          event.preventDefault();
          setView("menu");
        }
        return;
      }
      if (event.code === "ArrowDown" || event.code === "KeyS") {
        event.preventDefault();
        setMenuIndex((index) => (index + 1) % MENU_ITEMS.length);
      } else if (event.code === "ArrowUp" || event.code === "KeyW") {
        event.preventDefault();
        setMenuIndex(
          (index) => (index - 1 + MENU_ITEMS.length) % MENU_ITEMS.length,
        );
      } else if (event.code === "Enter" || event.code === "Space") {
        event.preventDefault();
        onOpen(MENU_ITEMS[menuIndex].action);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    enabled,
    menuIndex,
    onAdjustOption,
    onCancelOptions,
    onCompleteOnboarding,
    onConfirmOptions,
    onContinueName,
    onOpen,
    optionIndex,
    setMenuIndex,
    setOptionIndex,
    setView,
    view,
  ]);
}
