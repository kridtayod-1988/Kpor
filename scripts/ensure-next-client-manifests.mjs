import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const appDirectory = join(process.cwd(), ".next", "server", "app");
const routeGroupManifest = join(appDirectory, "(app)", "page_client-reference-manifest.js");

if (existsSync(join(appDirectory, "(app)")) && !existsSync(routeGroupManifest)) {
  writeFileSync(routeGroupManifest, "self.__next_f.push([1,\"{}\"])\n");
}
