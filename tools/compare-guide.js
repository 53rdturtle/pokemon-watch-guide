// Deep-compares the rows and series of two builds of a show, e.g. before and after a build.js refactor.
// Usage: node tools/compare-guide.js <before.js> <after.js> [show]
// Either file may be the old single-show data/guide.js (window.GUIDE) or a data/<show>.js (window.GUIDES[show]).
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const [before, after, show = "pokemon"] = process.argv.slice(2);
const load = (file) => {
  const window = {};
  vm.runInNewContext(fs.readFileSync(file, "utf8"), { window });
  const g = window.GUIDE || (window.GUIDES || {})[show];
  if (!g) throw new Error(`${file}: no window.GUIDE or window.GUIDES[${JSON.stringify(show)}]`);
  return JSON.parse(JSON.stringify(g)); // plain objects: each vm context has its own Object prototype
};
const a = load(before), b = load(after);
let diffs = 0;
for (const key of ["series", "rows"]) {
  try {
    assert.deepStrictEqual(b[key], a[key]);
    console.log(`${key}: identical (${a[key].length})`);
  } catch (e) {
    diffs++;
    const i = a[key].findIndex((x, j) => { try { assert.deepStrictEqual(b[key][j], x); return false; } catch { return true; } });
    console.log(`${key}: DIFFERENT (${a[key].length} before, ${b[key].length} after); first difference at [${i}]:`);
    console.log("  before:", JSON.stringify(a[key][i]));
    console.log("  after: ", JSON.stringify(b[key][i]));
  }
}
process.exit(diffs ? 1 : 0);
