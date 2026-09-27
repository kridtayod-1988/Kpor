import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const appDirectory = join(process.cwd(), ".next", "server", "app");
const routeGroupDirectory = join(appDirectory, "(app)");
const routeGroupManifest = join(routeGroupDirectory, "page_client-reference-manifest.js");

if (!existsSync(routeGroupDirectory)) {
  process.exit(1);
}

if (!existsSync(routeGroupManifest)) {
  writeFileSync(routeGroupManifest, "self.__next_f.push([1,\"{}\"])\n");
}

process.exit(existsSync(routeGroupManifest) ? 0 : 1);
