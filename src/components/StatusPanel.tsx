import { AlertTriangle, FileCode2, RefreshCw } from "lucide-react";
import type { FitEditorState } from "../editor";
import {
  dangerButton,
  dragStatusPanel,
  errorStatusPanel,
  progressFill,
  progressRow,
  progressTrack,
  spin,
  statusBody,
  statusCopy,
  statusIcon,
  statusIconError,
  statusPanel,
  statusTitle,
} from "../styles/app.css";
import {
  getFitEditorStatusHelper,
  getFitEditorStatusTitle,
} from "../editor";

interface StatusPanelProps {
  state: FitEditorState;
  dragging: boolean;
  onOpenFile: () => void;
}

export function StatusPanel({ state, dragging, onOpenFile }: StatusPanelProps) {
  const loading = state.status === "loading";
  const error = state.status === "error";
  const empty = state.status === "empty";
  const panelClass = [
    statusPanel,
    dragging && empty ? dragStatusPanel : "",
    error ? errorStatusPanel : "",
  ]
    .filter(Boolean)
    .join(" ");
  const titleText = getFitEditorStatusTitle(state, dragging);
  const helperText = getFitEditorStatusHelper(state, dragging);

  return (
    <section className={panelClass}>
      <div className={statusBody}>
        <div
          className={[statusIcon, error ? statusIconError : ""]
            .filter(Boolean)
            .join(" ")}
        >
          {error ? (
            <AlertTriangle size={22} aria-hidden="true" />
          ) : loading ? (
            <RefreshCw className={spin} size={22} aria-hidden="true" />
          ) : (
            <FileCode2 size={22} aria-hidden="true" />
          )}
        </div>
        <div>
          <h2 className={statusTitle}>{titleText}</h2>
          <p className={statusCopy}>{helperText}</p>
          {loading ? (
            <div className={progressRow}>
              <div className={progressTrack}>
                <div className={progressFill} />
              </div>
              <span>Parsing...</span>
            </div>
          ) : null}
          {error ? (
            <button
              className={dangerButton}
              type="button"
              onClick={onOpenFile}
              style={{ marginTop: 20 }}
            >
              Try another file
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
