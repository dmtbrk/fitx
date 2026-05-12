import type {
  FitDataRecord,
  FitDocument,
  FitField,
  FitInsertedMessage,
  FitScalarValue,
  FitValue
} from "../fit/types";

export type FitMessageFilterKind = "all" | "issues" | "edited" | "message-type";

export interface FitMessageTypeCount {
  readonly globalMessageNumber: number;
  readonly messageName: string;
  readonly count: number;
}

export interface FitAllFilterOption {
  readonly kind: "all";
  readonly label: "All";
  readonly count: number;
}

export interface FitIssuesFilterOption {
  readonly kind: "issues";
  readonly label: "Issues";
  readonly count: number;
}

export interface FitEditedFilterOption {
  readonly kind: "edited";
  readonly label: "Edited";
  readonly count: number;
}

export interface FitMessageTypeFilterOption extends FitMessageTypeCount {
  readonly kind: "message-type";
}

export type FitFilterOption = FitAllFilterOption | FitIssuesFilterOption | FitEditedFilterOption | FitMessageTypeFilterOption;

export type FitMessageFilter =
  | "all"
  | "issues"
  | "edited"
  | {
      readonly kind: "message-type";
      readonly globalMessageNumber: number;
    };

export interface FitIssueLike {
  readonly messageId?: string | null;
}

interface DisplayableFitField {
  readonly value: FitValue;
  readonly units?: string;
}

export interface FitViewModelOptions {
  readonly issues?: readonly FitIssueLike[];
  readonly editedMessageIds?: Iterable<string>;
  readonly deletedMessageIds?: Iterable<string>;
  readonly insertedMessages?: ReadonlyMap<string, FitInsertedMessage> | Iterable<FitInsertedMessage>;
  readonly editedFieldKeys?: Iterable<string>;
}

export interface FitFieldDisplayValue {
  readonly valueText: string;
  readonly units?: string;
}

export interface FitQuickFieldViewModel {
  readonly id: string;
  readonly number: number;
  readonly name: string;
  readonly value: FitValue;
  readonly rawValue: FitValue;
  readonly valueText: string;
  readonly units?: string;
  readonly known: boolean;
  readonly developer: boolean;
  readonly baseTypeName: string;
}

export interface FitQuickMessageViewModel {
  readonly id: string;
  readonly order: number;
  readonly globalMessageNumber: number;
  readonly messageName: string;
  readonly timestampLabel?: string;
  readonly fields: readonly FitQuickFieldViewModel[];
  readonly issueCount: number;
  readonly hasIssues: boolean;
  readonly isEdited: boolean;
}

export interface FitViewCounts {
  readonly messages: number;
  readonly issues: number;
  readonly edited: number;
  readonly messageTypes: number;
}

export interface FitViewModel {
  readonly messages: readonly FitQuickMessageViewModel[];
  readonly messageTypeCounts: readonly FitMessageTypeCount[];
  readonly filterOptions: readonly FitFilterOption[];
  readonly counts: FitViewCounts;
}

const FIT_EPOCH_MS = Date.UTC(1989, 11, 31);
const TIMESTAMP_FIELD_NAMES = new Set(["timestamp", "time_created", "start_time"]);

export function buildFitViewModel(document: FitDocument, options: FitViewModelOptions = {}): FitViewModel {
  const editedMessageIds = collectEditedMessageIds({
    messageIds: options.editedMessageIds,
    fieldKeys: options.editedFieldKeys
  });
  const deletedMessageIds = new Set(options.deletedMessageIds ?? []);
  const issueCounts = countIssuesByMessageId(options.issues ?? []);
  const visibleMessages = buildVisibleMessages(document.messages, deletedMessageIds, options.insertedMessages ?? []);
  const messages = buildFitQuickMessages(visibleMessages, {
    editedMessageIds,
    issueCounts
  });
  const messageTypeCounts = collectFitMessageTypeCounts(messages);

  return {
    messages,
    messageTypeCounts,
    filterOptions: buildFitFilterOptions(messages, options),
    counts: {
      messages: messages.length,
      issues: countIssueMessages(options.issues ?? []),
      edited: countEditedMessages({
        messageIds: editedMessageIds,
        visibleMessageIds: messages.map((message) => message.id)
      }),
      messageTypes: messageTypeCounts.length
    }
  };
}

export function collectInsertedMessagesBySource(
  insertedMessages: ReadonlyMap<string, FitInsertedMessage> | Iterable<FitInsertedMessage>
): ReadonlyMap<string, readonly FitInsertedMessage[]> {
  const grouped = new Map<string, FitInsertedMessage[]>();
  const iterator = insertedMessages instanceof Map ? insertedMessages.values() : insertedMessages;

  for (const insertedMessage of iterator) {
    if (!insertedMessage.sourceMessageId) {
      continue;
    }
    const current = grouped.get(insertedMessage.sourceMessageId) ?? [];
    current.push(insertedMessage);
    grouped.set(insertedMessage.sourceMessageId, current);
  }

  return grouped;
}

export function buildFitQuickMessages(
  messages: readonly FitDataRecord[],
  options: {
    readonly editedMessageIds?: ReadonlySet<string>;
    readonly issueCounts?: ReadonlyMap<string, number>;
  } = {}
): readonly FitQuickMessageViewModel[] {
  return messages.map((message) => buildFitQuickMessage(message, options));
}

export function buildFitQuickMessage(
  message: FitDataRecord,
  options: {
    readonly editedMessageIds?: ReadonlySet<string>;
    readonly issueCounts?: ReadonlyMap<string, number>;
  } = {}
): FitQuickMessageViewModel {
  const fields = message.fields.map((field) => buildFitQuickField(field));
  const issueCount = options.issueCounts?.get(message.id) ?? 0;

  return {
    id: message.id,
    order: message.order,
    globalMessageNumber: message.globalMessageNumber,
    messageName: message.messageName,
    timestampLabel: getFitMessageTimestampLabel(message),
    fields,
    issueCount,
    hasIssues: issueCount > 0,
    isEdited: options.editedMessageIds?.has(message.id) ?? false
  };
}

export function buildFitQuickField(field: FitField): FitQuickFieldViewModel {
  const display = formatFitFieldDisplayValue(field);
  return {
    id: field.id,
    number: field.number,
    name: field.name,
    value: field.value,
    rawValue: field.rawValue,
    valueText: display.valueText,
    units: display.units,
    known: field.developer ? false : field.known,
    developer: Boolean(field.developer),
    baseTypeName: field.developer ? "developer" : field.baseTypeName
  };
}

export function formatFitFieldDisplayValue(field: DisplayableFitField): FitFieldDisplayValue {
  return {
    valueText: formatFitValue(field.value),
    units: normalizeUnits(field.units)
  };
}

export function formatFitValue(value: FitValue): string {
  if (Array.isArray(value)) {
    return value.map((item) => formatFitScalarValue(item)).join(", ");
  }

  return formatFitScalarValue(value);
}

export function formatFitScalarValue(value: FitScalarValue): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "null";
  }

  return value;
}

export function getFitMessageTimestampLabel(message: Pick<FitDataRecord, "fields">): string | undefined {
  for (const fieldName of TIMESTAMP_FIELD_NAMES) {
    const field = message.fields.find((candidate) => candidate.name === fieldName);
    if (!field) {
      continue;
    }

    const label = formatFitTimestampValue(field.value);
    if (label !== undefined) {
      return label;
    }
  }

  return undefined;
}

export function formatFitTimestampValue(value: FitValue): string | undefined {
  if (typeof value === "number" || typeof value === "bigint") {
    return formatFitTimestampSeconds(value);
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 1) {
      return formatFitTimestampValue(value[0]);
    }

    const text = value.map((item) => formatFitScalarValue(item)).join(", ");
    return text.length > 0 ? text : undefined;
  }

  return undefined;
}

export function formatFitTimestampSeconds(seconds: number | bigint): string {
  const numericSeconds = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (!Number.isFinite(numericSeconds)) {
    return String(seconds);
  }

  const date = new Date(FIT_EPOCH_MS + numericSeconds * 1000);
  return Number.isNaN(date.getTime()) ? String(seconds) : date.toISOString();
}

export function collectFitMessageTypeCounts(messages: readonly FitDataRecord[] | readonly FitQuickMessageViewModel[]): readonly FitMessageTypeCount[] {
  const counts = new Map<number, FitMessageTypeCount>();
  const order: number[] = [];

  for (const message of messages) {
    const globalMessageNumber = message.globalMessageNumber;
    const current = counts.get(globalMessageNumber);
    if (current) {
      counts.set(globalMessageNumber, {
        ...current,
        count: current.count + 1
      });
      continue;
    }

    const next = {
      globalMessageNumber,
      messageName: message.messageName,
      count: 1
    };
    counts.set(globalMessageNumber, next);
    order.push(globalMessageNumber);
  }

  return order.map((globalMessageNumber) => counts.get(globalMessageNumber) as FitMessageTypeCount);
}

export function buildFitFilterOptions(
  messages: readonly FitDataRecord[] | readonly FitQuickMessageViewModel[],
  options: FitViewModelOptions = {}
): readonly FitFilterOption[] {
  const messageTypeCounts = collectFitMessageTypeCounts(messages);
  const issues = countIssueMessages(options.issues ?? []);
  const visibleMessageIds = messages.map((message) => message.id);
  const edited = countEditedMessages({
    messageIds: options.editedMessageIds,
    fieldKeys: options.editedFieldKeys,
    visibleMessageIds
  });

  return [
    { kind: "all", label: "All", count: messages.length },
    { kind: "issues", label: "Issues", count: issues },
    { kind: "edited", label: "Edited", count: edited },
    ...messageTypeCounts.map((count) => ({
      kind: "message-type" as const,
      globalMessageNumber: count.globalMessageNumber,
      messageName: count.messageName,
      count: count.count
    }))
  ];
}

export function filterFitMessages(
  messages: readonly FitQuickMessageViewModel[],
  filter: FitMessageFilter,
  options: FitViewModelOptions = {}
): readonly FitQuickMessageViewModel[] {
  if (filter === "all") {
    return messages;
  }

  if (filter === "issues") {
    const issueMessageIds = collectIssueMessageIds(options.issues ?? []);
    return messages.filter((message) => issueMessageIds.has(message.id));
  }

  if (filter === "edited") {
    const editedMessageIds = collectEditedMessageIds({
      messageIds: options.editedMessageIds,
      fieldKeys: options.editedFieldKeys
    });
    return messages.filter((message) => editedMessageIds.has(message.id));
  }

  return messages.filter((message) => message.globalMessageNumber === filter.globalMessageNumber);
}

function buildVisibleMessages(
  documentMessages: readonly FitDataRecord[],
  deletedMessageIds: ReadonlySet<string>,
  insertedMessages: ReadonlyMap<string, FitInsertedMessage> | Iterable<FitInsertedMessage>,
): readonly FitDataRecord[] {
  const messages: FitDataRecord[] = [];
  const insertedMessagesByAfterId = new Map<string, FitInsertedMessage[]>();
  const insertedMessagesByBeforeId = new Map<string, FitInsertedMessage[]>();
  const iterator = insertedMessages instanceof Map ? insertedMessages.values() : insertedMessages;

  for (const insertedMessage of iterator) {
    const afterMessageId = getInsertedMessageAfterMessageId(insertedMessage);
    if (afterMessageId) {
      pushInsertedMessage(insertedMessagesByAfterId, afterMessageId, insertedMessage);
      continue;
    }

    const beforeMessageId = insertedMessage.position.beforeMessageId;
    if (beforeMessageId) {
      pushInsertedMessage(insertedMessagesByBeforeId, beforeMessageId, insertedMessage);
    }
  }

  for (const message of documentMessages) {
    for (const insertedMessage of insertedMessagesByBeforeId.get(message.id) ?? []) {
      messages.push(insertedMessage.message);
    }

    if (!deletedMessageIds.has(message.id)) {
      messages.push(message);
    }

    for (const insertedMessage of insertedMessagesByAfterId.get(message.id) ?? []) {
      messages.push(insertedMessage.message);
    }
  }

  return messages;
}

function getInsertedMessageAfterMessageId(insertedMessage: FitInsertedMessage): string | null {
  return insertedMessage.position.afterMessageId ?? insertedMessage.sourceMessageId ?? null;
}

function pushInsertedMessage(
  groupedMessages: Map<string, FitInsertedMessage[]>,
  messageId: string,
  insertedMessage: FitInsertedMessage,
): void {
  const current = groupedMessages.get(messageId) ?? [];
  current.push(insertedMessage);
  groupedMessages.set(messageId, current);
}

export interface FitEditedMessageSource {
  readonly messageIds?: Iterable<string>;
  readonly fieldKeys?: Iterable<string>;
  readonly visibleMessageIds?: Iterable<string>;
}

export function countEditedMessages(source: FitEditedMessageSource): number {
  const editedMessageIds = collectEditedMessageIds(source);

  if (source.visibleMessageIds === undefined) {
    return editedMessageIds.size;
  }

  const visibleMessageIds = new Set(source.visibleMessageIds);
  let count = 0;

  for (const messageId of editedMessageIds) {
    if (visibleMessageIds.has(messageId)) {
      count += 1;
    }
  }

  return count;
}

export function countIssueMessages(issues: Iterable<FitIssueLike>): number {
  return collectIssueMessageIds(issues).size;
}

export function collectEditedMessageIds(source: FitEditedMessageSource): ReadonlySet<string> {
  const messageIds = new Set<string>();

  for (const messageId of source.messageIds ?? []) {
    if (messageId.length > 0) {
      messageIds.add(messageId);
    }
  }

  for (const fieldKey of source.fieldKeys ?? []) {
    const messageId = parseFieldEditMessageId(fieldKey);
    if (messageId.length > 0) {
      messageIds.add(messageId);
    }
  }

  return messageIds;
}

export function collectIssueMessageIds(issues: Iterable<FitIssueLike>): ReadonlySet<string> {
  const messageIds = new Set<string>();
  for (const issue of issues) {
    const messageId = issue.messageId;
    if (typeof messageId === "string" && messageId.length > 0) {
      messageIds.add(messageId);
    }
  }
  return messageIds;
}

export function countIssuesByMessageId(issues: readonly FitIssueLike[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const issue of issues) {
    const messageId = issue.messageId;
    if (typeof messageId !== "string" || messageId.length === 0) {
      continue;
    }
    counts.set(messageId, (counts.get(messageId) ?? 0) + 1);
  }
  return counts;
}

export function parseFieldEditMessageId(fieldKey: string): string {
  const separator = fieldKey.indexOf(":");
  if (separator === -1) {
    return fieldKey;
  }

  return fieldKey.slice(0, separator);
}

function normalizeUnits(units: string | undefined): string | undefined {
  if (units === undefined) {
    return undefined;
  }

  const trimmed = units.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
