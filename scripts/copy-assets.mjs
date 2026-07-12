import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src", "renderer");
const outDir = join(root, "dist", "renderer");

mkdirSync(outDir, { recursive: true });
for (const file of ["index.html", "styles.css"]) {
  copyFileSync(join(srcDir, file), join(outDir, file));
  console.log(`[build] copied ${file} -> dist/renderer/`);
}
