/**
 * CRC16-CCITT calculation for QRIS.
 * Polynomial: 0x1021, Initial: 0xFFFF
 */
export function crc16(data: string): string {
    let crc = 0xffff;
    for (let i = 0; i < data.length; i++) {
        let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xff;
        x ^= x >> 4;
        crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Generates a dynamic QRIS string with the specified amount.
 * 
 * @param baseQRIS The static base QRIS string
 * @param amount The numerical amount to pay
 * @returns Modified QRIS string with amount and new CRC
 */
export function generateDynamicQRIS(baseQRIS: string, amount: number): string {
    // 1. Change Initiation Method (Tag 01) from 11 (Static) to 12 (Dynamic)
    // Usually at the beginning: 000201 0102 11 -> 12
    let qris = baseQRIS.replace("010211", "010212");

    // 2. Prepare Amount Tag (Tag 54)
    // Format: 54 + length(2 digits) + amount string
    const amountStr = Math.floor(amount).toString();
    const amountTag = "54" + amountStr.length.toString().padStart(2, "0") + amountStr;

    // 3. Insert Amount Tag before Country Code (Tag 58)
    const countryCodeTag = "5802ID";
    const insertIndex = qris.indexOf(countryCodeTag);

    if (insertIndex !== -1) {
        qris = qris.slice(0, insertIndex) + amountTag + qris.slice(insertIndex);
    } else {
        // Fallback if tag 58 is not found (shouldn't happen with standard QRIS)
        // We'll append it before CRC tag 63
        const crcTag = "6304";
        const crcIndex = qris.lastIndexOf(crcTag);
        if (crcIndex !== -1) {
            qris = qris.slice(0, crcIndex) + amountTag + qris.slice(crcIndex);
        }
    }

    // 4. Strip old CRC (last 4 chars)
    // The base string should already end with 6304 + 4 chars of CRC
    // We keep everything up to and including '6304'
    const crcTagStart = qris.lastIndexOf("6304");
    if (crcTagStart !== -1) {
        qris = qris.slice(0, crcTagStart + 4);
    } else {
        qris += "6304";
    }

    // 5. Calculate and append new CRC
    const newCrc = crc16(qris);
    return qris + newCrc;
}
