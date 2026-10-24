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
fs.writeFileSync(path.join(root, "data/guide.js"), `window.GUIDE = ${JSON.stringify(guide, null, 1)};\n`);

const eps = rows.filter((r) => r.type === "episode");
const pct = (list) => `${list.filter((r) => r.rating >= 4).length}/${list.length} = ${Math.round((list.filter((r) => r.rating >= 4).length / list.length) * 100)}%`;
console.log(`${rows.length} rows (${eps.length} episodes, rated 4+: ${pct(eps)})`);
for (const s of SERIES) console.log(`  ${s}: rated 4+ ${pct(eps.filter((r) => r.series === s))}`);
