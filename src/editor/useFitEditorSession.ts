import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type {
  FitDataRecord,
  FitDocument,
  FitFieldValueEdit,
  FitInsertedMessage,
} from "../fit";
import { parseFitDocument, writeFitDocument } from "../fit";
import {
  buildFitViewModel,
  filterFitMessages,
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
  buildMessageSnapshotFromAppliedEdits,
  createRawInsertedMessage,
  type FitRawInsertedMessageInput,
  validateRawInsertedMessageInput,
} from "./editSession";
import {
  type FitEditorIssue,
  type FitEditorValidationResult,
  validateFitEditorDocument,
} from "./validation";

export type FitEditorState =
  | { status: "empty" }
  | { status: "loading"; fileName: string }
  | { status: "loaded"; fileName: string; document: FitDocument }
  | { status: "error"; message: string };

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
const EMPTY_VALIDATION_RESULT = {
  issues: [],
  hasExportBlockingIssues: false,
} as const;

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
  const validation = useMemo(
    () =>
      loaded
        ? validateFitEditorDocument(loaded.document, editOverlay)
        : EMPTY_VALIDATION_RESULT,
    [editOverlay, loaded],
  );
  const issues = validation.issues;
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
            appliedEdits: overlayAppliedEdits,
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
    issuesOpenedFromDownload && !validation.hasExportBlockingIssues;
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

    const nextValidation = validateFitEditorDocument(
      loaded.document,
      editOverlay,
    );

    if (!shouldDownloadImmediately(nextValidation)) {
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

    const nextValidation = validateFitEditorDocument(
      loaded.document,
      editOverlay,
    );

    if (nextValidation.hasExportBlockingIssues) {
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

export function shouldDownloadImmediately(
  validation: Pick<
    FitEditorValidationResult,
    "issues" | "hasExportBlockingIssues"
  >,
): boolean {
  return validation.issues.length === 0 && !validation.hasExportBlockingIssues;
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
