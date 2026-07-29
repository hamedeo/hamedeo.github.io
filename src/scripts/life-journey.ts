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
    const progress = root.querySelector<HTMLProgressElement>(
        "[data-life-progress]",
    );
    const progressValue = root.querySelector<HTMLElement>(
        "[data-life-progress-value]",
    );

    if (!canvas || milestones.length < 2 || !progress || !progressValue) {
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
    let milestoneCentres = new Float64Array(milestones.length);
    let stagePositions = new Float32Array(milestones.length);
    let firstCentre = 0;
    let finalCentre = 1;

    const measure = () => {
        milestoneCentres = new Float64Array(milestones.length);
        stagePositions = new Float32Array(milestones.length);

        milestones.forEach((milestone, index) => {
            const bounds = milestone.getBoundingClientRect();
            milestoneCentres[index] =
                window.scrollY + bounds.top + bounds.height / 2;
            const visualStage = milestone.dataset
                .visualStage as LifeVisualStage;
            stagePositions[index] = stageIndexes.get(visualStage) ?? 0;
        });

        firstCentre = milestoneCentres[0];
        finalCentre =
            milestoneCentres[milestoneCentres.length - 1] || firstCentre + 1;
    };

    const update = () => {
        frameRequested = false;
        if (disposed) return;

        const readingLine = window.scrollY + window.innerHeight * 0.5;
        const denominator = Math.max(1, finalCentre - firstCentre);
        const nextProgress = clamp(
            (readingLine - firstCentre) / denominator,
        );
        const nextDirection =
            window.scrollY > previousScrollY
                ? 1
                : window.scrollY < previousScrollY
                  ? -1
                  : state.direction;
        previousScrollY = window.scrollY;

        let activeIndex = 0;
        let nearestDistance = Number.POSITIVE_INFINITY;
        milestones.forEach((_milestone, index) => {
            const distance = Math.abs(milestoneCentres[index] - readingLine);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                activeIndex = index;
            }
        });

        let lowerIndex = 0;
        while (
            lowerIndex < milestoneCentres.length - 2 &&
            readingLine >= milestoneCentres[lowerIndex + 1]
        ) {
            lowerIndex += 1;
        }

        const upperIndex = Math.min(
            milestones.length - 1,
            lowerIndex + 1,
        );
        const segmentLength = Math.max(
            1,
            milestoneCentres[upperIndex] - milestoneCentres[lowerIndex],
        );
        const segmentProgress =
            readingLine <= firstCentre
                ? 0
                : readingLine >= finalCentre
                  ? 1
                  : clamp(
                        (readingLine - milestoneCentres[lowerIndex]) /
                            segmentLength,
                    );
        const nextStageProgress =
            stagePositions[lowerIndex] +
            (stagePositions[upperIndex] - stagePositions[lowerIndex]) *
                segmentProgress;

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
        root.style.setProperty("--life-progress", String(nextProgress));
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
        requestUpdate();
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
    preloadObserver.observe(canvas);
    visibilityObserver.observe(canvas);

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

    return () => {
        disposed = true;
        controller.abort();
        preloadObserver.disconnect();
        visibilityObserver.disconnect();
        sketch?.destroy();
        root.dataset.initialized = "false";
        root.style.removeProperty("--life-progress");
    };
}
