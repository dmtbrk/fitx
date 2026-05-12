import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { button as baseButton, primaryButton } from "../styles/app.css";
import {
  FIT_BASE_TYPES,
  type FitDataRecord,
  type FitField,
  type FitFieldValueEdit,
} from "../fit";
import {
  appendRawAddedFieldDraft,
  buildFieldValueEditsFromDraft,
  createMessageEditDraft,
  createRawAddedFieldDraft,
  countDraftChangedFields,
  getFitMessageTimestampLabel,
  getDraftIssues,
  getRawAddedFieldDraftIssues,
  updateDraftFieldValue,
  type FitDraftIssue,
  type FitFieldEditDraft,
  type FitMessageEditDraft,
  type FitRawAddedFieldDraftInput
} from "../editor";
import {
  addFieldActions,
  addFieldGrid,
  addFieldShell,
  body,
  bodyStack,
  content,
  description,
  emptyState,
  fieldHeader,
  fieldInvalid,
  fieldLabel,
  fieldLabelName,
  fieldList,
  fieldMeta,
  fieldShell,
  fieldEdited,
  footer,
  form as panelForm,
  header,
  headerRow,
  issueList,
  issuePill,
  overlay,
  title,
  titleMeta,
  titleMetaPill,
  titleWrap,
  valueInput,
  valueInputEdited,
  valueInputInvalid,
  valueStack,
  warningBanner
} from "../styles/messageEditorPanel.css";

type MessageEditDraft = FitMessageEditDraft;

interface MessageEditorPanelProps {
  message: FitDataRecord | null;
  open: boolean;
  appliedEdits: readonly FitFieldValueEdit[];
  allowAddFields?: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (edits: FitFieldValueEdit[]) => void;
  closeFocusTarget: HTMLElement | null;
  fallbackFocusTarget: HTMLElement | null;
}

interface FieldViewModel {
  readonly draftField: FitFieldEditDraft;
  readonly sourceField: FitField | null;
}

interface AddedFieldFormState {
  readonly fieldNumber: string;
  readonly fieldName: string;
  readonly baseTypeName: string;
  readonly size: string;
  readonly units: string;
  readonly valueText: string;
}

interface AddedFieldPreview {
  readonly fieldDraft: FitFieldEditDraft | null;
  readonly issues: readonly string[];
}

const BASE_TYPE_OPTIONS = Object.values(FIT_BASE_TYPES).filter((type, index, all) => all.findIndex((candidate) => candidate.name === type.name) === index);

function createDefaultAddedFieldForm(): AddedFieldFormState {
  const defaultBaseType = BASE_TYPE_OPTIONS.find((type) => type.name === "uint8") ?? BASE_TYPE_OPTIONS[0];
  return {
    fieldNumber: "",
    fieldName: "",
    baseTypeName: defaultBaseType?.name ?? "uint8",
    size: "1",
    units: "",
    valueText: ""
  };
}

export function MessageEditorPanel({
  message,
  open,
  appliedEdits,
  allowAddFields = true,
  onOpenChange,
  onApply,
  closeFocusTarget,
  fallbackFocusTarget
}: MessageEditorPanelProps) {
  const initialDraft = useMemo<MessageEditDraft | null>(() => {
    if (!message) {
      return null;
    }

    return createMessageEditDraft(message, appliedEdits);
  }, [appliedEdits, message]);

  const [draft, setDraft] = useState<MessageEditDraft | null>(initialDraft);
  const [addedFieldForm, setAddedFieldForm] = useState<AddedFieldFormState>(() => createDefaultAddedFieldForm());
  const [addedFieldAttempted, setAddedFieldAttempted] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const addedFieldNumberRef = useRef<HTMLInputElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  function focusInitialControl() {
    const nextTarget = firstInputRef.current ?? addedFieldNumberRef.current ?? cancelButtonRef.current;
    nextTarget?.focus({ preventScroll: true });
  }

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  useEffect(() => {
    setAddedFieldForm(createDefaultAddedFieldForm());
    setAddedFieldAttempted(false);
  }, [message?.id]);

  const draftIssues = draft ? getDraftIssues(draft) : [];
  const changedCount = draft ? countDraftChangedFields(draft) : 0;
  const editableFields = useMemo(() => buildEditableFields(message, draft), [message, draft]);
  const addedFieldPreview = useMemo(() => buildAddedFieldPreview(message, draft, addedFieldForm), [addedFieldForm, draft, message]);
  const addedFieldIssues = addedFieldAttempted ? addedFieldPreview?.issues ?? [] : [];
  const titleValue = message ? buildMessageLabel(message) : "Message editor";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft) {
      onOpenChange(false);
      return;
    }

    onApply(buildFieldValueEditsFromDraft(draft));
    onOpenChange(false);
  }

  function handleFieldChange(fieldId: string, valueIndex: number, nextText: string) {
    if (!draft) {
      return;
    }

    setDraft(updateDraftFieldValue(draft, fieldId, valueIndex, nextText));
  }

  function handleAddField() {
    setAddedFieldAttempted(true);
    if (!message || !draft || !addedFieldPreview?.fieldDraft || addedFieldPreview.issues.length > 0) {
      return;
    }

    const fieldDraft = addedFieldPreview.fieldDraft;
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return appendRawAddedFieldDraft(currentDraft, fieldDraft);
    });
    setAddedFieldForm(createDefaultAddedFieldForm());
    setAddedFieldAttempted(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content
          className={content}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            focusInitialControl();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const nextTarget =
              closeFocusTarget?.isConnected
                ? closeFocusTarget
                : fallbackFocusTarget?.isConnected
                  ? fallbackFocusTarget
                  : null;
            nextTarget?.focus({ preventScroll: true });
          }}
        >
          <form onSubmit={handleSubmit} className={panelForm}>
            <header className={header}>
              <div className={headerRow}>
                <div className={titleWrap}>
                  <Dialog.Title className={title}>{titleValue}</Dialog.Title>
                  <div className={titleMeta}>
                    <span className={titleMetaPill}>Raw edit mode</span>
                    {changedCount > 0 ? (
                      <span>{changedCount} changed field{changedCount === 1 ? "" : "s"}</span>
                    ) : (
                      <span>No staged edits yet</span>
                    )}
                    {draftIssues.length > 0 ? (
                      <span>{draftIssues.length} issue{draftIssues.length === 1 ? "" : "s"}</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <Dialog.Description className={description}>
                {message
                  ? "Edit every field in raw form. Applied edits stay local until you press Apply."
                  : "No message is selected."}
              </Dialog.Description>
            </header>

            <div className={body}>
              <div className={bodyStack}>
                {draftIssues.length > 0 ? (
                  <div className={warningBanner}>
                    Validation warnings are shown inline below. Apply remains available.
                  </div>
                ) : null}

                {message && editableFields.length > 0 ? (
                  <div className={fieldList}>
                    {editableFields.map(({ draftField, sourceField }, fieldIndex) => {
                      const fieldKey = draftField.fieldId;
                      const fieldIssues = draftIssues.filter((issue) => issueAppliesToField(issue, draftField));
                      const isEdited = isDraftFieldEdited(draftField);
                      const fieldName = draftField.fieldName;
                      const fieldMetaText = getFieldMetaText(draftField, sourceField);
                      const inputValues = readFieldValues(draftField);

                      return (
                        <fieldset
                          key={fieldKey}
                          className={[
                            fieldShell,
                            isEdited ? fieldEdited : "",
                            fieldIssues.length > 0 ? fieldInvalid : ""
                          ].filter(Boolean).join(" ")}
                        >
                          <legend className={fieldHeader}>
                            <span className={fieldLabel}>
                              <span className={fieldLabelName}>{fieldName}</span>
                              {fieldMetaText.map((entry) => (
                                <span key={`${fieldKey}-${entry}`} className={fieldMeta}>
                                  · {entry}
                                </span>
                              ))}
                            </span>
                            {fieldIssues.length > 0 ? (
                              <span className={issueList}>
                                {fieldIssues.flatMap((issue, issueIndex) =>
                                  issue.messages.map((messageText, messageIndex) => (
                                    <span
                                      key={`${fieldKey}-issue-${issueIndex}-${messageIndex}`}
                                      className={issuePill}
                                    >
                                      {messageText}
                                    </span>
                                  ))
                                )}
                              </span>
                            ) : null}
                          </legend>

                          <div className={valueStack}>
                            {inputValues.map((value, valueIndex) => {
                              const isFirstInput = fieldIndex === 0 && valueIndex === 0;
                              const inputHasError = fieldIssues.some((issue) => issue.messages.length > 0);
                              const inputClassName = [
                                valueInput,
                                isEdited ? valueInputEdited : "",
                                inputHasError ? valueInputInvalid : ""
                              ].filter(Boolean).join(" ");

                              return (
                                <input
                                  key={`${fieldKey}-${valueIndex}`}
                                  ref={isFirstInput ? firstInputRef : undefined}
                                  className={inputClassName}
                                  type="text"
                                  value={value}
                                  onChange={(event) => handleFieldChange(fieldKey, valueIndex, event.target.value)}
                                  aria-invalid={inputHasError ? true : undefined}
                                  aria-label={`${fieldName} value ${valueIndex + 1}`}
                                  data-testid="message-editor-input"
                                  spellCheck={false}
                                  autoCapitalize="off"
                                  autoComplete="off"
                                  autoCorrect="off"
                                />
                              );
                            })}
                          </div>
                        </fieldset>
                      );
                    })}
                  </div>
                ) : (
                  <div className={emptyState}>
                    {message ? "This message has no editable fields yet." : "Open a message to edit its fields."}
                  </div>
                )}

                {message && allowAddFields ? (
                  <fieldset className={[
                    fieldShell,
                    addFieldShell,
                    addedFieldIssues.length > 0 ? fieldInvalid : ""
                  ].filter(Boolean).join(" ")}>
                    <legend className={fieldHeader}>
                      <span className={fieldLabel}>
                        <span className={fieldLabelName}>Add raw field</span>
                        <span className={fieldMeta}>· normal</span>
                        <span className={fieldMeta}>· appended</span>
                      </span>
                      {addedFieldIssues.length > 0 ? (
                        <span className={issueList}>
                          {addedFieldIssues.map((messageText, issueIndex) => (
                            <span key={`add-field-issue-${issueIndex}`} className={issuePill}>
                              {messageText}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </legend>

                    <div className={addFieldGrid}>
                      <input
                        ref={addedFieldNumberRef}
                        className={valueInput}
                        type="text"
                        inputMode="numeric"
                        value={addedFieldForm.fieldNumber}
                        onChange={(event) => {
                          setAddedFieldAttempted(false);
                          setAddedFieldForm((current) => ({ ...current, fieldNumber: event.target.value }));
                        }}
                        aria-label="New field number"
                        placeholder="Field number"
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                      />
                      <input
                        className={valueInput}
                        type="text"
                        value={addedFieldForm.fieldName}
                        onChange={(event) => {
                          setAddedFieldAttempted(false);
                          setAddedFieldForm((current) => ({ ...current, fieldName: event.target.value }));
                        }}
                        aria-label="New field name"
                        placeholder="Field name"
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                      />
                      <select
                        className={valueInput}
                        value={addedFieldForm.baseTypeName}
                        onChange={(event) => {
                          setAddedFieldAttempted(false);
                          setAddedFieldForm((current) => ({ ...current, baseTypeName: event.target.value }));
                        }}
                        aria-label="New field base type"
                      >
                        {BASE_TYPE_OPTIONS.map((baseType) => (
                          <option key={baseType.id} value={baseType.name}>
                            {baseType.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className={valueInput}
                        type="text"
                        inputMode="numeric"
                        value={addedFieldForm.size}
                        onChange={(event) => {
                          setAddedFieldAttempted(false);
                          setAddedFieldForm((current) => ({ ...current, size: event.target.value }));
                        }}
                        aria-label="New field size"
                        placeholder="Size"
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                      />
                      <input
                        className={valueInput}
                        type="text"
                        value={addedFieldForm.units}
                        onChange={(event) => {
                          setAddedFieldAttempted(false);
                          setAddedFieldForm((current) => ({ ...current, units: event.target.value }));
                        }}
                        aria-label="New field units"
                        placeholder="Units"
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                      />
                      <input
                        className={valueInput}
                        type="text"
                        value={addedFieldForm.valueText}
                        onChange={(event) => {
                          setAddedFieldAttempted(false);
                          setAddedFieldForm((current) => ({ ...current, valueText: event.target.value }));
                        }}
                        aria-label="New field values"
                        placeholder="Value(s)"
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                      />
                    </div>

                    <div className={addFieldActions}>
                      <button className={baseButton} type="button" onClick={handleAddField}>
                        Add field
                      </button>
                    </div>
                  </fieldset>
                ) : null}
              </div>
            </div>

            <footer className={footer}>
              <Dialog.Close asChild>
                <button ref={cancelButtonRef} className={baseButton} type="button">
                  Cancel
                </button>
              </Dialog.Close>
              <button className={primaryButton} type="submit" disabled={!message || !draft}>
                Apply
              </button>
              {draftIssues.length > 0 ? (
                <span className={titleMetaPill}>
                  {draftIssues.length} issue{draftIssues.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function buildEditableFields(
  message: FitDataRecord | null,
  draft: MessageEditDraft | null
): readonly FieldViewModel[] {
  if (!message || !draft) {
    return [];
  }

  return draft.fieldOrder.flatMap((fieldId) => {
    const draftField = draft.fieldsById[fieldId];
    if (!draftField) {
      return [];
    }

    const sourceField = message.fields.find((field) => field.id === fieldId) ?? null;
    return [{ draftField, sourceField }];
  });
}

function buildMessageLabel(message: FitDataRecord): string {
  const timestampLabel = getFitMessageTimestampLabel(message);
  return timestampLabel ? `${message.messageName} · ${timestampLabel}` : message.messageName;
}

function getFieldMetaText(draftField: FitFieldEditDraft, sourceField: FitField | null): string[] {
  const meta: string[] = [];

  if (draftField.units) {
    meta.push(draftField.units);
  }

  if (draftField.baseTypeName) {
    meta.push(draftField.baseTypeName);
  } else if (sourceField && "baseTypeName" in sourceField) {
    meta.push(sourceField.baseTypeName);
  }

  if (draftField.added && typeof draftField.size === "number") {
    meta.push(`${draftField.size} byte${draftField.size === 1 ? "" : "s"}`);
  }

  if (draftField.developer) {
    meta.push("developer");
  }

  if (draftField.added) {
    meta.push("added");
  }

  if (sourceField && "known" in sourceField && sourceField.known === false) {
    meta.push("unknown");
  }

  return meta;
}

function readFieldValues(field: FitFieldEditDraft): string[] {
  if (field.textValues.length > 0) {
    return [...field.textValues];
  }

  return [""];
}

function issueAppliesToField(issue: FitDraftIssue, field: FitFieldEditDraft): boolean {
  return issue.fieldId === field.fieldId;
}

function isDraftFieldEdited(field: FitFieldEditDraft): boolean {
  if (field.initialTextValues.length !== field.textValues.length) {
    return true;
  }

  for (let index = 0; index < field.initialTextValues.length; index += 1) {
    if (field.initialTextValues[index] !== field.textValues[index]) {
      return true;
    }
  }

  return false;
}

function buildAddedFieldPreview(
  message: FitDataRecord | null,
  draft: FitMessageEditDraft | null,
  form: AddedFieldFormState
): AddedFieldPreview | null {
  if (!message || !draft) {
    return null;
  }

  const parsed = parseAddedFieldForm(form);
  if (parsed.issues.length > 0 || !parsed.input) {
    return { fieldDraft: null, issues: parsed.issues };
  }

  const fieldDraft = createRawAddedFieldDraft(message.id, parsed.input);
  return {
    fieldDraft,
    issues: getRawAddedFieldDraftIssues(fieldDraft, draft)
  };
}

function parseAddedFieldForm(form: AddedFieldFormState): { readonly input: FitRawAddedFieldDraftInput | null; readonly issues: readonly string[] } {
  const issues: string[] = [];
  const fieldNumber = parseIntegerField(form.fieldNumber, "Field number", issues, { min: 0, max: 255 });
  const size = parseIntegerField(form.size, "Size", issues, { min: 1, max: 255 });
  const fieldName = form.fieldName.trim();
  const baseTypeName = form.baseTypeName.trim();
  const baseType = BASE_TYPE_OPTIONS.find((candidate) => candidate.name === baseTypeName);

  if (fieldName.length === 0) {
    issues.push("Field name is required.");
  }

  if (!baseType) {
    issues.push("Base type must be one of the supported FIT base types.");
  }

  const textValues = splitAddedFieldValues(baseTypeName, form.valueText);
  if (textValues.length === 0) {
    issues.push("Value is required.");
  }

  if (fieldNumber === null || size === null || !baseType) {
    return { input: null, issues };
  }

  return {
    input: {
      fieldNumber,
      fieldName,
      baseTypeName,
      baseType: baseType.id,
      size,
      units: form.units.trim().length > 0 ? form.units.trim() : undefined,
      textValues
    },
    issues
  };
}

function parseIntegerField(
  text: string,
  label: string,
  issues: string[],
  range: { readonly min: number; readonly max: number }
): number | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    issues.push(`${label} is required.`);
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) {
    issues.push(`${label} must be a whole number.`);
    return null;
  }
  if (parsed < range.min || parsed > range.max) {
    issues.push(`${label} must be between ${range.min} and ${range.max}.`);
    return null;
  }
  return parsed;
}

function splitAddedFieldValues(baseTypeName: string, valueText: string): readonly string[] {
  if (baseTypeName === "string") {
    return [valueText];
  }

  return valueText
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}
