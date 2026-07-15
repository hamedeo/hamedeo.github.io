/* =========================================================
   KALEIDOCYCLE GEOMETRY AND FOLDING CALCULATIONS
   ========================================================= */

/* =========================================================
   KALEIDOCYCLE GEOMETRY
   ========================================================= */

// Builds one animated disphenoid (a tetrahedron with paired equal edges).
// The orthogonal basis u/v/w changes with t while all required edge lengths
// remain fixed. This is core geometry: modify only if changing the mechanism.
function makeDisphenoid(t) {
  let halfHinge = hingeEdge / 2;

  // distance between opposite hinge-edge midpoints
  let midGap = sqrt(sideEdge * sideEdge - hingeEdge * hingeEdge / 2);

  let ta = tan(sectorAngle);
  let st = sin(t);
  let ct = cos(t);

  let den = sqrt(1 + st * st * ta * ta);

  let u = pt3(ct, 0, st);

  let v = pt3(
    -st / den,
    -st * ta / den,
    ct / den
  );

  let w = pt3(
    -st * st * ta / den,
    1 / den,
    ct * st * ta / den
  );

  let p = pt3(
    midGap * (w.y / ta - w.x),
    0,
    -midGap * w.z / 2
  );

  let q = pt3(
    midGap * (w.y / ta),
    midGap * w.y,
    midGap * w.z / 2
  );

  let A = addPt(p, scalePt(u, -halfHinge));
  let B = addPt(p, scalePt(u, halfHinge));
  let C = addPt(q, scalePt(v, -halfHinge));
  let D = addPt(q, scalePt(v, halfHinge));

  return [A, B, C, D];
}

// Rotates every vertex of a tetrahedron around the ring's Z axis.
function rotateSetZ(arr, angle) {
  let out = [];

  for (let i = 0; i < arr.length; i++) {
    out.push(rotateZPt(arr[i], angle));
  }

  return out;
}

// Standard point rotation in the XY plane; Z is deliberately unchanged.
function rotateZPt(p, angle) {
  let ca = cos(angle);
  let sa = sin(angle);

  return pt3(
    ca * p.x - sa * p.y,
    sa * p.x + ca * p.y,
    p.z
  );
}

// Reflects a point across one radial sector plane. Each original tetrahedron
// is paired with this mirror so their labelled face-3 triangles share an edge.
function mirrorInSectorPlane(p) {
  let nx = -sin(sectorAngle);
  let ny = cos(sectorAngle);
  let d = p.x * nx + p.y * ny;

  return pt3(
    p.x - 2 * d * nx,
    p.y - 2 * d * ny,
    p.z
  );
}

// Measures the opening between a shared word's two triangle normals. Clamping
// protects acos() from floating-point values just outside [-1, 1]. A failed
// measurement returns the last valid angle instead of suppressing rendering.
function getPairDihedralAngle(firstNormal, secondNormal, fallbackAngle) {
  let d = dotPt(firstNormal, secondNormal);

  if (!Number.isFinite(d)) {
    return fallbackAngle;
  }

  d = Math.max(-1, Math.min(1, d));

  // 0 = tightly folded/overlapping, PI = fully unfolded.
  let angle = Math.acos(d);
  return Number.isFinite(angle) ? angle : fallbackAngle;
}

// Compares the current dihedral angle with the preceding valid sample. A small
// dead band ignores numerical noise at the folded and unfolded extremes.
function getPairMotionDirection(state, angle) {
  let previousDirection = state.motionDirection;

  if (!Number.isFinite(angle)) {
    return {
      previous: previousDirection,
      current: state.motionDirection
    };
  }

  if (state.hasPreviousAngle) {
    let delta = angle - state.previousAngle;

    if (delta < -DIHEDRAL_MOTION_EPSILON) {
      state.motionDirection = "folding";
    } else if (delta > DIHEDRAL_MOTION_EPSILON) {
      state.motionDirection = "unfolding";
    }
  }

  state.previousAngle = angle;
  state.hasPreviousAngle = true;

  return {
    previous: previousDirection,
    current: state.motionDirection
  };
}
