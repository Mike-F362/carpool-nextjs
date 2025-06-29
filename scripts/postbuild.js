const fs = require("fs");
const path = require("path");
const {execSync} = require("child_process");

const version = require("../package.json").version;
const gitTag = execSync("git describe --tags --abbrev=0").toString().trim();
const commitHash = execSync("git rev-parse HEAD").toString().trim();

const envPath = path.join(__dirname, "../.env.local");

fs.writeFileSync(
    envPath,
    `NEXT_PUBLIC_APP_VERSION=v${version}
NEXT_PUBLIC_GIT_TAG=${gitTag}
NEXT_PUBLIC_COMMIT_HASH=${commitHash}
`,
);

console.log("🔧 .env.local created with version and git info");
