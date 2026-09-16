import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../module.json", import.meta.url)));

for (const pack of manifest.packs) {
  const source = `packs/_source/${pack.name}`;
  const dest = pack.path;
  await compilePack(source, dest, { recursive: true });
  console.log(`Packed ${source} -> ${dest}`);
}
