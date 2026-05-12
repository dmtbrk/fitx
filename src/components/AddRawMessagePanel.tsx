import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  FIT_BASE_TYPES,
} from "../fit";
import {
  type FitRawAddedFieldDraftInput,
  type FitRawInsertedMessageInput,
  validateRawInsertedMessageInput,
} from "../editor";
import {
  addFieldActions,
  addFieldGrid,
  addFieldShell,
  body,
  bodyStack,
  content,
  description,
  fieldHeader,
  fieldInvalid,
  fieldLabel,
  fieldLabelName,
  fieldList,
  fieldMeta,
  fieldShell,
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
  warningBanner,
} from "../styles/messageEditorPanel.css";
import {
  button as baseButton,
  primaryButton,
  secondaryButton,
} from "../styles/app.css";

interface AddRawMessagePanelProps {
  open: boolean;
  insertionPointLabel: string | null;
  onOpenChange: (open: boolean) => void;
  onApply: (input: FitRawInsertedMessageInput) => boolean;
  closeFocusTarget: HTMLElement | null;
  fallbackFocusTarget: HTMLElement | null;
}

interface RawFieldFormState {
  readonly fieldNumber: string;
  readonly fieldName: string;
  readonly baseTypeName: string;
  readonly size: string;
  readonly units: string;
  readonly valueText: string;
}

interface ParsedFieldRow {
  readonly input: FitRawAddedFieldDraftInput | null;
  readonly issues: readonly string[];
}

interface ParsedRawMessageForm {
  readonly input: FitRawInsertedMessageInput | null;
  readonly issues: readonly string[];
  readonly fieldRows: readonly ParsedFieldRow[];
}

const BASE_TYPE_OPTIONS = Object.values(FIT_BASE_TYPES).filter(
  (type, index, all) =>
    all.findIndex((candidate) => candidate.name === type.name) === index,
);

function createDefaultFieldRow(): RawFieldFormState {
  const defaultBaseType =
    BASE_TYPE_OPTIONS.find((type) => type.name === "uint8") ??
    BASE_TYPE_OPTIONS[0];
  return {
    fieldNumber: "",
    fieldName: "",
    baseTypeName: defaultBaseType?.name ?? "uint8",
    size: "1",
    units: "",
    valueText: "",
  };
}

function createDefaultForm(): {
  readonly messageNumber: string;
  readonly label: string;
  readonly fields: readonly RawFieldFormState[];
} {
  return {
    messageNumber: "",
    label: "",
    fields: [createDefaultFieldRow()],
  };
}

export function AddRawMessagePanel({
  open,
  insertionPointLabel,
  onOpenChange,
  onApply,
  closeFocusTarget,
  fallbackFocusTarget,
}: AddRawMessagePanelProps) {
  const [messageNumber, setMessageNumber] = useState("");
  const [label, setLabel] = useState("");
  const [fields, setFields] = useState<readonly RawFieldFormState[]>([
    createDefaultFieldRow(),
  ]);
  const [attemptedCommit, setAttemptedCommit] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextForm = createDefaultForm();
    setMessageNumber(nextForm.messageNumber);
    setLabel(nextForm.label);
    setFields(nextForm.fields);
    setAttemptedCommit(false);
  }, [open]);

  const parsedForm = useMemo(
    () => parseRawInsertedMessageForm(messageNumber, label, fields),
    [fields, label, messageNumber],
  );
  const visibleIssues = attemptedCommit ? parsedForm.issues : [];
  const issueSummaryId = "raw-message-issues";
  const titleValue = insertionPointLabel
    ? `Insert message ${insertionPointLabel}`
    : "Insert raw message";

  function focusInitialControl() {
    const nextTarget = firstInputRef.current ?? cancelButtonRef.current;
    nextTarget?.focus({ preventScroll: true });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttemptedCommit(true);
    if (!parsedForm.input || parsedForm.issues.length > 0) {
      return;
    }

    if (onApply(parsedForm.input)) {
      onOpenChange(false);
    }
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
            const nextTarget = closeFocusTarget?.isConnected
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
                    <span className={titleMetaPill}>Raw insert mode</span>
                    <span>{fields.length} field{fields.length === 1 ? "" : "s"}</span>
                  </div>
                </div>
              </div>
              <Dialog.Description className={description}>
                Add a raw normal-field message at the selected position. Structural issues block commit until they are fixed.
              </Dialog.Description>
            </header>

            <div className={body}>
              <div className={bodyStack}>
                {visibleIssues.length > 0 ? (
                  <div
                    className={warningBanner}
                    id={issueSummaryId}
                    role="alert"
                    aria-live="assertive"
                  >
                    <div className={issueList}>
                      {visibleIssues.map((issue, index) => (
                        <span key={`${issue}-${index}`} className={issuePill}>
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <fieldset className={[fieldShell, addFieldShell].join(" ")}>
                  <legend className={fieldHeader}>
                    <span className={fieldLabel}>
                      <span className={fieldLabelName}>Message details</span>
                      <span className={fieldMeta}>· global number</span>
                      <span className={fieldMeta}>· optional label</span>
                    </span>
                  </legend>

                  <div className={addFieldGrid}>
                    <input
                      ref={firstInputRef}
                      className={valueInput}
                      type="text"
                      inputMode="numeric"
                      value={messageNumber}
                      onChange={(event) => {
                        setAttemptedCommit(false);
                        setMessageNumber(event.target.value);
                      }}
                      aria-label="Message number"
                      aria-invalid={visibleIssues.length > 0 ? true : undefined}
                      aria-describedby={
                        visibleIssues.length > 0 ? issueSummaryId : undefined
                      }
                      placeholder="Message number"
                      spellCheck={false}
                      autoCapitalize="off"
                      autoComplete="off"
                      autoCorrect="off"
                    />
                    <input
                      className={valueInput}
                      type="text"
                      value={label}
                      onChange={(event) => {
                        setAttemptedCommit(false);
                        setLabel(event.target.value);
                      }}
                      aria-label="Message label"
                      aria-invalid={visibleIssues.length > 0 ? true : undefined}
                      aria-describedby={
                        visibleIssues.length > 0 ? issueSummaryId : undefined
                      }
                      placeholder="Label (optional)"
                      spellCheck={false}
                      autoCapitalize="off"
                      autoComplete="off"
                      autoCorrect="off"
                    />
                  </div>
                </fieldset>

                <div className={fieldList}>
                  {fields.map((field, index) => {
                    const fieldRowState = field;
                    const fieldIssues = attemptedCommit
                      ? parsedForm.fieldRows[index]?.issues ?? []
                      : [];
                    const fieldIssueId = `raw-field-${index}-issues`;
                    const fieldHasIssues = fieldIssues.length > 0;
                    return (
                      <fieldset
                        key={`raw-field-${index}`}
                        className={[
                          fieldShell,
                          fieldHasIssues ? fieldInvalid : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <legend className={fieldHeader}>
                          <span className={fieldLabel}>
                            <span className={fieldLabelName}>
                              Raw field {index + 1}
                            </span>
                            <span className={fieldMeta}>· normal</span>
                          </span>
                          {fieldHasIssues ? (
                            <span className={issueList} id={fieldIssueId}>
                              {fieldIssues.map((messageText, issueIndex) => (
                                <span
                                  key={`raw-field-${index}-issue-${issueIndex}`}
                                  className={issuePill}
                                >
                                  {messageText}
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </legend>

                        <div className={addFieldGrid}>
                          <input
                            className={valueInput}
                            type="text"
                            inputMode="numeric"
                            value={fieldRowState.fieldNumber}
                            onChange={(event) => updateFieldRow(
                              setAttemptedCommit,
                              setFields,
                              index,
                              (current) => ({
                                ...current,
                                fieldNumber: event.target.value,
                              }),
                            )}
                            aria-label={`Field ${index + 1} number`}
                            aria-invalid={fieldHasIssues ? true : undefined}
                            aria-describedby={
                              fieldHasIssues ? fieldIssueId : undefined
                            }
                            placeholder="Field number"
                            spellCheck={false}
                            autoCapitalize="off"
                            autoComplete="off"
                            autoCorrect="off"
                          />
                          <input
                            className={valueInput}
                            type="text"
                            value={fieldRowState.fieldName}
                            onChange={(event) => updateFieldRow(
                              setAttemptedCommit,
                              setFields,
                              index,
                              (current) => ({
                                ...current,
                                fieldName: event.target.value,
                              }),
                            )}
                            aria-label={`Field ${index + 1} name`}
                            aria-invalid={fieldHasIssues ? true : undefined}
                            aria-describedby={
                              fieldHasIssues ? fieldIssueId : undefined
                            }
                            placeholder="Field name"
                            spellCheck={false}
                            autoCapitalize="off"
                            autoComplete="off"
                            autoCorrect="off"
                          />
                          <select
                            className={valueInput}
                            value={fieldRowState.baseTypeName}
                            onChange={(event) => updateFieldRow(
                              setAttemptedCommit,
                              setFields,
                              index,
                              (current) => ({
                                ...current,
                                baseTypeName: event.target.value,
                              }),
                            )}
                            aria-label={`Field ${index + 1} base type`}
                            aria-invalid={fieldHasIssues ? true : undefined}
                            aria-describedby={
                              fieldHasIssues ? fieldIssueId : undefined
                            }
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
                            value={fieldRowState.size}
                            onChange={(event) => updateFieldRow(
                              setAttemptedCommit,
                              setFields,
                              index,
                              (current) => ({
                                ...current,
                                size: event.target.value,
                              }),
                            )}
                            aria-label={`Field ${index + 1} size`}
                            aria-invalid={fieldHasIssues ? true : undefined}
                            aria-describedby={
                              fieldHasIssues ? fieldIssueId : undefined
                            }
                            placeholder="Size"
                            spellCheck={false}
                            autoCapitalize="off"
                            autoComplete="off"
                            autoCorrect="off"
                          />
                          <input
                            className={valueInput}
                            type="text"
                            value={fieldRowState.units}
                            onChange={(event) => updateFieldRow(
                              setAttemptedCommit,
                              setFields,
                              index,
                              (current) => ({
                                ...current,
                                units: event.target.value,
                              }),
                            )}
                            aria-label={`Field ${index + 1} units`}
                            aria-invalid={fieldHasIssues ? true : undefined}
                            aria-describedby={
                              fieldHasIssues ? fieldIssueId : undefined
                            }
                            placeholder="Units"
                            spellCheck={false}
                            autoCapitalize="off"
                            autoComplete="off"
                            autoCorrect="off"
                          />
                          <input
                            className={valueInput}
                            type="text"
                            value={fieldRowState.valueText}
                            onChange={(event) => updateFieldRow(
                              setAttemptedCommit,
                              setFields,
                              index,
                              (current) => ({
                                ...current,
                                valueText: event.target.value,
                              }),
                            )}
                            aria-label={`Field ${index + 1} values`}
                            aria-invalid={fieldHasIssues ? true : undefined}
                            aria-describedby={
                              fieldHasIssues ? fieldIssueId : undefined
                            }
                            placeholder="Value(s)"
                            spellCheck={false}
                            autoCapitalize="off"
                            autoComplete="off"
                            autoCorrect="off"
                          />
                        </div>
                      </fieldset>
                    );
                  })}
                </div>

                <div className={addFieldActions}>
                  <button
                    className={secondaryButton}
                    type="button"
                    onClick={() => {
                      setAttemptedCommit(false);
                      setFields((current) => [...current, createDefaultFieldRow()]);
                    }}
                  >
                    Add field
                  </button>
                </div>
              </div>
            </div>

            <footer className={footer}>
              <Dialog.Close asChild>
                <button
                  ref={cancelButtonRef}
                  className={baseButton}
                  type="button"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button className={primaryButton} type="submit">
                Add message
              </button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function parseRawInsertedMessageForm(
  messageNumberText: string,
  label: string,
  fields: readonly RawFieldFormState[],
): ParsedRawMessageForm {
  const issues: string[] = [];
  const fieldRows: ParsedFieldRow[] = [];
  const globalMessageNumber = parseIntegerField(
    messageNumberText,
    "Message number",
    issues,
    { min: 0, max: 65534 },
  );
  const trimmedLabel = label.trim();

  for (const field of fields) {
    const parsedRow = parseRawFieldForm(field);
    fieldRows.push(parsedRow);
    issues.push(...parsedRow.issues);
  }

  if (fieldRows.length === 0) {
    issues.push("At least one normal field is required.");
  }

  if (globalMessageNumber === null || issues.length > 0) {
    return {
      input: null,
      issues,
      fieldRows,
    };
  }

  const input: FitRawInsertedMessageInput = {
    globalMessageNumber,
    ...(trimmedLabel.length > 0 ? { label: trimmedLabel } : {}),
    fields: fieldRows.map((fieldRow) => fieldRow.input as FitRawAddedFieldDraftInput),
  };
  const validationIssues = validateRawInsertedMessageInput(input);
  return {
    input,
    issues: [
      ...issues,
      ...validationIssues.flatMap((issue) => issue.messages),
    ],
    fieldRows,
  };
}

function parseRawFieldForm(field: RawFieldFormState): ParsedFieldRow {
  const issues: string[] = [];
  const fieldNumber = parseIntegerField(
    field.fieldNumber,
    "Field number",
    issues,
    { min: 0, max: 255 },
  );
  const size = parseIntegerField(field.size, "Size", issues, {
    min: 1,
    max: 255,
  });
  const fieldName = field.fieldName.trim();
  const baseTypeName = field.baseTypeName.trim();
  const baseType = BASE_TYPE_OPTIONS.find(
    (candidate) => candidate.name === baseTypeName,
  );

  if (fieldName.length === 0) {
    issues.push("Field name is required.");
  }

  if (!baseType) {
    issues.push("Base type must be one of the supported FIT base types.");
  }

  const textValues = splitRawFieldValues(baseTypeName, field.valueText);
  if (textValues.length === 0) {
    issues.push("Value is required.");
  }

  if (fieldNumber === null || size === null || !baseType) {
    return {
      input: null,
      issues,
    };
  }

  return {
    input: {
      fieldNumber,
      fieldName,
      baseTypeName,
      baseType: baseType.id,
      size,
      units: field.units.trim().length > 0 ? field.units.trim() : undefined,
      textValues,
    },
    issues,
  };
}

function parseIntegerField(
  text: string,
  label: string,
  issues: string[],
  range: { readonly min: number; readonly max: number },
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

function splitRawFieldValues(
  baseTypeName: string,
  valueText: string,
): readonly string[] {
  if (baseTypeName === "string") {
    return [valueText];
  }

  return valueText
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function updateFieldRow(
  setAttemptedCommit: (value: boolean) => void,
  setFields: Dispatch<SetStateAction<readonly RawFieldFormState[]>>,
  index: number,
  update: (current: RawFieldFormState) => RawFieldFormState,
) {
  setAttemptedCommit(false);
  setFields((current) =>
    current.map((field, currentIndex) =>
      currentIndex === index ? update(field) : field,
    ),
  );
}
