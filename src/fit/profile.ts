import { FIT_PROFILE_GENERATED } from "../generated/fitProfile.generated";
import { FIT_PROFILE_COMPATIBILITY } from "../generated/fitProfileCompatibility.generated";

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
  readonly profileSource?: string;
  readonly profileSourceUrl?: string;
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

export interface FitProfileCompatibilitySourceMetadata {
  readonly generatorVersion: string;
  readonly generatedAt: string;
  readonly workbookPath: string;
  readonly workbookSha256: string;
  readonly sourceName: string;
  readonly sourceUrl: string;
}

export interface FitProfileCompatibilityMessageMetadata {
  readonly number?: number;
  readonly name: string;
  readonly comment?: string;
  readonly profileSource?: string;
  readonly profileSourceUrl?: string;
  readonly fields: readonly FitProfileFieldMetadata[];
}

export interface FitProfileCompatibilityData {
  readonly source: FitProfileCompatibilitySourceMetadata;
  readonly messages: readonly FitProfileCompatibilityMessageMetadata[];
}

export interface ResolvedProfileMessageMetadata extends FitProfileMessageMetadata {
  readonly known: boolean;
}

export interface ResolvedProfileFieldMetadata extends FitProfileFieldMetadata {
  readonly known: boolean;
  readonly messageNumber: number;
  readonly messageName: string;
}

const MESSAGE_BY_NUMBER = buildProfileMessageMap();

export const fitProfile: FitProfileGeneratedData = {
  ...FIT_PROFILE_GENERATED,
  messages: [...MESSAGE_BY_NUMBER.values()].sort((left, right) => left.number - right.number)
};

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

function buildProfileMessageMap(): Map<number, FitProfileMessageMetadata> {
  const messagesByNumber = new Map<number, FitProfileMessageMetadata>(
    FIT_PROFILE_GENERATED.messages.map((message) => [message.number, message] as const),
  );
  const officialMessageNumbersByName = new Map(
    FIT_PROFILE_GENERATED.messages.map((message) => [message.name, message.number] as const),
  );

  for (const compatibilityMessage of FIT_PROFILE_COMPATIBILITY.messages) {
    const messageNumber = compatibilityMessage.number ?? officialMessageNumbersByName.get(compatibilityMessage.name);
    if (messageNumber === undefined) {
      continue;
    }

    const existing = messagesByNumber.get(messageNumber);
    const compatibilityFields = compatibilityMessage.fields.map((field) => ({
      ...field,
      profileSource: field.profileSource ?? FIT_PROFILE_COMPATIBILITY.source.sourceName,
      profileSourceUrl: field.profileSourceUrl ?? FIT_PROFILE_COMPATIBILITY.source.sourceUrl,
    }));

    if (!existing) {
      messagesByNumber.set(messageNumber, {
        number: messageNumber,
        name: compatibilityMessage.name,
        comment: compatibilityMessage.comment,
        fields: compatibilityFields,
      });
      continue;
    }

    messagesByNumber.set(messageNumber, mergeCompatibilityFields(existing, compatibilityFields));
  }

  return messagesByNumber;
}

function mergeCompatibilityFields(
  message: FitProfileMessageMetadata,
  compatibilityFields: readonly FitProfileFieldMetadata[],
): FitProfileMessageMetadata {
  const fieldNumbers = new Set(message.fields.map((field) => field.number));
  const missingFields = compatibilityFields.filter((field) => !fieldNumbers.has(field.number));
  if (missingFields.length === 0) {
    return message;
  }

  return {
    ...message,
    fields: [...message.fields, ...missingFields].sort((left, right) => left.number - right.number)
  };
}
