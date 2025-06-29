const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const version = require("../package.json").version;
let gitTag = "";
let commitHash = "";

try {
    gitTag = execSync("git describe --tags --abbrev=0").toString().trim();
    commitHash = execSync("git rev-parse HEAD").toString().trim();
} catch (e) {
    console.warn("Git-Daten konnten nicht ermittelt werden");
}

const envContent = `
NEXT_PUBLIC_APP_VERSION=v${version}
NEXT_PUBLIC_GIT_TAG=${gitTag}
NEXT_PUBLIC_COMMIT_HASH=${commitHash}
`;

fs.writeFileSync(path.resolve(__dirname, "../.env.local"), envContent.trim());
console.log("✅ .env.local mit Versionsdaten erzeugt.");
