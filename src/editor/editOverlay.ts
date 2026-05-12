import type { FitFieldValueEdit, FitInsertedMessage } from "../fit";

export interface FitEditOverlay {
  readonly messages: ReadonlyMap<string, FitEditOverlayMessage>;
  readonly deletedMessageIds: ReadonlySet<string>;
  readonly insertedMessages: ReadonlyMap<string, FitInsertedMessage>;
}

export interface FitEditOverlayMessage {
  readonly messageId: string;
  readonly edits: readonly FitEditOverlayEntry[];
}

export interface FitEditOverlayEntry {
  readonly key: string;
  readonly edit: FitFieldValueEdit;
}

export function createEmptyEditOverlay(): FitEditOverlay {
  return {
    messages: new Map(),
    deletedMessageIds: new Set(),
    insertedMessages: new Map(),
  };
}

export function buildEditOverlay(
  edits: readonly FitFieldValueEdit[],
): FitEditOverlay {
  let overlay = createEmptyEditOverlay();

  for (const edit of edits) {
    overlay = stageOverlayEdit(overlay, edit);
  }

  return overlay;
}

export function flattenEditOverlay(
  overlay: FitEditOverlay,
): FitFieldValueEdit[] {
  const edits: FitFieldValueEdit[] = [];

  for (const message of overlay.messages.values()) {
    for (const entry of message.edits) {
      edits.push(entry.edit);
    }
  }

  return edits;
}

export function collectInsertedMessages(
  overlay: FitEditOverlay,
): ReadonlyMap<string, FitInsertedMessage> {
  return new Map(overlay.insertedMessages);
}

export function collectDeletedMessageIds(
  overlay: FitEditOverlay,
): ReadonlySet<string> {
  return new Set(overlay.deletedMessageIds);
}

export function isMessageDeleted(
  overlay: FitEditOverlay,
  messageId: string,
): boolean {
  return overlay.deletedMessageIds.has(messageId);
}

export function replaceMessageEdits(
  overlay: FitEditOverlay,
  messageId: string,
  nextEdits: readonly FitFieldValueEdit[],
): FitEditOverlay {
  const messages = new Map(overlay.messages);
  const deletedMessageIds = new Set(overlay.deletedMessageIds);
  const insertedMessages = new Map(overlay.insertedMessages);
  if (nextEdits.length === 0) {
    messages.delete(messageId);
    return { messages, deletedMessageIds, insertedMessages };
  }

  deletedMessageIds.delete(messageId);
  messages.set(messageId, buildOverlayMessage(messageId, nextEdits));
  return { messages, deletedMessageIds, insertedMessages };
}

export function markMessageDeleted(
  overlay: FitEditOverlay,
  messageId: string,
): FitEditOverlay {
  const messages = new Map(overlay.messages);
  const deletedMessageIds = new Set(overlay.deletedMessageIds);
  const insertedMessages = new Map(overlay.insertedMessages);

  if (insertedMessages.has(messageId)) {
    insertedMessages.delete(messageId);
    for (const [insertedMessageId, insertedMessage] of insertedMessages) {
      if (doesInsertedMessageDependOn(insertedMessage, messageId)) {
        insertedMessages.delete(insertedMessageId);
      }
    }
    return { messages, deletedMessageIds, insertedMessages };
  }

  messages.delete(messageId);
  deletedMessageIds.add(messageId);
  for (const [insertedMessageId, insertedMessage] of insertedMessages) {
    if (doesInsertedMessageDependOn(insertedMessage, messageId)) {
      insertedMessages.delete(insertedMessageId);
    }
  }
  return { messages, deletedMessageIds, insertedMessages };
}

export function deleteMessage(
  overlay: FitEditOverlay,
  messageId: string,
): FitEditOverlay {
  return markMessageDeleted(overlay, messageId);
}

export function undeleteMessage(
  overlay: FitEditOverlay,
  messageId: string,
): FitEditOverlay {
  if (!overlay.deletedMessageIds.has(messageId)) {
    return overlay;
  }

  const deletedMessageIds = new Set(overlay.deletedMessageIds);
  deletedMessageIds.delete(messageId);
  return {
    messages: new Map(overlay.messages),
    deletedMessageIds,
    insertedMessages: new Map(overlay.insertedMessages),
  };
}

export function insertInsertedMessage(
  overlay: FitEditOverlay,
  insertedMessage: FitInsertedMessage,
): FitEditOverlay {
  return insertInsertedMessageBefore(overlay, insertedMessage, null);
}

export function insertInsertedMessageBefore(
  overlay: FitEditOverlay,
  insertedMessage: FitInsertedMessage,
  beforeInsertedMessageId: string | null,
): FitEditOverlay {
  const messages = new Map(overlay.messages);
  const deletedMessageIds = new Set(overlay.deletedMessageIds);
  const insertedMessages = new Map<string, FitInsertedMessage>();
  messages.delete(insertedMessage.id);
  deletedMessageIds.delete(insertedMessage.id);

  let inserted = false;
  for (const [currentId, currentInsertedMessage] of overlay.insertedMessages) {
    if (
      !inserted &&
      beforeInsertedMessageId &&
      currentId === beforeInsertedMessageId
    ) {
      insertedMessages.set(insertedMessage.id, insertedMessage);
      inserted = true;
    }

    if (currentId !== insertedMessage.id) {
      insertedMessages.set(currentId, currentInsertedMessage);
    }
  }

  if (!inserted) {
    insertedMessages.set(insertedMessage.id, insertedMessage);
  }

  return { messages, deletedMessageIds, insertedMessages };
}

export function insertDuplicateMessage(
  overlay: FitEditOverlay,
  insertedMessage: FitInsertedMessage,
): FitEditOverlay {
  return insertInsertedMessage(overlay, insertedMessage);
}

function doesInsertedMessageDependOn(
  insertedMessage: FitInsertedMessage,
  messageId: string,
): boolean {
  return (
    insertedMessage.sourceMessageId === messageId ||
    insertedMessage.position.afterMessageId === messageId ||
    insertedMessage.position.beforeMessageId === messageId
  );
}

export function collectEditedMessageIdsFromOverlay(
  overlay: FitEditOverlay,
): ReadonlySet<string> {
  const messageIds = new Set<string>();

  for (const [messageId, message] of overlay.messages) {
    if (message.edits.length > 0) {
      messageIds.add(messageId);
    }
  }

  for (const messageId of overlay.deletedMessageIds) {
    messageIds.add(messageId);
  }

  for (const messageId of overlay.insertedMessages.keys()) {
    messageIds.add(messageId);
  }

  return messageIds;
}

export function countEditOverlayEdits(overlay: FitEditOverlay): number {
  let count = 0;

  for (const message of overlay.messages.values()) {
    count += message.edits.length;
  }

  count += overlay.deletedMessageIds.size;
  count += overlay.insertedMessages.size;

  return count;
}

export function countEditedMessagesFromOverlay(
  overlay: FitEditOverlay,
): number {
  let count = 0;

  for (const message of overlay.messages.values()) {
    if (message.edits.length > 0) {
      count += 1;
    }
  }

  count += overlay.deletedMessageIds.size;
  count += overlay.insertedMessages.size;

  return count;
}

export function getEditsForMessage(
  overlay: FitEditOverlay,
  messageId: string,
): readonly FitFieldValueEdit[] {
  return overlay.deletedMessageIds.has(messageId)
    ? []
    : overlay.messages.get(messageId)?.edits.map((entry) => entry.edit) ?? [];
}

function stageOverlayEdit(
  overlay: FitEditOverlay,
  edit: FitFieldValueEdit,
): FitEditOverlay {
  const messages = new Map(overlay.messages);
  const deletedMessageIds = new Set(overlay.deletedMessageIds);
  const insertedMessages = new Map(overlay.insertedMessages);
  deletedMessageIds.delete(edit.messageId);
  const current = messages.get(edit.messageId);
  const nextMessage = current
    ? stageMessageEdit(current, edit)
    : buildOverlayMessage(edit.messageId, [edit]);

  messages.set(edit.messageId, nextMessage);
  return { messages, deletedMessageIds, insertedMessages };
}

function buildOverlayMessage(
  messageId: string,
  edits: readonly FitFieldValueEdit[],
): FitEditOverlayMessage {
  const entries: FitEditOverlayEntry[] = [];

  for (const edit of edits) {
    stageEntry(entries, edit);
  }

  return {
    messageId,
    edits: entries,
  };
}

function stageMessageEdit(
  message: FitEditOverlayMessage,
  edit: FitFieldValueEdit,
): FitEditOverlayMessage {
  const entries = [...message.edits];
  stageEntry(entries, edit);
  return {
    messageId: message.messageId,
    edits: entries,
  };
}

function stageEntry(
  entries: FitEditOverlayEntry[],
  edit: FitFieldValueEdit,
): void {
  const key = makeEditIdentityKey(edit, entries.length);
  const existingIndex = entries.findIndex((entry) => entry.key === key);

  if (existingIndex >= 0) {
    entries[existingIndex] = {
      key,
      edit,
    };
    return;
  }

  entries.push({
    key,
    edit,
  });
}

function makeEditIdentityKey(
  edit: FitFieldValueEdit,
  sequence: number,
): string {
  if (edit.fieldId) {
    return `field-id:${edit.fieldId}`;
  }

  if (edit.added) {
    return [
      "added",
      edit.fieldNumber,
      edit.developer ? "developer" : "normal",
      edit.developerDataIndex ?? "",
      sequence,
    ].join(":");
  }

  return [
    "field",
    edit.fieldNumber,
    edit.developer ? "developer" : "normal",
    edit.developerDataIndex ?? "",
  ].join(":");
}
