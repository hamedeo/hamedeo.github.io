import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

// Kaleidocycle/ remains the editable source. Astro serves public/ verbatim, so
// this generated mirror makes the standalone iframe URL available in both the
// development server and production output without maintaining two copies.
const source = resolve("Kaleidocycle");
const target = resolve("public", "Kaleidocycle");

await mkdir(resolve("public"), { recursive: true });
await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });

console.log("Synced Kaleidocycle/ to public/Kaleidocycle/");

