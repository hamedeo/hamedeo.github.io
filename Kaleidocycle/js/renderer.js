/* =========================================================
   TRIANGLE, SURFACE, EDGE, AND TEXTURE RENDERING
   ========================================================= */

/* =========================================================
   DRAW TETRAHEDRA
   ========================================================= */

// Renders the four configured triangular faces, then overlays all six physical
// tetrahedron edges. Vertex-to-face assignments are part of the geometry and
// must stay synchronized with face indices documented in surfaces.js.
function drawTetra(v, tetraIndex, redSideLayout) {
  drawSurface(v[0], v[1], v[2], tetraIndex, 0, redSideLayout);
  drawSurface(v[0], v[1], v[3], tetraIndex, 1, redSideLayout);
  drawSurface(v[0], v[2], v[3], tetraIndex, 2, redSideLayout);
  drawSurface(v[1], v[2], v[3], tetraIndex, 3, redSideLayout);

  // CUSTOMIZE: triangle edge colour and thickness. stroke() accepts a grey
  // value or CSS colour string; strokeWeight() is measured in pixels.
  stroke(30);
  strokeWeight(1.4);

  drawSegment(v[0], v[1]);
  drawSegment(v[0], v[2]);
  drawSegment(v[0], v[3]);
  drawSegment(v[1], v[2]);
  drawSegment(v[1], v[3]);
  drawSegment(v[2], v[3]);
}

// Fills one triangle and attaches its configured content. Shared face-3 words
// are intentionally skipped here because they must be drawn once across both
// connected tetrahedra. Red faces receive side-specific letter textures from
// getRedSideLayout(); ordinary labels use the same texture on both sides.
function drawSurface(a, b, c, tetraIndex, faceIndex, redSideLayout) {
  let cfg = surfaces[tetraIndex][faceIndex];
  let tex = labelTextures[tetraIndex][faceIndex];

  // coloured triangle
  noStroke();
  fill(cfg.color);

  beginShape(TRIANGLES);
  vertex(a.x, a.y, a.z);
  vertex(b.x, b.y, b.z);
  vertex(c.x, c.y, c.z);
  endShape();

  // Shared text is drawn once across its connected pair after both tetrahedra.
  if (cfg.contentType !== "sharedText") {
    let redAssignment =
      faceIndex === RED_FACE_INDEX && redSideLayout
        ? redSideLayout.assignments.get(tetraIndex)
        : null;

    if (redAssignment) {
      drawCenteredLabel(
        a,
        b,
        c,
        cfg,
        redAssignment.frontTexture,
        redAssignment.backTexture,
        redAssignment.frontNormal
      );
    } else {
      drawCenteredLabel(a, b, c, cfg, tex, tex, null);
    }
  }
}

/* =========================================================
   SMALL HELPERS
   ========================================================= */

// Draws one 3D edge between lightweight point objects.
function drawSegment(a, b) {
  line(a.x, a.y, a.z, b.x, b.y, b.z);
}
