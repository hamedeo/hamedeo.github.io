# Kaleidocycle customization guide

This sketch uses p5.js in global mode. The JavaScript files are ordinary scripts loaded by `index.html`, so there are no imports, exports, build tools, or modules to configure.

Make one small change at a time and reload the page. Geometry and label-orientation code is interconnected; keep a backup before modifying the advanced settings described below.

## Project structure

- `js/config.js` — shared dimensions, derived geometry values, texture sizes, and persistent label-orientation state.
- `js/math3d.js` — reusable point, vector, projection, normal, distance, and centroid calculations. Most content changes do not require editing this file.
- `js/geometry.js` — creates and folds the tetrahedra and calculates pair dihedral angles.
- `js/surfaces.js` — face colours, words, individual red letters, images, fonts, and face-to-content assignments. This is the main file for content changes.
- `js/labels.js` — creates text/image textures and keeps front, back, shared-pair, and centre-facing labels readable.
- `js/renderer.js` — draws triangle faces, label textures, and triangle edges.
- `js/sketch.js` — p5 `setup()` and `draw()`, including the canvas, image loading, camera controls, scene rotation, and animation loop.
- `style.css` — browser-page and canvas CSS.
- `index.html` — loads p5.js and the project scripts in dependency order. Keep that order unchanged.

## Common modifications

### Animation speed

Change the elapsed-time multiplier in `js/config.js`:

```js
// File: js/config.js
const ANIMATION_SPEED = 0.002; // slower than the current 0.003
```

Use a larger number for faster movement and a smaller positive number for slower movement.

The folding animation uses elapsed time rather than `frameCount`, so its visible
speed remains stable whenever the expanded animation resumes.

### Kaleidocycle size

Change `sideEdge`. `hingeEdge` is derived from it automatically.

```js
// File: js/config.js
let sideEdge = 500; // current value: 400
```

### Hinge ratio

Change `hingeRatio`. Keep it between `0` and `1`; values close to the current value are safest.

```js
// File: js/config.js
let hingeRatio = 0.85; // current value: 0.89
```

### Canvas size

Change the first two arguments of `createCanvas()` and keep `WEBGL`.

```js
// File: js/sketch.js, function setup()
createCanvas(900, 700, WEBGL);
```

The expanded size inside the Astro website is configured separately:

```js
// File: js/config.js
const EMBEDDED_MAX_VIEWPORT_RATIO = 0.65;
const EMBEDDED_MAX_SIZE = 900;
```

The ratio uses the viewport's shorter dimension, preserving the square shape.

### Background colour

The canvas is currently transparent because `draw()` calls `clear()`. To use an
opaque colour instead, replace it with `background()`:

```js
// File: js/sketch.js, function draw()
background("#eeeeee");
```

### Face colours

Edit the palette at the top of `js/surfaces.js`. `SIDE_3_COLORS` assigns the six mixed-side triangles.

```js
// File: js/surfaces.js
const WHITE = "#fff8e7";
const BLACK = "#17202a";
const R_RED = "#c92f56";

const SIDE_3_COLORS = [WHITE, WHITE, BLACK, BLACK, R_RED, R_RED];
```

Keep equal colours next to each other in `SIDE_3_COLORS` so the three shared-word pairs remain visually connected.

### DESIGN, DEVELOP, and DELIVER

Edit the three `setSharedTextPair()` calls in `initSurfaceSettings()`:

```js
// File: js/surfaces.js, function initSurfaceSettings()
setSharedTextPair(0, 1, 3, "RESEARCH");
setSharedTextPair(2, 3, 3, "CREATE");
setSharedTextPair(4, 5, 3, "SHARE");
```

Do not change the tetrahedron pairs `(0, 1)`, `(2, 3)`, and `(4, 5)` unless the geometry and UV mapping are also redesigned.

### Red-side individual letters

`RED_SEQUENCE` is the canonical clockwise sequence. Change it to six one-character strings:

```js
// File: js/config.js
const RED_SEQUENCE = ["C", "O", "D", "I", "N", "G"];
```

Also update the six `setText(..., 2, ...)` calls in `initSurfaceSettings()` so a texture exists for every letter. The current verified triangle assignment is:

```js
// File: js/surfaces.js, function initSurfaceSettings()
setText(0, 2, "D", 350, 130, 230);
setText(1, 2, "I", 300, 130, 230);
setText(2, 2, "N", 250, 130, 230);
setText(3, 2, "G", 200, 130, 230);
setText(4, 2, "C", 450, 130, 230);
setText(5, 2, "O", 400, 130, 230);
```

The numeric font sizes above compensate for the current triangle layout. Adjust them visually if the new letters have very different widths.

### Font

Change the default `fontFamily` in `makeSurface()`. Use a font available in the browser:

```js
// File: js/surfaces.js, function makeSurface()
fontFamily: "Verdana",
```

`drawTextTexture()` and `drawSharedTextTexture()` in `js/labels.js` apply this setting. To style one face only, set its configuration after `setText()`:

```js
setText(0, 0, "HELLO", 42, 130, 45);
surfaces[0][0].fontFamily = "Georgia";
```

### Font size

For a single triangle, the fourth `setText()` argument is the font size. For a shared pair, the optional fifth `setSharedTextPair()` argument is the font size.

```js
// File: js/surfaces.js, function initSurfaceSettings()
setText(0, 2, "S", 300, 130, 230);
setSharedTextPair(0, 1, 3, "DESIGN", 82);
```

### Text colour

Set `textColor` after assigning content:

```js
// File: js/surfaces.js, function initSurfaceSettings()
setText(0, 0, "HELLO", 42, 130, 45);
surfaces[0][0].textColor = "#0066cc";
```

Shared-pair text colour is normally selected by `readableTextColor()` inside `setSharedTextPair()`. Override both triangles after that call:

```js
surfaces[0][3].textColor = "#333333";
surfaces[1][3].textColor = "#333333";
```

### Text position

Single-face labels are centred by `center` in `drawCenteredLabel()`. To move all such labels along their face-local horizontal and vertical axes, add an offset after those axes have been calculated:

```js
// File: js/labels.js, function drawCenteredLabel()
// Add this after xAxis and yAxis are finalized, before frontCenter/backCenter:
center = addPt(center, addPt(scalePt(xAxis, 10), scalePt(yAxis, -5)));
```

Positive `xAxis` moves horizontally and positive `yAxis` moves vertically in label-local space. Shared words use geometry-wide UV mapping and should remain centred unless `sharedPairUVs()` is intentionally redesigned.

### Text rotation

To rotate every single-face label in its own plane, rotate `xAxis` and `yAxis` just before `w` and `h` are assigned:

```js
// File: js/labels.js, function drawCenteredLabel()
let angle = Math.PI / 12; // 15 degrees
let oldX = xAxis;
let oldY = yAxis;
xAxis = addPt(scalePt(oldX, Math.cos(angle)), scalePt(oldY, Math.sin(angle)));
yAxis = addPt(scalePt(oldX, -Math.sin(angle)), scalePt(oldY, Math.cos(angle)));
```

This is an advanced global change. It affects all individually centred text and images.

### Text orientation

The intended upright direction for shared words is calculated in `getCenterFacingOrientationScore()`. It projects this radial direction into the pair plane:

```js
// File: js/labels.js, function getCenterFacingOrientationScore()
let radialDirection = subPt(pairCentroid, centralJunction);
let radialInPlane = projectOntoPlane(radialDirection, pairNormal);
```

Keep this code for centre-reader orientation. Reversing `radialDirection` would intentionally make the words upright for an outside reader instead:

```js
let radialDirection = subPt(centralJunction, pairCentroid);
```

### Triangle edge colour

Change `stroke()` in `drawTetra()`:

```js
// File: js/renderer.js, function drawTetra()
stroke("#555555");
```

### Triangle edge thickness

Change `strokeWeight()` in `drawTetra()`:

```js
// File: js/renderer.js, function drawTetra()
strokeWeight(2);
```

### Camera position

The current view uses an orthographic projection followed by fixed scene rotations. Small changes to these values are the simplest way to change the starting view:

```js
// File: js/sketch.js, function draw()
ortho(-500, 500, -500, 500, -1200, 1200);
rotateX(-0.5);
rotateZ(0.35);
```

For an explicit p5 camera, add a `camera()` call before the scene rotations:

```js
camera(0, 0, 800, 0, 0, 0, 0, 1, 0);
```

### Automatic rotation

Add a frame-based rotation in `draw()` alongside the existing fixed rotations:

```js
// File: js/sketch.js, function draw()
rotateZ(0.2 + frameCount * 0.002);
```

Remove the `frameCount` term to stop automatic rotation. This scene rotation is separate from the kaleidocycle folding animation.

### Mouse orbit controls

The integrated experience enables `orbitControl()` only while expanded. Docked
mode is a static isometric render and intentionally ignores orbit input:

```js
// File: js/sketch.js, function draw()
if (orbitControlsEnabled) {
  orbitControl();
}
```

### Image textures

First load an image in `setup()`, then assign its key in `initSurfaceSettings()`:

```js
// File: js/sketch.js, function setup()
faceImages["MY_IMAGE"] = await loadImage("images/my-image.png");

// File: js/surfaces.js, function initSurfaceSettings()
setImage(0, 0, "MY_IMAGE", 110);
```

The final number is the physical image width. `setImage()` preserves the source aspect ratio.

### Front/back text behaviour

Single-triangle labels are drawn on both sides by `drawLabelFront()` and `drawLabelBack()`. The rear UV order in `drawLabelBack()` prevents mirroring.

Shared words are drawn on both physical sides by `drawWordForOrientationState()`. `correctedSharedTextUV()` applies the rear horizontal correction and optional 180-degree rotation:

```js
// File: js/labels.js
let u = isBack ? 1 - uv.u : uv.u;

if (rotate180) {
  u = 1 - u;
  v = 1 - v;
}
```

Safe orientation switching is controlled by `shouldSwitchTextState()` and the `DIHEDRAL_*` thresholds in `js/config.js`. Changing these values can make words flip while visible, so leave them unchanged unless you are deliberately tuning the folding transition.

## Script loading order

`index.html` must load the local scripts in this order:

```html
<script src="js/config.js"></script>
<script src="js/math3d.js"></script>
<script src="js/geometry.js"></script>
<script src="js/surfaces.js"></script>
<script src="js/labels.js"></script>
<script src="js/renderer.js"></script>
<script src="js/sketch.js"></script>
```

Later files call functions and use state created by earlier files. Do not reorder these tags.
