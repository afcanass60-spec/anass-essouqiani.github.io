// Construit la version statique de démonstration (sans IA) dans ./out
// Usage : STATIC_BASE_PATH=/english-quest-app node scripts/build-static.mjs
import { execSync } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";

const api = "src/app/api";
const parked = "api.parked";
if (existsSync(api)) renameSync(api, parked);
rmSync(".next", { recursive: true, force: true }); // types générés obsolètes // les routes serveur ne sont pas exportables
try {
  execSync("npx next build", { stdio: "inherit", env: { ...process.env, STATIC_EXPORT: "1", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" } });
} finally {
  if (existsSync(parked)) renameSync(parked, api);
}
