import { useCallback, useEffect, useRef, useState } from "react";

import { appRequestHref, isAvailableToolId, TOOL_CATALOG, type ToolId } from "../../tools";
import { OptionRow } from "./OptionsView";
import type { LaunchSettings } from "./settings";
import { HINT_DESCRIPTIONS, HINT_MODES, LABELS, PACES, cycleValue } from "./title-config";
import { BackButton, TitlePanel } from "./TitleShell";

export function GameSetup({ settings, firstVisit, onChange, onContinue, onPlayTutorial, onBack }: {
  readonly settings: LaunchSettings;
  readonly firstVisit: boolean;
  readonly onChange: (settings: LaunchSettings) => void;
  readonly onContinue: () => void;
  readonly onPlayTutorial: () => void;
  readonly onBack: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const [appId, setAppId] = useState<ToolId>(settings.tool);
  const controls = useRef<HTMLDivElement>(null);
  const app = TOOL_CATALOG.find(tool => tool.id === appId)!;
  const canStart = isAvailableToolId(appId);

  useEffect(() => {
    controls.current?.querySelector<HTMLButtonElement>(".option-row button:last-of-type")?.focus();
  }, []);

  const adjust = useCallback((index: number, direction: -1 | 1) => {
    if (index === 0) {
      const nextApp = cycleValue(TOOL_CATALOG.map(tool => tool.id), appId, direction);
      setAppId(nextApp);
      if (isAvailableToolId(nextApp)) onChange({ ...settings, tool: nextApp });
    } else if (index === 1) {
      onChange({ ...settings, pace: cycleValue(PACES, settings.pace, direction) });
    } else if (index === 2) {
      onChange({ ...settings, hints: cycleValue(HINT_MODES, settings.hints, direction) });
    }
  }, [appId, onChange, settings]);

  useEffect(() => {
    function navigate(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.isComposing || event.repeat) return;
      const items = controls.current!.querySelectorAll<HTMLButtonElement>(
        ".option-row button:last-of-type, .setup-actions > button",
      );
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        let next = selected;
        do {
          next = (next + direction + items.length) % items.length;
        } while (items[next].disabled);
        items[next].focus();
      } else if (selected < 3 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        adjust(selected, event.key === "ArrowRight" ? 1 : -1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        onBack();
      } else if (event.key === "Enter") {
        // Enter starts from any setting. Explicit secondary actions remain accessible.
        if (event.target instanceof HTMLElement && event.target.closest("a, .setup-actions .title-panel__back")) return;
        event.preventDefault();
        if (canStart) onContinue();
      } else if (event.key === " ") {
        if (event.target instanceof HTMLElement && event.target.closest("button, a")) return;
        event.preventDefault();
        items[selected].click();
      }
    }

    // Keep navigation working after clicks on text/background or a return to the tab.
    window.addEventListener("keydown", navigate);
    return () => window.removeEventListener("keydown", navigate);
  }, [adjust, canStart, onBack, onContinue, selected]);

  return (
    <TitlePanel title="game setup">
      <div className="setup-controls" ref={controls} onClickCapture={(event) => {
        // Safari does not focus clicked buttons; keep keyboard navigation on the clicked control.
        if (event.target instanceof HTMLElement) event.target.closest("button")?.focus();
      }}>
        <div className="option-list">
          <OptionRow label="app" value={app.name} description={canStart ? undefined : `Coming soon. ${app.description}`}
            active={selected === 0} onFocus={() => setSelected(0)}
            onPrevious={() => adjust(0, -1)} onNext={() => adjust(0, 1)} />
          <OptionRow label="speed" value={LABELS.pace[settings.pace]} active={selected === 1}
            onFocus={() => setSelected(1)}
            onPrevious={() => adjust(1, -1)} onNext={() => adjust(1, 1)} />
          <OptionRow label="hints" value={LABELS.hints[settings.hints]} description={HINT_DESCRIPTIONS[settings.hints]}
            active={selected === 2} onFocus={() => setSelected(2)}
            onPrevious={() => adjust(2, -1)} onNext={() => adjust(2, 1)} />
        </div>
        <div className="setup-actions">
          <button type="button" className="primary-button setup-start" disabled={!canStart}
            onFocus={() => setSelected(3)} onClick={onContinue}>
            <span>play now</span>
            <span aria-hidden="true">↵</span>
          </button>
          {firstVisit ? <button type="button" className="title-panel__back"
            onFocus={() => setSelected(4)} onClick={onPlayTutorial}>play tutorial</button> : null}
          <BackButton onFocus={() => setSelected(firstVisit ? 5 : 4)} onClick={onBack} />
          <a className="title-panel__back" href={appRequestHref(canStart ? undefined : app.name)}
            target="_blank" rel="noreferrer">
            {canStart ? "request an app" : `vote for ${app.name}`} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </TitlePanel>
  );
}
