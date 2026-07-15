/* =========================================================
   P5 LIFECYCLE AND SCENE ORCHESTRATION
   ========================================================= */

/* =========================================================
   SETUP
   ========================================================= */

// p5 calls setup() once. Images load before surface configuration so setImage()
// can preserve their aspect ratios; label textures are then built before the
// animation is allowed to render. Keep WEBGL and textureMode(NORMAL) because all
// face positions and UV coordinates assume those modes.
async function setup() {
  // CUSTOMIZE: canvas width and height. Keep WEBGL as the third argument.
  createCanvas(700, 700, WEBGL);
  textureMode(NORMAL);

  // Keep culling off so labels/images do not disappear.
  drawingContext.disable(drawingContext.CULL_FACE);

  sectorAngle = TWO_PI / N;

  // Load your images here.
  // Format:
  // faceImages["IMAGE_KEY"] = await loadImage("images/file-name.png");

  faceImages["AZGCO"] = await loadImage("images/AZGCO.png");
  faceImages["MSC"] = await loadImage("images/MSC.jpg");
  faceImages["TUe"] = await loadImage("images/TUe.png");
  faceImages["ASML"] = await loadImage("images/ASML.png");
  faceImages["MET"] = await loadImage("images/MET.png");
  faceImages["DSS"] = await loadImage("images/DSS.png");

  // faceImages["LOCATION_ICON"] = await loadImage("images/Location.png");
  // faceImages["Mail_ICON"] = await loadImage("images/Mail.png");

  faceImages["FluidThermal"] = await loadImage("images/FluidThermal.png");
  faceImages["Resourceful"] = await loadImage("images/Resourceful.png");
  faceImages["CAE"] = await loadImage("images/CAE.png");
  faceImages["Leadership"] = await loadImage("images/Leadership.png");
  faceImages["ProductDevelopment"] = await loadImage("images/ProductDevelopment.png");
  faceImages["Interpersonal"] = await loadImage("images/Interpersonal.png");


  initSurfaceSettings();
  buildLabelTextures();

  assetsReady = true;
}

// p5 calls draw() once per frame. This function owns scene-level concerns only:
// view controls, folding time, construction of the six transformed tetrahedra,
// and dispatch to the surface/label renderers. Content belongs in surfaces.js.
function draw() {
  // Clear to transparent pixels each frame so the page beneath can show through.
  clear();

  if (!assetsReady) {
    return;
  }

  // CUSTOMIZE: comment out orbitControl() to disable mouse orbit controls.
  orbitControl();
  ortho(-420, 420, -420, 420, -1200, 1200);

  // CUSTOMIZE: fixed scene/camera-facing rotation. Values are radians.
  rotateX(-0.7);
  rotateZ(0.2);

  // CUSTOMIZE: 0.05 is the animation speed multiplier.
  let t = frameCount * 0.05;

  let base = makeDisphenoid(t);
  let mirrored = [];

  for (let i = 0; i < 4; i++) {
    mirrored.push(mirrorInSectorPlane(base[i]));
  }

  // Each base/mirror pair shares the face-3 edge that carries one full word.
  // Three rotations place those connected pairs around the closed ring.
  let wordPairs = [];

  for (let k = 0; k < N / 2; k++) {
    let angle = 2 * k * sectorAngle;
    let firstTetra = rotateSetZ(base, angle);
    let secondTetra = rotateSetZ(mirrored, angle);
    let firstTetraIndex = 2 * k;
    let secondTetraIndex = firstTetraIndex + 1;

    wordPairs.push({
      firstTetra: firstTetra,
      secondTetra: secondTetra,
      firstTetraIndex: firstTetraIndex,
      secondTetraIndex: secondTetraIndex
    });
  }

  // Both layouts must be calculated from the current animated geometry before
  // drawing: shared words need the centre-reader reference, while red letters
  // need their current centroid order and front/back traversal assignment.
  let centralJunction = getCentralJunction(wordPairs);
  let redSideLayout = getRedSideLayout(wordPairs);

  for (let k = 0; k < wordPairs.length; k++) {
    let pair = wordPairs[k];

    drawTetra(pair.firstTetra, pair.firstTetraIndex, redSideLayout);
    drawTetra(pair.secondTetra, pair.secondTetraIndex, redSideLayout);

    // Shared text is drawn after both coloured triangles so neither triangle
    // can paint over its half of the continuous texture.
    drawSharedTextPairSurface(
      pair.firstTetra,
      pair.secondTetra,
      pair.firstTetraIndex,
      pair.secondTetraIndex,
      3,
      centralJunction
    );
  }
}
