import { extractPack } from "@foundryvtt/foundryvtt-cli";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../module.json", import.meta.url)));

for (const pack of manifest.packs) {
  const source = pack.path;
  const dest = `packs/_source/${pack.name}`;
  await extractPack(source, dest, { yaml: false, clean: true });
  console.log(`Unpacked ${source} -> ${dest}`);
}
