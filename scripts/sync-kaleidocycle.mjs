import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { gunzipSync } from "node:zlib";

const REPOSITORY = "hamedeo/kaleidocycle";
// Override this pinned default with KALEIDOCYCLE_GIT_REF. The override may be
// another commit, tag, or branch, but builds remain reproducible by default.
const DEFAULT_GIT_REF = "f0f51889c019b4e7195ef27b5853564d0ee55885";
const gitRef = process.env.KALEIDOCYCLE_GIT_REF?.trim() || DEFAULT_GIT_REF;
const archiveUrl = `https://codeload.github.com/${REPOSITORY}/tar.gz/${encodeURIComponent(gitRef)}`;
const publicDirectory = resolve("public");
const target = resolve(publicDirectory, "Kaleidocycle");

function readTarText(archive, offset, length) {
    const end = archive.indexOf(0, offset);
    const boundedEnd = end === -1 || end > offset + length ? offset + length : end;
    return archive.subarray(offset, boundedEnd).toString("utf8").trim();
}

function readTarNumber(archive, offset, length, fieldName) {
    const value = readTarText(archive, offset, length);
    const parsed = value === "" ? 0 : Number.parseInt(value, 8);

    if (!Number.isSafeInteger(parsed) || parsed < 0) {
        throw new Error(`Invalid tar ${fieldName}: ${JSON.stringify(value)}`);
    }

    return parsed;
}

function isEmptyTarBlock(archive, offset) {
    for (let index = offset; index < offset + 512; index += 1) {
        if (archive[index] !== 0) return false;
    }
    return true;
}

function safeArchivePath(entryName, archiveRoot) {
    if (!entryName || entryName.includes("\\") || entryName.startsWith("/")) {
        throw new Error(`Unsafe archive path: ${JSON.stringify(entryName)}`);
    }

    const parts = entryName.split("/").filter(Boolean);
    if (parts.some((part) => part === "." || part === "..")) {
        throw new Error(`Unsafe archive path: ${JSON.stringify(entryName)}`);
    }

    if (parts[0] !== archiveRoot) {
        throw new Error(`Unexpected archive root in ${JSON.stringify(entryName)}`);
    }

    return parts.slice(1);
}

async function extractGitHubTar(archive) {
    let offset = 0;
    let archiveRoot;

    while (offset + 512 <= archive.length) {
        if (isEmptyTarBlock(archive, offset)) break;

        const name = readTarText(archive, offset, 100);
        const prefix = readTarText(archive, offset + 345, 155);
        const entryName = prefix ? `${prefix}/${name}` : name;
        const size = readTarNumber(archive, offset + 124, 12, "entry size");
        const type = String.fromCharCode(archive[offset + 156] || 48);
        const dataStart = offset + 512;
        const dataEnd = dataStart + size;

        if (dataEnd > archive.length) {
            throw new Error(`Truncated tar entry: ${JSON.stringify(entryName)}`);
        }

        // GitHub codeload archives may begin with global or per-file PAX
        // metadata. Current project paths fit in the standard tar name fields,
        // so these records do not need to override an entry path.
        if (type === "g" || type === "x") {
            offset = dataStart + Math.ceil(size / 512) * 512;
            continue;
        }

        const root = entryName.split("/", 1)[0];
        archiveRoot ??= root;
        const relativeParts = safeArchivePath(entryName, archiveRoot);

        if (relativeParts.length > 0) {
            const destination = resolve(target, ...relativeParts);
            if (destination !== target && !destination.startsWith(`${target}${sep}`)) {
                throw new Error(`Archive path escapes target: ${JSON.stringify(entryName)}`);
            }

            if (type === "5") {
                await mkdir(destination, { recursive: true });
            } else if (type === "0") {
                await mkdir(dirname(destination), { recursive: true });
                await writeFile(destination, archive.subarray(dataStart, dataEnd));
            } else {
                throw new Error(
                    `Unsupported tar entry type ${JSON.stringify(type)} for ${JSON.stringify(entryName)}`,
                );
            }
        }

        offset = dataStart + Math.ceil(size / 512) * 512;
    }

    if (!archiveRoot) throw new Error("Downloaded archive is empty.");
}

try {
    await mkdir(publicDirectory, { recursive: true });
    await rm(target, { recursive: true, force: true });

    const response = await fetch(archiveUrl, {
        headers: { "User-Agent": "hamedeo.github.io-kaleidocycle-sync" },
        redirect: "follow",
    });

    if (!response.ok) {
        throw new Error(`Download returned HTTP ${response.status} ${response.statusText}`);
    }

    const compressedArchive = Buffer.from(await response.arrayBuffer());
    await extractGitHubTar(gunzipSync(compressedArchive));

    const entryPoint = await stat(resolve(target, "index.html"));
    if (!entryPoint.isFile()) throw new Error("Extracted index.html is not a file.");

    console.log(`Synced ${REPOSITORY}@${gitRef} to public/Kaleidocycle/`);
} catch (error) {
    await rm(target, { recursive: true, force: true }).catch(() => {});
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Kaleidocycle synchronization failed (${REPOSITORY}@${gitRef}): ${reason}`);
    process.exitCode = 1;
}
