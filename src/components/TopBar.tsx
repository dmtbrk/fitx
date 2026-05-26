import type { RefObject } from "react";
import { FileCode2, FolderOpen, Save } from "lucide-react";
import {
  appIcon,
  brandGroup,
  divider,
  editPill,
  headerActions,
  headerText,
  issuePill,
  mutedHeaderText,
  primaryButton,
  secondaryButton,
  title,
  topbar,
} from "../styles/app.css";

interface TopBarProps {
  fileName?: string;
  messageCount: number;
  loaded: boolean;
  issueCount: number;
  editCount: number;
  onOpenFile: () => void;
  onSave: () => void;
  onOpenIssues: () => void;
  openButtonRef: RefObject<HTMLButtonElement | null>;
}

export function TopBar({
  fileName,
  messageCount,
  loaded,
  issueCount,
  editCount,
  onOpenFile,
  onSave,
  onOpenIssues,
  openButtonRef,
}: TopBarProps) {
  return (
    <header className={topbar}>
      <div className={brandGroup}>
        <div className={appIcon}>
          <FileCode2 size={21} aria-hidden="true" />
        </div>
        <h1 className={title}>FITx</h1>
        {loaded && fileName ? (
          <>
            <span className={divider} />
            <span className={headerText}>{fileName}</span>
            <span className={mutedHeaderText}>·</span>
            <span className={mutedHeaderText}>
              {messageCount.toLocaleString()} messages
            </span>
          </>
        ) : null}
      </div>
      <div className={headerActions}>
        {loaded && issueCount > 0 ? (
          <button className={issuePill} type="button" onClick={onOpenIssues}>
            {issueCount} {issueCount === 1 ? "issue" : "issues"}
          </button>
        ) : null}
        {loaded && editCount > 0 ? (
          <span className={editPill}>
            {editCount} {editCount === 1 ? "edit" : "edits"}
          </span>
        ) : null}
        {loaded ? (
          <button className={primaryButton} type="button" onClick={onSave}>
            <Save size={17} aria-hidden="true" />
            <span>Save</span>
          </button>
        ) : null}
        <button
          ref={openButtonRef}
          className={loaded ? secondaryButton : primaryButton}
          type="button"
          onClick={onOpenFile}
        >
          <FolderOpen size={17} aria-hidden="true" />
          <span>Open</span>
        </button>
      </div>
    </header>
  );
}
