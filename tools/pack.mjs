import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { readFile, rm } from "node:fs/promises";
import { ClassicLevel } from "classic-level";

const manifest = JSON.parse(await readFile(new URL("../module.json", import.meta.url)));

/**
 * classic-level's write path has occasionally raced its own manifest update on some CI
 * runners: compilePack resolves, the on-disk .ldb table has real data (confirmed by grepping
 * its raw bytes), but the fresh CURRENT/MANIFEST doesn't reference it yet, so a reader opens
 * a technically-valid but empty database. Re-verify each pack by reopening it, and recompile
 * on the rare empty read rather than silently shipping a broken compendium.
 */
async function countEntries(dest) {
  const db = new ClassicLevel(dest, { valueEncoding: "json" });
  await db.open();
  const keys = await db.keys().all();
  await db.close();
  return keys.length;
}

for (const pack of manifest.packs) {
  const source = `packs/_source/${pack.name}`;
  const dest = pack.path;

  let count = 0;
  for (let attempt = 1; attempt <= 3; attempt++) {
    await rm(dest, { recursive: true, force: true });
    await compilePack(source, dest, { recursive: true });
    count = await countEntries(dest);
    if (count > 0) break;
    console.warn(`${dest} compiled empty (attempt ${attempt}/3), retrying...`);
  }
  if (count === 0) throw new Error(`${dest} compiled empty after 3 attempts`);

  console.log(`Packed ${source} -> ${dest} (${count} entries)`);
}
