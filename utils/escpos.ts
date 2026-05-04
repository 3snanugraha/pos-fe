/**
 * ESC/POS Encoder for RawBT/Thermer thermal printing
 * Compatible with React Native / Expo
 */

// Polyfill btoa for React Native environments where it may not exist
const encodeBase64 = (binary: string): string => {
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  // Manual Base64 encoding
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let result = "";
  let i = 0;
  while (i < binary.length) {
    const a = binary.charCodeAt(i++);
    const b = i < binary.length ? binary.charCodeAt(i++) : 0;
    const c = i < binary.length ? binary.charCodeAt(i++) : 0;
    const bitmap = (a << 16) | (b << 8) | c;
    result += chars.charAt((bitmap >> 18) & 63);
    result += chars.charAt((bitmap >> 12) & 63);
    result += i - 2 < binary.length ? chars.charAt((bitmap >> 6) & 63) : "=";
    result += i - 1 < binary.length ? chars.charAt(bitmap & 63) : "=";
  }
  return result;
};

export class EscPosEncoder {
  private buffer: number[] = [];

  constructor() {
    this.initialize();
  }

  initialize() {
    this.buffer.push(0x1b, 0x40);
    return this;
  }

  align(direction: "left" | "center" | "right") {
    const n = direction === "center" ? 1 : direction === "right" ? 2 : 0;
    this.buffer.push(0x1b, 0x61, n);
    return this;
  }

  bold(active: boolean) {
    this.buffer.push(0x1b, 0x45, active ? 1 : 0);
    return this;
  }

  size(width: number, height: number) {
    if (width < 1) width = 1;
    else if (width > 8) width = 8;
    if (height < 1) height = 1;
    else if (height > 8) height = 8;
    const n = ((width - 1) << 4) | (height - 1);
    this.buffer.push(0x1d, 0x21, n);
    return this;
  }

  text(content: string) {
    for (let i = 0; i < content.length; i++) {
      this.buffer.push(content.charCodeAt(i));
    }
    return this;
  }

  newline(count: number = 1) {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  line(char: string = "-") {
    this.text(char.repeat(32));
    this.newline();
    return this;
  }

  qr(content: string, size: number = 6) {
    const storeLen = content.length + 3;
    const storepL = storeLen % 256;
    const storepH = Math.floor(storeLen / 256);

    // Set Model 2
    this.buffer.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    // Set Size
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size);
    // Set Error Correction Level M
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 49);
    // Store Data
    this.buffer.push(0x1d, 0x28, 0x6b, storepL, storepH, 0x31, 0x50, 48);
    for (let i = 0; i < content.length; i++) {
      this.buffer.push(content.charCodeAt(i));
    }
    // Print
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 48);
    return this;
  }

  cut() {
    this.buffer.push(0x1d, 0x56, 66, 0);
    return this;
  }

  toBase64(): string {
    const uint8 = new Uint8Array(this.buffer);
    let binary = "";
    for (let i = 0; i < uint8.byteLength; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return encodeBase64(binary);
  }

  getURI(): string {
    return `rawbt:base64,${this.toBase64()}`;
  }
}
