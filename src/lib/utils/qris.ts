export function generateDynamicQRIS(baseQRIS: string, amount: number): string {
    // 1. Change the Initiation Method tag 010211 (Static) to 010212 (Dynamic).
    let qris = baseQRIS.replace("010211", "010212");

    // 2. Insert the Transaction Amount Tag (54) right before the Country Code (5802ID).
    const amountStr = amount.toString();
    const amountLength = amountStr.length.toString().padStart(2, '0');
    const amountTag = `54${amountLength}${amountStr}`;
    qris = qris.replace("5802ID", `${amountTag}5802ID`);

    // 3. Strip the last 4 characters (the old CRC)
    qris = qris.slice(0, -4);

    // 4. Calculate a new CRC16-CCITT (polynomial 0x1021, initial value 0xFFFF)
    // for the entire modified string (including the trailing 6304).
    const crc = calculateCRC16CCITT(qris);

    // 5. Append the 4-character uppercase Hex CRC
    return qris + crc;
}

function calculateCRC16CCITT(payload: string): string {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
        }
    }
    crc &= 0xFFFF;
    return crc.toString(16).toUpperCase().padStart(4, '0');
}
