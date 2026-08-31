"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { SystemScreen } from "./SystemScreen";
import { analytics } from "../../analytics";

type GameRuntimeBoundaryState = {
  readonly error: Error | null;
};

export class GameRuntimeBoundary extends Component<
  { readonly children: ReactNode },
  GameRuntimeBoundaryState
> {
  state: GameRuntimeBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): GameRuntimeBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    analytics.captureException(error, {
      boundary: "game",
      route: window.location.pathname,
    });
    if (process.env.NODE_ENV !== "production") {
      console.error("Shortcut Hero game runtime failed", error, info);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <SystemScreen
          eyebrow="run interrupted"
          title="the highway stalled"
          message="Your browser hit a rendering problem. Reload the game, or return home without losing your saved settings."
          primaryLabel="reload game"
          onPrimary={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}
