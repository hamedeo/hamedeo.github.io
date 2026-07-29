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

function populateStageTargets(
    targets: Float32Array[],
    particleCount: number,
) {
    for (let index = 0; index < particleCount; index += 1) {
        const u = particleCount <= 1 ? 0 : index / (particleCount - 1);
        const centred = u * 2 - 1;
        const jitterX = hash(index, 1) - 0.5;
        const jitterY = hash(index, 2) - 0.5;
        let offset = index * 3;

        // Origins: an open, irregular path with room to search.
        targets[0][offset] =
            centred * 0.83 + Math.sin(index * 1.71) * 0.045;
        targets[0][offset + 1] =
            Math.sin(u * Math.PI * 3.2) * 0.28 +
            jitterY * 0.24 * (0.35 + Math.abs(centred));
        targets[0][offset + 2] = jitterX * 0.22;

        // Mechanical education: rings, linkages and triangular structure.
        const mechanicalGroup = index % 3;
        const mechanicalAngle =
            TAU * (index / particleCount) + mechanicalGroup * 0.18;
        const mechanicalRadius =
            mechanicalGroup === 0 ? 0.72 : mechanicalGroup === 1 ? 0.45 : 0.24;
        targets[1][offset] =
            Math.cos(mechanicalAngle) * mechanicalRadius;
        targets[1][offset + 1] =
            Math.sin(mechanicalAngle) * mechanicalRadius * 0.78;
        targets[1][offset + 2] =
            Math.sin(mechanicalAngle * 2) * 0.08;

        // Technology and project work: distinct systems in communication.
        const networkGroup = index % 4;
        const networkAngle = TAU * (index / Math.max(1, particleCount / 4));
        const networkCentresX = [-0.55, 0.12, 0.55, -0.08];
        const networkCentresY = [-0.22, -0.42, 0.2, 0.4];
        targets[2][offset] =
            networkCentresX[networkGroup] +
            Math.cos(networkAngle) * (0.13 + hash(index, 3) * 0.1);
        targets[2][offset + 1] =
            networkCentresY[networkGroup] +
            Math.sin(networkAngle) * (0.1 + hash(index, 4) * 0.08);
        targets[2][offset + 2] = (networkGroup - 1.5) * 0.05;

        // Industrial engineering: a weighted frame and controlled paths.
        const columns = 9;
        const column = index % columns;
        const row = Math.floor(index / columns);
        const rowCount = Math.ceil(particleCount / columns);
        targets[3][offset] = (column / (columns - 1) - 0.5) * 1.55;
        targets[3][offset + 1] =
            (row / Math.max(1, rowCount - 1) - 0.5) * 1.15;
        targets[3][offset + 2] =
            Math.sin(column * 0.9 + row * 0.6) * 0.05;

        // Movement: separated places held together by a continuous trajectory.
        const travelX = centred * 0.9;
        const travelY =
            Math.sin((u * 1.15 + 0.08) * Math.PI * 2) * 0.33 +
            Math.sin(u * Math.PI * 5) * 0.07;
        const waypoint = Math.round(u * 3) / 3;
        const gather = 1 - clamp(Math.abs(u - waypoint) * 16);
        targets[4][offset] = travelX + jitterX * 0.08 * gather;
        targets[4][offset + 1] = travelY + jitterY * 0.11 * gather;
        targets[4][offset + 2] =
            Math.sin(u * Math.PI * 2) * 0.18;

        // Thermo-fluids: coherent streamlines that separate into droplets.
        const lane = (index % 6) - 2.5;
        const flowX = centred * 0.94;
        const breakup = clamp((u - 0.48) / 0.52);
        targets[5][offset] =
            flowX + breakup * jitterX * 0.16;
        targets[5][offset + 1] =
            lane * 0.075 * (1 - breakup * 0.55) +
            Math.sin(u * Math.PI * 2 + lane * 0.45) *
                (0.08 + breakup * 0.18) +
            breakup * jitterY * 0.14;
        targets[5][offset + 2] =
            Math.cos(u * Math.PI * 3 + lane) * breakup * 0.16;

        // Precision engineering: ordered nodes and tightly coordinated loops.
        const precisionAngle = TAU * u;
        const precisionBand = (index % 4) - 1.5;
        targets[6][offset] =
            Math.cos(precisionAngle) * (0.62 + precisionBand * 0.045);
        targets[6][offset + 1] =
            Math.sin(precisionAngle) * (0.42 + precisionBand * 0.03);
        targets[6][offset + 2] = precisionBand * 0.035;

        // Creation: one living, Möbius-like structure.
        const mobiusAngle = TAU * u;
        const bandPosition = ((index % 5) - 2) * 0.085;
        const mobiusRadius =
            0.58 + bandPosition * Math.cos(mobiusAngle / 2);
        const mobiusX = mobiusRadius * Math.cos(mobiusAngle);
        const mobiusY = mobiusRadius * Math.sin(mobiusAngle);
        const mobiusZ = bandPosition * Math.sin(mobiusAngle / 2);
        targets[7][offset] = mobiusX + mobiusZ * 0.52;
        targets[7][offset + 1] = mobiusY * 0.72 - mobiusZ * 0.68;
        targets[7][offset + 2] = mobiusZ;
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
        const particleSeeds = new Float32Array(DESKTOP_PARTICLE_COUNT);

        let width = 1;
        let height = 1;
        let particleCount = DESKTOP_PARTICLE_COUNT;
        let drawParticleCount = particleCount;
        let isMobile = false;
        let curveStep = 1;
        let quality = 1;
        let lowFrameSamples = 0;
        let elapsed = 0;
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

        const drawTechnicalGuides = (
            scale: number,
            centreX: number,
            centreY: number,
        ) => {
            const mechanical = stageInfluence(state.stageProgress, 1);
            const network = stageInfluence(state.stageProgress, 2);
            const industrial = stageInfluence(state.stageProgress, 3);
            const movement = stageInfluence(state.stageProgress, 4);
            const flow = stageInfluence(state.stageProgress, 5);
            const precision = stageInfluence(state.stageProgress, 6);
            const creation = stageInfluence(state.stageProgress, 7);

            p.strokeWeight(1);
            if (mechanical > 0.01) {
                drawCircle(scale * 0.72, scale * 0.56, 60 * mechanical);
                drawCircle(scale * 0.45, scale * 0.35, 42 * mechanical);
                setStroke(muted, 58 * mechanical);
                p.line(
                    centreX - scale * 0.9,
                    centreY,
                    centreX + scale * 0.9,
                    centreY,
                );
                p.line(
                    centreX,
                    centreY - scale * 0.72,
                    centreX,
                    centreY + scale * 0.72,
                );
                p.triangle(
                    centreX,
                    centreY - scale * 0.58,
                    centreX - scale * 0.52,
                    centreY + scale * 0.42,
                    centreX + scale * 0.52,
                    centreY + scale * 0.42,
                );
            }

            if (network > 0.01) {
                setStroke(accent, 55 * network);
                const stride =
                    Math.max(4, Math.floor(particleCount / 12)) * curveStep;
                for (
                    let index = 0;
                    index + stride < drawParticleCount;
                    index += stride
                ) {
                    p.line(
                        projectedX[index],
                        projectedY[index],
                        projectedX[index + stride],
                        projectedY[index + stride],
                    );
                }
            }

            if (industrial > 0.01) {
                setStroke(foreground, 42 * industrial);
                p.strokeWeight(1.25);
                const columnExtent = isMobile ? 2 : 3;
                const rowExtent = isMobile ? 1 : 2;
                for (
                    let index = -columnExtent;
                    index <= columnExtent;
                    index += 1
                ) {
                    const x = centreX + index * scale * 0.22;
                    p.line(
                        x,
                        centreY - scale * 0.63,
                        x,
                        centreY + scale * 0.63,
                    );
                }
                for (
                    let index = -rowExtent;
                    index <= rowExtent;
                    index += 1
                ) {
                    const y = centreY + index * scale * 0.25;
                    p.line(
                        centreX - scale * 0.82,
                        y,
                        centreX + scale * 0.82,
                        y,
                    );
                }
            }

            if (movement > 0.01) {
                setStroke(accent, 75 * movement);
                p.noFill();
                p.beginShape();
                for (
                    let index = 0;
                    index < drawParticleCount;
                    index += 3 * curveStep
                ) {
                    p.curveVertex(projectedX[index], projectedY[index]);
                }
                p.endShape();

                for (let waypoint = 0; waypoint < 4; waypoint += 1) {
                    const index = Math.min(
                        drawParticleCount - 1,
                        Math.round((waypoint / 3) * (drawParticleCount - 1)),
                    );
                    p.circle(
                        projectedX[index],
                        projectedY[index],
                        8 + waypoint * 1.5,
                    );
                }
            }

            if (flow > 0.01) {
                setStroke(muted, 50 * flow);
                p.noFill();
                for (let lane = 0; lane < 6; lane += 1) {
                    p.beginShape();
                    for (
                        let index = lane;
                        index < drawParticleCount;
                        index += 6 * curveStep
                    ) {
                        p.curveVertex(projectedX[index], projectedY[index]);
                    }
                    p.endShape();
                }
            }

            if (precision > 0.01) {
                drawCircle(scale * 0.68, scale * 0.46, 75 * precision);
                drawCircle(scale * 0.61, scale * 0.41, 38 * precision);
                setStroke(accent, 56 * precision);
                p.line(
                    centreX - scale * 0.82,
                    centreY,
                    centreX + scale * 0.82,
                    centreY,
                );
                p.line(
                    centreX,
                    centreY - scale * 0.58,
                    centreX,
                    centreY + scale * 0.58,
                );
            }

            if (creation > 0.01) {
                setStroke(accent, 98 * creation);
                p.strokeWeight(1.15);
                p.noFill();
                p.beginShape();
                for (
                    let index = 0;
                    index < drawParticleCount;
                    index += curveStep
                ) {
                    p.curveVertex(projectedX[index], projectedY[index]);
                }
                p.endShape(p.CLOSE);

                setStroke(foreground, 44 * creation);
                for (
                    let index = 0;
                    index + 5 < drawParticleCount;
                    index += 5 * curveStep
                ) {
                    p.line(
                        projectedX[index],
                        projectedY[index],
                        projectedX[index + 4],
                        projectedY[index + 4],
                    );
                }
            }
        };

        const updateSize = () => {
            const bounds = container.getBoundingClientRect();
            width = Math.max(1, Math.round(bounds.width));
            height = Math.max(1, Math.round(bounds.height));
            isMobile = width < 560;
            curveStep = isMobile ? 2 : 1;
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
            if (state.reducedMotion || !p.isLooping()) p.redraw();
        };

        setVisible = (visible: boolean) => {
            state.visible = visible;
            if (visible && !document.hidden) {
                if (state.reducedMotion) {
                    p.noLoop();
                    p.redraw();
                } else {
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
            curveStep = isMobile ? 2 : 1;
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
            setStroke(muted, 38 + origins * 35);
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
                const size = (isAnchor ? 5.2 : 2.3) + depth * 3;
                setFill(isAnchor ? accent : foreground, isAnchor ? 225 : 150);
                p.circle(projectedX[index], projectedY[index], size);
            }

            const directionOffset = state.direction * 8;
            setStroke(accent, 115);
            p.strokeWeight(1);
            p.line(
                centreX - scale * 0.18 + directionOffset,
                centreY + scale * 0.75,
                centreX + scale * 0.18 + directionOffset,
                centreY + scale * 0.75,
            );

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
