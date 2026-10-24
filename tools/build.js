// Merges raw sources + editorial ratings into data/guide.js (loaded by index.html via <script>,
// so the page also works when opened straight from disk).
// Usage: node tools/build.js
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));

// Seasons in broadcast order. Each has editorial/<id>.json and sources/wikipedia-<id>.json.
const SERIES = ["indigo-league", "orange-islands", "johto-journeys", "johto-league-champions", "master-quest"];

const zh = read("sources/zh-titles-original-series.json");
const imdb = read("sources/imdb-original-series.json");
const tencent = read("sources/tencent-original-series.json");
const tencentMovies = read("sources/tencent-movies.json");
const pokemonZh = read("sources/pokemon-names-zh.json");
const seasons = SERIES.map((id) => ({ id, wiki: read(`sources/wikipedia-${id}.json`), editorial: read(`editorial/${id}.json`) }));

const tencentUrl = (cid, vid) => `https://v.qq.com/x/cover/${cid}/${vid}.html`;
const imdbUrl = (id) => `https://www.imdb.com/title/${id}/`;
// Starred Pokémon: national dex number -> { dex, name }; sprite lives at assets/sprites/<dex>.png.
const starOf = (dex) => {
  if (dex == null) return null;
  if (!pokemonZh[dex]) throw new Error(`No Chinese name for Pokémon #${dex} in sources/pokemon-names-zh.json`);
  if (!fs.existsSync(path.join(root, `assets/sprites/${dex}.png`))) throw new Error(`Missing sprite assets/sprites/${dex}.png`);
  return { dex, name: pokemonZh[dex] };
};
// Optional 4th editorial field: mood tags for picking episodes by taste regardless of rating.
const TAGS = ["cute", "comedy"];
const tagsOf = (tags, where) => {
  for (const t of tags || []) if (!TAGS.includes(t)) throw new Error(`Unknown tag "${t}" on ${where} (allowed: ${TAGS.join(", ")})`);
  return tags || [];
};

// Tencent's one 271-episode album spans all seasons and skips some Japanese episodes; walk both lists in order.
const missing = new Set(seasons.flatMap((s) => s.editorial.tencentMissingJp || []));
const tencentByJp = {};
let t = 0;
for (const s of seasons) for (const ep of s.wiki) {
  if (missing.has(ep.jp)) continue;
  tencentByJp[ep.jp] = tencent.episodes[t++];
}
if (t !== tencent.episodes.length) throw new Error(`Matched ${t} Tencent episodes but the album has ${tencent.episodes.length}`);

const rows = [];
for (const { id, wiki, editorial } of seasons) {
  const season = imdb[`season${editorial.imdbSeason}`];
  for (const ep of wiki) {
    const ed = editorial.episodes[ep.jp];
    if (!ed) throw new Error(`No editorial entry for EP${ep.jp}`);
    const im = season[ep.jp];
    const tx = tencentByJp[ep.jp];
    rows.push({
      type: "episode",
      series: id,
      jp: ep.jp,
      tencentNo: tx ? tx.n : null,
      date: ep.date,
      title: ep.title,
      titleZh: zh[ep.jp] || "",
      japanese: ep.japanese,
      rating: ed[0],
      summary: ed[1],
      star: starOf(ed[2]),
      tags: tagsOf(ed[3], `EP${ep.jp}`),
      imdbRating: im ? im.rating : null,
      imdbVotes: im ? im.votes : null,
      imdbUrl: im ? imdbUrl(im.id) : null,
      tencentUrl: tx ? tencentUrl(tencent.cid, tx.vid) : null,
    });
  }

  for (const x of editorial.extras || []) {
    const im = x.imdb ? imdb.extra[x.imdb] : null;
    const movieVid = x.tencentVid && tencentMovies.episodes.find((e) => e.vid === x.tencentVid);
    if (x.tencentVid && !movieVid) throw new Error(`Unknown Tencent movie vid ${x.tencentVid}`);
    rows.push({
      type: x.type,
      series: id,
      jp: null,
      tencentNo: null,
      date: x.date,
      title: x.title,
      titleZh: x.titleZh,
      japanese: "",
      rating: x.rating,
      summary: x.summary,
      star: starOf(x.star),
      tags: tagsOf(x.tags, x.title),
      imdbRating: im ? im.rating : null,
      imdbVotes: im ? im.votes : null,
      imdbUrl: x.imdb ? imdbUrl(x.imdb) : null,
      tencentUrl: movieVid ? tencentUrl(x.tencentCid, movieVid.vid) : null,
    });
  }
}

// Chronological by Japanese release; episodes before extras on the same day.
rows.sort((a, b) => a.date.localeCompare(b.date) || (a.type === "episode" ? -1 : 1) - (b.type === "episode" ? -1 : 1) || (a.jp || 0) - (b.jp || 0));

const guide = {
  generated: new Date().toISOString(),
  series: seasons.map(({ id, wiki, editorial: e }) => ({
    id, title: e.seriesTitle, titleZh: e.seriesTitleZh, short: e.seriesShortZh,
    from: wiki[0].jp, to: wiki[wiki.length - 1].jp, tencentNote: e.tencentMissingNote || "",
  })),
  rows,
};
const guideJs = `window.GUIDE = ${JSON.stringify(guide, null, 1)};\n`;
fs.writeFileSync(path.join(root, "data/guide.js"), guideJs);
// Stamp index.html's <script> with a content hash: browsers (iOS Safari especially) otherwise keep a
// cached guide.js from an older build next to a newer index.html, and the page renders empty.
const hash = require("crypto").createHash("sha1").update(JSON.stringify({ ...guide, generated: "" })).digest("hex").slice(0, 10);
const indexPath = path.join(root, "index.html");
fs.writeFileSync(indexPath, fs.readFileSync(indexPath, "utf8").replace(/src="data\/guide\.js(\?v=\w+)?"/, `src="data/guide.js?v=${hash}"`));

// Rating budget (see README): about 1/3 of all episodes 4+ and about 10% rated 5 across the whole
// show; each season's 4+ share floats with its quality but stays within 15–50%.
const eps = rows.filter((r) => r.type === "episode");
const pct = (n, d) => `${Math.round((n / d) * 100)}%`;
const share = (list) => {
  const top = list.filter((r) => r.rating >= 4).length;
  const five = list.filter((r) => r.rating === 5).length;
  return { top, five, line: `${list.length} episodes, 4+ ${top} = ${pct(top, list.length)}, 5 ${five} = ${pct(five, list.length)}` };
};
console.log(`${rows.length} rows`);
for (const id of [...new Set(eps.map((r) => r.series))]) {
  const list = eps.filter((r) => r.series === id);
  const { top } = share(list);
  const out = top / list.length < 0.15 || top / list.length > 0.5 ? "  <- outside 15–50%" : "";
  console.log(`  ${id}: ${share(list).line}${out}`);
}
console.log(`  overall: ${share(eps).line} (target ≈33% / ≈10%)`);
for (const t of TAGS) {
  const list = eps.filter((r) => r.tags.includes(t));
  const byRating = [5, 4, 3, 2, 1].map((n) => `${n}:${list.filter((r) => r.rating === n).length}`).join(" ");
  console.log(`  ${t}: ${list.length} episodes (${byRating})`);
}
