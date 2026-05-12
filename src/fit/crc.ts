const CRC_TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400,
  0xf001, 0x3c00, 0x2800, 0xe401,
  0xa001, 0x6c00, 0x7800, 0xb401,
  0x5000, 0x9c01, 0x8801, 0x4400
] as const;

export function updateFitCrc(crc: number, byte: number): number {
  let next = crc & 0xffff;
  let tmp = CRC_TABLE[next & 0x0f];
  next = ((next >> 4) & 0x0fff) ^ tmp ^ CRC_TABLE[byte & 0x0f];
  tmp = CRC_TABLE[next & 0x0f];
  next = ((next >> 4) & 0x0fff) ^ tmp ^ CRC_TABLE[(byte >> 4) & 0x0f];
  return next & 0xffff;
}

export function calculateFitCrc(bytes: Uint8Array, start = 0, end = bytes.byteLength): number {
  let crc = 0;
  for (let index = start; index < end; index += 1) {
    crc = updateFitCrc(crc, bytes[index]);
  }
  return crc;
}

export function readUint16Le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

export function writeUint16Le(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
}
