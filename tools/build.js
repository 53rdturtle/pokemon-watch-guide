// Merges raw sources + editorial ratings into one data/<show>.js per show (loaded by index.html via a
// <script> tag, so the page also works when opened straight from disk).
// Usage: node tools/build.js
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const readOpt = (p) => (exists(p) ? read(p) : null);

// Shows → series → seasons. A series has its own episode numbering (prefix), Chinese titles, IMDb seasons
// and streaming album; its seasons are in broadcast order. Per show, under editorial/<show>/ and sources/<show>/:
//   editorial/<season>.json         ratings, summaries, stars, tags and extras (games/movies/events)
//   sources/wikipedia-<season>.json episode list: jp number, date, English and Japanese titles (required)
//   sources/zh-titles-<series>.json Chinese titles by jp number (optional)
//   sources/imdb-<series>.json      IMDb ratings by season (optional; editorial imdbSeason picks the season)
//   sources/<link>-<series>.json    streaming album (required unless the series has link: null)
// Show options:
//   stars  null, or { names, sprites }: the editorial 3rd field is an id with a Chinese name in `names`
//          and a sprite at <sprites>/<id>.png (Pokémon: national dex number).
//   tags   allowed values of the editorial 4th field, with their page labels.
//   extrasAlbum  optional sources/<show>/<name>.json album that extras' tencentVid must be in.
// Series options: link = streaming provider ("tencent" by default; null when there's no album).
const SHOWS = [
  {
    id: "pokemon",
    nameZh: "宝可梦",
    stars: { names: "sources/pokemon-names-zh.json", sprites: "assets/sprites" },
    tags: { cute: "可爱", comedy: "搞笑" },
    extrasAlbum: "tencent-movies",
    series: [
      { id: "original-series", nameZh: "无印", prefix: "EP", seasons: ["indigo-league", "orange-islands", "johto-journeys", "johto-league-champions", "master-quest"] },
      { id: "advanced-generation", nameZh: "超世代", prefix: "AG", seasons: ["advanced", "advanced-challenge", "advanced-battle", "battle-frontier"] },
    ],
  },
];

const PROVIDERS = {
  tencent: { url: (cid, vid) => `https://v.qq.com/x/cover/${cid}/${vid}.html` },
};
const imdbUrl = (id) => `https://www.imdb.com/title/${id}/`;
const code = (g, jp) => `${g.prefix}${String(jp).padStart(3, "0")}`;
const pct = (n, d) => `${Math.round((n / d) * 100)}%`;

const manifest = [];
for (const show of SHOWS) manifest.push({ id: show.id, nameZh: show.nameZh, v: buildShow(show) });

// Stamp index.html's inline manifest with each data file's content hash: browsers (iOS Safari especially)
// otherwise keep a cached data file from an older build next to a newer index.html, and the page renders
// empty. The manifest is inline script, so a data change also triggers the page's auto-reload.
const indexPath = path.join(root, "index.html");
const html = fs.readFileSync(indexPath, "utf8");
const manifestTag = `<script id="shows">window.SHOWS = ${JSON.stringify(manifest)};</script>`;
if (!/<script id="shows">.*<\/script>/.test(html)) throw new Error('index.html has no <script id="shows"> manifest');
fs.writeFileSync(indexPath, html.replace(/<script id="shows">.*<\/script>/, () => manifestTag));

function buildShow(show) {
  const dir = (kind, name) => `${kind}/${show.id}/${name}.json`;
  const extrasAlbum = show.extrasAlbum ? read(dir("sources", show.extrasAlbum)) : null;
  const starNames = show.stars ? read(show.stars.names) : null;
  const groups = show.series.map((g) => {
    const link = g.link === undefined ? "tencent" : g.link;
    if (link && !PROVIDERS[link]) throw new Error(`${show.id}/${g.id}: unknown link provider "${link}"`);
    return {
      ...g,
      link,
      zh: readOpt(dir("sources", `zh-titles-${g.id}`)) || {},
      imdb: readOpt(dir("sources", `imdb-${g.id}`)),
      album: link ? read(dir("sources", `${link}-${g.id}`)) : null,
      seasons: g.seasons.map((id) => ({ id, wiki: read(dir("sources", `wikipedia-${id}`)), editorial: read(dir("editorial", id)) })),
    };
  });
  const imdbExtra = Object.assign({}, ...groups.map((g) => (g.imdb && g.imdb.extra) || {}));
  const seasons = groups.flatMap((g) => g.seasons.map((s) => ({ ...s, group: g })));

  // Optional 3rd editorial field: the episode's star (a sprite + name shown next to the episode).
  const starOf = (id, where) => {
    if (id == null) return null;
    if (!show.stars) throw new Error(`${where} has a star but ${show.id} has no star sprites`);
    if (!starNames[id]) throw new Error(`No Chinese name for star #${id} in ${show.stars.names}`);
    if (!exists(`${show.stars.sprites}/${id}.png`)) throw new Error(`Missing sprite ${show.stars.sprites}/${id}.png`);
    return { dex: id, name: starNames[id] };
  };
  // Optional 4th editorial field: tags from the show's vocabulary (Pokémon: moods for picking episodes by taste regardless of rating).
  const TAGS = Object.keys(show.tags || {});
  const tagsOf = (tags, where) => {
    for (const t of tags || []) if (!TAGS.includes(t)) throw new Error(`Unknown tag "${t}" on ${where} (allowed: ${TAGS.join(", ") || "none"})`);
    return tags || [];
  };

  // Each series has one streaming album spanning all its seasons that may skip some Japanese episodes; walk both lists in order.
  const albumByCode = {};
  for (const g of groups) {
    if (!g.album) continue;
    const missing = new Set(g.seasons.flatMap((s) => s.editorial.tencentMissingJp || []));
    let t = 0;
    for (const s of g.seasons) for (const ep of s.wiki) {
      if (missing.has(ep.jp)) continue;
      albumByCode[code(g, ep.jp)] = g.album.episodes[t++];
    }
    if (t !== g.album.episodes.length) throw new Error(`${g.id}: matched ${t} ${g.link} episodes but the album has ${g.album.episodes.length}`);
  }

  const rows = [];
  for (const { id, wiki, editorial, group: g } of seasons) {
    const season = g.imdb ? g.imdb[`season${editorial.imdbSeason}`] || {} : {};
    for (const ep of wiki) {
      const ed = editorial.episodes[ep.jp];
      if (!ed) throw new Error(`No editorial entry for ${code(g, ep.jp)}`);
      const im = season[ep.jp];
      const tx = albumByCode[code(g, ep.jp)];
      rows.push({
        type: "episode",
        series: id,
        jp: ep.jp,
        code: code(g, ep.jp),
        tencentNo: tx ? tx.n : null,
        date: ep.date,
        title: ep.title,
        titleZh: g.zh[ep.jp] || "",
        japanese: ep.japanese,
        rating: ed[0],
        summary: ed[1],
        star: starOf(ed[2], code(g, ep.jp)),
        tags: tagsOf(ed[3], code(g, ep.jp)),
        imdbRating: im ? im.rating : null,
        imdbVotes: im ? im.votes : null,
        imdbUrl: im ? imdbUrl(im.id) : null,
        tencentUrl: tx ? PROVIDERS[g.link].url(g.album.cid, tx.vid) : null,
      });
    }

    for (const x of editorial.extras || []) {
      const im = x.imdb ? imdbExtra[x.imdb] : null;
      if (x.imdb && !im) throw new Error(`No IMDb rating for ${x.imdb} (${x.title})`);
      const movieVid = x.tencentVid && extrasAlbum && extrasAlbum.episodes.find((e) => e.vid === x.tencentVid);
      if (x.tencentVid && !movieVid) throw new Error(`Unknown Tencent movie vid ${x.tencentVid}`);
      rows.push({
        type: x.type,
        series: id,
        jp: null,
        code: null,
        tencentNo: null,
        date: x.date,
        title: x.title,
        titleZh: x.titleZh,
        japanese: "",
        rating: x.rating,
        summary: x.summary,
        star: starOf(x.star, x.title),
        tags: tagsOf(x.tags, x.title),
        imdbRating: im ? im.rating : null,
        imdbVotes: im ? im.votes : null,
        imdbUrl: x.imdb ? imdbUrl(x.imdb) : null,
        tencentUrl: movieVid ? PROVIDERS.tencent.url(x.tencentCid, movieVid.vid) : null,
      });
    }
  }

  // Chronological by Japanese release; episodes before extras on the same day.
  rows.sort((a, b) => a.date.localeCompare(b.date) || (a.type === "episode" ? -1 : 1) - (b.type === "episode" ? -1 : 1) || (a.jp || 0) - (b.jp || 0));

  const guide = {
    generated: new Date().toISOString(),
    show: { id: show.id, nameZh: show.nameZh, tags: show.tags || {}, sprites: show.stars ? show.stars.sprites : null },
    groups: groups.map((g) => ({ id: g.id, name: g.nameZh, prefix: g.prefix, link: g.link })),
    series: seasons.map(({ id, wiki, editorial: e, group: g }) => ({
      id, title: e.seriesTitle, titleZh: e.seriesTitleZh, short: e.seriesShortZh, group: g.nameZh,
      from: code(g, wiki[0].jp), to: code(g, wiki[wiki.length - 1].jp), tencentNote: e.tencentMissingNote || "",
    })),
    rows,
  };
  const js = `window.GUIDES = window.GUIDES || {};\nwindow.GUIDES[${JSON.stringify(show.id)}] = ${JSON.stringify(guide, null, 1)};\n`;
  fs.writeFileSync(path.join(root, `data/${show.id}.js`), js);

  // Rating budget (see README): about 1/3 of all episodes 4+ and about 10% rated 5 across the whole
  // show; each season's 4+ share floats with its quality but stays within 15–50%. About half of all
  // episodes are 3+: a 3 is an episode that is a little special, cute or comedic.
  const eps = rows.filter((r) => r.type === "episode");
  const share = (list) => {
    const top = list.filter((r) => r.rating >= 4).length;
    const five = list.filter((r) => r.rating === 5).length;
    const three = list.filter((r) => r.rating >= 3).length;
    return { top, five, line: `${list.length} episodes, 3+ ${three} = ${pct(three, list.length)}, 4+ ${top} = ${pct(top, list.length)}, 5 ${five} = ${pct(five, list.length)}` };
  };
  console.log(`${show.id} (${show.nameZh}): ${rows.length} rows → data/${show.id}.js`);
  for (const id of [...new Set(eps.map((r) => r.series))]) {
    const list = eps.filter((r) => r.series === id);
    const { top } = share(list);
    const out = top / list.length < 0.15 || top / list.length > 0.5 ? "  <- outside 15–50%" : "";
    console.log(`  ${id}: ${share(list).line}${out}`);
  }
  for (const g of groups) {
    const ids = g.seasons.map((s) => s.id);
    console.log(`  ${g.nameZh}: ${share(eps.filter((r) => ids.includes(r.series))).line}`);
  }
  console.log(`  ${show.id} overall: ${share(eps).line} (target 3+ ≈50%, 4+ ≈33%, 5 ≈10%)`);
  for (const t of TAGS) {
    const list = eps.filter((r) => r.tags.includes(t));
    const byRating = [5, 4, 3, 2, 1].map((n) => `${n}:${list.filter((r) => r.rating === n).length}`).join(" ");
    console.log(`  ${t}: ${list.length} episodes (${byRating})`);
  }

  return require("crypto").createHash("sha1").update(JSON.stringify({ ...guide, generated: "" })).digest("hex").slice(0, 10);
}
