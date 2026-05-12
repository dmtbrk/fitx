import type { FitBaseTypeInfo, FitScalarValue, FitValue } from "./types";

interface NumericEncodingOptions {
  readonly integer?: boolean;
  readonly min?: number;
  readonly max?: number;
}

function requireNumber(value: FitScalarValue, typeName: string, options: NumericEncodingOptions = {}): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return validateNumber(value, typeName, options);
  }
  if (typeof value === "bigint") {
    return validateNumber(Number(value), typeName, options);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return validateNumber(parsed, typeName, options);
    }
  }
  throw new Error(`Cannot encode ${String(value)} as ${typeName}.`);
}

function validateNumber(value: number, typeName: string, options: NumericEncodingOptions): number {
  if (options.integer && !Number.isInteger(value)) {
    throw new Error(`Cannot encode fractional value ${value} as ${typeName}.`);
  }
  if (options.min !== undefined && value < options.min) {
    throw new Error(`Cannot encode ${value} as ${typeName}; minimum is ${options.min}.`);
  }
  if (options.max !== undefined && value > options.max) {
    throw new Error(`Cannot encode ${value} as ${typeName}; maximum is ${options.max}.`);
  }
  return value;
}

function requireBigInt(value: FitScalarValue, typeName: string, min: bigint, max: bigint): bigint {
  let parsed: bigint;
  if (typeof value === "bigint") {
    parsed = value;
  } else if (typeof value === "number" && Number.isSafeInteger(value)) {
    parsed = BigInt(value);
  } else if (typeof value === "string" && value.trim() !== "") {
    try {
      parsed = BigInt(value);
    } catch {
      throw new Error(`Cannot encode ${String(value)} as ${typeName}.`);
    }
  } else {
    throw new Error(`Cannot encode ${String(value)} as ${typeName}.`);
  }

  if (parsed < min || parsed > max) {
    throw new Error(`Cannot encode ${parsed.toString()} as ${typeName}; range is ${min.toString()} to ${max.toString()}.`);
  }
  return parsed;
}

function makeNumberType(
  id: number,
  name: string,
  size: number,
  invalid: number,
  read: FitBaseTypeInfo["read"],
  write: FitBaseTypeInfo["write"]
): FitBaseTypeInfo {
  return {
    id,
    normalizedId: id & 0x1f,
    name,
    size,
    invalid,
    read,
    write
  };
}

export const FIT_BASE_TYPES: Record<number, FitBaseTypeInfo> = {
  0x00: makeNumberType(0x00, "enum", 1, 0xff, (view, offset) => view.getUint8(offset), (view, offset, value) => view.setUint8(offset, requireNumber(value, "enum", { integer: true, min: 0, max: 0xff }))),
  0x01: makeNumberType(0x01, "sint8", 1, 0x7f, (view, offset) => view.getInt8(offset), (view, offset, value) => view.setInt8(offset, requireNumber(value, "sint8", { integer: true, min: -0x80, max: 0x7f }))),
  0x02: makeNumberType(0x02, "uint8", 1, 0xff, (view, offset) => view.getUint8(offset), (view, offset, value) => view.setUint8(offset, requireNumber(value, "uint8", { integer: true, min: 0, max: 0xff }))),
  0x83: makeNumberType(0x83, "sint16", 2, 0x7fff, (view, offset, littleEndian) => view.getInt16(offset, littleEndian), (view, offset, value, littleEndian) => view.setInt16(offset, requireNumber(value, "sint16", { integer: true, min: -0x8000, max: 0x7fff }), littleEndian)),
  0x84: makeNumberType(0x84, "uint16", 2, 0xffff, (view, offset, littleEndian) => view.getUint16(offset, littleEndian), (view, offset, value, littleEndian) => view.setUint16(offset, requireNumber(value, "uint16", { integer: true, min: 0, max: 0xffff }), littleEndian)),
  0x85: makeNumberType(0x85, "sint32", 4, 0x7fffffff, (view, offset, littleEndian) => view.getInt32(offset, littleEndian), (view, offset, value, littleEndian) => view.setInt32(offset, requireNumber(value, "sint32", { integer: true, min: -0x80000000, max: 0x7fffffff }), littleEndian)),
  0x86: makeNumberType(0x86, "uint32", 4, 0xffffffff, (view, offset, littleEndian) => view.getUint32(offset, littleEndian), (view, offset, value, littleEndian) => view.setUint32(offset, requireNumber(value, "uint32", { integer: true, min: 0, max: 0xffffffff }), littleEndian)),
  0x07: {
    id: 0x07,
    normalizedId: 0x07,
    name: "string",
    size: 1,
    invalid: 0,
    read: (view, offset) => view.getUint8(offset),
    write: (view, offset, value) => view.setUint8(offset, requireNumber(value, "string byte", { integer: true, min: 0, max: 0xff }))
  },
  0x88: makeNumberType(0x88, "float32", 4, 0xffffffff, (view, offset, littleEndian) => view.getFloat32(offset, littleEndian), (view, offset, value, littleEndian) => view.setFloat32(offset, requireNumber(value, "float32"), littleEndian)),
  0x89: {
    id: 0x89,
    normalizedId: 0x09,
    name: "float64",
    size: 8,
    invalid: null,
    read: (view, offset, littleEndian) => view.getFloat64(offset, littleEndian),
    write: (view, offset, value, littleEndian) => view.setFloat64(offset, requireNumber(value, "float64"), littleEndian)
  },
  0x0a: makeNumberType(0x0a, "uint8z", 1, 0x00, (view, offset) => view.getUint8(offset), (view, offset, value) => view.setUint8(offset, requireNumber(value, "uint8z", { integer: true, min: 0, max: 0xff }))),
  0x8b: makeNumberType(0x8b, "uint16z", 2, 0x0000, (view, offset, littleEndian) => view.getUint16(offset, littleEndian), (view, offset, value, littleEndian) => view.setUint16(offset, requireNumber(value, "uint16z", { integer: true, min: 0, max: 0xffff }), littleEndian)),
  0x8c: makeNumberType(0x8c, "uint32z", 4, 0x00000000, (view, offset, littleEndian) => view.getUint32(offset, littleEndian), (view, offset, value, littleEndian) => view.setUint32(offset, requireNumber(value, "uint32z", { integer: true, min: 0, max: 0xffffffff }), littleEndian)),
  0x0d: makeNumberType(0x0d, "byte", 1, 0xff, (view, offset) => view.getUint8(offset), (view, offset, value) => view.setUint8(offset, requireNumber(value, "byte", { integer: true, min: 0, max: 0xff }))),
  0x8e: {
    id: 0x8e,
    normalizedId: 0x0e,
    name: "sint64",
    size: 8,
    invalid: 0x7fffffffffffffffn,
    read: (view, offset, littleEndian) => view.getBigInt64(offset, littleEndian),
    write: (view, offset, value, littleEndian) => view.setBigInt64(offset, requireBigInt(value, "sint64", -0x8000000000000000n, 0x7fffffffffffffffn), littleEndian)
  },
  0x8f: {
    id: 0x8f,
    normalizedId: 0x0f,
    name: "uint64",
    size: 8,
    invalid: 0xffffffffffffffffn,
    read: (view, offset, littleEndian) => view.getBigUint64(offset, littleEndian),
    write: (view, offset, value, littleEndian) => view.setBigUint64(offset, requireBigInt(value, "uint64", 0n, 0xffffffffffffffffn), littleEndian)
  },
  0x90: {
    id: 0x90,
    normalizedId: 0x10,
    name: "uint64z",
    size: 8,
    invalid: 0x0000000000000000n,
    read: (view, offset, littleEndian) => view.getBigUint64(offset, littleEndian),
    write: (view, offset, value, littleEndian) => view.setBigUint64(offset, requireBigInt(value, "uint64z", 0n, 0xffffffffffffffffn), littleEndian)
  }
};

const BASE_TYPES_BY_NORMALIZED_ID = new Map<number, FitBaseTypeInfo>(
  Object.values(FIT_BASE_TYPES).map((type) => [type.normalizedId, type])
);

export function getFitBaseType(baseType: number): FitBaseTypeInfo {
  return FIT_BASE_TYPES[baseType] ?? BASE_TYPES_BY_NORMALIZED_ID.get(baseType & 0x1f) ?? FIT_BASE_TYPES[0x0d];
}

export function isInvalidFitValue(value: FitScalarValue, invalid: number | bigint | null): boolean {
  if (value == null || invalid == null) {
    return false;
  }
  if (typeof value === "bigint") {
    return BigInt(invalid) === value;
  }
  if (typeof value === "number") {
    return Number(invalid) === value;
  }
  return false;
}

export function fitValueToArray(value: FitValue): FitScalarValue[] {
  return Array.isArray(value) ? value : [value];
}

export function isInvalidFloatBits(view: DataView, offset: number, baseTypeName: string, littleEndian: boolean): boolean {
  if (baseTypeName === "float32") {
    return view.getUint32(offset, littleEndian) === 0xffffffff;
  }
  if (baseTypeName === "float64") {
    return view.getBigUint64(offset, littleEndian) === 0xffffffffffffffffn;
  }
  return false;
}

export function writeInvalidFitValue(view: DataView, offset: number, baseType: FitBaseTypeInfo, littleEndian: boolean): void {
  if (baseType.name === "float32") {
    view.setUint32(offset, 0xffffffff, littleEndian);
    return;
  }
  if (baseType.name === "float64") {
    view.setBigUint64(offset, 0xffffffffffffffffn, littleEndian);
    return;
  }
  baseType.write(view, offset, baseType.invalid, littleEndian);
}
