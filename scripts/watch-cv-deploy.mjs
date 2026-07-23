import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  watch,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const templatePath = path.join(
  projectRoot,
  ".private",
  "Hamed_Abdollahi-CVtemp.docx",
);

// generate-cv.mjs has one generated output: Hamed_Abdollahi-CV.docx.
// Override its configurable destination so the deployable copy is public.
const generatedFiles = [
  path.join(
    projectRoot,
    "public",
    "downloads",
    "Hamed_Abdollahi-CV.docx",
  ),
];
const generatedGitPaths = generatedFiles.map((filePath) =>
  path.relative(projectRoot, filePath).split(path.sep).join("/"),
);

const debounceMilliseconds = 3_500;
const dryRun = process.argv.includes("--dry-run");

function log(message) {
  console.log(`[CV deploy] ${message}`);
}

function fail(message) {
  console.error(`[CV deploy] ERROR: ${message}`);
}

function run(command, args, options = {}) {
  const { capture = false, env = process.env } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env,
      shell: false,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    let stdout = "";
    let stderr = "";

    if (capture) {
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

async function requireSuccessful(command, args, description, options = {}) {
  const result = await run(command, args, options);

  if (result.code !== 0) {
    const details = [result.stderr, result.stdout].filter(Boolean).join("\n");
    throw new Error(
      `${description} failed${details ? `:\n${details}` : "."}`,
    );
  }

  return result;
}

async function preflight() {
  if (!existsSync(templatePath)) {
    throw new Error(`Private CV template not found: ${templatePath}`);
  }

  const ignored = await run(
    "git",
    ["check-ignore", "--quiet", "--", templatePath],
    { capture: true },
  );
  if (ignored.code !== 0) {
    throw new Error(
      "The private CV template is not ignored by Git. Refusing to continue.",
    );
  }

  const branch = await requireSuccessful(
    "git",
    ["symbolic-ref", "--quiet", "--short", "HEAD"],
    "Current branch lookup",
    { capture: true },
  );

  const upstream = await run(
    "git",
    [
      "for-each-ref",
      "--format=%(upstream:remotename)%09%(upstream:remoteref)",
      `refs/heads/${branch.stdout}`,
    ],
    { capture: true },
  );
  if (upstream.code !== 0 || !upstream.stdout) {
    throw new Error(
      `Branch "${branch.stdout}" has no configured upstream. ` +
        "Configure one before running the watcher.",
    );
  }

  const [upstreamRemote, upstreamRef] = upstream.stdout.split("\t");
  if (!upstreamRemote || !upstreamRef) {
    throw new Error(
      `Could not resolve the configured upstream for "${branch.stdout}".`,
    );
  }

  return {
    branch: branch.stdout,
    upstream: `${upstreamRemote}/${upstreamRef.replace(/^refs\/heads\//, "")}`,
    upstreamRef,
    upstreamRemote,
  };
}

async function generateCv(outputPath) {
  const npmCliPath = process.env.npm_execpath;
  if (!npmCliPath) {
    throw new Error(
      "npm CLI path is unavailable. Start this script with " +
        '"npm run watch:cv-deploy".',
    );
  }

  log("Generating the CV...");
  await requireSuccessful(
    process.execPath,
    [npmCliPath, "run", "generate:cv"],
    "CV generation",
    {
      env: {
        ...process.env,
        CV_DOCX_OUTPUT: outputPath,
      },
    },
  );
}

function filesEqual(firstPath, secondPath) {
  if (!existsSync(firstPath) || !existsSync(secondPath)) {
    return false;
  }

  return readFileSync(firstPath).equals(readFileSync(secondPath));
}

async function verifyDryRun() {
  const { branch, upstream } = await preflight();
  const temporaryDirectory = mkdtempSync(
    path.join(tmpdir(), "cv-deploy-check-"),
  );
  const temporaryOutput = path.join(
    temporaryDirectory,
    path.basename(generatedFiles[0]),
  );

  try {
    await generateCv(temporaryOutput);
    const wouldChange = !filesEqual(temporaryOutput, generatedFiles[0]);

    log(`Dry-run verification succeeded on ${branch} (${upstream}).`);
    if (wouldChange) {
      log(`Would stage: ${generatedGitPaths[0]}`);
      log('Would commit "Update generated CV" and push to the upstream.');
    } else {
      log("Generated public CV is unchanged; no commit or push would occur.");
    }
    log("Dry run did not stage, commit, push, or modify the public CV.");
  } finally {
    rmSync(temporaryDirectory, {
      recursive: true,
      force: true,
      maxRetries: 2,
    });
  }
}

async function deployCv() {
  const {
    branch,
    upstream,
    upstreamRef,
    upstreamRemote,
  } = await preflight();

  const alreadyStaged = await run(
    "git",
    ["diff", "--cached", "--quiet", "--", ...generatedGitPaths],
    { capture: true },
  );
  if (alreadyStaged.code === 1) {
    throw new Error(
      "A generated CV file already has staged changes. " +
        "Resolve them before the watcher continues.",
    );
  }
  if (alreadyStaged.code > 1) {
    throw new Error("Could not inspect the staged generated CV files.");
  }

  await generateCv(generatedFiles[0]);

  await requireSuccessful(
    "git",
    ["add", "--force", "--", ...generatedGitPaths],
    "Staging generated CV files",
  );

  const changed = await run(
    "git",
    ["diff", "--cached", "--quiet", "--", ...generatedGitPaths],
    { capture: true },
  );
  if (changed.code === 0) {
    log("Generated public CV is unchanged; no commit or push needed.");
    return;
  }
  if (changed.code > 1) {
    throw new Error("Could not compare the generated CV with Git.");
  }

  log(`Staged only: ${generatedGitPaths.join(", ")}`);
  await requireSuccessful(
    "git",
    [
      "commit",
      "--only",
      "-m",
      "Update generated CV",
      "--",
      ...generatedGitPaths,
    ],
    "CV commit",
  );

  log(`Pushing ${branch} to its configured upstream (${upstream})...`);
  await requireSuccessful(
    "git",
    ["push", upstreamRemote, `HEAD:${upstreamRef}`],
    "Git push",
  );
  log("Generated CV committed and pushed successfully.");
}

if (dryRun) {
  verifyDryRun().catch((error) => {
    fail(error.message);
    process.exitCode = 1;
  });
} else {
  let debounceTimer;
  let running = false;
  let rerunRequested = false;

  async function execute() {
    if (running) {
      rerunRequested = true;
      return;
    }

    running = true;
    try {
      await deployCv();
    } catch (error) {
      fail(error.message);
    } finally {
      running = false;
      if (rerunRequested) {
        rerunRequested = false;
        schedule();
      }
    }
  }

  function schedule() {
    clearTimeout(debounceTimer);
    log(`Change detected; waiting ${debounceMilliseconds / 1_000} seconds...`);
    debounceTimer = setTimeout(execute, debounceMilliseconds);
  }

  try {
    await preflight();
  } catch (error) {
    fail(error.message);
    process.exit(1);
  }

  const watcher = watch(path.dirname(templatePath), (eventType, filename) => {
    if (
      filename === null ||
      path.basename(filename.toString()) === path.basename(templatePath)
    ) {
      schedule();
    }
  });

  watcher.on("error", (error) => {
    fail(`File watcher failed: ${error.message}`);
    process.exitCode = 1;
    watcher.close();
  });

  function stop() {
    clearTimeout(debounceTimer);
    watcher.close();
    log("Watcher stopped.");
  }

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  log(`Watching ${path.relative(projectRoot, templatePath)}.`);
  log("Press Ctrl+C to stop.");
}
