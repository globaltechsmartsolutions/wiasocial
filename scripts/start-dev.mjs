import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const projectRoot = fileURLToPath(new URL("..", import.meta.url));

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(new URL("../node_modules", import.meta.url))) {
  console.log("Instalando dependencias...");
  run(npmCommand, ["install"]);
}

// A production build and the development server use the same .next directory.
// Starting dev immediately after build can otherwise leave HTML pointing to
// development chunks that do not exist. Keep normal dev caches, but discard a
// production cache when BUILD_ID proves that one is present.
const productionBuildId = new URL("../.next/BUILD_ID", import.meta.url);
if (existsSync(productionBuildId)) {
  console.log("Eliminando la caché de producción antes de iniciar desarrollo...");
  rmSync(new URL("../.next", import.meta.url), { recursive: true, force: true });
}

console.log("Iniciando WIASocial...");
console.log("http://localhost:3000");

const child = spawn(npmCommand, ["run", "dev"], {
  cwd: projectRoot,
  stdio: "inherit",
  // Recent Node versions cannot always execute npm.cmd directly on Windows.
  // Let cmd.exe resolve it there while keeping direct spawning on Unix.
  shell: process.platform === "win32",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("No se pudo iniciar el servidor:", error.message);
  process.exit(1);
});
