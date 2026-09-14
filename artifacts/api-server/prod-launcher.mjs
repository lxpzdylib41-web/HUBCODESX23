// Production launcher: runs the API server and the Discord bot as sibling
// processes inside the same Reserved VM deployment, so the bot stays online
// 24/7 without needing a separate host. If either process dies, this
// launcher exits too, so the deployment's process supervisor restarts both.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

function launch(name, args, cwd) {
  const proc = spawn("node", args, { cwd, stdio: "inherit", env: process.env });
  proc.on("exit", (code, signal) => {
    console.error(`[prod-launcher] ${name} exited (code=${code} signal=${signal})`);
    process.exitCode = code ?? 1;
    process.exit(process.exitCode);
  });
  return proc;
}

const apiServer = launch("api-server", ["--enable-source-maps", "./dist/index.mjs"], dir);
const discordBot = launch(
  "discord-bot",
  [path.resolve(dir, "../discord-bot/dist/index.mjs")],
  path.resolve(dir, "../discord-bot"),
);

function shutdown() {
  apiServer.kill("SIGTERM");
  discordBot.kill("SIGTERM");
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
