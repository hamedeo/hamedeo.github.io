/* =========================================================
   CONFIGURATION AND SHARED STATE
   ========================================================= */

// START HERE for overall size and hinge-shape changes. Content, colours, and
// fonts are configured in surfaces.js; animation and canvas settings are in
// sketch.js. See ../README.md for safe examples of common modifications.

// Number of tetrahedra in the closed ring. The geometry and content mappings
// are designed for six, so do not change this without redesigning both.
let N = 6;

// Main geometric controls. sideEdge and hingeRatio are safe customization
// points within sensible ranges; hingeEdge is derived and should stay derived.
let sideEdge = 400;
let hingeRatio = 0.89;
let hingeEdge = sideEdge * hingeRatio;
// Filled during setup from TWO_PI / N; used to place each mirrored pair.
let sectorAngle;

// Elapsed-time folding speed in radians per millisecond. 0.003 matches the
// previous frameCount * 0.05 motion at 60 FPS and remains rate-independent.
const ANIMATION_SPEED = 0.0003;
let animationTime = 0;
let skipNextAnimationDelta = true;

// Default off-screen texture resolution. These affect texture sharpness and
// memory use, not the physical size of labels on a triangle.
let LABEL_W = 512;
let LABEL_H = 180;

// Runtime content and texture tables, indexed as [tetrahedron][face].
let surfaces = [];
let labelTextures = [];

// Persistent state prevents orientation and circular-order decisions from
// flickering when faces become edge-on or their normals are numerically weak.
// These values are managed by surfaces.js and labels.js, not customization UI.
let textOrientationStates = new Map();
let lastCentralJunction = { x: 0, y: 0, z: 0 };
let lastRedCircularOrder = [];
let lastRedRingNormal = { x: 0, y: 0, z: 1 };
let lastRedFrontNormals = new Map();
let redFrontUsesForwardTraversal = false;

// Shared words have exactly two legal texture orientations. Avoid adding an
// intermediate state: every frame must have a drawable orientation.
const TEXT_NORMAL = "NORMAL";
const TEXT_OPPOSITE = "OPPOSITE";

// Face 2 contains six individual red-side letters. RED_SEQUENCE is their
// canonical viewer-clockwise reading order on either physical side.
const RED_FACE_INDEX = 2;
const RED_SEQUENCE = ["D", "E", "S", "I", "G", "N"];
// Stability tolerances for centroid sorting and front/back traversal changes.
const RED_ORDER_MIN_GAP = 0.01;
const RED_SIDE_HYSTERESIS = 0.05;

// The measured face-3 opening range is about 0.408 to 180 degrees.
// Commit only at the tightly folded or center-edge-on unfolded extremes.
const DIHEDRAL_MIN_ENTER = Math.PI / 180;
const DIHEDRAL_MIN_EXIT = 6 * Math.PI / 180;
const DIHEDRAL_COMMIT_LIMIT = 2 * Math.PI / 180;
const DIHEDRAL_MAX_ENTER = 177 * Math.PI / 180;
const DIHEDRAL_MAX_EXIT = 170 * Math.PI / 180;
const DIHEDRAL_MOTION_EPSILON = 0.05 * Math.PI / 180;

// Loaded p5.Image objects, addressed by the keys assigned in sketch.js.
let faceImages = {};

// draw() waits for asynchronous image loading and texture creation to finish.
let assetsReady = false;

// Standalone pages keep orbit interaction enabled. The Astro host disables it
// while the persistent iframe is docked and enables it only when expanded.
let orbitControlsEnabled = window.self === window.top;
let performanceMode = window.self === window.top ? "expanded" : "docked";
let targetFrameRate = performanceMode === "docked" ? 30 : 60;
