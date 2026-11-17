// Fast check for a no-build static app: the scripts parse, content.json is
// well formed, and every file the service worker precaches exists.
// Run from the repo root with Node 18+.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const fail = (msg) => { console.error(`check failed: ${msg}`); process.exit(1); };

// app.js loads as a module (top-level await); sw.js is a classic service worker script.
for (const [f, args] of [["app.js", ["--input-type=module"]], ["sw.js", []]]) {
  try { execFileSync(process.execPath, ["--check", ...args], { input: readFileSync(f), stdio: ["pipe", "pipe", "pipe"] }); }
  catch (e) { fail(`${f} does not parse\n${e.stderr}`); }
}

let data;
try { data = JSON.parse(readFileSync("content.json", "utf8")); }
catch (e) { fail(`content.json is not valid JSON: ${e.message}`); }
if (!Array.isArray(data.batches)) fail("content.json has no batches array");

const seen = new Set();
for (const b of data.batches) {
  if (!b.id || !b.title) fail(`a batch is missing id or title`);
  if (!["speak", "listen"].includes(b.list)) fail(`batch ${b.id}: list must be "speak" or "listen"`);
  if (seen.has(b.id)) fail(`duplicate batch id ${b.id}`);
  seen.add(b.id);
  if (!Array.isArray(b.items)) fail(`batch ${b.id} has no items array`);
  for (const it of b.items) {
    for (const k of ["id", "romaji", "english", "ja"]) if (!it[k]) fail(`item ${it.id || "?"} in ${b.id} is missing ${k}`);
    if (seen.has(it.id)) fail(`duplicate id ${it.id}`);
    seen.add(it.id);
  }
}

const shell = readFileSync("sw.js", "utf8").match(/const SHELL = (\[[^\]]*\])/);
if (!shell) fail("could not find the SHELL list in sw.js");
for (const f of JSON.parse(shell[1])) if (f !== "./" && !existsSync(f)) fail(`sw.js precaches ${f}, which does not exist`);

// The Pages workflow copies an explicit file list into the site: every precached file must be in it.
const wf = readFileSync(".github/workflows/pages.yml", "utf8").match(/cp -R ([^\n]*) _site\//);
if (!wf) fail("could not find the site copy step in .github/workflows/pages.yml");
const staged = wf[1].trim().split(/\s+/);
for (const f of JSON.parse(shell[1])) if (f !== "./" && !staged.includes(f.split("/")[0])) fail(`sw.js precaches ${f}, but the Pages workflow does not copy it into the site`);

console.log(`ok: scripts parse, ${data.batches.length} batches / ${seen.size - data.batches.length} items, service worker shell complete and published`);
