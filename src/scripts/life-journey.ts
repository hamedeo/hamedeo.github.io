import {
    LIFE_VISUAL_STAGES,
    type LifeVisualStage,
} from "../data/lifeJourney";
import type p5 from "p5";
import type {
    createLifeSketch,
    LifeSketchController,
    LifeSketchState,
} from "./life-sketch";

export type LifeRuntime = {
    P5: typeof p5;
    createLifeSketch: typeof createLifeSketch;
};

export type LifeRuntimeLoader = () => Promise<LifeRuntime>;

const stageIndexes = new Map<LifeVisualStage, number>(
    LIFE_VISUAL_STAGES.map((stage, index) => [stage, index]),
);

function clamp(value: number, minimum = 0, maximum = 1) {
    return Math.min(maximum, Math.max(minimum, value));
}

export function mountLifeJourney(
    loadRuntime: LifeRuntimeLoader,
): () => void {
    const root = document.querySelector<HTMLElement>("[data-life-journey]");
    if (!root || root.dataset.initialized === "true") return () => {};

    const canvas = root.querySelector<HTMLElement>("[data-life-canvas]");
    const milestones = Array.from(
        root.querySelectorAll<HTMLElement>("[data-life-milestone]"),
    );
    const milestoneContents = milestones.map(
        (milestone) =>
            milestone.querySelector<HTMLElement>(".life-milestone-content") ??
            milestone,
    );
    const progress = root.querySelector<HTMLProgressElement>(
        "[data-life-progress]",
    );
    const progressValue = root.querySelector<HTMLElement>(
        "[data-life-progress-value]",
    );
    const progressPeriod = root.querySelector<HTMLElement>(
        "[data-life-progress-period]",
    );
    const logoLayer = root.querySelector<HTMLElement>(
        "[data-life-logo-layer]",
    );
    const logoGroups = Array.from(
        root.querySelectorAll<HTMLElement>("[data-life-logo-group]"),
    );

    if (
        !canvas ||
        milestones.length < 2 ||
        !progress ||
        !progressValue ||
        !progressPeriod
    ) {
        return () => {};
    }

    root.dataset.initialized = "true";
    const controller = new AbortController();
    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    );
    const state: LifeSketchState = {
        progress: 0,
        targetProgress: 0,
        stageProgress: 0,
        targetStageProgress: 0,
        activeIndex: 0,
        transitionProgress: 0,
        direction: 0,
        reducedMotion: reducedMotionQuery.matches,
        visible: false,
    };

    let sketch: LifeSketchController | undefined;
    let sketchPromise: Promise<void> | undefined;
    let disposed = false;
    let frameRequested = false;
    let previousScrollY = window.scrollY;
    let previousActiveIndex = -1;
    let milestoneAnchors = new Float64Array(milestones.length);
    let stagePositions = new Float32Array(milestones.length);
    let firstAnchor = 0;
    let finalAnchor = 1;
    let logoOrbitRadius = 96;
    let shineTimer = 0;
    let pointerFrame = 0;
    let pointerBounds: DOMRect | undefined;
    let pointerX = 0;
    let pointerY = 0;

    const triggerLogoShine = (group?: HTMLElement) => {
        if (!group || state.reducedMotion) return;
        window.clearTimeout(shineTimer);
        logoGroups.forEach((item) => item.removeAttribute("data-shine"));
        group.setAttribute("data-shine", "");
        shineTimer = window.setTimeout(() => {
            group.removeAttribute("data-shine");
        }, 760);
    };

    const updateLogos = (
        stageProgress: number,
        activeIndex: number,
        activeStageProgress: number,
    ) => {
        logoGroups.forEach((group) => {
            const stageIndex = Number(group.dataset.stageIndex);
            const presence = clamp(
                1 - Math.abs(stageProgress - stageIndex) * 1.25,
            );
            group.style.setProperty(
                "--life-logo-presence",
                String(presence),
            );
            group.style.setProperty(
                "--life-logo-offset",
                `${((1 - presence) * 14).toFixed(2)}px`,
            );
            group.style.setProperty(
                "--life-logo-scale",
                (0.94 + presence * 0.06).toFixed(3),
            );
            if (stageIndex === 5) {
                const principleProgress = state.reducedMotion
                    ? activeIndex === 5
                        ? 1
                        : 0
                    : activeIndex < 5
                      ? 0
                      : activeIndex > 5
                        ? 1
                        : activeStageProgress;
                const principleOne = clamp(principleProgress / 0.2);
                const principleTwo = clamp(
                    (principleProgress - 0.18) / 0.2,
                );
                const principleThree = clamp(
                    (principleProgress - 0.36) / 0.2,
                );
                group.style.setProperty(
                    "--life-morpheidos-word-1",
                    principleOne.toFixed(3),
                );
                group.style.setProperty(
                    "--life-morpheidos-word-2",
                    principleTwo.toFixed(3),
                );
                group.style.setProperty(
                    "--life-morpheidos-word-3",
                    principleThree.toFixed(3),
                );
            }
            if (stageIndex === 2) {
                const equationProgress = state.reducedMotion
                    ? activeIndex === 2
                        ? 1
                        : 0
                    : activeIndex < 2
                      ? 0
                      : activeIndex > 2
                        ? 1
                        : clamp(activeStageProgress / 0.36);
                group.style.setProperty(
                    "--life-equation-progress",
                    equationProgress.toFixed(3),
                );
                group.style.setProperty(
                    "--life-equation-shift",
                    `${((1 - equationProgress) * 0.7).toFixed(3)}rem`,
                );
                group.style.setProperty(
                    "--life-equation-shift-negative",
                    `${((equationProgress - 1) * 0.7).toFixed(3)}rem`,
                );
                group.style.setProperty(
                    "--life-equation-rise",
                    `${((equationProgress - 1) * 0.55).toFixed(3)}rem`,
                );
            }
            if (stageIndex === 1) {
                const orbitProgress =
                    activeIndex < 1
                        ? 0
                        : activeIndex > 1
                          ? 1
                          : activeStageProgress;
                const azgAngle = -14 + orbitProgress * 12;
                const azgRadians = azgAngle * (Math.PI / 180);
                const asmeAngle = 166 + orbitProgress * 12;
                const asmeRadians = asmeAngle * (Math.PI / 180);
                group.style.setProperty(
                    "--life-azg-orbit-x",
                    `${(Math.cos(azgRadians) * logoOrbitRadius).toFixed(2)}px`,
                );
                group.style.setProperty(
                    "--life-azg-orbit-y",
                    `${(Math.sin(azgRadians) * logoOrbitRadius).toFixed(2)}px`,
                );
                group.style.setProperty(
                    "--life-asme-orbit-x",
                    `${(Math.cos(asmeRadians) * logoOrbitRadius).toFixed(2)}px`,
                );
                group.style.setProperty(
                    "--life-asme-orbit-y",
                    `${(Math.sin(asmeRadians) * logoOrbitRadius).toFixed(2)}px`,
                );
            }
            group.toggleAttribute("data-active", activeIndex === stageIndex);
        });

        if (activeIndex !== previousActiveIndex) {
            const activeGroup = logoGroups.find(
                (group) => Number(group.dataset.stageIndex) === activeIndex,
            );
            triggerLogoShine(activeGroup);
            previousActiveIndex = activeIndex;
        }
    };

    const measure = () => {
        milestoneAnchors = new Float64Array(milestones.length);
        stagePositions = new Float32Array(milestones.length);

        milestones.forEach((milestone, index) => {
            const content = milestoneContents[index] ?? milestone;
            const bounds = content.getBoundingClientRect();
            milestoneAnchors[index] = window.scrollY + bounds.top;
            const visualStage = milestone.dataset
                .visualStage as LifeVisualStage;
            stagePositions[index] = stageIndexes.get(visualStage) ?? 0;
        });

        firstAnchor = milestoneAnchors[0];
        finalAnchor =
            milestoneAnchors[milestoneAnchors.length - 1] || firstAnchor + 1;
        const canvasBounds = canvas.getBoundingClientRect();
        logoOrbitRadius =
            canvasBounds.width * (canvasBounds.width < 560 ? 0.41 : 0.415);
    };

    const update = () => {
        frameRequested = false;
        if (disposed) return;

        const upperTriggerLine =
            window.scrollY + window.innerHeight * 0;
        const lowerTriggerLine =
            window.scrollY + window.innerHeight * 0.5;
        const denominator = Math.max(1, finalAnchor - firstAnchor);
        const nextProgress = clamp(
            (lowerTriggerLine - firstAnchor) / denominator,
        );
        const nextDirection =
            window.scrollY > previousScrollY
                ? 1
                : window.scrollY < previousScrollY
                  ? -1
                  : state.direction;
        previousScrollY = window.scrollY;

        let activeIndex = 0;
        for (let index = 1; index < milestoneAnchors.length; index += 1) {
            if (lowerTriggerLine >= milestoneAnchors[index]) {
                activeIndex = index;
            } else {
                break;
            }
        }

        const triggerBandHeight = Math.max(
            1,
            lowerTriggerLine - upperTriggerLine,
        );
        const segmentProgress = clamp(
            (lowerTriggerLine - milestoneAnchors[activeIndex]) /
                triggerBandHeight,
        );
        const nextStageProgress = stagePositions[activeIndex];

        state.targetProgress = nextProgress;
        state.targetStageProgress = nextStageProgress;
        state.activeIndex = activeIndex;
        state.transitionProgress = segmentProgress;
        state.direction = nextDirection as -1 | 0 | 1;

        if (state.reducedMotion) {
            state.progress = nextProgress;
            state.stageProgress = stagePositions[activeIndex];
            state.targetStageProgress = state.stageProgress;
        }

        milestones.forEach((milestone, index) => {
            const isActive = index === activeIndex;
            milestone.toggleAttribute("data-active", isActive);
            if (isActive) {
                milestone.setAttribute("aria-current", "step");
            } else {
                milestone.removeAttribute("aria-current");
            }
        });

        progress.value = nextProgress;
        progress.textContent = `${Math.round(nextProgress * 100)}%`;
        progressValue.textContent = String(activeIndex + 1).padStart(2, "0");
        progressPeriod.textContent =
            milestones[activeIndex]?.dataset.lifePeriod ?? "";
        root.style.setProperty("--life-progress", String(nextProgress));
        updateLogos(
            state.reducedMotion
                ? stagePositions[activeIndex]
                : nextStageProgress,
            activeIndex,
            segmentProgress,
        );
        sketch?.refresh();
    };

    const requestUpdate = () => {
        if (frameRequested) return;
        frameRequested = true;
        window.requestAnimationFrame(update);
    };

    const onResize = () => {
        measure();
        requestUpdate();
    };

    const onMotionChange = () => {
        state.reducedMotion = reducedMotionQuery.matches;
        canvas.toggleAttribute(
            "data-reduced-motion",
            state.reducedMotion,
        );
        sketch?.setVisible(state.visible);
        if (state.reducedMotion && logoLayer) {
            logoLayer.style.removeProperty("--life-logo-x");
            logoLayer.style.removeProperty("--life-logo-y");
            logoLayer.style.removeProperty("--life-logo-tilt");
        }
        requestUpdate();
    };

    const applyPointerPosition = () => {
        pointerFrame = 0;
        if (!logoLayer || !pointerBounds || state.reducedMotion) return;
        const normalX = clamp(
            (pointerX - pointerBounds.left) / pointerBounds.width,
        ) * 2 - 1;
        const normalY = clamp(
            (pointerY - pointerBounds.top) / pointerBounds.height,
        ) * 2 - 1;
        logoLayer.style.setProperty(
            "--life-logo-x",
            `${(normalX * 3).toFixed(2)}px`,
        );
        logoLayer.style.setProperty(
            "--life-logo-y",
            `${(normalY * 2).toFixed(2)}px`,
        );
        logoLayer.style.setProperty(
            "--life-logo-tilt",
            `${(normalX * 2).toFixed(2)}deg`,
        );
    };

    const onPointerEnter = () => {
        pointerBounds = canvas.getBoundingClientRect();
    };

    const onPointerMove = (event: PointerEvent) => {
        if (
            state.reducedMotion ||
            event.pointerType === "touch" ||
            !window.matchMedia("(pointer: fine)").matches
        ) {
            return;
        }
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (!pointerFrame) {
            pointerFrame = window.requestAnimationFrame(applyPointerPosition);
        }
    };

    const resetPointerPosition = () => {
        pointerBounds = undefined;
        if (!logoLayer) return;
        logoLayer.style.removeProperty("--life-logo-x");
        logoLayer.style.removeProperty("--life-logo-y");
        logoLayer.style.removeProperty("--life-logo-tilt");
    };

    const onPointerAction = () => {
        triggerLogoShine(
            logoGroups.find(
                (group) =>
                    Number(group.dataset.stageIndex) === state.activeIndex,
            ),
        );
    };

    const ensureSketch = () => {
        if (disposed || sketch || sketchPromise) return;

        canvas.dataset.loading = "true";
        sketchPromise = loadRuntime()
            .then(({ P5, createLifeSketch }) => {
                if (disposed) return;

                const createdSketch = createLifeSketch(P5, canvas, state);
                if (disposed) {
                    createdSketch.destroy();
                    return;
                }

                sketch = createdSketch;
                canvas.dataset.rendered = "true";
                sketch.setVisible(state.visible);
                sketch.refresh();
            })
            .catch((error) => {
                console.error("Life journey visual could not start.", error);
                canvas.dataset.renderError = "true";
            })
            .finally(() => {
                canvas.removeAttribute("data-loading");
            });
    };

    const preloadObserver = new IntersectionObserver(
        ([entry]) => {
            if (!entry?.isIntersecting) return;
            preloadObserver.disconnect();
            ensureSketch();
        },
        { rootMargin: "300px 0px" },
    );

    const visibilityObserver = new IntersectionObserver(
        ([entry]) => {
            state.visible = Boolean(entry?.isIntersecting) && !document.hidden;
            sketch?.setVisible(state.visible);
        },
        { rootMargin: "0px", threshold: 0.01 },
    );
    const layoutObserver = new ResizeObserver(() => {
        measure();
        requestUpdate();
    });

    const onDocumentVisibility = () => {
        const bounds = canvas.getBoundingClientRect();
        state.visible =
            !document.hidden &&
            bounds.bottom > 0 &&
            bounds.top < window.innerHeight;
        sketch?.setVisible(state.visible);
    };

    measure();
    update();
    canvas.toggleAttribute("data-reduced-motion", state.reducedMotion);
    const initialCanvasBounds = canvas.getBoundingClientRect();
    const canvasIsNearViewport =
        initialCanvasBounds.bottom >= -300 &&
        initialCanvasBounds.top <= window.innerHeight + 300;
    if (canvasIsNearViewport) {
        ensureSketch();
    } else {
        preloadObserver.observe(canvas);
    }
    visibilityObserver.observe(canvas);
    layoutObserver.observe(root);

    window.addEventListener("scroll", requestUpdate, {
        passive: true,
        signal: controller.signal,
    });
    window.addEventListener("resize", onResize, {
        passive: true,
        signal: controller.signal,
    });
    document.addEventListener("visibilitychange", onDocumentVisibility, {
        signal: controller.signal,
    });
    reducedMotionQuery.addEventListener("change", onMotionChange, {
        signal: controller.signal,
    });
    canvas.addEventListener("pointerenter", onPointerEnter, {
        passive: true,
        signal: controller.signal,
    });
    canvas.addEventListener("pointermove", onPointerMove, {
        passive: true,
        signal: controller.signal,
    });
    canvas.addEventListener("pointerleave", resetPointerPosition, {
        passive: true,
        signal: controller.signal,
    });
    canvas.addEventListener("pointerdown", onPointerAction, {
        passive: true,
        signal: controller.signal,
    });

    return () => {
        disposed = true;
        controller.abort();
        window.clearTimeout(shineTimer);
        window.cancelAnimationFrame(pointerFrame);
        preloadObserver.disconnect();
        visibilityObserver.disconnect();
        layoutObserver.disconnect();
        sketch?.destroy();
        root.dataset.initialized = "false";
        root.style.removeProperty("--life-progress");
        resetPointerPosition();
        logoGroups.forEach((group) => {
            group.removeAttribute("data-active");
            group.removeAttribute("data-shine");
            group.style.removeProperty("--life-logo-presence");
            group.style.removeProperty("--life-logo-offset");
            group.style.removeProperty("--life-logo-scale");
            group.style.removeProperty("--life-equation-progress");
            group.style.removeProperty("--life-equation-shift");
            group.style.removeProperty("--life-equation-shift-negative");
            group.style.removeProperty("--life-equation-rise");
            group.style.removeProperty("--life-morpheidos-word-1");
            group.style.removeProperty("--life-morpheidos-word-2");
            group.style.removeProperty("--life-morpheidos-word-3");
            group.style.removeProperty("--life-azg-orbit-x");
            group.style.removeProperty("--life-azg-orbit-y");
            group.style.removeProperty("--life-asme-orbit-x");
            group.style.removeProperty("--life-asme-orbit-y");
        });
    };
}
