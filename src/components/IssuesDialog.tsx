import * as Dialog from "@radix-ui/react-dialog";
import type { FitEditorIssue } from "../editor";
import {
  button,
  dialogBody,
  dialogContent,
  dialogFooter,
  dialogHeader,
  dialogTitle,
  emptyResult,
  issueDescription,
  issueItem,
  issueList,
  issueTitle,
  overlay,
  primaryButton,
  secondaryButton,
  timestamp,
} from "../styles/app.css";

interface IssuesDialogProps {
  open: boolean;
  issues: readonly FitEditorIssue[];
  showDownloadAction: boolean;
  onClose: () => void;
  onShowIssues?: () => void;
  onDownloadAnyway: () => void;
}

export function IssuesDialog({
  open,
  issues,
  showDownloadAction,
  onClose,
  onShowIssues,
  onDownloadAnyway,
}: IssuesDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content className={dialogContent}>
          <div className={dialogHeader}>
            <Dialog.Title className={dialogTitle}>Issues</Dialog.Title>
          </div>
          <div className={dialogBody}>
            {issues.length > 0 ? (
              <div className={issueList}>
                {issues.map((issue) => (
                  <article className={issueItem} key={issue.id}>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div className={issueTitle}>
                          {issue.title}
                          {issue.messageName ? (
                            <span className={timestamp}>
                              {" "}
                              · {issue.messageName}
                            </span>
                          ) : null}
                          {issue.timestampLabel ? (
                            <span className={timestamp}>
                              {" "}
                              · {issue.timestampLabel}
                            </span>
                          ) : null}
                        </div>
                        {issue.description ? (
                          <p className={issueDescription}>
                            {issue.description}
                          </p>
                        ) : null}
                      </div>
                      {issue.scope === "message" && onShowIssues ? (
                        <button
                          className={secondaryButton}
                          type="button"
                          onClick={onShowIssues}
                        >
                          Show
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={emptyResult}>
                The current file passes basic validation.
              </div>
            )}
          </div>
          <div className={dialogFooter}>
            <Dialog.Close className={button}>Keep editing</Dialog.Close>
            {showDownloadAction ? (
              <button
                className={primaryButton}
                type="button"
                onClick={onDownloadAnyway}
              >
                Download anyway
              </button>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
