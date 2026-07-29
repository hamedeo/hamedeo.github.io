import type p5 from "p5";
import { LIFE_VISUAL_STAGES } from "../data/lifeJourney";

const DESKTOP_PARTICLE_COUNT = 72;
const MOBILE_PARTICLE_COUNT = 40;
const TAU = Math.PI * 2;

type ThemeColour = {
    r: number;
    g: number;
    b: number;
};

export type LifeSketchState = {
    progress: number;
    targetProgress: number;
    stageProgress: number;
    targetStageProgress: number;
    activeIndex: number;
    transitionProgress: number;
    direction: -1 | 0 | 1;
    reducedMotion: boolean;
    visible: boolean;
};

export type LifeSketchController = {
    refresh: () => void;
    setVisible: (visible: boolean) => void;
    destroy: () => void;
};

function clamp(value: number, minimum = 0, maximum = 1) {
    return Math.min(maximum, Math.max(minimum, value));
}

function hash(index: number, salt: number) {
    const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
    return value - Math.floor(value);
}

function stageInfluence(stageProgress: number, stageIndex: number) {
    return clamp(1 - Math.abs(stageProgress - stageIndex));
}

type KaleidocyclePoint = {
    x: number;
    y: number;
    z: number;
};

const KALEIDOCYCLE_SECTIONS = 6;
const KALEIDOCYCLE_SIDE_EDGE = 400;
const KALEIDOCYCLE_HINGE_EDGE = KALEIDOCYCLE_SIDE_EDGE * 0.89;
const KALEIDOCYCLE_SECTOR_ANGLE =
    TAU / KALEIDOCYCLE_SECTIONS;
const KALEIDOCYCLE_FOLD_ANGLE = 0.78;
const KALEIDOCYCLE_ROTATION_X = -0.72;
const KALEIDOCYCLE_ROTATION_Y = -0.1;
const KALEIDOCYCLE_ROTATION_Z = 0.82 - Math.PI / 2;
const KALEIDOCYCLE_COS_X = Math.cos(KALEIDOCYCLE_ROTATION_X);
const KALEIDOCYCLE_SIN_X = Math.sin(KALEIDOCYCLE_ROTATION_X);
const KALEIDOCYCLE_COS_Y = Math.cos(KALEIDOCYCLE_ROTATION_Y);
const KALEIDOCYCLE_SIN_Y = Math.sin(KALEIDOCYCLE_ROTATION_Y);
const KALEIDOCYCLE_COS_Z = Math.cos(KALEIDOCYCLE_ROTATION_Z);
const KALEIDOCYCLE_SIN_Z = Math.sin(KALEIDOCYCLE_ROTATION_Z);
const KALEIDOCYCLE_TETRA_EDGES = new Uint8Array([
    0, 1, 0, 2, 0, 3, 1, 2, 1, 3, 2, 3,
]);

function kaleidocyclePoint(
    x: number,
    y: number,
    z: number,
): KaleidocyclePoint {
    return { x, y, z };
}

function addKaleidocyclePoints(
    a: KaleidocyclePoint,
    b: KaleidocyclePoint,
) {
    return kaleidocyclePoint(a.x + b.x, a.y + b.y, a.z + b.z);
}

function scaleKaleidocyclePoint(
    point: KaleidocyclePoint,
    scalar: number,
) {
    return kaleidocyclePoint(
        point.x * scalar,
        point.y * scalar,
        point.z * scalar,
    );
}

function rotateKaleidocyclePointZ(
    point: KaleidocyclePoint,
    angle: number,
) {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return kaleidocyclePoint(
        cosine * point.x - sine * point.y,
        sine * point.x + cosine * point.y,
        point.z,
    );
}

function mirrorKaleidocyclePoint(
    point: KaleidocyclePoint,
) {
    const normalX = -Math.sin(KALEIDOCYCLE_SECTOR_ANGLE);
    const normalY = Math.cos(KALEIDOCYCLE_SECTOR_ANGLE);
    const distance = point.x * normalX + point.y * normalY;
    return kaleidocyclePoint(
        point.x - 2 * distance * normalX,
        point.y - 2 * distance * normalY,
        point.z,
    );
}

function makeKaleidocycleDisphenoid(foldAngle: number) {
    const halfHinge = KALEIDOCYCLE_HINGE_EDGE / 2;
    const midpointGap = Math.sqrt(
        KALEIDOCYCLE_SIDE_EDGE * KALEIDOCYCLE_SIDE_EDGE -
            (KALEIDOCYCLE_HINGE_EDGE *
                KALEIDOCYCLE_HINGE_EDGE) /
                2,
    );
    const tangent = Math.tan(KALEIDOCYCLE_SECTOR_ANGLE);
    const sine = Math.sin(foldAngle);
    const cosine = Math.cos(foldAngle);
    const denominator = Math.sqrt(
        1 + sine * sine * tangent * tangent,
    );
    const u = kaleidocyclePoint(cosine, 0, sine);
    const v = kaleidocyclePoint(
        -sine / denominator,
        (-sine * tangent) / denominator,
        cosine / denominator,
    );
    const w = kaleidocyclePoint(
        (-sine * sine * tangent) / denominator,
        1 / denominator,
        (cosine * sine * tangent) / denominator,
    );
    const p = kaleidocyclePoint(
        midpointGap * (w.y / tangent - w.x),
        0,
        (-midpointGap * w.z) / 2,
    );
    const q = kaleidocyclePoint(
        midpointGap * (w.y / tangent),
        midpointGap * w.y,
        (midpointGap * w.z) / 2,
    );

    return [
        addKaleidocyclePoints(
            p,
            scaleKaleidocyclePoint(u, -halfHinge),
        ),
        addKaleidocyclePoints(
            p,
            scaleKaleidocyclePoint(u, halfHinge),
        ),
        addKaleidocyclePoints(
            q,
            scaleKaleidocyclePoint(v, -halfHinge),
        ),
        addKaleidocyclePoints(
            q,
            scaleKaleidocyclePoint(v, halfHinge),
        ),
    ];
}

function buildKaleidocycleModel() {
    const base = makeKaleidocycleDisphenoid(
        KALEIDOCYCLE_FOLD_ANGLE,
    );
    const mirrored = base.map(mirrorKaleidocyclePoint);
    const vertices: KaleidocyclePoint[] = [];
    const vertexMap = new Map<string, number>();
    const edgeMap = new Map<string, [number, number]>();

    const getVertexIndex = (point: KaleidocyclePoint) => {
        const key = `${point.x.toFixed(5)}:${point.y.toFixed(5)}:${point.z.toFixed(5)}`;
        const existing = vertexMap.get(key);
        if (existing !== undefined) return existing;
        const index = vertices.length;
        vertices.push(point);
        vertexMap.set(key, index);
        return index;
    };

    for (
        let sector = 0;
        sector < KALEIDOCYCLE_SECTIONS / 2;
        sector += 1
    ) {
        const angle =
            2 * sector * KALEIDOCYCLE_SECTOR_ANGLE;
        for (const tetrahedron of [base, mirrored]) {
            const indices = tetrahedron.map((point) =>
                getVertexIndex(
                    rotateKaleidocyclePointZ(point, angle),
                ),
            );
            for (
                let edge = 0;
                edge < KALEIDOCYCLE_TETRA_EDGES.length;
                edge += 2
            ) {
                const start =
                    indices[KALEIDOCYCLE_TETRA_EDGES[edge]];
                const end =
                    indices[KALEIDOCYCLE_TETRA_EDGES[edge + 1]];
                const low = Math.min(start, end);
                const high = Math.max(start, end);
                edgeMap.set(`${low}:${high}`, [low, high]);
            }
        }
    }

    const packedVertices = new Float32Array(vertices.length * 3);
    vertices.forEach((point, index) => {
        const offset = index * 3;
        packedVertices[offset] = point.x;
        packedVertices[offset + 1] = point.y;
        packedVertices[offset + 2] = point.z;
    });

    const packedEdges = new Uint16Array(edgeMap.size * 2);
    let edgeOffset = 0;
    edgeMap.forEach(([start, end]) => {
        packedEdges[edgeOffset] = start;
        packedEdges[edgeOffset + 1] = end;
        edgeOffset += 2;
    });

    return {
        vertices: packedVertices,
        edges: packedEdges,
        vertexCount: vertices.length,
    };
}

const KALEIDOCYCLE_MODEL = buildKaleidocycleModel();

function populateStageTargets(
    targets: Float32Array[],
    particleCount: number,
) {
    for (let index = 0; index < particleCount; index += 1) {
        const u = particleCount <= 1 ? 0 : index / (particleCount - 1);
        const centred = u * 2 - 1;
        const jitterX = hash(index, 1) - 0.5;
        const jitterY = hash(index, 2) - 0.5;
        const offset = index * 3;

        // IT delivery: an ordered network with enough irregularity to feel human.
        const itColumns = 9;
        const itColumn = index % itColumns;
        const itRows = Math.ceil(particleCount / itColumns);
        const itRow = Math.floor(index / itColumns);
        const itX =
            (itColumn / (itColumns - 1) - 0.5) * 2.05 +
            jitterX * 0.16;
        let itY =
            (itRow / Math.max(1, itRows - 1) - 0.5) * 1.72 +
            Math.sin(itColumn * 0.9 + itRow * 0.38) * 0.09 +
            jitterY * 0.12;
        if (Math.abs(itX) < 0.38 && Math.abs(itY) < 0.34) {
            itY += itY >= 0 ? 0.36 : -0.36;
        }
        targets[0][offset] = itX;
        targets[0][offset + 1] = itY;
        targets[0][offset + 2] =
            Math.sin(itColumn * 0.75 + itRow) * 0.06;

        // Mechanical consulting: particles follow the pressure-vessel perimeter.
        const vesselHalfWidth = 0.78;
        const vesselHalfHeight = 0.42;
        const vesselStraightLength = vesselHalfWidth * 2;
        const vesselArcLength = Math.PI * vesselHalfHeight;
        const vesselPerimeter =
            vesselStraightLength * 2 + vesselArcLength * 2;
        let vesselDistance = u * vesselPerimeter;
        let vesselX = -vesselHalfWidth;
        let vesselY = -vesselHalfHeight;

        if (vesselDistance <= vesselStraightLength) {
            vesselX += vesselDistance;
        } else if (
            vesselDistance <=
            vesselStraightLength + vesselArcLength
        ) {
            vesselDistance -= vesselStraightLength;
            const angle =
                -Math.PI / 2 +
                (vesselDistance / vesselArcLength) * Math.PI;
            vesselX =
                vesselHalfWidth + Math.cos(angle) * vesselHalfHeight;
            vesselY = Math.sin(angle) * vesselHalfHeight;
        } else if (
            vesselDistance <=
            vesselStraightLength * 2 + vesselArcLength
        ) {
            vesselDistance -= vesselStraightLength + vesselArcLength;
            vesselX = vesselHalfWidth - vesselDistance;
            vesselY = vesselHalfHeight;
        } else {
            vesselDistance -= vesselStraightLength * 2 + vesselArcLength;
            const angle =
                Math.PI / 2 +
                (vesselDistance / vesselArcLength) * Math.PI;
            vesselX =
                -vesselHalfWidth + Math.cos(angle) * vesselHalfHeight;
            vesselY = Math.sin(angle) * vesselHalfHeight;
        }

        targets[1][offset] = vesselX;
        targets[1][offset + 1] = vesselY;
        targets[1][offset + 2] = Math.sin(TAU * u * 2) * 0.025;

        // Master's study: concentric academic rings with a triangular cadence.
        const academicBand = index % 3;
        const academicAngle = TAU * u + academicBand * 0.16;
        const academicRadius =
            academicBand === 0 ? 0.7 : academicBand === 1 ? 0.48 : 0.27;
        targets[2][offset] =
            Math.cos(academicAngle) * academicRadius;
        targets[2][offset + 1] =
            Math.sin(academicAngle) * academicRadius * 0.78;
        targets[2][offset + 2] =
            Math.sin(academicAngle * 3) * 0.055;

        // Thermo-fluids: coherent streamlines separate into droplets.
        const lane = (index % 6) - 2.5;
        const breakup = clamp((u - 0.34) / 0.66);
        targets[3][offset] =
            lane * 0.032 * (1 - breakup) +
            Math.sin(u * Math.PI * 4 + lane * 0.6) *
                breakup *
                0.16 +
            breakup * jitterX * 0.18;
        targets[3][offset + 1] =
            -0.78 + u * 1.62 + breakup * jitterY * 0.12;
        targets[3][offset + 2] =
            Math.cos(u * Math.PI * 3 + lane) * breakup * 0.16;

        // ASML: ordered nodes and tightly coordinated precision loops.
        const precisionAngle = TAU * u;
        const precisionBand = (index % 4) - 1.5;
        targets[4][offset] =
            Math.cos(precisionAngle) * (0.62 + precisionBand * 0.045);
        targets[4][offset + 1] =
            Math.sin(precisionAngle) * (0.42 + precisionBand * 0.03);
        targets[4][offset + 2] = precisionBand * 0.035;

        // Morpheidos: one coherent, Möbius-like problem-solving form.
        const mobiusAngle = TAU * u;
        const bandPosition = ((index % 5) - 2) * 0.085;
        const mobiusRadius =
            0.58 + bandPosition * Math.cos(mobiusAngle / 2);
        const mobiusX = mobiusRadius * Math.cos(mobiusAngle);
        const mobiusY = mobiusRadius * Math.sin(mobiusAngle);
        const mobiusZ = bandPosition * Math.sin(mobiusAngle / 2);
        targets[5][offset] = mobiusX + mobiusZ * 0.52;
        targets[5][offset + 1] = mobiusY * 0.72 - mobiusZ * 0.68;
        targets[5][offset + 2] = mobiusZ;

        // DSS/AUAS: distinct clusters connected into a shared network.
        const cluster = index % 4;
        const clusterAngle = TAU * index / Math.max(1, particleCount / 4);
        const clusterX =
            cluster === 0 ? -0.52 : cluster === 1 ? 0.08 : cluster === 2 ? 0.54 : -0.05;
        const clusterY =
            cluster === 0 ? -0.2 : cluster === 1 ? -0.42 : cluster === 2 ? 0.18 : 0.4;
        targets[6][offset] =
            clusterX +
            Math.cos(clusterAngle) * (0.12 + hash(index, 3) * 0.1);
        targets[6][offset + 1] =
            clusterY +
            Math.sin(clusterAngle) * (0.1 + hash(index, 4) * 0.08);
        targets[6][offset + 2] = (cluster - 1.5) * 0.045;

        // Kaleidocycle: a lightweight triangular ribbon, not its full runtime.
        const ribbonSections = 12;
        const ribbonPosition = u * ribbonSections;
        const ribbonPhase = ribbonPosition - Math.floor(ribbonPosition);
        const ribbonFold =
            ribbonPhase < 0.5
                ? ribbonPhase * 2
                : (1 - ribbonPhase) * 2;
        targets[7][offset] = centred * 0.92;
        targets[7][offset + 1] =
            (ribbonFold - 0.5) * 0.7 *
            (index % 2 === 0 ? 1 : -1);
        targets[7][offset + 2] =
            Math.sin(ribbonPosition * Math.PI) * 0.16;

        // Liminal state: an open field of independent, scattered possibilities.
        targets[8][offset] = -1.35 + hash(index, 17) * 2.7;
        targets[8][offset + 1] = -0.86 + hash(index, 18) * 1.72;
        targets[8][offset + 2] = -0.18 + hash(index, 19) * 0.36;
    }
}

export function createLifeSketch(
    P5: typeof p5,
    container: HTMLElement,
    state: LifeSketchState,
): LifeSketchController {
    let destroyed = false;
    let instance: p5;
    let resizeObserver: ResizeObserver | undefined;
    let themeObserver: MutationObserver | undefined;
    let refresh = () => {};
    let setVisible = (_visible: boolean) => {};

    instance = new P5((p: p5) => {
        const stageCount = LIFE_VISUAL_STAGES.length;
        const stageTargets = Array.from(
            { length: stageCount },
            () => new Float32Array(DESKTOP_PARTICLE_COUNT * 3),
        );
        const projectedX = new Float32Array(DESKTOP_PARTICLE_COUNT);
        const projectedY = new Float32Array(DESKTOP_PARTICLE_COUNT);
        const kaleidocycleX = new Float32Array(
            KALEIDOCYCLE_MODEL.vertexCount,
        );
        const kaleidocycleY = new Float32Array(
            KALEIDOCYCLE_MODEL.vertexCount,
        );
        const kaleidocycleDepth = new Float32Array(
            KALEIDOCYCLE_MODEL.vertexCount,
        );
        const particleSeeds = new Float32Array(DESKTOP_PARTICLE_COUNT);
        const firstStageNodeX = new Float32Array([
            -0.92, -0.48, -0.2, 0.42, 0.88,
            0.72, 0.91, 0.32, -0.34, -0.86,
        ]);
        const firstStageNodeY = new Float32Array([
            -0.68, -0.28, -0.84, -0.58, -0.72,
            0.05, 0.61, 0.83, 0.69, 0.42,
        ]);
        const firstStageProjectedX = new Float32Array(10);
        const firstStageProjectedY = new Float32Array(10);
        const firstStageLabels = [
            "1", "2", "3", "4", "5",
            "6", "7", "8", "9", "10",
        ];
        const firstStageEdges = new Uint8Array([
            0, 1, 1, 2, 2, 3, 3, 4, 4, 5,
            5, 6, 6, 7, 7, 8, 8, 9, 9, 0,
            0, 8, 1, 9, 2, 4, 5, 7,
        ]);

        let width = 1;
        let height = 1;
        let particleCount = DESKTOP_PARTICLE_COUNT;
        let drawParticleCount = particleCount;
        let isMobile = false;
        let quality = 1;
        let lowFrameSamples = 0;
        let elapsed = 0;
        let lastActivityTime = 0;
        let background: ThemeColour = { r: 0, g: 0, b: 0 };
        let foreground: ThemeColour = { r: 255, g: 255, b: 255 };
        let accent: ThemeColour = { r: 100, g: 140, b: 255 };
        let muted: ThemeColour = { r: 140, g: 140, b: 140 };
        let border: ThemeColour = { r: 100, g: 100, b: 100 };

        for (let index = 0; index < particleSeeds.length; index += 1) {
            particleSeeds[index] = hash(index, 9) * TAU;
        }

        const colourFromCss = (name: string): ThemeColour => {
            const value = getComputedStyle(document.documentElement)
                .getPropertyValue(name)
                .trim();
            const parsed = p.color(value || "#808080");
            return {
                r: p.red(parsed),
                g: p.green(parsed),
                b: p.blue(parsed),
            };
        };

        const refreshTheme = () => {
            background = colourFromCss("--background");
            foreground = colourFromCss("--foreground");
            accent = colourFromCss("--accent");
            muted = colourFromCss("--text-muted");
            border = colourFromCss("--border");
            refresh();
        };

        const setStroke = (colour: ThemeColour, alpha: number) => {
            p.stroke(colour.r, colour.g, colour.b, alpha);
        };

        const setFill = (colour: ThemeColour, alpha: number) => {
            p.fill(colour.r, colour.g, colour.b, alpha);
        };

        const drawCircle = (
            radiusX: number,
            radiusY: number,
            alpha: number,
        ) => {
            setStroke(border, alpha);
            p.noFill();
            p.ellipse(width / 2, height / 2, radiusX * 2, radiusY * 2);
        };

        const drawFirstStageFocus = (
            scale: number,
            centreX: number,
            centreY: number,
        ) => {
            const influence = stageInfluence(state.stageProgress, 0);
            if (influence <= 0.01) return;

            const motion = state.reducedMotion ? 0 : 1.35;
            for (let index = 0; index < 10; index += 1) {
                firstStageProjectedX[index] =
                    centreX +
                    firstStageNodeX[index] * scale +
                    Math.sin(elapsed * 0.00032 + index * 1.73) * motion;
                firstStageProjectedY[index] =
                    centreY +
                    firstStageNodeY[index] * scale +
                    Math.cos(elapsed * 0.00027 + index * 1.37) * motion;
            }

            p.strokeWeight(1.1);
            for (
                let edge = 0;
                edge < firstStageEdges.length;
                edge += 2
            ) {
                const from = firstStageEdges[edge];
                const to = firstStageEdges[edge + 1];
                setStroke(
                    foreground,
                    (edge % 6 === 0 ? 92 : 168) * influence,
                );
                p.line(
                    firstStageProjectedX[from],
                    firstStageProjectedY[from],
                    firstStageProjectedX[to],
                    firstStageProjectedY[to],
                );
            }

            p.noStroke();
            setFill(background, 255 * influence);
            p.circle(centreX, centreY, scale * 0.63);

            setFill(accent, 255 * influence);
            p.textAlign(p.CENTER, p.CENTER);
            p.textStyle(p.BOLD);
            p.textSize(Math.max(44, Math.min(78, scale * 0.43)));
            p.text("3+", centreX, centreY - scale * 0.015);

            const nodeSize = isMobile ? 19 : 23;
            const labelSize = isMobile ? 8 : 10;
            for (let index = 0; index < 10; index += 1) {
                setFill(accent, 245 * influence);
                p.circle(
                    firstStageProjectedX[index],
                    firstStageProjectedY[index],
                    nodeSize,
                );
                p.fill(0, 0, 0, 245 * influence);
                p.textSize(labelSize);
                p.text(
                    firstStageLabels[index],
                    firstStageProjectedX[index],
                    firstStageProjectedY[index] + 0.25,
                );
            }
            p.textStyle(p.NORMAL);
        };

        const drawKaleidocycle = (
            scale: number,
            centreX: number,
            centreY: number,
        ) => {
            const influence = stageInfluence(
                state.stageProgress,
                7,
            );
            if (influence <= 0.01) return;

            const modelScale =
                (scale / KALEIDOCYCLE_SIDE_EDGE) *
                (isMobile ? 0.92 : 1.02);
            const floatOffset =
                state.reducedMotion
                    ? 0
                    : Math.sin(elapsed * 0.00045) * 2.2;
            const vertices = KALEIDOCYCLE_MODEL.vertices;

            for (
                let index = 0;
                index < KALEIDOCYCLE_MODEL.vertexCount;
                index += 1
            ) {
                const offset = index * 3;
                const x = vertices[offset];
                const y = vertices[offset + 1];
                const z = vertices[offset + 2];

                const rotatedX = x;
                const rotatedY =
                    y * KALEIDOCYCLE_COS_X -
                    z * KALEIDOCYCLE_SIN_X;
                const rotatedZ =
                    y * KALEIDOCYCLE_SIN_X +
                    z * KALEIDOCYCLE_COS_X;
                const tiltedX =
                    rotatedX * KALEIDOCYCLE_COS_Y +
                    rotatedZ * KALEIDOCYCLE_SIN_Y;
                const tiltedZ =
                    -rotatedX * KALEIDOCYCLE_SIN_Y +
                    rotatedZ * KALEIDOCYCLE_COS_Y;
                const screenX =
                    tiltedX * KALEIDOCYCLE_COS_Z -
                    rotatedY * KALEIDOCYCLE_SIN_Z;
                const screenY =
                    tiltedX * KALEIDOCYCLE_SIN_Z +
                    rotatedY * KALEIDOCYCLE_COS_Z;

                kaleidocycleX[index] =
                    centreX + screenX * modelScale;
                kaleidocycleY[index] =
                    centreY + screenY * modelScale + floatOffset;
                kaleidocycleDepth[index] = tiltedZ;
            }

            p.noFill();
            const edges = KALEIDOCYCLE_MODEL.edges;
            for (
                let edge = 0;
                edge < edges.length;
                edge += 2
            ) {
                const start = edges[edge];
                const end = edges[edge + 1];
                const depth = clamp(
                    (kaleidocycleDepth[start] +
                        kaleidocycleDepth[end] +
                        510) /
                        1000,
                );
                setStroke(
                    foreground,
                    (112 + depth * 116) * influence,
                );
                p.strokeWeight(isMobile ? 1.2 : 1.55);
                p.line(
                    kaleidocycleX[start],
                    kaleidocycleY[start],
                    kaleidocycleX[end],
                    kaleidocycleY[end],
                );
            }

            p.noStroke();
            for (
                let index = 0;
                index < KALEIDOCYCLE_MODEL.vertexCount;
                index += 1
            ) {
                const depth = clamp(
                    (kaleidocycleDepth[index] + 255) / 500,
                );
                const nodeSize =
                    (isMobile ? 5.8 : 6.8) + depth * 2.4;
                setFill(accent, 40 * influence);
                p.circle(
                    kaleidocycleX[index],
                    kaleidocycleY[index],
                    nodeSize + 7,
                );
                setFill(accent, (205 + depth * 45) * influence);
                p.circle(
                    kaleidocycleX[index],
                    kaleidocycleY[index],
                    nodeSize,
                );
                setFill(foreground, 145 * influence);
                p.circle(
                    kaleidocycleX[index] - nodeSize * 0.16,
                    kaleidocycleY[index] - nodeSize * 0.16,
                    Math.max(1.2, nodeSize * 0.2),
                );
            }
        };

        const drawTechnicalGuides = (
            scale: number,
            centreX: number,
            centreY: number,
        ) => {
            const it = stageInfluence(state.stageProgress, 0);
            const vessel = stageInfluence(state.stageProgress, 1);
            const academic = stageInfluence(state.stageProgress, 2);

            p.strokeWeight(1);
            if (it > 0.01) {
                const columns = 9;
                for (let index = 0; index < drawParticleCount; index += 1) {
                    if ((index + 1) % columns !== 0 && index + 1 < drawParticleCount) {
                        setStroke(
                            foreground,
                            (index % 3 === 0 ? 58 : 112) * it,
                        );
                        p.line(
                            projectedX[index],
                            projectedY[index],
                            projectedX[index + 1],
                            projectedY[index + 1],
                        );
                    }
                    if (index + columns < drawParticleCount && index % 2 === 0) {
                        setStroke(
                            foreground,
                            (index % 4 === 0 ? 52 : 94) * it,
                        );
                        p.line(
                            projectedX[index],
                            projectedY[index],
                            projectedX[index + columns],
                            projectedY[index + columns],
                        );
                    }
                }
            }

            if (vessel > 0.01) {
                setStroke(foreground, 148 * vessel);
                p.strokeWeight(1.35);
                p.noFill();
                const vesselHalfWidth = scale * 0.78;
                const vesselHalfHeight = scale * 0.42;
                p.line(
                    centreX - vesselHalfWidth,
                    centreY - vesselHalfHeight,
                    centreX + vesselHalfWidth,
                    centreY - vesselHalfHeight,
                );
                p.line(
                    centreX - vesselHalfWidth,
                    centreY + vesselHalfHeight,
                    centreX + vesselHalfWidth,
                    centreY + vesselHalfHeight,
                );
                p.arc(
                    centreX - vesselHalfWidth,
                    centreY,
                    vesselHalfHeight * 2,
                    vesselHalfHeight * 2,
                    p.HALF_PI,
                    p.PI + p.HALF_PI,
                );
                p.arc(
                    centreX + vesselHalfWidth,
                    centreY,
                    vesselHalfHeight * 2,
                    vesselHalfHeight * 2,
                    -p.HALF_PI,
                    p.HALF_PI,
                );

                setStroke(foreground, 54 * vessel);
                p.strokeWeight(0.8);
                p.line(
                    centreX - vesselHalfWidth,
                    centreY - vesselHalfHeight * 0.82,
                    centreX + vesselHalfWidth,
                    centreY - vesselHalfHeight * 0.82,
                );
                p.line(
                    centreX - vesselHalfWidth,
                    centreY + vesselHalfHeight * 0.82,
                    centreX + vesselHalfWidth,
                    centreY + vesselHalfHeight * 0.82,
                );

                const shineOffset = state.reducedMotion
                    ? 0
                    : Math.sin(elapsed * 0.00045) * scale * 0.1;
                setStroke(accent, 175 * vessel);
                p.strokeWeight(1.7);
                p.line(
                    centreX - scale * 0.2 + shineOffset,
                    centreY - vesselHalfHeight,
                    centreX + scale * 0.24 + shineOffset,
                    centreY - vesselHalfHeight,
                );

                setStroke(foreground, 105 * vessel);
                p.strokeWeight(1);
                p.rect(
                    centreX - scale * 0.09,
                    centreY - scale * 0.64,
                    scale * 0.18,
                    scale * 0.22,
                );
                p.line(
                    centreX - scale * 0.54,
                    centreY + vesselHalfHeight,
                    centreX - scale * 0.66,
                    centreY + scale * 0.66,
                );
                p.line(
                    centreX + scale * 0.54,
                    centreY + vesselHalfHeight,
                    centreX + scale * 0.66,
                    centreY + scale * 0.66,
                );
                setStroke(muted, 62 * vessel);
                p.line(
                    centreX - scale * 1.22,
                    centreY,
                    centreX + scale * 1.22,
                    centreY,
                );

                p.noStroke();
                const bodyNodeCount = isMobile ? 5 : 8;
                for (
                    let node = 0;
                    node < bodyNodeCount;
                    node += 1
                ) {
                    const nodeProgress =
                        node / Math.max(1, bodyNodeCount - 1);
                    const nodeX =
                        centreX -
                        vesselHalfWidth +
                        nodeProgress * vesselHalfWidth * 2;
                    const shimmer = state.reducedMotion
                        ? 0
                        : Math.sin(elapsed * 0.0005 + node * 1.8) * 0.65;
                    const isRed = node % 3 === 0;
                    setFill(
                        isRed ? accent : foreground,
                        (isRed ? 220 : 170) * vessel,
                    );
                    p.circle(
                        nodeX,
                        centreY - vesselHalfHeight + shimmer,
                        isRed ? 4.2 : 2.5,
                    );
                    setFill(
                        isRed ? foreground : accent,
                        (isRed ? 160 : 205) * vessel,
                    );
                    p.circle(
                        nodeX,
                        centreY + vesselHalfHeight - shimmer,
                        isRed ? 2.7 : 3.8,
                    );
                }

                const arcNodeCount = isMobile ? 3 : 4;
                for (
                    let node = 1;
                    node <= arcNodeCount;
                    node += 1
                ) {
                    const arcProgress = node / (arcNodeCount + 1);
                    const leftAngle =
                        p.HALF_PI + arcProgress * p.PI;
                    const rightAngle =
                        -p.HALF_PI + arcProgress * p.PI;
                    const isRed = node % 2 === 0;
                    setFill(
                        isRed ? accent : foreground,
                        (isRed ? 220 : 165) * vessel,
                    );
                    p.circle(
                        centreX -
                            vesselHalfWidth +
                            Math.cos(leftAngle) * vesselHalfHeight,
                        centreY +
                            Math.sin(leftAngle) * vesselHalfHeight,
                        isRed ? 4 : 2.5,
                    );
                    p.circle(
                        centreX +
                            vesselHalfWidth +
                            Math.cos(rightAngle) * vesselHalfHeight,
                        centreY +
                            Math.sin(rightAngle) * vesselHalfHeight,
                        isRed ? 4 : 2.5,
                    );
                }
            }

            if (academic > 0.01) {
                drawCircle(scale * 0.7, scale * 0.54, 70 * academic);
                drawCircle(scale * 0.47, scale * 0.36, 44 * academic);
                setStroke(accent, 62 * academic);
                p.noFill();
                p.triangle(
                    centreX,
                    centreY - scale * 0.58,
                    centreX - scale * 0.53,
                    centreY + scale * 0.38,
                    centreX + scale * 0.53,
                    centreY + scale * 0.38,
                );
                setStroke(muted, 42 * academic);
                p.line(centreX - scale * 0.82, centreY, centreX + scale * 0.82, centreY);
                p.line(centreX, centreY - scale * 0.64, centreX, centreY + scale * 0.58);
            }

        };

        const updateSize = () => {
            const bounds = container.getBoundingClientRect();
            width = Math.max(1, Math.round(bounds.width));
            height = Math.max(1, Math.round(bounds.height));
            isMobile = width < 560;
            particleCount = isMobile
                ? MOBILE_PARTICLE_COUNT
                : DESKTOP_PARTICLE_COUNT;
            drawParticleCount = Math.max(
                24,
                Math.floor(particleCount * quality),
            );
            populateStageTargets(stageTargets, particleCount);

            if (p.width && p.height) {
                const density = isMobile
                    ? 1
                    : Math.min(window.devicePixelRatio, 2);
                if (p.pixelDensity() !== density) p.pixelDensity(density);
                p.frameRate(isMobile ? 30 : 45);
                p.resizeCanvas(width, height, true);
                refresh();
            }
        };

        refresh = () => {
            if (destroyed || !state.visible) return;
            if (state.reducedMotion) {
                p.noLoop();
                p.redraw();
                return;
            }
            lastActivityTime = performance.now();
            if (!p.isLooping()) p.loop();
        };

        setVisible = (visible: boolean) => {
            state.visible = visible;
            if (visible && !document.hidden) {
                if (state.reducedMotion) {
                    p.noLoop();
                    p.redraw();
                } else {
                    lastActivityTime = performance.now();
                    p.loop();
                }
            } else {
                p.noLoop();
            }
        };

        p.setup = () => {
            const bounds = container.getBoundingClientRect();
            width = Math.max(1, Math.round(bounds.width));
            height = Math.max(1, Math.round(bounds.height));
            isMobile = width < 560;
            particleCount = isMobile
                ? MOBILE_PARTICLE_COUNT
                : DESKTOP_PARTICLE_COUNT;
            drawParticleCount = particleCount;
            p.pixelDensity(
                isMobile ? 1 : Math.min(window.devicePixelRatio, 2),
            );
            const renderer = p.createCanvas(width, height);
            renderer.elt.setAttribute("aria-hidden", "true");
            renderer.elt.setAttribute("role", "presentation");
            renderer.elt.tabIndex = -1;
            p.frameRate(isMobile ? 30 : 45);
            p.strokeCap(p.ROUND);
            p.strokeJoin(p.ROUND);
            populateStageTargets(stageTargets, particleCount);
            refreshTheme();

            resizeObserver = new ResizeObserver(updateSize);
            resizeObserver.observe(container);

            themeObserver = new MutationObserver(refreshTheme);
            themeObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ["data-theme", "class"],
            });

            if (!state.visible || document.hidden || state.reducedMotion) {
                p.noLoop();
                p.redraw();
            }
        };

        p.draw = () => {
            p.background(
                background.r,
                background.g,
                background.b,
                255,
            );

            const smoothing = state.reducedMotion
                ? 1
                : 1 - Math.pow(0.001, Math.min(40, p.deltaTime) / 1000);
            state.progress +=
                (state.targetProgress - state.progress) * smoothing;
            state.stageProgress +=
                (state.targetStageProgress - state.stageProgress) * smoothing;

            if (!state.reducedMotion) {
                elapsed += Math.min(40, p.deltaTime);
            }

            const lowerStage = Math.min(
                stageCount - 1,
                Math.floor(state.stageProgress),
            );
            const upperStage = Math.min(stageCount - 1, lowerStage + 1);
            const blend = state.stageProgress - lowerStage;
            const scale = Math.min(width, height) * 0.43;
            const centreX = width / 2;
            const centreY = height / 2;
            const ambientAmount = state.reducedMotion
                ? 0
                : 1.2 +
                  stageInfluence(state.stageProgress, 0) * 2 +
                  stageInfluence(state.stageProgress, 5) * 1.5;

            const lowerTargets = stageTargets[lowerStage];
            const upperTargets = stageTargets[upperStage];

            for (let index = 0; index < drawParticleCount; index += 1) {
                const offset = index * 3;
                const x =
                    lowerTargets[offset] +
                    (upperTargets[offset] - lowerTargets[offset]) * blend;
                const y =
                    lowerTargets[offset + 1] +
                    (upperTargets[offset + 1] - lowerTargets[offset + 1]) *
                        blend;
                const z =
                    lowerTargets[offset + 2] +
                    (upperTargets[offset + 2] - lowerTargets[offset + 2]) *
                        blend;
                const drift =
                    Math.sin(elapsed * 0.00035 + particleSeeds[index]) *
                    ambientAmount;
                const depthScale = 1 + z * 0.22;

                projectedX[index] =
                    centreX + x * scale * depthScale + drift;
                projectedY[index] =
                    centreY +
                    y * scale * depthScale +
                    Math.cos(elapsed * 0.00028 + particleSeeds[index]) *
                        ambientAmount *
                        0.7;
            }

            const origins = stageInfluence(state.stageProgress, 0);
            const liminal = stageInfluence(state.stageProgress, 8);
            const particleVisibility =
                1 -
                Math.max(
                    stageInfluence(state.stageProgress, 3),
                    stageInfluence(state.stageProgress, 4),
                    stageInfluence(state.stageProgress, 5),
                    stageInfluence(state.stageProgress, 6),
                    stageInfluence(state.stageProgress, 7),
                );
            const lineVisibility = particleVisibility * (1 - liminal);
            if (origins > 0.01) {
                setStroke(
                    foreground,
                    (58 + origins * 72) * lineVisibility,
                );
            } else {
                setStroke(muted, 38 * lineVisibility);
            }
            p.strokeWeight(0.75);
            p.noFill();
            p.beginShape();
            const originStep = isMobile ? 3 : 2;
            for (
                let index = 0;
                index < drawParticleCount;
                index += originStep
            ) {
                p.vertex(projectedX[index], projectedY[index]);
            }
            p.endShape();

            drawTechnicalGuides(scale, centreX, centreY);
            drawKaleidocycle(scale, centreX, centreY);

            p.noStroke();
            for (let index = 0; index < drawParticleCount; index += 1) {
                const isAnchor =
                    index % Math.max(4, Math.round(drawParticleCount / 10)) ===
                    0;
                const depth = Math.abs(
                    lowerTargets[index * 3 + 2] +
                        (upperTargets[index * 3 + 2] -
                            lowerTargets[index * 3 + 2]) *
                            blend,
                );
                const connectedSize =
                    (isAnchor ? 5.2 - origins * 2.2 : 2.3) + depth * 3;
                const scatteredSize = 1.6 + hash(index, 20) * 6.8;
                const size =
                    connectedSize +
                    (scatteredSize - connectedSize) * liminal;
                if (liminal > 0.01) {
                    const colourChoice = hash(index, 21);
                    const dotColour =
                        colourChoice < 0.34
                            ? accent
                            : colourChoice < 0.76
                              ? foreground
                              : muted;
                    setFill(
                        dotColour,
                        (135 + hash(index, 22) * 105) *
                            particleVisibility,
                    );
                } else if (isAnchor && origins > 0.01) {
                    p.fill(
                        accent.r + (foreground.r - accent.r) * origins,
                        accent.g + (foreground.g - accent.g) * origins,
                        accent.b + (foreground.b - accent.b) * origins,
                        (150 + origins * 25) * particleVisibility,
                    );
                } else {
                    setFill(
                        isAnchor ? accent : foreground,
                        (isAnchor ? 225 : 150) * particleVisibility,
                    );
                }
                p.circle(projectedX[index], projectedY[index], size);
            }

            drawFirstStageFocus(scale, centreX, centreY);

            const directionOffset = state.direction * 8;
            setStroke(accent, 115 * (1 - liminal));
            p.strokeWeight(1);
            if (liminal < 0.999) {
                p.line(
                    centreX - scale * 0.18 + directionOffset,
                    centreY + scale * 0.75,
                    centreX + scale * 0.18 + directionOffset,
                    centreY + scale * 0.75,
                );
            }

            if (!state.reducedMotion && quality === 1) {
                lowFrameSamples =
                    p.deltaTime > 30
                        ? lowFrameSamples + 1
                        : Math.max(0, lowFrameSamples - 2);
                if (lowFrameSamples > 120) {
                    quality = 0.68;
                    drawParticleCount = Math.max(
                        24,
                        Math.floor(particleCount * quality),
                    );
                    p.frameRate(30);
                }
            }

            const settled =
                Math.abs(state.targetProgress - state.progress) < 0.0005 &&
                Math.abs(
                    state.targetStageProgress - state.stageProgress,
                ) < 0.0005;
            if (
                !state.reducedMotion &&
                settled &&
                performance.now() - lastActivityTime > 180
            ) {
                p.noLoop();
            }
        };
    }, container);

    return {
        refresh: () => refresh(),
        setVisible: (visible) => setVisible(visible),
        destroy: () => {
            destroyed = true;
            resizeObserver?.disconnect();
            themeObserver?.disconnect();
            instance?.remove();
            container.removeAttribute("data-rendered");
            container.removeAttribute("data-loading");
        },
    };
}
