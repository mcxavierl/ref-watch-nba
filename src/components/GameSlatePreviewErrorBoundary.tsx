"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type GameSlatePreviewErrorBoundaryProps = {
  children: ReactNode;
  onReset?: () => void;
};

type GameSlatePreviewErrorBoundaryState = {
  hasError: boolean;
};

export class GameSlatePreviewErrorBoundary extends Component<
  GameSlatePreviewErrorBoundaryProps,
  GameSlatePreviewErrorBoundaryState
> {
  state: GameSlatePreviewErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GameSlatePreviewErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV !== "production") {
      console.error("Game slate preview drawer error", error, info);
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="game-slate-preview-error-fallback"
        role="alert"
        aria-live="polite"
      >
        <h3 className="game-slate-preview-error-title">Preview unavailable</h3>
        <p className="game-slate-preview-error-copy">
          We could not load this matchup preview. The slate card is still valid, but
          detailed ref intelligence is missing for this game.
        </p>
        <button type="button" className="btn-secondary" onClick={this.handleRetry}>
          Try again
        </button>
      </div>
    );
  }
}
