import { FIT_PROFILE_GENERATED } from "../generated/fitProfile.generated";

export interface FitProfileEnumValue {
  readonly value: number | string;
  readonly name: string;
  readonly comment?: string;
}

export interface FitProfileTypeMetadata {
  readonly name: string;
  readonly baseType: string;
  readonly size: number;
  readonly signed: boolean;
  readonly values: readonly FitProfileEnumValue[];
}

export interface FitProfileComponentMetadata {
  readonly fieldNumber: number;
  readonly scale?: number;
  readonly offset?: number;
  readonly units?: string;
}

export interface FitProfileFieldMetadata {
  readonly number: number;
  readonly name: string;
  readonly baseType: string;
  readonly size: number;
  readonly type?: string;
  readonly scale?: number;
  readonly offset?: number;
  readonly units?: string;
  readonly values: readonly FitProfileEnumValue[];
  readonly components?: readonly FitProfileComponentMetadata[];
  readonly comment?: string;
}

export interface FitProfileMessageMetadata {
  readonly number: number;
  readonly name: string;
  readonly comment?: string;
  readonly fields: readonly FitProfileFieldMetadata[];
}

export interface FitProfileSourceMetadata {
  readonly generatorVersion: string;
  readonly generatedAt: string;
  readonly workbookPath: string;
  readonly workbookSha256: string;
  readonly sdkRelease: string;
}

export interface FitProfileGeneratedData {
  readonly source: FitProfileSourceMetadata;
  readonly types: readonly FitProfileTypeMetadata[];
  readonly messages: readonly FitProfileMessageMetadata[];
}

export interface ResolvedProfileMessageMetadata extends FitProfileMessageMetadata {
  readonly known: boolean;
}

export interface ResolvedProfileFieldMetadata extends FitProfileFieldMetadata {
  readonly known: boolean;
  readonly messageNumber: number;
  readonly messageName: string;
}

const MESSAGE_BY_NUMBER = new Map<number, FitProfileMessageMetadata>(
  FIT_PROFILE_GENERATED.messages.map((message) => [message.number, message] as const)
);

export const fitProfile = FIT_PROFILE_GENERATED;

export function getProfileMessageMetadata(messageNumber: number): ResolvedProfileMessageMetadata {
  const known = MESSAGE_BY_NUMBER.get(messageNumber);
  if (known) {
    return {
      ...known,
      known: true
    };
  }

  return {
    known: false,
    number: messageNumber,
    name: `unknown_message_${messageNumber}`,
    comment: "Unknown FIT message. Preserve raw data and treat fields as custom.",
    fields: []
  };
}

export function getProfileFieldMetadata(messageNumber: number, fieldNumber: number): ResolvedProfileFieldMetadata {
  const message = MESSAGE_BY_NUMBER.get(messageNumber);
  const field = message?.fields.find((candidate) => candidate.number === fieldNumber);
  if (message && field) {
    return {
      ...field,
      known: true,
      messageNumber,
      messageName: message.name
    };
  }

  const resolvedMessage = message ?? getProfileMessageMetadata(messageNumber);
  return {
    known: false,
    messageNumber,
    messageName: resolvedMessage.name,
    number: fieldNumber,
    name: `unknown_field_${fieldNumber}`,
    baseType: "unknown",
    size: 0,
    values: [],
    comment: "Unknown FIT field. Preserve raw data and allow manual editing."
  };
}

export function hasProfileMessageMetadata(messageNumber: number): boolean {
  return MESSAGE_BY_NUMBER.has(messageNumber);
}

export function hasProfileFieldMetadata(messageNumber: number, fieldNumber: number): boolean {
  const message = MESSAGE_BY_NUMBER.get(messageNumber);
  return Boolean(message?.fields.some((field) => field.number === fieldNumber));
}
