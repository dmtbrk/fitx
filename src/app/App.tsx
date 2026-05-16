import {
  type ChangeEvent,
  type DragEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AddRawMessagePanel } from "../components/AddRawMessagePanel";
import { MessageEditorPanel } from "../components/MessageEditorPanel";
import { MessageToolbar } from "../components/MessageToolbar";
import { MessageStream } from "../components/MessageStream";
import { IssuesDialog } from "../components/IssuesDialog";
import { StatusPanel } from "../components/StatusPanel";
import { TopBar } from "../components/TopBar";
import { useFitEditorSession, type FitMessageFilter } from "../editor";
import type { FitDocument } from "../fit";
import {
  app,
  content,
  hiddenFileInput,
} from "../styles/app.css";

const loadedDocumentScrollIds = new WeakMap<FitDocument, number>();
let nextLoadedDocumentScrollId = 0;

function App() {
  const session = useFitEditorSession();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadButtonRef = useRef<HTMLButtonElement | null>(null);
  const selectButtonRef = useRef<HTMLButtonElement | null>(null);
  const messageListRef = useRef<HTMLElement | null>(null);
  const editButtonRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const closeFocusTargetRef = useRef<HTMLButtonElement | null>(null);
  const previousSelectionModeRef = useRef(session.selectionMode);

  const loaded = session.state.status === "loaded" ? session.state : null;
  const fallbackFocusTarget = loaded
    ? messageListRef.current
    : uploadButtonRef.current;
  const scrollResetKey = loaded
    ? `${getLoadedDocumentScrollIdentity(loaded.document)}:${stringifyFitMessageFilter(session.activeFilter)}`
    : "unloaded";

  useLayoutEffect(() => {
    const enteringSelectionMode =
      session.selectionMode && !previousSelectionModeRef.current;
    const exitingSelectionMode =
      !session.selectionMode && previousSelectionModeRef.current;

    if (enteringSelectionMode) {
      const firstSelectionControl =
        messageListRef.current?.querySelector<HTMLElement>(
          '[data-selection-control="true"]',
        ) ?? selectButtonRef.current;
      firstSelectionControl?.focus({ preventScroll: true });
    } else if (exitingSelectionMode) {
      selectButtonRef.current?.focus({ preventScroll: true });
    }

    previousSelectionModeRef.current = session.selectionMode;
  }, [session.selectionMode]);

  function openUpload() {
    inputRef.current?.click();
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    void session.loadFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    void session.loadFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div
      className={app}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          setIsDragging(false);
        }
      }}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        className={hiddenFileInput}
        type="file"
        accept=".fit,.FIT,application/octet-stream"
        onChange={onInputChange}
      />
      <TopBar
        fileName={loaded?.fileName}
        messageCount={session.view?.counts.messages ?? 0}
        loaded={Boolean(loaded)}
        issueCount={session.issueCount}
        editCount={session.editCount}
        onUpload={openUpload}
        onDownload={session.download}
        onOpenIssues={session.openIssues}
        uploadButtonRef={uploadButtonRef}
      />
      {loaded && session.view ? (
        <MessageToolbar
          addMessageMode={session.rawInsertMode}
          selectionMode={session.selectionMode}
          selectedMessageCount={session.selectedMessageCount}
          selectionDisabled={session.visibleMessages.length === 0}
          activeFilter={session.activeFilter}
          filterOptions={session.view.filterOptions}
          selectButtonRef={(element) => {
            selectButtonRef.current = element;
          }}
          onAddMessage={() => {
            if (session.rawInsertMode) {
              session.cancelAddMessage();
              return;
            }

            session.startAddMessage();
          }}
          onStartSelection={session.startSelectionMode}
          onDeleteSelected={session.deleteSelectedMessages}
          onClearSelection={session.clearSelectionMode}
          onFilterChange={session.setActiveFilter}
        />
      ) : null}
      <main className={content}>
        {loaded && session.view ? (
          <MessageStream
            messages={session.visibleMessages}
            editedMessageIds={session.editedMessageIds}
            selectionMode={session.selectionMode}
            selectedMessageIds={session.selectedMessageIds}
            insertMode={session.rawInsertMode}
            outerSectionRef={messageListRef}
            scrollResetKey={scrollResetKey}
            onEditMessage={(messageId, focusTarget) => {
              closeFocusTargetRef.current =
                focusTarget ?? editButtonRefs.current.get(messageId) ?? null;
              session.selectMessage(messageId);
            }}
            onDuplicateMessage={(messageId, focusTarget) => {
              closeFocusTargetRef.current =
                focusTarget ?? editButtonRefs.current.get(messageId) ?? null;
              session.duplicateMessage(messageId);
            }}
            onDeleteMessage={(messageId) => {
              session.deleteMessage(messageId);
            }}
            onToggleSelectedMessage={session.toggleSelectedMessage}
            onSelectInsertPosition={(position, focusTarget) => {
              closeFocusTargetRef.current = focusTarget ?? null;
              session.selectInsertPosition(position);
            }}
            registerEditButtonRef={(messageId, element) => {
              if (element) {
                editButtonRefs.current.set(messageId, element);
                return;
              }

              editButtonRefs.current.delete(messageId);
            }}
          />
        ) : (
          <StatusPanel
            state={session.state}
            dragging={isDragging}
            onUpload={openUpload}
          />
        )}
      </main>
      <AddRawMessagePanel
        open={Boolean(session.selectedInsertPosition)}
        insertionPointLabel={session.selectedInsertPositionLabel}
        closeFocusTarget={closeFocusTargetRef.current}
        fallbackFocusTarget={fallbackFocusTarget}
        onOpenChange={(open) => {
          if (!open) {
            session.cancelAddMessage();
          }
        }}
        onApply={session.applyRawInsertedMessage}
      />
      <MessageEditorPanel
        message={session.editingMessage}
        open={Boolean(session.editingMessage)}
        appliedEdits={session.appliedEditsForEditor}
        allowAddFields={session.editingMessageCanAddFields}
        closeFocusTarget={closeFocusTargetRef.current}
        fallbackFocusTarget={fallbackFocusTarget}
        onOpenChange={(open) => {
          if (!open) {
            session.closeMessageEditor();
          }
        }}
        onApply={session.applyMessageEdits}
      />
      <IssuesDialog
        open={session.issuesOpen}
        issues={session.issues}
        showDownloadAction={session.showDownloadAction}
        onClose={session.closeIssues}
        onShowIssues={session.showIssuesInList}
        onDownloadAnyway={session.downloadAnyway}
      />
    </div>
  );
}

function stringifyFitMessageFilter(filter: FitMessageFilter): string {
  if (typeof filter === "string") {
    return filter;
  }

  return `message-type:${filter.globalMessageNumber}`;
}

function getLoadedDocumentScrollIdentity(document: FitDocument): string {
  const existingId = loadedDocumentScrollIds.get(document);
  if (existingId !== undefined) {
    return String(existingId);
  }

  nextLoadedDocumentScrollId += 1;
  loadedDocumentScrollIds.set(document, nextLoadedDocumentScrollId);
  return String(nextLoadedDocumentScrollId);
}

export default App;
