/* =========================================================
   SURFACE CONTENT, COLOURS, AND CIRCULAR MAPPINGS
   ========================================================= */

/* =========================================================
   CUSTOM COLOUR PALETTE
   ========================================================= */

// CUSTOMIZE: these three values control the face palette throughout the
// sketch. Use CSS hex colours such as "#3366FF".

const WHITE = "#FFFFFF";
const BLACK = "#000000";
const R_RED = "#d8315b";
//D61E47";

// Side 3 is arranged as three connected, same-colour pairs.
const SIDE_3_COLORS = [
  WHITE,
  WHITE,
  BLACK,
  BLACK,
  R_RED,
  R_RED
];

/* =========================================================
   SURFACE SETTINGS
   ========================================================= */

// Rebuilds all per-face configuration whenever the sketch starts. Face indices
// are structural: 0=white, 1=black, 2=red letter ring, 3=shared word pairs.
// Content, font sizes, and image assignments are safe to edit in this function;
// pair indices and face indices should not be changed casually.
function initSurfaceSettings() {
  surfaces = [];
  textOrientationStates = new Map();
  lastCentralJunction = pt3(0, 0, 0);
  lastRedCircularOrder = [];
  lastRedRingNormal = pt3(0, 0, 1);
  lastRedFrontNormals = new Map();
  redFrontUsesForwardTraversal = false;

  for (let t = 0; t < N; t++) {
    let tetraFaces = [];

    // Face 0: white side
    tetraFaces.push(makeSurface(WHITE, "", BLACK));

    // Face 1: black side
    tetraFaces.push(makeSurface(BLACK, "", WHITE));

    // Face 2: DSS red side
    tetraFaces.push(makeSurface(R_RED, "", WHITE));

    // Face 3: each tetrahedron triangle gets its own colour
    tetraFaces.push(
      makeSurface(
        SIDE_3_COLORS[t],
        "",
        readableTextColor(SIDE_3_COLORS[t])
      )
    );

    surfaces.push(tetraFaces);
  }

  /*
    =====================================================
    EDIT EACH TRIANGLE HERE
    =====================================================

    setText(
      tetrahedronIndex,
      faceIndex,
      "TEXT",
      fontSize,
      labelWidth,
      labelHeight
    );

    setImage(
      tetrahedronIndex,
      faceIndex,
      "imageKey",
      imageWidth
    );

    tetrahedronIndex:
    0, 1, 2, 3, 4, 5

    faceIndex:
    0 = white side
    1 = black side
    2 = DSS red side
    3 = mixed-colour side
  */

  // -------------------------
  // Text examples
  // -------------------------

  // setText(0, 0, "WHITE 0", 42, 130, 45);
  // setText(1, 0, "WHITE 1", 42, 130, 45);
  // setText(2, 0, "WHITE 2", 42, 130, 45);
  // setText(3, 0, "WHITE 3", 42, 130, 45);
  // setText(4, 0, "WHITE 4", 42, 130, 45);
  // setText(5, 0, "WHITE 5", 42, 130, 45);

  // setText(0, 1, "Hamed\nAbdollahi", 42, 130, 45);
  // //setText(1, 1, "", 42, 130, 45);
  // setText(2, 1, "Eindhoven\nNetherlands", 42, 130, 45);
  // //setText(3, 1, "", 42, 130, 45);
  // setText(4, 1, "hamed.abdollahi\n@outlook.com", 42, 130, 45);
  // setText(5, 1, "0622410181", 42, 130, 45);

  setText(0, 2, "S", 350, 130, 230);
  setText(1, 2, "I", 300, 130, 230);
  setText(2, 2, "G", 250, 130, 230);
  setText(3, 2, "N", 200, 130, 230);
  setText(4, 2, "D", 450, 130, 230);
  setText(5, 2, "E", 400, 130, 230);
  surfaces[0][2].textColor = BLACK;
  surfaces[1][2].textColor = BLACK;
  surfaces[2][2].textColor = BLACK;
  surfaces[3][2].textColor = BLACK;
  surfaces[4][2].textColor = BLACK;
  surfaces[5][2].textColor = BLACK;

  // CUSTOMIZE: change the three mixed-side words and their shared font size
  // here. Add a fifth argument to setSharedTextPair(), for example:
  // setSharedTextPair(0, 1, 3, "DESIGN", 82);
  setSharedTextPair(0, 1, 3, "DESIGN");
  setSharedTextPair(2, 3, 3, "DEVELOP");
  setSharedTextPair(4, 5, 3, "DELIVER");

  // -------------------------
  // Image example
  // -------------------------
  // This keeps the original image ratio.
  // Only the width is controlled by the last number.

  setImage(0, 0, "AZGCO", 110);
  setImage(1, 0, "MSC", 110);
  setImage(2, 0, "TUe", 110);
  setImage(3, 0, "ASML", 110);
  setImage(4, 0, "MET", 110);
  setImage(5, 0, "DSS", 110);

  // setImage(1, 1, "LOCATION_ICON", 100);
  // setImage(3, 1, "Mail_ICON", 100);

  setImage(0, 1, "FluidThermal", 100);
  setImage(1, 1, "Resourceful", 100);
  setImage(2, 1, "CAE", 100);
  setImage(3, 1, "Leadership", 100);
  setImage(4, 1, "ProductDevelopment", 100);
  setImage(5, 1, "Interpersonal", 100);
}

// Creates the complete default configuration for one triangular surface.
// Physical label dimensions (labelW/H) are separate from texture resolution
// (textureW/H), allowing readable textures without changing geometry.
function makeSurface(color, word, textColor) {
  return {
    color: color,
    word: word,
    textColor: textColor,

    // "text", "image", or "sharedText"
    contentType: "text",

    // used only for images
    imageKey: null,

    // physical size on the triangle
    labelW: 120,
    labelH: 42,

    // texture resolution
    textureW: LABEL_W,
    textureH: LABEL_H,

    // CUSTOMIZE: defaults for font, font size, and physical label size.
    // Individual setText()/setSharedTextPair() calls can override fontSize.
    fontSize: 42,
    fontFamily: "Arial",
    fontStyle: BOLD,

    // used only for text shared by two connected triangles
    sharedPairId: null,
    sharedPairSide: null
  };
}

/* =========================================================
   EASY CONTENT HELPERS
   ========================================================= */

// Assigns a self-contained text label to one tetrahedron face. labelW/labelH
// control its physical footprint; fontSize controls glyph size in the texture.
function setText(tetraIndex, faceIndex, txt, fontSize = 42, labelW = 120, labelH = 42) {
  if (!surfaces[tetraIndex] || !surfaces[tetraIndex][faceIndex]) {
    return;
  }

  let cfg = surfaces[tetraIndex][faceIndex];

  cfg.contentType = "text";
  cfg.word = txt;
  cfg.imageKey = null;
  cfg.sharedPairId = null;
  cfg.sharedPairSide = null;

  cfg.fontSize = fontSize;
  cfg.labelW = labelW;
  cfg.labelH = labelH;

  // Keep texture ratio close to physical label ratio.
  cfg.textureW = LABEL_W;
  cfg.textureH = Math.round(LABEL_W * (labelH / labelW));
}

// Assigns one texture across two connected face-3 triangles. Both triangles
// receive the same pair ID and a complementary side number so labels.js can map
// the left and right halves continuously across their shared edge.
function setSharedTextPair(tetraA, tetraB, faceIndex, txt, fontSize = 75) {
  if (
    !surfaces[tetraA] ||
    !surfaces[tetraB] ||
    !surfaces[tetraA][faceIndex] ||
    !surfaces[tetraB][faceIndex]
  ) {
    return;
  }

  let pairId = `${tetraA}-${tetraB}-${faceIndex}`;
  let pair = [tetraA, tetraB];

  for (let side = 0; side < pair.length; side++) {
    let cfg = surfaces[pair[side]][faceIndex];

    cfg.contentType = "sharedText";
    cfg.word = txt;
    cfg.imageKey = null;
    cfg.textColor = readableTextColor(cfg.color);
    cfg.fontSize = fontSize;
    cfg.textureW = 1024;
    cfg.textureH = 512;
    cfg.sharedPairId = pairId;
    cfg.sharedPairSide = side;
  }

  // Every word has a valid two-state orientation before the first frame.
  textOrientationStates.set(pairId, makeTextOrientationState(pairId, txt));
}

// Assigns a loaded image to one face and derives label height from the source
// aspect ratio. imageKey must match an entry loaded in sketch.js setup().
function setImage(tetraIndex, faceIndex, imageKey, labelW = 120) {
  if (!surfaces[tetraIndex] || !surfaces[tetraIndex][faceIndex]) {
    return;
  }

  let cfg = surfaces[tetraIndex][faceIndex];
  let img = faceImages[imageKey];

  cfg.contentType = "image";
  cfg.imageKey = imageKey;
  cfg.word = "";
  cfg.sharedPairId = null;
  cfg.sharedPairSide = null;

  cfg.labelW = labelW;

  // Keep original image ratio.
  if (img) {
    cfg.labelH = labelW * (img.height / img.width);

    cfg.textureW = 512;
    cfg.textureH = Math.round(512 * (img.height / img.width));
  } else {
    cfg.labelH = 42;
    cfg.textureW = LABEL_W;
    cfg.textureH = LABEL_H;
  }
}

/* =========================================================
   COLOUR HELPERS
   ========================================================= */

// Converts the six-digit palette strings used above into RGB components.
function hexToRgb(hex) {
  hex = hex.replace("#", "");

  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16)
  };
}

// Selects black or white text from background luminance. This is applied to
// shared words automatically and is safe to override per surface afterward.
function readableTextColor(backgroundHex) {
  let c = hexToRgb(backgroundHex);

  // Bright backgrounds get black text, dark backgrounds get white text.
  let brightness = (c.r * 299 + c.g * 587 + c.b * 114) / 1000;

  if (brightness > 140) {
    return BLACK;
  }

  return WHITE;
}

/* =========================================================
   RED-SIDE CIRCULAR LETTER ORDER
   ========================================================= */

// Builds the per-frame front and rear texture assignment for the six red faces.
// Geometry, not tetrahedron index, establishes their circular order: centroids
// are projected around a stable ring normal and sorted by angle. The traversal
// reverses between physical sides so a viewer always encounters D-E-S-I-G-N
// clockwise instead of seeing N-G-I-S-E-D from the rear.
function getRedSideLayout(wordPairs) {
  let redFaces = [];

  for (let i = 0; i < wordPairs.length; i++) {
    let pair = wordPairs[i];

    redFaces.push(
      makeRedFaceRecord(
        pair.firstTetra,
        pair.firstTetraIndex,
        false
      )
    );
    redFaces.push(
      makeRedFaceRecord(
        pair.secondTetra,
        pair.secondTetraIndex,
        true
      )
    );
  }

  let assignments = new Map();

  if (redFaces.length !== RED_SEQUENCE.length) {
    return { assignments: assignments };
  }

  let redCenter = pt3(0, 0, 0);

  for (let i = 0; i < redFaces.length; i++) {
    redCenter = addPt(redCenter, redFaces[i].centroid);
  }

  redCenter = scalePt(redCenter, 1 / redFaces.length);

  // Find the six faces by their configured letters. This supplies a canonical
  // DESIGN loop and a verified fallback when a folded pose is too ambiguous to
  // sort reliably. The normal running path still uses centroid angles below.
  let configuredOrder = [];

  for (let i = 0; i < RED_SEQUENCE.length; i++) {
    let letter = RED_SEQUENCE[i];
    let match = redFaces.find(function (face) {
      return surfaces[face.tetraIndex][RED_FACE_INDEX].word === letter;
    });

    if (match) {
      configuredOrder.push(match);
    }
  }

  if (configuredOrder.length !== RED_SEQUENCE.length) {
    configuredOrder = redFaces.slice();
  }

  // The configured D-to-E-to-... traversal is known to be correct on one
  // physical side. Its signed centroid loop establishes a geometry-derived
  // ring normal without relying on a fragile tetrahedron index sequence.
  let ringNormalCandidate = pt3(0, 0, 0);

  for (let i = 0; i < configuredOrder.length; i++) {
    let currentRadial = subPt(configuredOrder[i].centroid, redCenter);
    let nextRadial = subPt(
      configuredOrder[(i + 1) % configuredOrder.length].centroid,
      redCenter
    );

    ringNormalCandidate = addPt(
      ringNormalCandidate,
      crossPt(currentRadial, nextRadial)
    );
  }

  let ringNormalMagnitude = magPt(ringNormalCandidate);

  if (
    isFinitePt(ringNormalCandidate) &&
    Number.isFinite(ringNormalMagnitude) &&
    ringNormalMagnitude > 1e-8
  ) {
    let candidate = scalePt(ringNormalCandidate, 1 / ringNormalMagnitude);

    if (dotPt(candidate, lastRedRingNormal) < 0) {
      candidate = scalePt(candidate, -1);
    }

    lastRedRingNormal = candidate;
  }

  // D is the angular anchor. x/y axes in the red-side plane turn each face
  // centroid into an atan2 angle that can be sorted independent of world pose.
  let anchorFace = configuredOrder[0];
  let angleXAxis = projectOntoPlane(
    subPt(anchorFace.centroid, redCenter),
    lastRedRingNormal
  );

  if (magPt(angleXAxis) < 1e-8 || !isFinitePt(angleXAxis)) {
    angleXAxis = subPt(configuredOrder[1].centroid, redCenter);
  }

  angleXAxis = unitPt(angleXAxis);
  let angleYAxis = unitPt(crossPt(lastRedRingNormal, angleXAxis));
  let angleRecords = [];

  for (let i = 0; i < redFaces.length; i++) {
    let radial = subPt(redFaces[i].centroid, redCenter);
    let angle = Math.atan2(
      dotPt(radial, angleYAxis),
      dotPt(radial, angleXAxis)
    );

    if (angle < 0) {
      angle += TWO_PI;
    }

    angleRecords.push({ face: redFaces[i], angle: angle });
  }

  angleRecords.sort(function (a, b) {
    return a.angle - b.angle;
  });

  // Nearly coincident centroid angles occur at folded transitions. Reject that
  // unstable order and keep the last valid circular order for this frame.
  let minimumGap = TWO_PI;

  for (let i = 0; i < angleRecords.length; i++) {
    let currentAngle = angleRecords[i].angle;
    let nextAngle =
      i + 1 < angleRecords.length
        ? angleRecords[i + 1].angle
        : angleRecords[0].angle + TWO_PI;

    minimumGap = Math.min(minimumGap, nextAngle - currentAngle);
  }

  let anchorPosition = angleRecords.findIndex(function (record) {
    return record.face.tetraIndex === anchorFace.tetraIndex;
  });
  let candidateOrder = angleRecords
    .slice(anchorPosition)
    .concat(angleRecords.slice(0, anchorPosition))
    .map(function (record) {
      return record.face;
    });

  if (
    Number.isFinite(minimumGap) &&
    minimumGap >= RED_ORDER_MIN_GAP
  ) {
    lastRedCircularOrder = candidateOrder.map(function (face) {
      return face.tetraIndex;
    });
  }

  let faceByIndex = new Map();

  for (let i = 0; i < redFaces.length; i++) {
    faceByIndex.set(redFaces[i].tetraIndex, redFaces[i]);
  }

  let circularOrder = lastRedCircularOrder
    .map(function (tetraIndex) {
      return faceByIndex.get(tetraIndex);
    })
    .filter(function (face) {
      return Boolean(face);
    });

  // At near-coincident folded poses, retain the last valid order. On the first
  // such frame, the configured canonical loop is a verified geometric fallback.
  if (circularOrder.length !== RED_SEQUENCE.length) {
    circularOrder = configuredOrder;
    lastRedCircularOrder = circularOrder.map(function (face) {
      return face.tetraIndex;
    });
  }

  let coherentFrontNormal = pt3(0, 0, 0);

  for (let i = 0; i < redFaces.length; i++) {
    coherentFrontNormal = addPt(
      coherentFrontNormal,
      redFaces[i].frontNormal
    );
  }

  coherentFrontNormal = scalePt(
    coherentFrontNormal,
    1 / redFaces.length
  );

  let frontSideScore = dotPt(coherentFrontNormal, lastRedRingNormal);

  // Change traversal only after the coherent red side has crossed the ring
  // plane and reached a small, edge-on visibility band. The separate enter
  // directions provide hysteresis and prevent sequence chatter near zero.
  if (frontSideScore >= RED_SIDE_HYSTERESIS) {
    redFrontUsesForwardTraversal = false;
  } else if (frontSideScore <= -RED_SIDE_HYSTERESIS) {
    redFrontUsesForwardTraversal = true;
  }

  // Textures are looked up by letter, then assigned along the geometric order.
  // Front and back use opposite traversal directions; orientation of each glyph
  // remains a separate responsibility of drawCenteredLabel() in labels.js.
  let textureByLetter = new Map();

  for (let i = 0; i < redFaces.length; i++) {
    let tetraIndex = redFaces[i].tetraIndex;
    let word = surfaces[tetraIndex][RED_FACE_INDEX].word;
    let textureRow = labelTextures[tetraIndex] || [];

    textureByLetter.set(word, textureRow[RED_FACE_INDEX]);
  }

  for (let i = 0; i < circularOrder.length; i++) {
    let face = circularOrder[i];
    let frontSequenceIndex = redFrontUsesForwardTraversal
      ? (RED_SEQUENCE.length - i) % RED_SEQUENCE.length
      : i;
    let backSequenceIndex = redFrontUsesForwardTraversal
      ? i
      : (RED_SEQUENCE.length - i) % RED_SEQUENCE.length;
    let ownTextureRow = labelTextures[face.tetraIndex] || [];
    let ownTexture = ownTextureRow[RED_FACE_INDEX];

    assignments.set(face.tetraIndex, {
      frontTexture:
        textureByLetter.get(RED_SEQUENCE[frontSequenceIndex]) || ownTexture,
      backTexture:
        textureByLetter.get(RED_SEQUENCE[backSequenceIndex]) || ownTexture,
      frontNormal: face.frontNormal,
      frontLetter: RED_SEQUENCE[frontSequenceIndex],
      backLetter: RED_SEQUENCE[backSequenceIndex]
    });
  }

  return {
    center: redCenter,
    ringNormal: lastRedRingNormal,
    circularOrder: circularOrder,
    assignments: assignments,
    frontUsesForwardTraversal: redFrontUsesForwardTraversal
  };
}

// Captures the centroid and a winding-stable material-front normal for one red
// triangle. Mirrored tetrahedra have opposite winding, so their raw normals are
// reversed here to describe the same coherent physical side of the red ring.
function makeRedFaceRecord(tetra, tetraIndex, isMirrored) {
  let a = tetra[0];
  let b = tetra[2];
  let c = tetra[3];
  let lastFrontNormal =
    lastRedFrontNormals.get(tetraIndex) || pt3(0, 0, 1);
  let rawFallback = isMirrored
    ? scalePt(lastFrontNormal, -1)
    : lastFrontNormal;
  let rawNormal = stableFaceNormalFromWinding(a, b, c, rawFallback);
  let frontNormal = isMirrored ? scalePt(rawNormal, -1) : rawNormal;

  lastRedFrontNormals.set(tetraIndex, frontNormal);

  return {
    tetraIndex: tetraIndex,
    centroid: centroidPt(a, b, c),
    frontNormal: frontNormal
  };
}
