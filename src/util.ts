// Convert a hex string to a byte array
export const hexTou8 = (hex: string): Uint8Array => {
    let bytes: Array<number> = [];
    for (let c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return Uint8Array.from(bytes);
}

// Convert a byte array to a hex string
export const u8ToHex = (bytes: Uint8Array): string => {
    let hex: Array<string> = [];
    for (let i = 0; i < bytes.length; i++) {
        var current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
        hex.push((current >>> 4).toString(16));
        hex.push((current & 0xF).toString(16));
    }
    return hex.join("");
}