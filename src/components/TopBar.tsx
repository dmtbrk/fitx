import type { RefObject } from "react";
import { Download, FileCode2, Upload } from "lucide-react";
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
  onUpload: () => void;
  onDownload: () => void;
  onOpenIssues: () => void;
  uploadButtonRef: RefObject<HTMLButtonElement | null>;
}

export function TopBar({
  fileName,
  messageCount,
  loaded,
  issueCount,
  editCount,
  onUpload,
  onDownload,
  onOpenIssues,
  uploadButtonRef,
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
          <button className={primaryButton} type="button" onClick={onDownload}>
            <Download size={17} aria-hidden="true" />
            <span>Download</span>
          </button>
        ) : null}
        <button
          ref={uploadButtonRef}
          className={loaded ? secondaryButton : primaryButton}
          type="button"
          onClick={onUpload}
        >
          <Upload size={17} aria-hidden="true" />
          <span>Upload</span>
        </button>
      </div>
    </header>
  );
}
