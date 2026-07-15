/* =========================================================
   LABEL TEXTURES, READABILITY, AND ORIENTATION STATE
   ========================================================= */

/* =========================================================
   LABEL / IMAGE TEXTURES
   ========================================================= */

// Converts every surface configuration into a p5.Graphics texture once during
// setup. Shared-pair surfaces deliberately reuse one texture across both faces.
function buildLabelTextures() {
  labelTextures = [];
  let sharedTextureCache = new Map();

  for (let t = 0; t < N; t++) {
    let row = [];

    for (let f = 0; f < 4; f++) {
      let cfg = surfaces[t][f];

      if (cfg.contentType === "sharedText") {
        if (!sharedTextureCache.has(cfg.sharedPairId)) {
          sharedTextureCache.set(cfg.sharedPairId, makeLabelTexture(cfg));
        }

        row.push(sharedTextureCache.get(cfg.sharedPairId));
      } else {
        row.push(makeLabelTexture(cfg));
      }
    }

    labelTextures.push(row);
  }
}

// Creates the correctly sized transparent texture and delegates its content to
// the text, shared-text, or image drawing routine selected by contentType.
function makeLabelTexture(cfg) {
  let tw = cfg.textureW || LABEL_W;
  let th = cfg.textureH || LABEL_H;

  let g = createGraphics(tw, th);
  g.pixelDensity(1);
  g.clear();

  if (cfg.contentType === "image") {
    drawImageTexture(g, cfg);
  } else if (cfg.contentType === "sharedText") {
    drawSharedTextTexture(g, cfg);
  } else {
    drawTextTexture(g, cfg);
  }

  return g;
}

// Draws one centred label into an off-screen canvas, shrinking the font only
// when necessary to keep the complete string inside its texture bounds.
function drawTextTexture(g, cfg) {
  g.textAlign(CENTER, CENTER);
  g.textStyle(cfg.fontStyle || BOLD);
  g.textFont(cfg.fontFamily || "Arial");

  let txt = cfg.word || "";
  let size = cfg.fontSize || 42;

  g.textSize(size);

  // Auto-shrink only if the text is too wide.
  while (g.textWidth(txt) > g.width * 0.86 && size > 10) {
    size -= 2;
    g.textSize(size);
  }

  let c = color(cfg.textColor);

  g.noStroke();
  g.fill(red(c), green(c), blue(c), 255);
  g.text(txt, g.width / 2, g.height / 2);
}

// Draws one complete word texture for a connected triangle pair. The texture
// is later split by UV coordinates, so the word remains continuous at the seam.
function drawSharedTextTexture(g, cfg) {
  g.textAlign(CENTER, CENTER);
  g.textStyle(cfg.fontStyle || BOLD);
  g.textFont(cfg.fontFamily || "Arial");

  let txt = cfg.word || "";
  let size = min(cfg.fontSize || 144, g.height * 0.28);

  g.textSize(size);

  // Keep the word inside the central rectangle of the two-triangle diamond.
  while (
    (g.textWidth(txt) > g.width * 0.72 ||
      g.textAscent() + g.textDescent() > g.height * 0.28) &&
    size > 10
  ) {
    size -= 2;
    g.textSize(size);
  }

  let c = color(cfg.textColor);

  g.noStroke();
  g.fill(red(c), green(c), blue(c), 255);
  g.text(txt, g.width / 2, g.height / 2);
}

// Copies a loaded image into a transparent texture without changing its aspect
// ratio. A visible placeholder is produced if the configured key was not loaded.
function drawImageTexture(g, cfg) {
  let img = faceImages[cfg.imageKey];

  if (!img) {
    g.textAlign(CENTER, CENTER);
    g.textStyle(BOLD);
    g.textFont("Arial");
    g.textSize(36);
    g.noStroke();
    g.fill(255, 0, 0, 255);
    g.text("IMAGE\nMISSING", g.width / 2, g.height / 2);
    return;
  }

  g.imageMode(CENTER);

  // The texture canvas ratio already matches the image ratio.
  // This draws the image without stretching.
  g.image(img, g.width / 2, g.height / 2, g.width, g.height);
}

/* =========================================================
   SHARED TEXT ACROSS A CONNECTED FACE-3 PAIR
   ========================================================= */

// Estimates the common inner vertex of the three labelled surface pairs. This
// point is the imagined reader position: each shared word's top points radially
// away from it and its bottom points toward it. Persistent fallback state avoids
// a jump when folded seam endpoints temporarily become indistinguishable.
function getCentralJunction(wordPairs) {
  let edgeStarts = [];
  let edgeEnds = [];

  for (let i = 0; i < wordPairs.length; i++) {
    let pair = wordPairs[i];
    let edgeStart = scalePt(
      addPt(pair.firstTetra[2], pair.secondTetra[2]),
      0.5
    );
    let edgeEnd = scalePt(
      addPt(pair.firstTetra[3], pair.secondTetra[3]),
      0.5
    );

    if (!isFinitePt(edgeStart) || !isFinitePt(edgeEnd)) {
      return lastCentralJunction;
    }

    edgeStarts.push(edgeStart);
    edgeEnds.push(edgeEnd);
  }

  if (edgeStarts.length === 0) {
    return lastCentralJunction;
  }

  let startCenter = pt3(0, 0, 0);
  let endCenter = pt3(0, 0, 0);

  for (let i = 0; i < edgeStarts.length; i++) {
    startCenter = addPt(startCenter, edgeStarts[i]);
    endCenter = addPt(endCenter, edgeEnds[i]);
  }

  startCenter = scalePt(startCenter, 1 / edgeStarts.length);
  endCenter = scalePt(endCenter, 1 / edgeEnds.length);

  let startSpread = 0;
  let endSpread = 0;

  for (let i = 0; i < edgeStarts.length; i++) {
    startSpread += distanceSqPt(edgeStarts[i], startCenter);
    endSpread += distanceSqPt(edgeEnds[i], endCenter);
  }

  if (!Number.isFinite(startSpread) || !Number.isFinite(endSpread)) {
    return lastCentralJunction;
  }

  // Whichever endpoint cluster converges more tightly is the physical common
  // vertex in an unfolded pose. Inverse-spread blending extends that junction
  // smoothly through folded poses instead of jumping between seam endpoints.
  let epsilon = 1e-9;
  let totalWeight = startSpread + endSpread + 2 * epsilon;
  let junction = scalePt(
    addPt(
      scalePt(startCenter, endSpread + epsilon),
      scalePt(endCenter, startSpread + epsilon)
    ),
    1 / totalWeight
  );

  if (isFinitePt(junction)) {
    lastCentralJunction = junction;
  }

  return lastCentralJunction;
}

// Returns the area-correct centre of two equal-area triangles sharing an edge.
function getSharedPairCentroid(firstApex, secondApex, edgeStart, edgeEnd) {
  // The two mirrored face-3 triangles have equal area. Averaging their two
  // triangle centroids weights each shared-edge endpoint twice.
  return scalePt(
    addPt(
      addPt(firstApex, secondApex),
      scalePt(addPt(edgeStart, edgeEnd), 2)
    ),
    1 / 6
  );
}

// Orchestrates one shared word pair: recover its geometry and stable normals,
// update—but never invalidate—its persistent orientation, then render it. Every
// fallback ends in a drawable texture/state so a transient calculation failure
// cannot make DESIGN, DEVELOP, or DELIVER disappear.
function drawSharedTextPairSurface(
  firstTetra,
  secondTetra,
  firstTetraIndex,
  secondTetraIndex,
  faceIndex,
  centralJunction
) {
  let firstCfg = surfaces[firstTetraIndex][faceIndex];
  let secondCfg = surfaces[secondTetraIndex][faceIndex];
  let pairId = firstCfg.sharedPairId;
  let orientationState = textOrientationStates.get(pairId);

  // This fallback still produces a strict, drawable state; it never hides text.
  if (!orientationState) {
    orientationState = makeTextOrientationState(pairId, firstCfg.word);
    textOrientationStates.set(pairId, orientationState);
  }

  let firstTextureRow = labelTextures[firstTetraIndex] || [];
  let secondTextureRow = labelTextures[secondTetraIndex] || [];
  let tex = firstTextureRow[faceIndex];

  if (!tex) {
    tex = secondTextureRow[faceIndex] || makeLabelTexture(firstCfg);
    firstTextureRow[faceIndex] = tex;
    secondTextureRow[faceIndex] = tex;
    labelTextures[firstTetraIndex] = firstTextureRow;
    labelTextures[secondTetraIndex] = secondTextureRow;
  }

  // Face 3 is (v[1], v[2], v[3]). The mirrored tetrahedra share v[2]-v[3].
  let firstApex = firstTetra[1];
  let secondApex = secondTetra[1];
  let edgeStart = scalePt(addPt(firstTetra[2], secondTetra[2]), 0.5);
  let edgeEnd = scalePt(addPt(firstTetra[3], secondTetra[3]), 0.5);

  // Invalid normals fall back to the last valid values; drawing still proceeds.
  let firstRawNormal = stableFaceNormalFromWinding(
    firstApex,
    edgeStart,
    edgeEnd,
    orientationState.lastFirstRawNormal
  );
  let secondRawNormal = stableFaceNormalFromWinding(
    secondApex,
    edgeStart,
    edgeEnd,
    orientationState.lastSecondRawNormal
  );
  orientationState.lastFirstRawNormal = firstRawNormal;
  orientationState.lastSecondRawNormal = secondRawNormal;

  // The pair UVs have opposite winding, so these normals describe one
  // coherent physical side of the complete two-triangle word surface.
  let firstFrontNormal = scalePt(firstRawNormal, -1);
  let secondFrontNormal = secondRawNormal;
  let angle = getPairDihedralAngle(
    firstRawNormal,
    secondRawNormal,
    orientationState.lastValidAngle
  );
  orientationState = updateTextOrientationState(
    orientationState,
    angle,
    firstApex,
    secondApex,
    edgeStart,
    edgeEnd,
    centralJunction,
    firstFrontNormal,
    secondFrontNormal
  );

  drawWordForOrientationState(
    firstApex,
    secondApex,
    edgeStart,
    edgeEnd,
    firstFrontNormal,
    secondFrontNormal,
    firstCfg,
    secondCfg,
    tex,
    orientationState
  );
}

// Creates the strict two-state record used for one word. NORMAL and OPPOSITE are
// the only render states; zone flags merely gate when a state may be committed.
// Last-valid geometry values keep the record usable through degenerate frames.
function makeTextOrientationState(pairId, word) {
  return {
    pairId: pairId,
    word: word,
    orientation: TEXT_NORMAL,
    lastValidOrientation: TEXT_NORMAL,
    desiredOrientation: TEXT_NORMAL,
    hasRendered: false,
    previousAngle: Math.PI,
    hasPreviousAngle: false,
    lastValidAngle: Math.PI,
    motionDirection: "unfolding",
    inMinimumZone: false,
    enteredWhileFolding: false,
    switchedThisVisit: false,
    inMaximumZone: false,
    switchedThisMaximumVisit: false,
    measuredMinimum: Math.PI,
    measuredMaximum: 0,
    lastFirstRawNormal: pt3(1, 0, 0),
    lastSecondRawNormal: pt3(-1, 0, 0),
    lastPairPlaneNormal: pt3(0, 0, -1)
  };
}

// Opens and closes hysteresis zones around the minimum and maximum dihedral
// angles. A state change is permitted only at those low-visibility extremes,
// never merely because a face normal changes relative to the camera. Separate
// enter/exit thresholds prevent repeated switching from numerical chatter.
function shouldSwitchTextState(state, angle, motion) {
  if (
    !state.inMinimumZone &&
    motion.current === "folding" &&
    angle <= DIHEDRAL_MIN_ENTER
  ) {
    state.inMinimumZone = true;
    state.enteredWhileFolding = true;
    state.switchedThisVisit = false;
  }

  let reversedAtMinimum =
    state.inMinimumZone &&
    state.enteredWhileFolding &&
    !state.switchedThisVisit &&
    motion.previous === "folding" &&
    motion.current === "unfolding" &&
    angle <= DIHEDRAL_COMMIT_LIMIT;

  if (reversedAtMinimum) {
    state.switchedThisVisit = true;
  }

  // The larger exit threshold re-arms the next visit without threshold chatter.
  if (
    state.inMinimumZone &&
    motion.current === "unfolding" &&
    angle >= DIHEDRAL_MIN_EXIT
  ) {
    state.inMinimumZone = false;
    state.enteredWhileFolding = false;
    state.switchedThisVisit = false;
  }

  if (
    !state.inMaximumZone &&
    motion.current === "unfolding" &&
    angle >= DIHEDRAL_MAX_ENTER
  ) {
    state.inMaximumZone = true;
    state.switchedThisMaximumVisit = false;
  }

  let reachedSafeMaximum =
    state.inMaximumZone &&
    !state.switchedThisMaximumVisit &&
    angle >= DIHEDRAL_MAX_ENTER &&
    state.orientation !== TEXT_NORMAL;

  if (reachedSafeMaximum) {
    state.switchedThisMaximumVisit = true;

    // This unfolded, edge-on maximum occurs before the radial upright score
    // changes sign. Prepare NORMAL here so the word is already aligned when
    // the labelled side opens toward the viewer instead of flipping late.
    state.desiredOrientation = TEXT_NORMAL;
  }

  // Re-arm only after leaving the fully unfolded zone on the folding side.
  if (
    state.inMaximumZone &&
    motion.current === "folding" &&
    angle <= DIHEDRAL_MAX_EXIT
  ) {
    state.inMaximumZone = false;
    state.switchedThisMaximumVisit = false;
  }

  return reversedAtMinimum || reachedSafeMaximum;
}

// Determines which orientation the centre-facing geometry will need next, but
// delays later commits until shouldSwitchTextState() reports a safe transition.
// Invalid measurements retain the previous valid state and still render.
function updateTextOrientationState(
  state,
  angle,
  firstApex,
  secondApex,
  edgeStart,
  edgeEnd,
  centralJunction,
  firstFrontNormal,
  secondFrontNormal
) {
  if (
    state.orientation !== TEXT_NORMAL &&
    state.orientation !== TEXT_OPPOSITE
  ) {
    state.orientation = state.lastValidOrientation;
  }

  if (Number.isFinite(angle)) {
    state.lastValidAngle = angle;
    state.measuredMinimum = Math.min(state.measuredMinimum, angle);
    state.measuredMaximum = Math.max(state.measuredMaximum, angle);
  } else {
    angle = state.lastValidAngle;
  }

  let orientationScore = getCenterFacingOrientationScore(
    firstApex,
    secondApex,
    edgeStart,
    edgeEnd,
    centralJunction,
    firstFrontNormal,
    secondFrontNormal,
    state
  );

  if (Number.isFinite(orientationScore)) {
    state.desiredOrientation =
      orientationScore < 0 ? TEXT_OPPOSITE : TEXT_NORMAL;

    // The first valid geometry sample may choose the initial state before any
    // pixels have been shown. Later changes remain dihedral-gated.
    if (!state.hasRendered) {
      state.orientation = state.desiredOrientation;
      state.lastValidOrientation = state.orientation;
    }
  }

  let motion = getPairMotionDirection(state, angle);

  // The commit is atomic: state changes once, then both sides draw immediately.
  if (shouldSwitchTextState(state, angle, motion)) {
    state.orientation = state.desiredOrientation;
    state.lastValidOrientation = state.orientation;
  }

  return state;
}

// Draws both physical sides on every frame using one exhaustive NORMAL/OPPOSITE
// branch. The state selects UV transforms only; it never controls visibility.
// Rendering two offset copies is essential because either material side can be
// exposed as the kaleidocycle turns and back-face culling cannot correct text.
function drawWordForOrientationState(
  firstApex,
  secondApex,
  edgeStart,
  edgeEnd,
  firstFrontNormal,
  secondFrontNormal,
  firstCfg,
  secondCfg,
  tex,
  state
) {
  let firstUVs = sharedPairUVs(firstCfg.sharedPairSide);
  let secondUVs = sharedPairUVs(secondCfg.sharedPairSide);
  let eps = 0.25;

  // Both exhaustive branches render both physical sides. State changes only
  // select UV transforms; they can never enable or disable the word.
  if (state.orientation === TEXT_NORMAL) {
    drawWordOnPhysicalSide(
      firstApex,
      secondApex,
      edgeStart,
      edgeEnd,
      firstFrontNormal,
      secondFrontNormal,
      firstUVs,
      secondUVs,
      tex,
      1,
      false,
      false,
      eps
    );
    drawWordOnPhysicalSide(
      firstApex,
      secondApex,
      edgeStart,
      edgeEnd,
      firstFrontNormal,
      secondFrontNormal,
      firstUVs,
      secondUVs,
      tex,
      -1,
      true,
      false,
      eps
    );
  } else {
    drawWordOnPhysicalSide(
      firstApex,
      secondApex,
      edgeStart,
      edgeEnd,
      firstFrontNormal,
      secondFrontNormal,
      firstUVs,
      secondUVs,
      tex,
      1,
      false,
      true,
      eps
    );
    drawWordOnPhysicalSide(
      firstApex,
      secondApex,
      edgeStart,
      edgeEnd,
      firstFrontNormal,
      secondFrontNormal,
      firstUVs,
      secondUVs,
      tex,
      -1,
      true,
      true,
      eps
    );
  }

  state.hasRendered = true;
}

// Places both halves of one word on a selected physical side. The small signed
// normal offset separates front and rear copies from the coloured triangles to
// prevent z-fighting while keeping the textures attached to the moving faces.
function drawWordOnPhysicalSide(
  firstApex,
  secondApex,
  edgeStart,
  edgeEnd,
  firstFrontNormal,
  secondFrontNormal,
  firstUVs,
  secondUVs,
  tex,
  sideDirection,
  isBack,
  rotate180,
  eps
) {
  let firstOffset = scalePt(firstFrontNormal, eps * sideDirection);
  let secondOffset = scalePt(secondFrontNormal, eps * sideDirection);

  drawSharedTextTriangle(
    [
      addPt(firstApex, firstOffset),
      addPt(edgeStart, firstOffset),
      addPt(edgeEnd, firstOffset)
    ],
    firstUVs,
    scalePt(firstFrontNormal, sideDirection),
    tex,
    isBack,
    rotate180
  );

  drawSharedTextTriangle(
    [
      addPt(secondApex, secondOffset),
      addPt(edgeStart, secondOffset),
      addPt(edgeEnd, secondOffset)
    ],
    secondUVs,
    scalePt(secondFrontNormal, sideDirection),
    tex,
    isBack,
    rotate180
  );
}

// Compares the current texture axes with a reader standing at centralJunction.
// Projecting centroid-minus-junction into the face plane defines local "up":
// letter bottoms face the centre, tops face outward, and the cross product checks
// that the horizontal axis remains left-to-right rather than mirrored.
function getCenterFacingOrientationScore(
  firstApex,
  secondApex,
  edgeStart,
  edgeEnd,
  centralJunction,
  firstFrontNormal,
  secondFrontNormal,
  state
) {
  try {
    let pairCentroid = getSharedPairCentroid(
      firstApex,
      secondApex,
      edgeStart,
      edgeEnd
    );
    let pairNormalCandidate = addPt(firstFrontNormal, secondFrontNormal);
    let pairNormalMagnitude = magPt(pairNormalCandidate);

    if (
      isFinitePt(pairNormalCandidate) &&
      Number.isFinite(pairNormalMagnitude) &&
      pairNormalMagnitude > 1e-8
    ) {
      state.lastPairPlaneNormal = scalePt(
        pairNormalCandidate,
        1 / pairNormalMagnitude
      );
    }

    let pairNormal = state.lastPairPlaneNormal;
    let radialDirection = subPt(pairCentroid, centralJunction);
    let radialInPlane = projectOntoPlane(radialDirection, pairNormal);
    let radialMagnitude = magPt(radialInPlane);

    if (
      !isFinitePt(radialInPlane) ||
      !Number.isFinite(radialMagnitude) ||
      radialMagnitude < 1e-8
    ) {
      return NaN;
    }

    let localUp = scalePt(radialInPlane, 1 / radialMagnitude);

    // In NORMAL texture space, v=0 is the top and v=1 is the bottom.
    let currentTop = unitPt(subPt(edgeStart, edgeEnd));
    let currentRight = unitPt(subPt(firstApex, secondApex));
    let expectedRight = unitPt(crossPt(pairNormal, localUp));

    let topAlignment = dotPt(currentTop, localUp);
    let rightAlignment = dotPt(currentRight, expectedRight);

    if (!Number.isFinite(topAlignment)) {
      return NaN;
    }

    // Top/bottom is authoritative. The horizontal check validates that the
    // same state is also left-to-right for the reader at the central junction.
    if (!Number.isFinite(rightAlignment) || magPt(expectedRight) < 1e-8) {
      return topAlignment;
    }

    if (
      Math.abs(topAlignment) > 1e-6 &&
      Math.abs(rightAlignment) > 1e-6 &&
      Math.sign(topAlignment) !== Math.sign(rightAlignment)
    ) {
      return NaN;
    }

    // The radial local-up direction alone selects NORMAL versus OPPOSITE;
    // horizontal handedness can validate that choice but must not override it.
    return topAlignment;
  } catch (error) {
    return NaN;
  }
}

// Gives each triangle complementary UV coordinates into the one shared texture.
// The common u=0.5 edge makes the word continuous across the physical seam.
function sharedPairUVs(pairSide) {
  return [
    { u: pairSide === 0 ? 1 : 0, v: 0.5 },
    { u: 0.5, v: 0 },
    { u: 0.5, v: 1 }
  ];
}

// Draws one textured triangle with vertex order corrected to match its requested
// physical-side normal. UV correction is kept separate from winding correction.
function drawSharedTextTriangle(
  points,
  uvs,
  outwardNormal,
  tex,
  isBack,
  rotate180
) {
  let rawNormal = crossPt(
    subPt(points[1], points[0]),
    subPt(points[2], points[0])
  );
  let order = dotPt(rawNormal, outwardNormal) >= 0 ? [0, 1, 2] : [0, 2, 1];

  noStroke();
  beginShape(TRIANGLES);
  texture(tex);

  for (let i = 0; i < order.length; i++) {
    let index = order[i];
    let uv = uvs[index];
    let correctedUV = correctedSharedTextUV(uv, isBack, rotate180);
    let p = points[index];

    vertex(p.x, p.y, p.z, correctedUV.u, correctedUV.v);
  }

  endShape();
}

// Corrects texture coordinates for the physical rear side. Rear viewing first
// reverses local horizontal direction to remove mirroring; OPPOSITE additionally
// reverses both axes, which is a stable face-local 180-degree rotation.
function correctedSharedTextUV(uv, isBack, rotate180) {
  let u = isBack ? 1 - uv.u : uv.u;
  let v = uv.v;

  // A 180-degree face-local rotation changes both texture directions. The
  // persistent pair state supplies this value; it never changes mid-visibility.
  if (rotate180) {
    u = 1 - u;
    v = 1 - v;
  }

  return { u: u, v: v };
}

/* =========================================================
   CENTERED LABEL
   ========================================================= */

// Builds a stable in-plane basis for ordinary one-triangle text and images, then
// draws separate front and rear copies. The radial/tangent basis keeps glyphs
// upright around the ring; handedness checks prevent accidental mirroring.
function drawCenteredLabel(
  a,
  b,
  c,
  cfg,
  frontTexture,
  backTexture,
  materialFrontNormal
) {
  // CUSTOMIZE WITH CARE: this centroid attaches the label to the middle of a
  // triangle. Offset `center` in the face plane to move individual labels.
  let center = centroidPt(a, b, c);
  let n = faceNormalTowardOrigin(a, b, c);

  if (!backTexture) {
    backTexture = frontTexture;
  }

  // The original toward-origin normal keeps the proven upright/non-mirrored
  // letter basis. The winding-stable material normal is used only to decide
  // which cyclic texture belongs on that physical drawing side.
  if (
    isFinitePt(materialFrontNormal) &&
    magPt(materialFrontNormal) > 1e-8 &&
    dotPt(n, materialFrontNormal) < 0
  ) {
    let textureSwap = frontTexture;
    frontTexture = backTexture;
    backTexture = textureSwap;
  }

  let r = pt3(center.x, center.y, 0);

  if (magPt(r) < 1e-8) {
    r = pt3(1, 0, 0);
  } else {
    r = unitPt(r);
  }

  let tangentCW = pt3(r.y, -r.x, 0);

  // xAxis/yAxis are the face-local horizontal and vertical directions.
  // Change these only when intentionally adjusting label rotation/orientation;
  // drawLabelBack() separately corrects the rear-side texture handedness.
  let xAxis = projectOntoPlane(tangentCW, n);

  if (magPt(xAxis) < 1e-8) {
    xAxis = subPt(b, a);
  }

  xAxis = unitPt(xAxis);

  // Keep xAxis pointing in the intended tangent direction.
  if (dotPt(xAxis, tangentCW) < 0) {
    xAxis = scalePt(xAxis, -1);
  }

  let yAxis = unitPt(crossPt(n, xAxis));

  // Stabilize the label's vertical direction.
  let yRef = projectOntoPlane(r, n);

  if (magPt(yRef) < 1e-8) {
    yRef = pt3(0, 0, 1);
  } else {
    yRef = unitPt(yRef);
  }

  if (dotPt(yAxis, yRef) > 0) {
    xAxis = scalePt(xAxis, -1);
    yAxis = scalePt(yAxis, -1);
  }

  // Prevent mirrored text/image.
  if (dotPt(crossPt(xAxis, yAxis), n) < 0) {
    xAxis = scalePt(xAxis, -1);
  }

  let w = cfg.labelW;
  let h = cfg.labelH;

  let eps = 2.0;

  let frontCenter = addPt(center, scalePt(n, eps));
  let backCenter = addPt(center, scalePt(n, -eps));

  drawLabelFront(frontCenter, xAxis, yAxis, w, h, frontTexture);
  drawLabelBack(backCenter, xAxis, yAxis, w, h, backTexture);
}

// Maps an unmirrored texture quad slightly above the selected front side.
function drawLabelFront(center, xAxis, yAxis, w, h, tex) {
  let tl = addPt(center, addPt(scalePt(xAxis, -w / 2), scalePt(yAxis, -h / 2)));
  let tr = addPt(center, addPt(scalePt(xAxis, w / 2), scalePt(yAxis, -h / 2)));
  let br = addPt(center, addPt(scalePt(xAxis, w / 2), scalePt(yAxis, h / 2)));
  let bl = addPt(center, addPt(scalePt(xAxis, -w / 2), scalePt(yAxis, h / 2)));

  noStroke();

  beginShape();
  texture(tex);

  vertex(tl.x, tl.y, tl.z, 0, 0);
  vertex(tr.x, tr.y, tr.z, 1, 0);
  vertex(br.x, br.y, br.z, 1, 1);
  vertex(bl.x, bl.y, bl.z, 0, 1);

  endShape(CLOSE);
}

// Maps a separate rear quad with reversed U coordinates and winding. Reusing the
// exact front transform here would make readable glyphs appear mirrored.
function drawLabelBack(center, xAxis, yAxis, w, h, tex) {
  let tl = addPt(center, addPt(scalePt(xAxis, -w / 2), scalePt(yAxis, -h / 2)));
  let tr = addPt(center, addPt(scalePt(xAxis, w / 2), scalePt(yAxis, -h / 2)));
  let br = addPt(center, addPt(scalePt(xAxis, w / 2), scalePt(yAxis, h / 2)));
  let bl = addPt(center, addPt(scalePt(xAxis, -w / 2), scalePt(yAxis, h / 2)));

  noStroke();

  beginShape();
  texture(tex);

  vertex(tl.x, tl.y, tl.z, 1, 0);
  vertex(bl.x, bl.y, bl.z, 1, 1);
  vertex(br.x, br.y, br.z, 0, 1);
  vertex(tr.x, tr.y, tr.z, 0, 0);

  endShape(CLOSE);
}
