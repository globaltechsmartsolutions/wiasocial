import { readdir, rm } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const fixedTargets = [
  ".next",
  ".playwright-mcp",
  "build",
  "coverage",
  "out",
  "tmp",
  "tsconfig.tsbuildinfo",
];

function resolveProjectTarget(target) {
  const absoluteTarget = resolve(projectRoot, target);
  const projectRelative = relative(projectRoot, absoluteTarget);

  if (!projectRelative || projectRelative.startsWith("..") || isAbsolute(projectRelative)) {
    throw new Error(`Ruta de limpieza no permitida: ${target}`);
  }

  return absoluteTarget;
}

const rootEntries = await readdir(projectRoot, { withFileTypes: true });
const logTargets = rootEntries
  .filter((entry) => entry.isFile() && /^\.next-dev.*\.log$/u.test(entry.name))
  .map((entry) => entry.name);

for (const target of [...fixedTargets, ...logTargets]) {
  await rm(resolveProjectTarget(target), { recursive: true, force: true });
  console.log(`Eliminado: ${target}`);
}

console.log("Limpieza terminada. Se han conservado dependencias, credenciales y resultados de modelos.");
