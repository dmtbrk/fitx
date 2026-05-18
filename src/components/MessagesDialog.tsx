import * as Dialog from "@radix-ui/react-dialog";
import type { RefObject } from "react";
import type {
  FitFilterOption,
  FitInsertPosition,
  FitMessageFilter,
  FitQuickMessageViewModel,
} from "../editor";
import { MessageStream } from "./MessageStream";
import { MessageToolbar } from "./MessageToolbar";
import { secondaryButton } from "../styles/app.css";
import {
  body,
  content,
  description,
  header,
  headerActions,
  overlay,
  shell,
  streamRegion,
  title,
  titleWrap,
  toolbarRegion,
} from "../styles/messagesDialog.css";

interface MessagesDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly closeFocusTarget: HTMLElement | null;
  readonly fallbackFocusTarget: HTMLElement | null;
  readonly addMessageMode: boolean;
  readonly selectionMode: boolean;
  readonly selectedMessageCount: number;
  readonly selectionDisabled: boolean;
  readonly activeFilter: FitMessageFilter;
  readonly filterOptions: readonly FitFilterOption[];
  readonly selectButtonRef?: (element: HTMLButtonElement | null) => void;
  readonly onAddMessage: () => void;
  readonly onStartSelection: () => void;
  readonly onDeleteSelected: () => void;
  readonly onClearSelection: () => void;
  readonly onFilterChange: (filter: FitMessageFilter) => void;
  readonly messages: readonly FitQuickMessageViewModel[];
  readonly editedMessageIds: ReadonlySet<string>;
  readonly selectedMessageIds: ReadonlySet<string>;
  readonly insertMode: boolean;
  readonly outerSectionRef: RefObject<HTMLElement | null>;
  readonly scrollResetKey: string;
  readonly onEditMessage: (
    messageId: string,
    focusTarget: HTMLButtonElement | null,
  ) => void;
  readonly onDuplicateMessage: (
    messageId: string,
    focusTarget: HTMLButtonElement | null,
  ) => void;
  readonly onDeleteMessage: (messageId: string) => void;
  readonly onToggleSelectedMessage: (messageId: string) => void;
  readonly onSelectInsertPosition: (
    position: FitInsertPosition,
    focusTarget: HTMLButtonElement | null,
  ) => void;
  readonly registerEditButtonRef: (
    messageId: string,
    element: HTMLButtonElement | null,
  ) => void;
}

export function MessagesDialog({
  open,
  onOpenChange,
  closeFocusTarget,
  fallbackFocusTarget,
  addMessageMode,
  selectionMode,
  selectedMessageCount,
  selectionDisabled,
  activeFilter,
  filterOptions,
  selectButtonRef,
  onAddMessage,
  onStartSelection,
  onDeleteSelected,
  onClearSelection,
  onFilterChange,
  messages,
  editedMessageIds,
  selectedMessageIds,
  insertMode,
  outerSectionRef,
  scrollResetKey,
  onEditMessage,
  onDuplicateMessage,
  onDeleteMessage,
  onToggleSelectedMessage,
  onSelectInsertPosition,
  registerEditButtonRef,
}: MessagesDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content
          className={content}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const nextTarget = closeFocusTarget?.isConnected
              ? closeFocusTarget
              : fallbackFocusTarget?.isConnected
                ? fallbackFocusTarget
                : null;
            nextTarget?.focus({ preventScroll: true });
          }}
        >
          <div className={shell}>
            <header className={header}>
              <div className={titleWrap}>
                <Dialog.Title className={title}>Messages</Dialog.Title>
                <Dialog.Description className={description}>
                  Browse, filter, select, and edit the current messages in a
                  focused secondary surface.
                </Dialog.Description>
              </div>
              <div className={headerActions}>
                <Dialog.Close asChild>
                  <button className={secondaryButton} type="button">
                    Close
                  </button>
                </Dialog.Close>
              </div>
            </header>

            <div className={body}>
              <div className={toolbarRegion}>
                <MessageToolbar
                  addMessageMode={addMessageMode}
                  selectionMode={selectionMode}
                  selectedMessageCount={selectedMessageCount}
                  selectionDisabled={selectionDisabled}
                  activeFilter={activeFilter}
                  filterOptions={filterOptions}
                  selectButtonRef={selectButtonRef}
                  onAddMessage={onAddMessage}
                  onStartSelection={onStartSelection}
                  onDeleteSelected={onDeleteSelected}
                  onClearSelection={onClearSelection}
                  onFilterChange={onFilterChange}
                />
              </div>

              <div className={streamRegion}>
                <MessageStream
                  messages={messages}
                  editedMessageIds={editedMessageIds}
                  selectionMode={selectionMode}
                  selectedMessageIds={selectedMessageIds}
                  insertMode={insertMode}
                  outerSectionRef={outerSectionRef}
                  scrollResetKey={scrollResetKey}
                  onEditMessage={onEditMessage}
                  onDuplicateMessage={onDuplicateMessage}
                  onDeleteMessage={onDeleteMessage}
                  onToggleSelectedMessage={onToggleSelectedMessage}
                  onSelectInsertPosition={onSelectInsertPosition}
                  registerEditButtonRef={registerEditButtonRef}
                />
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
