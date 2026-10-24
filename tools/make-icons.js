// Draws the Poké Ball home-screen icons into icons/ (no dependencies).
// Usage: node tools/make-icons.js
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const out = path.join(__dirname, "..", "icons");
fs.mkdirSync(out, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

const RED = [217, 58, 43], WHITE = [255, 255, 255], DARK = [29, 29, 31], BG = [247, 247, 245];

// Colour of the point (x, y) in a unit square centred at 0; full-bleed background (iOS rounds corners).
function colour(x, y) {
  const r = Math.hypot(x, y);
  const R = 0.36, line = 0.035, button = 0.1;
  if (r > R + line) return BG;
  if (r > R) return DARK;
  if (r < button - line) return WHITE;
  if (r < button + line) return DARK;
  if (Math.abs(y) < line) return DARK;
  return y < 0 ? RED : WHITE;
}

function png(size) {
  const ss = 4; // supersampling for smooth edges
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let py = 0; py < size; py++) {
    raw[py * (size * 3 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
        const c = colour((px + (sx + 0.5) / ss) / size - 0.5, (py + (sy + 0.5) / ss) / size - 0.5);
        for (let i = 0; i < 3; i++) acc[i] += c[i];
      }
      for (let i = 0; i < 3; i++) raw[py * (size * 3 + 1) + 1 + px * 3 + i] = Math.round(acc[i] / (ss * ss));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [180, 192, 512]) {
  fs.writeFileSync(path.join(out, `icon-${size}.png`), png(size));
  console.log(`icons/icon-${size}.png`);
}
