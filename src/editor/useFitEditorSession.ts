import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type {
  FitDataRecord,
  FitDocument,
  FitField,
  FitFieldValueEdit,
  FitFileIssue,
  FitInsertedMessage,
} from "../fit";
import { parseFitDocument, writeFitDocument } from "../fit";
import {
  buildFitViewModel,
  filterFitMessages,
  getFitMessageTimestampLabel,
  type FitMessageFilter,
  type FitQuickMessageViewModel,
} from "./viewModel";
import {
  buildEditOverlay,
  collectDeletedMessageIds,
  collectInsertedMessages,
  collectEditedMessageIdsFromOverlay,
  countEditOverlayEdits,
  createEmptyEditOverlay,
  deleteMessage as deleteMessageFromOverlay,
  flattenEditOverlay,
  insertDuplicateMessage,
  insertInsertedMessageBefore,
  replaceMessageEdits,
  type FitEditOverlay,
} from "./editOverlay";
import {
  createMessageEditDraft,
  buildMessageSnapshotFromAppliedEdits,
  createRawInsertedMessage,
  getDraftIssues,
  type FitRawInsertedMessageInput,
  validateRawInsertedMessageInput,
  type FitDraftIssue,
} from "./editSession";

export type FitEditorState =
  | { status: "empty" }
  | { status: "loading"; fileName: string }
  | { status: "loaded"; fileName: string; document: FitDocument }
  | { status: "error"; message: string };

export interface FitEditorIssue {
  readonly id: string;
  readonly scope: "file" | "message";
  readonly exportBlocking?: boolean;
  readonly title: string;
  readonly description?: string;
  readonly messageId?: string;
  readonly messageName?: string;
  readonly timestampLabel?: string;
}

export interface FitEditorSession {
  readonly state: FitEditorState;
  readonly activeFilter: FitMessageFilter;
  readonly rawInsertMode: boolean;
  readonly selectedInsertPosition: FitInsertPosition | null;
  readonly selectedInsertPositionLabel: string | null;
  readonly issuesOpen: boolean;
  readonly issuesOpenedFromDownload: boolean;
  readonly issueCount: number;
  readonly editCount: number;
  readonly appliedEdits: readonly FitFieldValueEdit[];
  readonly issues: readonly FitEditorIssue[];
  readonly view: ReturnType<typeof buildFitViewModel> | null;
  readonly visibleMessages: readonly FitQuickMessageViewModel[];
  readonly editedMessageIds: ReadonlySet<string>;
  readonly editingMessage: FitDataRecord | null;
  readonly appliedEditsForEditor: readonly FitFieldValueEdit[];
  readonly editingMessageCanAddFields: boolean;
  readonly showDownloadAction: boolean;
  readonly loadFile: (file: File | undefined) => Promise<void>;
  readonly setActiveFilter: Dispatch<SetStateAction<FitMessageFilter>>;
  readonly startAddMessage: () => void;
  readonly cancelAddMessage: () => void;
  readonly selectInsertPosition: (position: FitInsertPosition) => void;
  readonly applyRawInsertedMessage: (
    input: FitRawInsertedMessageInput,
  ) => boolean;
  readonly openIssues: () => void;
  readonly closeIssues: () => void;
  readonly showIssuesInList: () => void;
  readonly download: () => void;
  readonly downloadAnyway: () => void;
  readonly applyMessageEdits: (nextMessageEdits: FitFieldValueEdit[]) => void;
  readonly deleteMessage: (messageId: string) => void;
  readonly selectMessage: (messageId: string) => void;
  readonly duplicateMessage: (messageId: string) => void;
  readonly closeMessageEditor: () => void;
}

export interface FitDeletedMessageUpdate {
  readonly editOverlay: FitEditOverlay;
  readonly editingMessageId: string | null;
}

export interface FitInsertPosition {
  readonly afterMessageId: string | null;
  readonly beforeMessageId: string | null;
}

interface FitInsertMessageSummary {
  readonly id: string;
  readonly messageName: string;
}

type FitEditorTarget =
  | {
      readonly kind: "edit";
      readonly messageId: string;
    }
  | {
      readonly kind: "duplicate";
      readonly sourceMessageId: string;
      readonly message: FitDataRecord;
    };

const defaultFilter: FitMessageFilter = "all";

export function useFitEditorSession(): FitEditorSession {
  const [state, setState] = useState<FitEditorState>({ status: "empty" });
  const [activeFilter, setActiveFilterState] =
    useState<FitMessageFilter>(defaultFilter);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [issuesOpenedFromDownload, setIssuesOpenedFromDownload] =
    useState(false);
  const [editOverlay, setEditOverlay] =
    useState<FitEditOverlay>(createEmptyEditOverlay());
  const [editingTarget, setEditingTarget] = useState<FitEditorTarget | null>(
    null,
  );
  const [rawInsertMode, setRawInsertMode] = useState(false);
  const [rawInsertPreviousFilter, setRawInsertPreviousFilter] =
    useState<FitMessageFilter | null>(null);
  const [rawInsertPosition, setRawInsertPosition] =
    useState<FitInsertPosition | null>(null);
  const [rawInsertPositionLabel, setRawInsertPositionLabel] =
    useState<string | null>(null);
  const [rawInsertBeforeInsertedMessageId, setRawInsertBeforeInsertedMessageId] =
    useState<string | null>(null);

  const loaded = state.status === "loaded" ? state : null;
  const overlayAppliedEdits = useMemo(
    () => flattenEditOverlay(editOverlay),
    [editOverlay],
  );
  const appliedEditsForEditor = useMemo(
    () => (editingTarget?.kind === "duplicate" ? [] : overlayAppliedEdits),
    [editingTarget, overlayAppliedEdits],
  );
  const editIssues = useMemo(
    () =>
      loaded
        ? [
            ...buildEditIssues(loaded.document, overlayAppliedEdits),
            ...buildInsertedMessageIssues(collectInsertedMessages(editOverlay), loaded.document),
          ]
        : [],
    [editOverlay, loaded, overlayAppliedEdits],
  );
  const issues = useMemo(
    () => (loaded ? [...buildFileIssues(loaded.document), ...editIssues] : []),
    [editIssues, loaded],
  );
  const editedMessageIds = useMemo(
    () => collectEditedMessageIdsFromOverlay(editOverlay),
    [editOverlay],
  );
  const deletedMessageIds = useMemo(
    () => collectDeletedMessageIds(editOverlay),
    [editOverlay],
  );
  const view = useMemo(
    () =>
      loaded
        ? buildFitViewModel(loaded.document, {
            issues,
            editedMessageIds,
            deletedMessageIds,
            insertedMessages: collectInsertedMessages(editOverlay),
          })
        : null,
    [deletedMessageIds, editOverlay, editedMessageIds, issues, loaded],
  );
  const visibleMessages = useMemo(() => {
    if (!view) {
      return [];
    }

    if (rawInsertMode) {
      return view.messages;
    }

    return filterFitMessages(view.messages, activeFilter, {
      issues,
      editedMessageIds,
    });
  }, [activeFilter, editedMessageIds, issues, rawInsertMode, view]);
  const editingMessage = useMemo(() => {
    if (!loaded || !editingTarget) {
      return null;
    }

    if (editingTarget.kind === "duplicate") {
      return editingTarget.message;
    }

    const insertedMessage = collectInsertedMessages(editOverlay).get(
      editingTarget.messageId,
    );
    if (insertedMessage) {
      return insertedMessage.message;
    }

    return (
      loaded.document.messages.find(
        (message) => message.id === editingTarget.messageId,
      ) ?? null
    );
  }, [editOverlay, editingTarget, loaded]);
  const issueCount = issues.length;
  const editCount = countEditOverlayEdits(editOverlay);
  const showDownloadAction =
    issuesOpenedFromDownload &&
    !issues.some((issue) => issue.exportBlocking);
  const editingMessageCanAddFields =
    editingTarget?.kind !== "duplicate" &&
    !(
      editingTarget?.kind === "edit" &&
      collectInsertedMessages(editOverlay).has(editingTarget.messageId)
    );
  const setActiveFilter: Dispatch<SetStateAction<FitMessageFilter>> = (
    nextValue,
  ) => {
    if (!rawInsertMode) {
      setActiveFilterState(nextValue);
      return;
    }

    const resolvedNext =
      typeof nextValue === "function"
        ? nextValue(activeFilter)
        : nextValue;
    if (resolvedNext !== "all") {
      return;
    }

    setActiveFilterState(nextValue);
  };

  async function loadFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setState({ status: "loading", fileName: file.name });
    setActiveFilterState(defaultFilter);
    setEditOverlay(createEmptyEditOverlay());
    setEditingTarget(null);
    setRawInsertMode(false);
    setRawInsertPreviousFilter(null);
    setRawInsertPosition(null);
    setRawInsertPositionLabel(null);
    setRawInsertBeforeInsertedMessageId(null);

    try {
      const buffer = await file.arrayBuffer();
      const document = parseFitDocument(buffer, file.name);
      setState({ status: "loaded", fileName: file.name, document });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not read this FIT file.",
      });
    }
  }

  function openIssues() {
    setIssuesOpenedFromDownload(false);
    setIssuesOpen(true);
  }

  function closeIssues() {
    setIssuesOpen(false);
  }

  function download() {
    if (!loaded) {
      return;
    }

    if (issues.length > 0) {
      setIssuesOpenedFromDownload(true);
      setIssuesOpen(true);
      return;
    }

    downloadFitDocument(
      loaded.document,
      loaded.fileName,
      overlayAppliedEdits,
      [...deletedMessageIds],
      [...collectInsertedMessages(editOverlay).values()],
    );
  }

  function downloadAnyway() {
    if (!loaded) {
      return;
    }

    if (issues.some((issue) => issue.exportBlocking)) {
      return;
    }

    downloadFitDocument(
      loaded.document,
      loaded.fileName,
      overlayAppliedEdits,
      [...deletedMessageIds],
      [...collectInsertedMessages(editOverlay).values()],
    );
    setIssuesOpen(false);
  }

  function showIssuesInList() {
    setActiveFilterState("issues");
    setIssuesOpen(false);
  }

  function startAddMessage() {
    if (!loaded) {
      return;
    }

    setEditingTarget(null);
    setRawInsertPreviousFilter(activeFilter);
    setRawInsertMode(true);
    setRawInsertPosition(null);
    setRawInsertPositionLabel(null);
    setRawInsertBeforeInsertedMessageId(null);
    setActiveFilterState("all");
  }

  function cancelAddMessage() {
    setRawInsertMode(false);
    setRawInsertPosition(null);
    setRawInsertPositionLabel(null);
    setRawInsertBeforeInsertedMessageId(null);
    setEditingTarget(null);
    setActiveFilterState((currentFilter) =>
      rawInsertPreviousFilter ?? currentFilter,
    );
    setRawInsertPreviousFilter(null);
  }

  function selectInsertPosition(position: FitInsertPosition) {
    if (!loaded) {
      return;
    }

    const visibleInsertionMessages = view?.messages ?? loaded.document.messages;
    const normalizedPosition = normalizeInsertPosition(
      loaded.document,
      visibleInsertionMessages,
      position,
    );

    setRawInsertMode(true);
    setRawInsertPosition(normalizedPosition);
    setRawInsertPositionLabel(
      describeInsertPosition({ messages: visibleInsertionMessages }, position),
    );
    setRawInsertBeforeInsertedMessageId(
      getInsertedBeforeMessageId(loaded.document, editOverlay, position),
    );
  }

  function applyRawInsertedMessage(
    input: FitRawInsertedMessageInput,
  ): boolean {
    if (
      !loaded ||
      !rawInsertPosition ||
      !isInsertPositionAnchoredToDocument(loaded.document, rawInsertPosition)
    ) {
      return false;
    }

    const issues = validateRawInsertedMessageInput(input);
    if (issues.length > 0) {
      return false;
    }

    const messageId = createRawInsertedMessageId(input.globalMessageNumber);
    const message = createRawInsertedMessage(messageId, input);
    setEditOverlay((currentOverlay) =>
      insertInsertedMessageBefore(
        currentOverlay,
        {
          id: messageId,
          origin: "raw",
          position: rawInsertPosition,
          message,
        },
        rawInsertBeforeInsertedMessageId,
      ),
    );
    return true;
  }

  function applyMessageEdits(nextMessageEdits: FitFieldValueEdit[]) {
    const target = editingTarget;
    if (!target) {
      return;
    }

    if (target.kind === "duplicate") {
      const committedMessage = buildMessageSnapshotFromAppliedEdits(
        target.message,
        nextMessageEdits,
      );

      setEditOverlay((currentOverlay) =>
        insertDuplicateMessage(currentOverlay, {
          id: committedMessage.id,
          origin: "duplicate",
          position: {
            afterMessageId: target.sourceMessageId,
            beforeMessageId: null,
          },
          sourceMessageId: target.sourceMessageId,
          message: committedMessage,
        }),
      );
      return;
    }

    setEditOverlay((currentOverlay) =>
      replaceMessageEdits(currentOverlay, target.messageId, nextMessageEdits),
    );
  }

  function deleteMessage(messageId: string) {
    setEditOverlay((currentOverlay) =>
      deleteMessageFromOverlay(currentOverlay, messageId),
    );

    setEditingTarget((currentTarget) =>
      clearDeletedMessageTarget(currentTarget, messageId),
    );
  }

  function selectMessage(messageId: string) {
    setEditingTarget({ kind: "edit", messageId });
  }

  function duplicateMessage(messageId: string) {
    if (!loaded) {
      return;
    }

    const sourceMessage = loaded.document.messages.find(
      (message) => message.id === messageId,
    );
    if (!sourceMessage) {
      return;
    }

    const duplicateId = createDuplicateMessageId(messageId);
    const duplicate = buildMessageSnapshotFromAppliedEdits(
      sourceMessage,
      overlayAppliedEdits,
      duplicateId,
    );

    setEditingTarget({
      kind: "duplicate",
      sourceMessageId: messageId,
      message: duplicate,
    });
  }

  function closeMessageEditor() {
    setEditingTarget(null);
  }

  return {
    state,
    activeFilter,
    rawInsertMode,
    selectedInsertPosition: rawInsertPosition,
    selectedInsertPositionLabel: rawInsertPositionLabel,
    issuesOpen,
    issuesOpenedFromDownload,
    issueCount,
    editCount,
    appliedEdits: overlayAppliedEdits,
    issues,
    view,
    visibleMessages,
    editedMessageIds,
    editingMessage,
    appliedEditsForEditor,
    editingMessageCanAddFields,
    showDownloadAction,
    loadFile,
    setActiveFilter,
    startAddMessage,
    cancelAddMessage,
    selectInsertPosition,
    applyRawInsertedMessage,
    openIssues,
    closeIssues,
    showIssuesInList,
    download,
    downloadAnyway,
    applyMessageEdits,
    deleteMessage,
    selectMessage,
    duplicateMessage,
    closeMessageEditor,
  };
}

export function collectEditedMessageIdsFromEdits(
  edits: readonly FitFieldValueEdit[],
): ReadonlySet<string> {
  return collectEditedMessageIdsFromOverlay(buildEditOverlay(edits));
}

export function describeInsertPosition(
  document: { readonly messages: readonly FitInsertMessageSummary[] },
  position: FitInsertPosition,
): string {
  const afterMessageName = position.afterMessageId
    ? document.messages.find(
        (message) => message.id === position.afterMessageId,
      )?.messageName
    : null;
  const beforeMessageName = position.beforeMessageId
    ? document.messages.find(
        (message) => message.id === position.beforeMessageId,
      )?.messageName
    : null;

  if (position.afterMessageId && position.beforeMessageId) {
    return `between ${afterMessageName ?? "the previous message"} and ${
      beforeMessageName ?? "the next message"
    }`;
  }

  if (position.beforeMessageId) {
    return `before ${beforeMessageName ?? "the first message"}`;
  }

  if (position.afterMessageId) {
    return `after ${afterMessageName ?? "the last message"}`;
  }

  return "at the current position";
}

export function normalizeInsertPosition(
  document: Pick<FitDocument, "messages">,
  orderedMessages: readonly FitInsertMessageSummary[],
  position: FitInsertPosition,
): FitInsertPosition {
  const documentMessageIds = new Set(
    document.messages.map((message) => message.id),
  );

  return {
    afterMessageId: resolveOriginalAfterAnchor(
      orderedMessages,
      documentMessageIds,
      position.afterMessageId,
    ),
    beforeMessageId: resolveOriginalBeforeAnchor(
      orderedMessages,
      documentMessageIds,
      position.beforeMessageId,
    ),
  };
}

function resolveOriginalAfterAnchor(
  orderedMessages: readonly FitInsertMessageSummary[],
  documentMessageIds: ReadonlySet<string>,
  messageId: string | null,
): string | null {
  if (!messageId) {
    return null;
  }

  if (documentMessageIds.has(messageId)) {
    return messageId;
  }

  const selectedIndex = orderedMessages.findIndex(
    (message) => message.id === messageId,
  );
  if (selectedIndex < 0) {
    return null;
  }

  for (let index = selectedIndex - 1; index >= 0; index -= 1) {
    const candidateId = orderedMessages[index]?.id;
    if (candidateId && documentMessageIds.has(candidateId)) {
      return candidateId;
    }
  }

  return null;
}

function resolveOriginalBeforeAnchor(
  orderedMessages: readonly FitInsertMessageSummary[],
  documentMessageIds: ReadonlySet<string>,
  messageId: string | null,
): string | null {
  if (!messageId) {
    return null;
  }

  if (documentMessageIds.has(messageId)) {
    return messageId;
  }

  const selectedIndex = orderedMessages.findIndex(
    (message) => message.id === messageId,
  );
  if (selectedIndex < 0) {
    return null;
  }

  for (
    let index = selectedIndex + 1;
    index < orderedMessages.length;
    index += 1
  ) {
    const candidateId = orderedMessages[index]?.id;
    if (candidateId && documentMessageIds.has(candidateId)) {
      return candidateId;
    }
  }

  return null;
}

function isInsertPositionAnchoredToDocument(
  document: Pick<FitDocument, "messages">,
  position: FitInsertPosition,
): boolean {
  if (document.messages.length === 0) {
    return true;
  }

  const documentMessageIds = new Set(
    document.messages.map((message) => message.id),
  );
  return (
    (position.afterMessageId !== null &&
      documentMessageIds.has(position.afterMessageId)) ||
    (position.beforeMessageId !== null &&
      documentMessageIds.has(position.beforeMessageId))
  );
}

function getInsertedBeforeMessageId(
  document: Pick<FitDocument, "messages">,
  editOverlay: FitEditOverlay,
  position: FitInsertPosition,
): string | null {
  if (!position.beforeMessageId) {
    return null;
  }

  if (
    document.messages.some((message) => message.id === position.beforeMessageId)
  ) {
    return null;
  }

  return editOverlay.insertedMessages.has(position.beforeMessageId)
    ? position.beforeMessageId
    : null;
}

export function getFitEditorStatusTitle(
  state: FitEditorState,
  dragging: boolean,
): string {
  if (state.status === "loading") {
    return "Reading activity data";
  }

  if (state.status === "error") {
    return "Could not read this FIT file";
  }

  return dragging
    ? "Release to open this FIT file"
    : "Upload a FIT file to start";
}

export function getFitEditorStatusHelper(
  state: FitEditorState,
  dragging: boolean,
): string {
  if (state.status === "loading") {
    return `Decoding ${state.fileName}, preserving hidden definitions and unknown fields for export.`;
  }

  if (state.status === "error") {
    return state.message;
  }

  return dragging
    ? "Drop the file here to parse it locally and open the editable message list."
    : "Use Upload in the header, or drop a .fit file here to inspect its messages in file order.";
}

export function buildEditIssues(
  document: FitDocument,
  appliedEdits: readonly FitFieldValueEdit[],
): FitEditorIssue[] {
  const editsByMessageId = groupEditsByMessageId(appliedEdits);
  return [...editsByMessageId.entries()].flatMap(
    ([messageId, messageEdits]) => {
      const message = document.messages.find(
        (candidate) => candidate.id === messageId,
      );
      if (!message) {
        return [];
      }

      const draft = createMessageEditDraft(message, messageEdits);
      const editedFieldIds = getAppliedEditFieldIds(
        messageId,
        message.fields,
        messageEdits,
      );
      return getDraftIssues(draft)
        .filter((issue) => editedFieldIds.has(issue.fieldId))
        .flatMap((issue) => draftIssueToFitEditorIssues(message, issue));
    },
  );
}

export function buildInsertedMessageIssues(
  insertedMessages: ReadonlyMap<string, FitInsertedMessage> | Iterable<FitInsertedMessage>,
  document?: FitDocument,
): FitEditorIssue[] {
  const iterator =
    insertedMessages instanceof Map
      ? insertedMessages.values()
      : insertedMessages;

  return [...iterator].flatMap((insertedMessage) => {
    const positionIssues =
      document && insertedMessage.origin === "raw"
        ? buildInsertedMessagePositionIssues(insertedMessage, document)
        : [];
    const draft = createMessageEditDraft(insertedMessage.message);
    return [
      ...positionIssues,
      ...getDraftIssues(draft).flatMap((issue) =>
        draftIssueToFitEditorIssues(insertedMessage.message, issue),
      ),
    ];
  });
}

export function buildFileIssues(document: FitDocument): FitEditorIssue[] {
  return document.issues.map((issue, index) =>
    fileIssueToFitEditorIssue(issue, index),
  );
}

export function clearDeletedMessageEditor(
  editingMessageId: string | null,
  deletedMessageId: string,
): string | null {
  return editingMessageId === deletedMessageId ? null : editingMessageId;
}

function clearDeletedMessageTarget(
  editingTarget: FitEditorTarget | null,
  deletedMessageId: string,
): FitEditorTarget | null {
  if (!editingTarget) {
    return editingTarget;
  }

  if (editingTarget.kind === "edit") {
    return editingTarget.messageId === deletedMessageId ? null : editingTarget;
  }

  return editingTarget.sourceMessageId === deletedMessageId
    ? null
    : editingTarget;
}

export function deleteMessageSessionState(
  editOverlay: FitEditOverlay,
  editingMessageId: string | null,
  deletedMessageId: string,
): FitDeletedMessageUpdate {
  return {
    editOverlay: deleteMessageFromOverlay(editOverlay, deletedMessageId),
    editingMessageId: clearDeletedMessageEditor(
      editingMessageId,
      deletedMessageId,
    ),
  };
}

function createDuplicateMessageId(messageId: string): string {
  const cryptoGlobal = globalThis.crypto;
  const randomSegment =
    cryptoGlobal && typeof cryptoGlobal.randomUUID === "function"
      ? cryptoGlobal.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  return `duplicate-${messageId}-${randomSegment}`;
}

function createRawInsertedMessageId(globalMessageNumber: number): string {
  const cryptoGlobal = globalThis.crypto;
  const randomSegment =
    cryptoGlobal && typeof cryptoGlobal.randomUUID === "function"
      ? cryptoGlobal.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  return `raw-${globalMessageNumber}-${randomSegment}`;
}

function buildInsertedMessagePositionIssues(
  insertedMessage: FitInsertedMessage,
  document: FitDocument,
): FitEditorIssue[] {
  const anchorMessageIds = [
    insertedMessage.position.afterMessageId ?? insertedMessage.sourceMessageId,
    insertedMessage.position.beforeMessageId,
  ].filter((messageId): messageId is string => typeof messageId === "string" && messageId.length > 0);

  if (anchorMessageIds.length === 0) {
    return [
      {
        id: `${insertedMessage.id}:position`,
        scope: "message",
        exportBlocking: true,
        title: `${insertedMessage.message.messageName} has invalid insert position`,
        description: "Insert position must reference a message before or after the inserted record.",
        messageId: insertedMessage.id,
        messageName: insertedMessage.message.messageName,
      },
    ];
  }

  const resolvedAnchorMessageId = anchorMessageIds.find((anchorMessageId) =>
    document.messages.some((message) => message.id === anchorMessageId),
  );
  if (resolvedAnchorMessageId) {
    return [];
  }

  for (const anchorMessageId of anchorMessageIds) {
    if (document.messages.some((message) => message.id === anchorMessageId)) {
      return [];
    }
  }

  return [
    {
      id: `${insertedMessage.id}:position`,
      scope: "message",
      exportBlocking: true,
      title: `${insertedMessage.message.messageName} has invalid insert position`,
      description: `Anchor message ${anchorMessageIds.join(" or ")} was not found in the loaded document.`,
      messageId: insertedMessage.id,
      messageName: insertedMessage.message.messageName,
    },
  ];
}

function groupEditsByMessageId(
  appliedEdits: readonly FitFieldValueEdit[],
): Map<string, FitFieldValueEdit[]> {
  const editsByMessageId = new Map<string, FitFieldValueEdit[]>();
  for (const edit of appliedEdits) {
    const current = editsByMessageId.get(edit.messageId) ?? [];
    current.push(edit);
    editsByMessageId.set(edit.messageId, current);
  }
  return editsByMessageId;
}

function getAppliedEditFieldIds(
  messageId: string,
  fields: readonly FitField[],
  appliedEdits: readonly FitFieldValueEdit[],
): ReadonlySet<string> {
  const fieldIds = new Set<string>();
  for (const edit of appliedEdits) {
    if (edit.messageId === messageId && edit.added && edit.fieldId) {
      fieldIds.add(edit.fieldId);
    }
  }

  for (const field of fields) {
    if (
      appliedEdits.some((edit) => doesAppliedEditMatchField(messageId, field, edit))
    ) {
      fieldIds.add(field.id);
    }
  }

  return fieldIds;
}

function doesAppliedEditMatchField(
  messageId: string,
  field: FitField,
  edit: FitFieldValueEdit,
): boolean {
  if (edit.fieldId && edit.fieldId === field.id) {
    return true;
  }

  if (edit.messageId !== messageId || edit.fieldNumber !== field.number) {
    return false;
  }

  if (Boolean(edit.developer) !== Boolean(field.developer)) {
    return false;
  }

  if (field.developer) {
    return edit.developerDataIndex === field.developerDataIndex;
  }

  return true;
}

function draftIssueToFitEditorIssues(
  message: FitDataRecord,
  issue: FitDraftIssue,
): FitEditorIssue[] {
  return issue.messages.map((description, index) => ({
    id: `${message.id}-${issue.fieldId}-${index}`,
    scope: "message" as const,
    exportBlocking: issue.exportBlocking,
    messageId: message.id,
    messageName: message.messageName,
    timestampLabel: getFitMessageTimestampLabel(message),
    title: `${issue.fieldName} has invalid data`,
    description,
  }));
}

function fileIssueToFitEditorIssue(
  issue: FitFileIssue,
  index: number,
): FitEditorIssue {
  return {
    id: `${issue.code}-${index}`,
    scope: "file",
    title: issue.message,
    description:
      "FITx can still export this file with freshly calculated checksums.",
  };
}

function downloadFitDocument(
  document: FitDocument,
  sourceName: string,
  fieldEdits: readonly FitFieldValueEdit[],
  deletedMessageIds: readonly string[],
  insertedMessages: readonly FitInsertedMessage[],
) {
  const buffer = writeFitDocument(document, { fieldEdits, deletedMessageIds, insertedMessages });
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = makeDownloadName(sourceName);
  link.click();
  URL.revokeObjectURL(url);
}

export function makeDownloadName(sourceName: string): string {
  return sourceName.replace(/\.fit$/i, "") + "-fitx.fit";
}
