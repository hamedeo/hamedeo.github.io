import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { parse } from "yaml";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const projectRoot = path.resolve(currentDirectory, "..");

const cvDataPath = path.join(
  projectRoot,
  "src",
  "content",
  "cv.md",
);

const templatePath = path.resolve(
  process.env.CV_TEMPLATE_PATH ??
    path.join(
      projectRoot,
      ".private",
      "Hamed_Abdollahi-CVtemp.docx",
    ),
);

const outputPath = path.resolve(
  process.env.CV_DOCX_OUTPUT ??
    path.join(
      projectRoot,
      ".cv-build",
      "Hamed_Abdollahi-CV.docx",
    ),
);

function readFrontmatter(filePath) {
  const source = fs
    .readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/, "");

  const match = source.match(
    /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
  );

  if (!match) {
    throw new Error(
      `No YAML frontmatter was found in ${filePath}`,
    );
  }

  return parse(match[1]) ?? {};
}

function text(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function textList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => text(item))
    .filter(Boolean);
}

function combine(...values) {
  return values
    .map((value) => text(value))
    .filter(Boolean)
    .join(" | ");
}

function prepareExperience(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    role: text(item.role),
    institution: text(item.institution),
    period: text(item.period),
    location: text(item.location),
    periodLocation: combine(item.period, item.location),
    description: text(item.description),
    bullets: textList(item.bullets),
    subBullets: textList(item.subBullets),
  }));
}

function prepareEducation(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    degree: text(item.degree),
    institution: text(item.institution),
    period: text(item.period),
    location: text(item.location),
    periodLocation: combine(item.period, item.location),
    description: text(item.description),
    thesis: text(item.thesis),
    details: textList(item.details),
    subDetails: textList(item.subDetails),

    subEntries: Array.isArray(item.subEntries)
      ? item.subEntries.map((subEntry) => ({
          title: text(subEntry.title),
          subtitle: text(subEntry.subtitle),
          period: text(subEntry.period),
          location: text(subEntry.location),
          periodLocation: combine(
            subEntry.period,
            subEntry.location,
          ),
          description: text(subEntry.description),
        }))
      : [],
  }));
}

function prepareCompetencies(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    title: text(item.title),
    summary: text(item.summary),
    tools: textList(item.tools),
    extra: textList(item.extra),
    toolsLine: textList(item.tools).join(" • "),
    extraLine: textList(item.extra).join(" • "),
  }));
}

function prepareLanguages(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    name: text(item.name),
    level: text(item.level),
  }));
}

function reportTemplateError(error) {
  console.error("\nCV generation failed.");

  const templateErrors = error?.properties?.errors;

  if (Array.isArray(templateErrors)) {
    for (const templateError of templateErrors) {
      console.error(
        "-",
        templateError?.properties?.explanation ??
          templateError?.message ??
          templateError,
      );
    }

    return;
  }

  console.error(error);
}

try {
  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Template not found:\n${templatePath}`,
    );
  }

  const rawCvData = readFrontmatter(cvDataPath);

  const documentData = {
    name: text(rawCvData.name),
    title: text(rawCvData.title),
    location: text(rawCvData.location),
    email: text(rawCvData.email),
    phone: text(rawCvData.phone),
    linkedin: text(rawCvData.linkedin),
    github: text(rawCvData.github),
    references: text(rawCvData.references),
    relocation: text(rawCvData.relocation),

    contactLine: combine(
      rawCvData.email,
      rawCvData.phone,
      rawCvData.location,
    ),

    linksLine: combine(
      rawCvData.linkedin,
      rawCvData.github,
    ),

    competencies: prepareCompetencies(
      rawCvData.competencies,
    ),

    experience: prepareExperience(
      rawCvData.experience,
    ),

    education: prepareEducation(
      rawCvData.education,
    ),

    languages: prepareLanguages(
      rawCvData.languages,
    ),
  };

  const templateContent = fs.readFileSync(
    templatePath,
    "binary",
  );

  const zip = new PizZip(templateContent);

  const document = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  document.render(documentData);

  fs.mkdirSync(path.dirname(outputPath), {
  recursive: true,
  });

  fs.writeFileSync(
    outputPath,
    document.toBuffer(),
  );

  console.log(`Generated CV:\n${outputPath}`);
} catch (error) {
  reportTemplateError(error);
  process.exit(1);
}