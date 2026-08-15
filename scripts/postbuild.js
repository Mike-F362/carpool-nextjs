const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const version = require("../package.json").version;
let gitTag = "";
let commitHash = "";

try {
    gitTag = execSync("git describe --tags --abbrev=0")?.toString().trim();
} catch {
    console.warn("Could not determine Git-Tag-Data");
}

try {
    commitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
    console.warn("Could not determine Git-Commit-Data");
}

const envContent = `
NEXT_PUBLIC_APP_VERSION=v${version}
NEXT_PUBLIC_GIT_TAG=${gitTag}
NEXT_PUBLIC_COMMIT_HASH=${commitHash}
`;

const envPath = path.resolve(__dirname, "../.env.local");
const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

const updated =
    existing
        .split("\n")
        .filter(
            (line) =>
                !line.startsWith("NEXT_PUBLIC_APP_VERSION=") &&
                !line.startsWith("NEXT_PUBLIC_GIT_TAG=") &&
                !line.startsWith("NEXT_PUBLIC_COMMIT_HASH="),
        )
        .join("\n")
        .trim() +
    "\n" +
    envContent.trim();

fs.writeFileSync(envPath, updated);
console.log("✅ .env.local updated.");
