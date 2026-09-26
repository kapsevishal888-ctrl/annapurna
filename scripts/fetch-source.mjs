#!/usr/bin/env node
// Build-time fetch of the published source bundle and homepage photographs.
// The GitHub text API cannot carry the archive in one commit, so the first
// deploy pulls it. If the host has expired, an existing tree is left as-is.
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";

const SOURCE_URL =
  "https://tmpfiles.org/dl/1790417413.f33de6c0978524ce/wtwhpgfkaatc/annapurna-src.json.gz";
const HEROES_URL =
  "https://tmpfiles.org/dl/1790417446.278648f7081463f9/wZwCp5fFv9ND/annapurna-heroes.tgz";

async function fetchBuf(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const head = buf.subarray(0, 20).toString("utf8");
  if (buf.length < 1000 || head.includes("<!DOC") || head.includes("<html")) {
    throw new Error(`GET ${url} returned a page (${buf.length} bytes), not the file`);
  }
  return buf;
}

async function alreadyThere() {
  try {
    await access("src/routes/index.tsx");
    return true;
  } catch {
    return false;
  }
}

try {
  const gz = await fetchBuf(SOURCE_URL);
  const files = JSON.parse(gunzipSync(gz).toString("utf8"));
  for (const file of files) {
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, file.content);
  }
  console.log(`[fetch-source] wrote ${files.length} text files`);
} catch (err) {
  if (await alreadyThere()) {
    console.log(`[fetch-source] bundle unavailable, using files already in the repo (${err.message})`);
  } else {
    throw err;
  }
}

try {
  await mkdir("public", { recursive: true });
  const heroes = await fetchBuf(HEROES_URL);
  await writeFile("/tmp/annapurna-heroes.tgz", heroes);
  execFileSync("tar", ["-xzf", "/tmp/annapurna-heroes.tgz", "-C", "public"], { stdio: "inherit" });
  console.log("[fetch-source] homepage photographs unpacked");
} catch (err) {
  console.log(`[fetch-source] photographs skipped (${err.message})`);
}
