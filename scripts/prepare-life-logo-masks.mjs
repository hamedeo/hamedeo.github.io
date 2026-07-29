import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const OUTPUT_DIRECTORY = resolve("public", "life-logo-masks");

const clampByte = (value) =>
    Math.max(0, Math.min(255, Math.round(value)));

async function writeAlphaMask(sourcePath, outputPath, alphaForPixel) {
    const { data, info } = await sharp(sourcePath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    const output = Buffer.alloc(info.width * info.height * 4);

    for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
        const offset = pixel * 4;
        const sourceAlpha = data[offset + 3] / 255;
        const alpha =
            alphaForPixel(
                data[offset],
                data[offset + 1],
                data[offset + 2],
            ) * sourceAlpha;

        output[offset] = 255;
        output[offset + 1] = 255;
        output[offset + 2] = 255;
        output[offset + 3] = clampByte(alpha);
    }

    await mkdir(dirname(outputPath), { recursive: true });
    await sharp(output, {
        raw: {
            width: info.width,
            height: info.height,
            channels: 4,
        },
    })
        .png({ compressionLevel: 9, palette: true })
        .toFile(outputPath);
}

async function removeSolidBackground(source, target) {
    const { data } = await sharp(source)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    const background = [data[0], data[1], data[2]];

    await writeAlphaMask(source, target, (red, green, blue) => {
        const distance = Math.sqrt(
            (red - background[0]) ** 2 +
                (green - background[1]) ** 2 +
                (blue - background[2]) ** 2,
        );
        return ((distance - 12) / 62) * 255;
    });
}

async function removeLightBackground(source, target) {
    await writeAlphaMask(source, target, (red, green, blue) => {
        const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
        return ((246 - luminance) / 118) * 255;
    });
}

async function keepLightDetails(source, target) {
    await writeAlphaMask(source, target, (red, green, blue) => {
        const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
        return ((luminance - 42) / 178) * 255;
    });
}

await mkdir(OUTPUT_DIRECTORY, { recursive: true });

await Promise.all([
    keepLightDetails(
        resolve("src", "content", "general pics", "AZGCO.png"),
        resolve(OUTPUT_DIRECTORY, "azg-mask.png"),
    ),
    removeSolidBackground(
        resolve("src", "content", "general pics", "DSS.png"),
        resolve(OUTPUT_DIRECTORY, "dss-mask.png"),
    ),
    removeLightBackground(
        resolve("src", "content", "general pics", "MSC.jpg"),
        resolve(OUTPUT_DIRECTORY, "msc-mask.png"),
    ),
    removeLightBackground(
        resolve("src", "content", "general pics", "PoliToLogo.jpg"),
        resolve(OUTPUT_DIRECTORY, "polito-mask.png"),
    ),
    removeLightBackground(
        resolve("src", "content", "general pics", "tue-en-square.webp"),
        resolve(OUTPUT_DIRECTORY, "tue-mask.png"),
    ),
]);

console.log("Prepared Life journey logo masks.");
