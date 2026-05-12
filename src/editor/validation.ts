import type {
  FitDataRecord,
  FitDocument,
  FitField,
  FitFieldValueEdit,
  FitFileIssue,
  FitInsertedMessage,
} from "../fit";
import {
  collectDeletedMessageIds,
  collectInsertedMessages,
  flattenEditOverlay,
  type FitEditOverlay,
} from "./editOverlay";
import { createMessageEditDraft, getDraftIssues, type FitDraftIssue } from "./editSession";
import { getFitMessageTimestampLabel } from "./viewModel";

export type FitIssueSeverity = "warning" | "export-blocking";

export interface FitEditorIssue {
  readonly id: string;
  readonly code: string;
  readonly severity: FitIssueSeverity;
  readonly scope: "file" | "message";
  readonly exportBlocking: boolean;
  readonly title: string;
  readonly description?: string;
  readonly messageId?: string;
  readonly messageName?: string;
  readonly timestampLabel?: string;
  readonly fieldId?: string;
  readonly fieldName?: string;
}

export interface FitEditorValidationResult {
  readonly issues: readonly FitEditorIssue[];
  readonly hasExportBlockingIssues: boolean;
}

const FILE_ISSUE_DESCRIPTION =
  "FITx can still export this file with freshly calculated checksums.";
const FIELD_ISSUE_CODE = "field-validation";
const INSERTED_MESSAGE_POSITION_CODE = "inserted-message-position";
const DEFINITION_FIELD_COUNT_CODE = "definition-field-count-exceeded";
const MAX_FIT_NORMAL_FIELDS = 0xff;

export function validateFitEditorDocument(
  document: FitDocument,
  editOverlay: FitEditOverlay,
): FitEditorValidationResult {
  const deletedMessageIds = collectDeletedMessageIds(editOverlay);
  const issues = [
    ...buildFileIssues(document),
    ...buildEditIssues(document, flattenEditOverlay(editOverlay)),
    ...buildInsertedMessageIssues(
      collectInsertedMessages(editOverlay),
      document,
      deletedMessageIds,
    ),
  ];

  return {
    issues,
    hasExportBlockingIssues: issues.some((issue) => issue.exportBlocking),
  };
}

export function buildEditIssues(
  document: FitDocument,
  appliedEdits: readonly FitFieldValueEdit[],
): FitEditorIssue[] {
  const editsByMessageId = groupEditsByMessageId(appliedEdits);
  return [...editsByMessageId.entries()].flatMap(([messageId, messageEdits]) => {
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
    return [
      ...buildDefinitionFieldCountIssues(message, messageEdits),
      ...getDraftIssues(draft)
        .filter((issue) => editedFieldIds.has(issue.fieldId))
        .flatMap((issue) => draftIssueToFitEditorIssues(message, issue)),
    ];
  });
}

export function buildInsertedMessageIssues(
  insertedMessages:
    | ReadonlyMap<string, FitInsertedMessage>
    | Iterable<FitInsertedMessage>,
  document?: FitDocument,
  deletedMessageIds: Iterable<string> = [],
): FitEditorIssue[] {
  const iterator =
    insertedMessages instanceof Map ? insertedMessages.values() : insertedMessages;
  const deletedMessageIdSet = new Set(deletedMessageIds);

  return [...iterator].flatMap((insertedMessage) => {
    const positionIssues =
      document && insertedMessage.origin === "raw"
        ? buildInsertedMessagePositionIssues(
            insertedMessage,
            document,
            deletedMessageIdSet,
          )
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

function buildInsertedMessagePositionIssues(
  insertedMessage: FitInsertedMessage,
  document: FitDocument,
  deletedMessageIds: ReadonlySet<string>,
): FitEditorIssue[] {
  const anchorMessageIds = [
    insertedMessage.position.afterMessageId ?? insertedMessage.sourceMessageId,
    insertedMessage.position.beforeMessageId,
  ].filter(
    (messageId): messageId is string =>
      typeof messageId === "string" && messageId.length > 0,
  );

  if (anchorMessageIds.length === 0) {
    return [
      {
        id: `${insertedMessage.id}:position`,
        code: INSERTED_MESSAGE_POSITION_CODE,
        scope: "message",
        severity: "export-blocking",
        exportBlocking: true,
        title: `${insertedMessage.message.messageName} has invalid insert position`,
        description:
          "Insert position must reference a message before or after the inserted record.",
        messageId: insertedMessage.id,
        messageName: insertedMessage.message.messageName,
      },
    ];
  }

  const resolvedAnchorMessageId = anchorMessageIds.find((anchorMessageId) =>
    document.messages.some(
      (message) =>
        message.id === anchorMessageId && !deletedMessageIds.has(message.id),
    ),
  );
  if (resolvedAnchorMessageId) {
    return [];
  }

  return [
    {
      id: `${insertedMessage.id}:position`,
      code: INSERTED_MESSAGE_POSITION_CODE,
      scope: "message",
      severity: "export-blocking",
      exportBlocking: true,
      title: `${insertedMessage.message.messageName} has invalid insert position`,
      description: `Anchor message ${anchorMessageIds.join(" or ")} was not found in the exportable document.`,
      messageId: insertedMessage.id,
      messageName: insertedMessage.message.messageName,
    },
  ];
}

function buildDefinitionFieldCountIssues(
  message: FitDataRecord,
  messageEdits: readonly FitFieldValueEdit[],
): FitEditorIssue[] {
  const normalFieldCount = message.fields.filter((field) => !field.developer).length;
  const addedFieldCount = messageEdits.filter((edit) => edit.added).length;
  const nextFieldCount = normalFieldCount + addedFieldCount;

  if (nextFieldCount <= MAX_FIT_NORMAL_FIELDS) {
    return [];
  }

  return [
    {
      id: `${message.id}:definition-field-count`,
      code: DEFINITION_FIELD_COUNT_CODE,
      scope: "message",
      severity: "export-blocking",
      exportBlocking: true,
      messageId: message.id,
      messageName: message.messageName,
      timestampLabel: getFitMessageTimestampLabel(message),
      title: `${message.messageName} has too many normal fields`,
      description: `FIT definitions can contain at most ${MAX_FIT_NORMAL_FIELDS} normal fields; this edit would write ${nextFieldCount}.`,
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
    if (appliedEdits.some((edit) => doesAppliedEditMatchField(messageId, field, edit))) {
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
    code: FIELD_ISSUE_CODE,
    scope: "message" as const,
    severity: issue.exportBlocking ? "export-blocking" : "warning",
    exportBlocking: issue.exportBlocking,
    messageId: message.id,
    messageName: message.messageName,
    timestampLabel: getFitMessageTimestampLabel(message),
    title: `${issue.fieldName} has invalid data`,
    description,
    fieldId: issue.fieldId,
    fieldName: issue.fieldName,
  }));
}

function fileIssueToFitEditorIssue(
  issue: FitFileIssue,
  index: number,
): FitEditorIssue {
  return {
    id: `${issue.code}-${index}`,
    code: issue.code,
    scope: "file",
    severity: "warning",
    exportBlocking: false,
    title: issue.message,
    description: FILE_ISSUE_DESCRIPTION,
  };
}
