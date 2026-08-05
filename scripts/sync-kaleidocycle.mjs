import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { gunzipSync } from "node:zlib";

const REPOSITORY = "hamedeo/kaleidocycle";

// Follow the latest commit on the main branch automatically.
const DEFAULT_GIT_REF = "main";

const gitRef = process.env.KALEIDOCYCLE_GIT_REF?.trim() || DEFAULT_GIT_REF;

const publicDirectory = resolve("public");
const target = resolve(publicDirectory, "Kaleidocycle");
const versionFile = resolve(target, ".source-commit");

async function resolveCommitSha(ref) {
    const response = await fetch(
        `https://api.github.com/repos/${REPOSITORY}/commits/${encodeURIComponent(ref)}`,
        {
            headers: {
                Accept: "application/vnd.github+json",
                "User-Agent": "hamedeo.github.io-kaleidocycle-sync",
            },
        },
    );

    if (!response.ok) {
        throw new Error(
            `Could not resolve Kaleidocycle commit: HTTP ${response.status} ${response.statusText}`,
        );
    }

    const data = await response.json();

    if (typeof data.sha !== "string" || !/^[0-9a-f]{40}$/i.test(data.sha)) {
        throw new Error("GitHub returned an invalid Kaleidocycle commit hash.");
    }

    return data.sha;
}

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

    const latestCommit = await resolveCommitSha(gitRef);

    const previousCommit = await readFile(versionFile, "utf8")
        .then((value) => value.trim())
        .catch(() => "");

    const existingEntryPointIsValid = await stat(resolve(target, "index.html"))
        .then((entry) => entry.isFile())
        .catch(() => false);

    if (previousCommit === latestCommit && existingEntryPointIsValid) {
        console.log(
            `Kaleidocycle is already current at ${latestCommit}. Download skipped.`,
        );
    } else {
        const archiveUrl =
            `https://codeload.github.com/${REPOSITORY}/tar.gz/${latestCommit}`;

        const response = await fetch(archiveUrl, {
            headers: {
                "User-Agent": "hamedeo.github.io-kaleidocycle-sync",
            },
            redirect: "follow",
        });

        if (!response.ok) {
            throw new Error(
                `Download returned HTTP ${response.status} ${response.statusText}`,
            );
        }

        const compressedArchive = Buffer.from(await response.arrayBuffer());

        await rm(target, { recursive: true, force: true });
        await extractGitHubTar(gunzipSync(compressedArchive));

        const entryPoint = await stat(resolve(target, "index.html"));

        if (!entryPoint.isFile()) {
            throw new Error("Extracted index.html is not a file.");
        }

        await writeFile(versionFile, `${latestCommit}\n`, "utf8");

        console.log(
            `Synced ${REPOSITORY}@${latestCommit} to public/Kaleidocycle/`,
        );
    }
} catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    console.error(
        `Kaleidocycle synchronization failed (${REPOSITORY}@${gitRef}): ${reason}`,
    );

    process.exitCode = 1;
}