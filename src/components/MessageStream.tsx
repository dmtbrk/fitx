import { useEffect, useRef } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Edit3, MoreVertical } from "lucide-react";
import type { RefObject } from "react";
import type {
  FitInsertPosition,
  FitQuickFieldViewModel,
  FitQuickMessageViewModel,
} from "../editor";
import {
  emptyResult,
  fieldGrid,
  fieldLabel,
  fieldShell,
  fieldValue,
  messageMenuContent,
  messageMenuItem,
  insertTargetButton,
  insertTargetCard,
  insertTargetHint,
  insertTargetLabel,
  insertTargetText,
  iconOnlyButton,
  messageCard,
  messageHeader,
  messageHeaderActions,
  messageHeaderMain,
  messageScroll,
  messageStackItem,
  messageSelectionControl,
  messageSelectionInput,
  messageTitle,
  surface,
  timestamp,
  virtualList,
  virtualRow,
} from "../styles/app.css";

interface MessageStreamProps {
  messages: readonly FitQuickMessageViewModel[];
  editedMessageIds: ReadonlySet<string>;
  selectionMode: boolean;
  selectedMessageIds: ReadonlySet<string>;
  insertMode: boolean;
  outerSectionRef: RefObject<HTMLElement | null>;
  scrollResetKey: string;
  onEditMessage: (
    messageId: string,
    focusTarget: HTMLButtonElement | null,
  ) => void;
  onDuplicateMessage: (
    messageId: string,
    focusTarget: HTMLButtonElement | null,
  ) => void;
  onDeleteMessage: (messageId: string) => void;
  onToggleSelectedMessage: (messageId: string) => void;
  onSelectInsertPosition: (
    position: FitInsertPosition,
    focusTarget: HTMLButtonElement | null,
  ) => void;
  registerEditButtonRef: (
    messageId: string,
    element: HTMLButtonElement | null,
  ) => void;
}

export function MessageStream({
  messages,
  editedMessageIds,
  selectionMode,
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
}: MessageStreamProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const entries = buildStreamEntries(messages, insertMode);
  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    getItemKey: (index) => entries[index]?.id ?? index,
    estimateSize: (index) => estimateStreamEntrySize(entries[index]),
    overscan: 6,
  });

  useEffect(() => {
    parentRef.current?.scrollTo({ top: 0 });
  }, [scrollResetKey]);

  return (
    <section
      ref={outerSectionRef}
      className={surface}
      tabIndex={-1}
      aria-label="Message list"
    >
      {messages.length > 0 ? (
        <div
          ref={parentRef}
          data-testid="message-scroll"
          className={messageScroll}
        >
          <div
            className={virtualList}
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const entry = entries[item.index];
              if (!entry) {
                return null;
              }

              return (
                <div
                  key={entry.id}
                  ref={virtualizer.measureElement}
                  className={virtualRow}
                  data-index={item.index}
                  data-entry-kind={entry.kind}
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  {entry.kind === "message" ? (
                    <div className={messageStackItem}>
                      <MessageCard
                        message={entry.message}
                        edited={editedMessageIds.has(entry.message.id)}
                        selectionMode={selectionMode}
                        selected={selectedMessageIds.has(entry.message.id)}
                        onEdit={(focusTarget) =>
                          onEditMessage(entry.message.id, focusTarget)
                        }
                        onDuplicate={(focusTarget) =>
                          onDuplicateMessage(entry.message.id, focusTarget)
                        }
                        onDelete={() => onDeleteMessage(entry.message.id)}
                        onToggleSelected={() =>
                          onToggleSelectedMessage(entry.message.id)
                        }
                        editButtonRef={(element) =>
                          registerEditButtonRef(entry.message.id, element)
                        }
                        restoreFocusTargetRef={outerSectionRef}
                      />
                    </div>
                  ) : (
                    <div className={messageStackItem}>
                      <InsertTargetRow
                        label={entry.label}
                        hint={entry.hint}
                        onSelect={(focusTarget) =>
                          onSelectInsertPosition(entry.position, focusTarget)
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={emptyResult}>No messages match this filter.</div>
      )}
    </section>
  );
}

type StreamEntry =
  | {
      readonly id: string;
      readonly kind: "message";
      readonly message: FitQuickMessageViewModel;
    }
  | {
      readonly id: string;
      readonly kind: "insert-target";
      readonly position: FitInsertPosition;
      readonly label: string;
      readonly hint: string;
    };

function buildStreamEntries(
  messages: readonly FitQuickMessageViewModel[],
  insertMode: boolean,
): readonly StreamEntry[] {
  if (!insertMode) {
    return messages.map((message) => ({
      id: message.id,
      kind: "message" as const,
      message,
    }));
  }

  if (messages.length === 0) {
    return [];
  }

  const entries: StreamEntry[] = [
    createInsertTargetEntry({
      afterMessageId: null,
      beforeMessageId: messages[0].id,
    }, "before", messages[0].messageName, null),
  ];

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    entries.push({
      id: message.id,
      kind: "message",
      message,
    });

    const nextMessage = messages[index + 1];
    if (!nextMessage) {
      entries.push(createInsertTargetEntry({
        afterMessageId: message.id,
        beforeMessageId: null,
      }, "after", message.messageName, null));
      continue;
    }

    entries.push(createInsertTargetEntry({
      afterMessageId: message.id,
      beforeMessageId: nextMessage.id,
    }, "between", message.messageName, nextMessage.messageName));
  }

  return entries;
}

function createInsertTargetEntry(
  position: FitInsertPosition,
  kind: "before" | "between" | "after",
  firstMessageName: string,
  secondMessageName: string | null,
): StreamEntry {
  const label =
    kind === "between"
      ? `Insert message between ${firstMessageName} and ${secondMessageName ?? "the next message"}`
      : kind === "before"
        ? `Insert message before ${secondMessageName ?? firstMessageName}`
        : `Insert message after ${firstMessageName}`;
  const hint =
    kind === "before"
      ? "Insert at the start of the loaded message list."
      : kind === "between"
        ? "Insert between these two messages."
        : "Insert at the end of the loaded message list.";

  return {
    id: `insert-${kind}-${position.afterMessageId ?? "start"}-${position.beforeMessageId ?? "end"}`,
    kind: "insert-target",
    position,
    label,
    hint,
  };
}

function estimateStreamEntrySize(entry: StreamEntry | undefined): number {
  if (!entry) {
    return 260;
  }

  if (entry.kind === "insert-target") {
    return 104;
  }

  return estimateMessageCardSize(entry.message);
}

function InsertTargetRow({
  label,
  hint,
  onSelect,
}: {
  readonly label: string;
  readonly hint: string;
  readonly onSelect: (
    focusTarget: HTMLButtonElement | null,
  ) => void;
}) {
  return (
    <div className={insertTargetCard}>
      <button
        className={insertTargetButton}
        type="button"
        aria-label={label}
        onClick={(event) => onSelect(event.currentTarget)}
      >
        <span className={insertTargetText}>
          <span className={insertTargetLabel}>{label}</span>
          <span className={insertTargetHint}>{hint}</span>
        </span>
      </button>
    </div>
  );
}

function MessageCard({
  message,
  edited,
  selectionMode,
  selected,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleSelected,
  editButtonRef,
  restoreFocusTargetRef,
}: {
  message: FitQuickMessageViewModel;
  edited: boolean;
  selectionMode: boolean;
  selected: boolean;
  onEdit: (focusTarget: HTMLButtonElement | null) => void;
  onDuplicate: (focusTarget: HTMLButtonElement | null) => void;
  onDelete: () => void;
  onToggleSelected: () => void;
  editButtonRef: (element: HTMLButtonElement | null) => void;
  restoreFocusTargetRef: RefObject<HTMLElement | null>;
}) {
  const deleteFocusRequestedRef = useRef(false);
  const editButtonElementRef = useRef<HTMLButtonElement | null>(null);

  return (
    <article
      className={messageCard}
      data-testid="message-card"
      data-message-id={message.id}
      data-message-name={message.messageName}
      data-edited={edited ? "true" : "false"}
      data-selected={selected ? "true" : "false"}
    >
      <div className={messageHeader}>
        <div className={messageHeaderMain}>
          {selectionMode ? (
            <label className={messageSelectionControl}>
              <input
                className={messageSelectionInput}
                type="checkbox"
                data-selection-control="true"
                checked={selected}
                aria-label={`Select ${message.messageName}`}
                onChange={onToggleSelected}
              />
            </label>
          ) : null}
          <h2 className={messageTitle}>
            <span>{message.messageName}</span>
            {message.timestampLabel ? (
              <>
                <span className={timestamp}> · </span>
                <span className={timestamp}>{message.timestampLabel}</span>
              </>
            ) : null}
          </h2>
        </div>
        <div className={messageHeaderActions}>
          <button
            ref={(element) => {
              editButtonRef(element);
              editButtonElementRef.current = element;
            }}
            className={iconOnlyButton}
            type="button"
            aria-label={`Edit ${message.messageName}`}
            onClick={(event) => onEdit(event.currentTarget)}
          >
            <Edit3 size={18} aria-hidden="true" />
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              className={iconOnlyButton}
              aria-label={`${message.messageName} actions`}
            >
              <MoreVertical size={18} aria-hidden="true" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                sideOffset={8}
                onCloseAutoFocus={(event) => {
                  if (!deleteFocusRequestedRef.current) {
                    return;
                  }

                  event.preventDefault();
                  deleteFocusRequestedRef.current = false;
                  const nextTarget = restoreFocusTargetRef.current?.isConnected
                    ? restoreFocusTargetRef.current
                    : null;
                  nextTarget?.focus({ preventScroll: true });
                }}
                className={messageMenuContent}
              >
                <DropdownMenu.Item
                  onSelect={() => {
                    onDuplicate(editButtonElementRef.current);
                  }}
                  className={messageMenuItem}
                >
                  Duplicate message
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    deleteFocusRequestedRef.current = true;
                    if (
                      window.confirm(
                        `Delete ${message.messageName}? This removes the message from the export.`,
                      )
                    ) {
                      onDelete();
                      return;
                    }
                    deleteFocusRequestedRef.current = false;
                  }}
                  className={messageMenuItem}
                >
                  Delete message
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
      <dl className={fieldGrid}>
        {message.fields.map((field) => (
          <FieldPreview key={field.id} field={field} />
        ))}
      </dl>
    </article>
  );
}

function estimateMessageCardSize(
  message: FitQuickMessageViewModel | undefined,
): number {
  if (!message) {
    return 260;
  }

  const width = typeof window === "undefined" ? 1280 : window.innerWidth;
  const columns = width >= 1200 ? 4 : width >= 960 ? 3 : width >= 640 ? 2 : 1;
  const fieldRows = Math.max(1, Math.ceil(message.fields.length / columns));
  return 116 + fieldRows * 90;
}

function FieldPreview({ field }: { field: FitQuickFieldViewModel }) {
  return (
    <div className={fieldShell}>
      <dt className={fieldLabel}>
        <span>{field.name}</span>
        {field.units ? <span>· {field.units}</span> : null}
        {!field.known ? <span>· unknown</span> : null}
        {field.developer ? <span>· developer</span> : null}
      </dt>
      <dd className={fieldValue}>{field.valueText}</dd>
    </div>
  );
}
