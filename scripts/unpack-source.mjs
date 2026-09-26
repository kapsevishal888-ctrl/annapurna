#!/usr/bin/env node
// Source files are stored as gzip+base64 chunks in scripts/payload so the
// GitHub text API can carry them. This runs before Vite on every build.
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { dirname, join } from "node:path";

const dir = "scripts/payload";
let names = [];
try {
  names = (await readdir(dir))
    .filter((name) => name.startsWith("src-") && name.endsWith(".b64"))
    .sort();
} catch {
  console.log("[unpack-source] no payload directory");
  process.exit(0);
}
if (names.length === 0) {
  console.log("[unpack-source] no chunks");
  process.exit(0);
}
const parts = await Promise.all(names.map((name) => readFile(join(dir, name), "utf8")));
const b64 = parts.join("").replace(/\s+/g, "");
const json = gunzipSync(Buffer.from(b64, "base64")).toString("utf8");
const files = JSON.parse(json);
for (const file of files) {
  await mkdir(dirname(file.path), { recursive: true });
  await writeFile(file.path, file.content);
}
console.log(`[unpack-source] wrote ${files.length} files`);
