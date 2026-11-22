// Downloads starred-Pokémon sprites from PokeAPI/sprites into assets/sprites/<dex>.png (only the ones in use, to keep the repo small).
// #1–386: FireRed/LeafGreen 64×64; #387–1025: PokeAPI's default 96×96 sprites (Black/White through #649, BW-style after),
// drawn at the same pixel size as the FRLG ones (index.html shows them at 96px instead of 64px).
// Usage: node tools/fetch-sprites.js [dex ...] [--force]   no dex: every starred dex in editorial/ that has no sprite yet
//        node tools/fetch-sprites.js --names               add missing Chinese names #1–1025 to sources/pokemon-names-zh.json
//                                                          (PokeAPI zh-Hans; names already in the file are kept)
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const MAX_DEX = 1025;
const RAW = "https://raw.githubusercontent.com/PokeAPI";
const spriteUrl = (dex) => dex <= 386
  ? `${RAW}/sprites/master/sprites/pokemon/versions/generation-iii/firered-leafgreen/${dex}.png`
  : `${RAW}/sprites/master/sprites/pokemon/${dex}.png`;
const spritePath = (dex) => path.join(root, `assets/sprites/${dex}.png`);

// Every dex starred in editorial/: episodes are [rating, summary, dex, tags], extras have a star field.
function starredDex() {
  const out = new Set();
  for (const f of fs.readdirSync(path.join(root, "editorial")).filter((f) => f.endsWith(".json"))) {
    const ed = JSON.parse(fs.readFileSync(path.join(root, "editorial", f), "utf8"));
    for (const ep of Object.values(ed.episodes || {})) if (ep[2] != null) out.add(ep[2]);
    for (const x of ed.extras || []) if (x.star != null) out.add(x.star);
  }
  return [...out].sort((a, b) => a - b);
}

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}

async function fetchNames() {
  const file = path.join(root, "sources/pokemon-names-zh.json");
  const names = JSON.parse(fs.readFileSync(file, "utf8"));
  const csv = await (await get(`${RAW}/pokeapi/master/data/v2/csv/pokemon_species_names.csv`)).text();
  let added = 0;
  for (const line of csv.split("\n").slice(1)) {
    const [id, lang, name] = line.split(",");
    if (lang !== "12" || Number(id) > MAX_DEX || names[id]) continue; // 12 = zh-Hans
    names[id] = name;
    added++;
  }
  const sorted = Object.fromEntries(Object.keys(names).sort((a, b) => a - b).map((k) => [k, names[k]]));
  fs.writeFileSync(file, JSON.stringify(sorted, null, 1) + "\n");
  console.log(`added ${added} names, ${Object.keys(sorted).length} total`);
}

async function fetchSprites(dexes, force) {
  for (const dex of dexes) {
    if (!Number.isInteger(dex) || dex < 1 || dex > MAX_DEX) throw new Error(`Not a national dex number 1–${MAX_DEX}: ${dex}`);
    if (!force && fs.existsSync(spritePath(dex))) continue;
    fs.writeFileSync(spritePath(dex), Buffer.from(await (await get(spriteUrl(dex))).arrayBuffer()));
    console.log(`#${dex} <- ${spriteUrl(dex)}`);
  }
}

(async () => {
  const args = process.argv.slice(2);
  if (args.includes("--names")) return fetchNames();
  const dexes = args.filter((a) => !a.startsWith("--")).map(Number);
  await fetchSprites(dexes.length ? dexes : starredDex(), args.includes("--force"));
})().catch((e) => { console.error(e.message); process.exit(1); });
