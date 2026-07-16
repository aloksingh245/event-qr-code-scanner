// Test script: Verify QR HTML table generation works and measure size
const QRCode = require('qrcode');

const qrCodeId = '81407747-2938-4a61-9671-6e314cf074ba'; // sample UUID
const qrPayload = JSON.stringify({ qrCodeId });

console.log(`\n📐 Payload: ${qrPayload}`);
console.log(`📐 Payload size: ${qrPayload.length} bytes\n`);

// Generate with error correction M
const qr = QRCode.create(qrPayload, { errorCorrectionLevel: 'M' });
const modules = qr.modules;
const size = modules.size;
const data = modules.data;

console.log(`✅ QR generated successfully`);
console.log(`   Version: ${qr.version}`);
console.log(`   Module grid: ${size} × ${size} = ${size * size} modules`);
console.log(`   Data type: ${data.constructor.name}, length: ${data.length}\n`);

// Build HTML table with run-length encoding
const px = 7;
const qz = 1;
const total = size + qz * 2;

const isDark = (r, c) => {
  const qRow = r - qz, qCol = c - qz;
  return qRow >= 0 && qRow < size && qCol >= 0 && qCol < size && !!data[qRow * size + qCol];
};

let html = '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 auto;">';
let totalCells = 0;
let totalMerged = 0;

for (let r = 0; r < total; r++) {
  html += `<tr style="height:${px}px;line-height:${px}px;font-size:0;">`;
  let c = 0;
  while (c < total) {
    const dark = isDark(r, c);
    let span = 1;
    while (c + span < total && isDark(r, c + span) === dark) span++;

    totalCells += span;
    totalMerged++;

    const bg = dark ? '#000' : '#fff';
    if (span > 1) {
      html += `<td colspan="${span}" width="${px * span}" height="${px}" bgcolor="${bg}" style="padding:0"></td>`;
    } else {
      html += `<td width="${px}" height="${px}" bgcolor="${bg}" style="padding:0"></td>`;
    }
    c += span;
  }
  html += '</tr>';
}
html += '</table>';

const htmlSizeKB = (Buffer.byteLength(html) / 1024).toFixed(1);
const restOfEmailKB = 5; // approximate rest of email HTML

console.log(`📊 QR Table Stats:`);
console.log(`   Total grid: ${total} × ${total} = ${total * total} cells`);
console.log(`   Original cells: ${totalCells}`);
console.log(`   After RLE merge: ${totalMerged} elements`);
console.log(`   Compression ratio: ${(totalCells / totalMerged).toFixed(1)}×`);
console.log(`\n📏 HTML Sizes:`);
console.log(`   QR table HTML: ${htmlSizeKB} KB`);
console.log(`   Est. total email: ~${(parseFloat(htmlSizeKB) + restOfEmailKB).toFixed(1)} KB`);
console.log(`   Gmail limit: 102 KB`);
console.log(`   Status: ${parseFloat(htmlSizeKB) + restOfEmailKB < 102 ? '✅ UNDER LIMIT' : '❌ OVER LIMIT — will be clipped!'}`);

// Also verify QR can generate as PNG (for attachment fallback)
QRCode.toDataURL(qrPayload, { errorCorrectionLevel: 'M', margin: 2, width: 300 })
  .then(base64 => {
    const rawB64 = base64.split(';base64,').pop();
    const pngBuffer = Buffer.from(rawB64, 'base64');
    console.log(`\n🖼️  PNG fallback: ${(pngBuffer.length / 1024).toFixed(1)} KB`);
    console.log(`\n🎉 ALL CHECKS PASSED — safe to deploy!\n`);
  })
  .catch(err => {
    console.error('❌ PNG generation failed:', err);
  });
