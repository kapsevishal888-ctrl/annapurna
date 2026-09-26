#!/usr/bin/env node
// GitHub's file API stores text. Recipe photos are committed as *.b64 and
// turned back into JPEG/PNG before Vite copies public/.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";

async function walk(dir, out = []) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".vercel") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, out);
    else if (entry.name.endsWith(".b64")) out.push(path);
  }
  return out;
}

const files = await walk("public");
let n = 0;
for (const file of files) {
  const raw = (await readFile(file, "utf8")).replace(/\s+/g, "");
  const dest = file.slice(0, -4);
  await writeFile(dest, Buffer.from(raw, "base64"));
  n += 1;
}
console.log(`[unpack-images] wrote ${n} files`);
