"use client";

import type { AvailableToolId } from "../../tools";

type ToolIconProps = {
  readonly tool: AvailableToolId;
  readonly className?: string;
};

/** Monochrome geometric marks that share one stroke language. */
export function ToolIcon({ tool, className }: ToolIconProps) {
  if (tool === "slack") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8.5 14.5a1.75 1.75 0 1 1-1.75 1.75V14.5H8.5zm0-1.5a1.75 1.75 0 1 1 0-3.5H6.75A1.75 1.75 0 0 0 5 11.25V12H8.5zm1.5 1.5a1.75 1.75 0 1 1 3.5 0v1.75A1.75 1.75 0 0 1 11.75 19H11v-3.5zm0-1.5V8.5a1.75 1.75 0 1 1 1.75-1.75H12.5V12H10zm1.5-5.5a1.75 1.75 0 1 1 1.75-1.75V6.5H11.5zm1.5 1.5a1.75 1.75 0 1 1 0 3.5h1.75A1.75 1.75 0 0 0 19 9.75V9H14.5zm-1.5 1.5a1.75 1.75 0 1 1-3.5 0V8.75A1.75 1.75 0 0 1 12.25 7H13v3.5z"
        />
      </svg>
    );
  }
  if (tool === "spotify") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M7.5 10.2c3.2-1 6.6-.8 9.4.6M8.2 13c2.5-.7 5.2-.6 7.5.5M8.8 15.6c1.9-.5 3.9-.4 5.7.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  // Linear-style mark
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 16.5 16.5 6M8.5 18.5h9v-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
