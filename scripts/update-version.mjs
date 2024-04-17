import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Define __dirname (flaviocopes.com/fix-dirname-not-defined-es-module-scope)
const __dirname = dirname(fileURLToPath(import.meta.url));

// Retrieve version from package.json
const packageFile = fs.readFileSync(
  join(__dirname, "..", "package.json"),
  "utf-8",
);
const { version } = JSON.parse(packageFile);

console.log(`Updating version to v${version}`);
// Write version file
fs.writeFileSync(
  join(__dirname, "..", "src", "version.ts"),
  `export default "${version}";\n`,
);
