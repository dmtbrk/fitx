import type { ResolvedProfileFieldMetadata, ResolvedProfileMessageMetadata } from "./profile";

export type FitScalarValue = string | number | bigint | null;
export type FitValue = FitScalarValue | FitScalarValue[];

export type FitRecordKind = "definition" | "data";
export type FitArchitecture = 0 | 1;
export type FitRecordHeaderKind = "normal" | "compressed-timestamp";

export interface FitByteSpan {
  readonly start: number;
  readonly end: number;
}

export interface FitHeader {
  readonly headerSize: 12 | 14;
  readonly protocolVersionRaw: number;
  readonly profileVersionRaw: number;
  readonly protocolVersion: string;
  readonly profileVersion: string;
  readonly dataSize: number;
  readonly dataType: ".FIT";
  readonly headerCrc?: number;
  readonly headerCrcValid?: boolean;
}

export interface FitChecksumState {
  readonly fileCrc: number;
  readonly fileCrcValid: boolean;
}

export interface FitDefinitionField {
  readonly number: number;
  readonly size: number;
  readonly baseType: number;
  readonly baseTypeName: string;
}

export interface FitDeveloperFieldDefinition {
  readonly number: number;
  readonly size: number;
  readonly developerDataIndex: number;
}

export interface FitDefinitionRecord {
  readonly kind: "definition";
  readonly id: string;
  readonly order: number;
  readonly localMessageType: number;
  readonly hasDeveloperData: boolean;
  readonly reserved: number;
  readonly architecture: FitArchitecture;
  readonly littleEndian: boolean;
  readonly globalMessageNumber: number;
  readonly message: ResolvedProfileMessageMetadata;
  readonly fields: FitDefinitionField[];
  readonly developerFields: FitDeveloperFieldDefinition[];
  readonly span: FitByteSpan;
}

export interface FitDataField {
  readonly id: string;
  readonly number: number;
  readonly name: string;
  readonly baseType: number;
  readonly baseTypeName: string;
  readonly size: number;
  readonly value: FitValue;
  readonly rawValue: FitValue;
  readonly units?: string;
  readonly known: boolean;
  readonly profile: ResolvedProfileFieldMetadata;
  readonly span: FitByteSpan;
  readonly developer?: false;
  readonly added?: true;
}

export interface FitDeveloperDataField {
  readonly id: string;
  readonly number: number;
  readonly name: string;
  readonly size: number;
  readonly value: FitValue;
  readonly rawValue: FitValue;
  readonly developerDataIndex: number;
  readonly span: FitByteSpan;
  readonly developer: true;
  readonly added?: true;
}

export type FitField = FitDataField | FitDeveloperDataField;

export interface FitDataRecord {
  readonly kind: "data";
  readonly id: string;
  readonly order: number;
  readonly recordHeaderKind: FitRecordHeaderKind;
  readonly recordHeader: number;
  readonly localMessageType: number;
  readonly compressedTimestampOffset?: number;
  readonly globalMessageNumber: number;
  readonly messageName: string;
  readonly definitionId: string;
  readonly fields: FitField[];
  readonly span: FitByteSpan;
}

export type FitRecord = FitDefinitionRecord | FitDataRecord;

export interface FitFileIssue {
  readonly scope: "file";
  readonly code: string;
  readonly message: string;
}

export interface FitDocument {
  readonly source: ArrayBuffer;
  readonly fileName: string;
  readonly fileSize: number;
  readonly header: FitHeader;
  readonly checksum: FitChecksumState;
  readonly records: FitRecord[];
  readonly definitions: FitDefinitionRecord[];
  readonly messages: FitDataRecord[];
  readonly issues: FitFileIssue[];
}

export interface FitBaseTypeInfo {
  readonly id: number;
  readonly normalizedId: number;
  readonly name: string;
  readonly size: number;
  readonly invalid: number | bigint | null;
  readonly read: (view: DataView, offset: number, littleEndian: boolean) => FitScalarValue;
  readonly write: (view: DataView, offset: number, value: FitScalarValue, littleEndian: boolean) => void;
}

export interface FitFieldValueEdit {
  readonly messageId: string;
  readonly fieldId?: string;
  readonly fieldNumber: number;
  readonly value: FitValue;
  readonly developer?: boolean;
  readonly developerDataIndex?: number;
  readonly added?: true;
  readonly fieldName?: string;
  readonly baseType?: number;
  readonly baseTypeName?: string;
  readonly size?: number;
  readonly units?: string;
}

export interface FitInsertedMessage {
  readonly id: string;
  readonly origin: "duplicate" | "raw";
  readonly position: {
    readonly afterMessageId: string | null;
    readonly beforeMessageId: string | null;
  };
  readonly sourceMessageId?: string;
  readonly message: FitDataRecord;
}
