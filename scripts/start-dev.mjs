import { existsSync } from "fs";
import { spawn, spawnSync } from "child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync("node_modules")) {
  console.log("Instalando dependencias...");
  run(npmCommand, ["install"]);
}

console.log("Iniciando WIA Instagram Growth OS...");
console.log("http://localhost:3000");

const child = spawn(npmCommand, ["run", "dev"], {
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("No se pudo iniciar el servidor:", error.message);
  process.exit(1);
});
