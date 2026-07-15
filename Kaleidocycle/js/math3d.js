/* =========================================================
   REUSABLE 3D POINT, VECTOR, AND NORMAL HELPERS
   ========================================================= */

/* =========================================================
   VECTOR HELPERS
   ========================================================= */

// Points and vectors share the same lightweight {x, y, z} representation.
// Keeping these helpers independent of p5.Vector makes the geometry predictable
// and avoids allocating p5 objects in the animation loop.

function pt3(x, y, z) {
  return { x: x, y: y, z: z };
}

function addPt(a, b) {
  return pt3(a.x + b.x, a.y + b.y, a.z + b.z);
}

function subPt(a, b) {
  return pt3(a.x - b.x, a.y - b.y, a.z - b.z);
}

function scalePt(a, s) {
  return pt3(a.x * s, a.y * s, a.z * s);
}

function dotPt(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function crossPt(a, b) {
  return pt3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x
  );
}

function magPt(a) {
  return sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

function unitPt(a) {
  let m = magPt(a);

  if (m < 1e-9) {
    return pt3(0, 0, 0);
  }

  return pt3(a.x / m, a.y / m, a.z / m);
}

// Removes the component of v that points along unit normal n. Label code uses
// this to construct horizontal and vertical axes that remain on a face plane.
function projectOntoPlane(v, n) {
  return subPt(v, scalePt(n, dotPt(v, n)));
}

// Returns the average position of one triangle's three vertices.
function centroidPt(a, b, c) {
  return pt3(
    (a.x + b.x + c.x) / 3,
    (a.y + b.y + c.y) / 3,
    (a.z + b.z + c.z) / 3
  );
}

// Produces a consistent normal for ordinary one-triangle labels by choosing
// the winding direction that points toward the kaleidocycle's origin.
function faceNormalTowardOrigin(a, b, c) {
  let n = unitPt(crossPt(subPt(b, a), subPt(c, a)));
  let center = centroidPt(a, b, c);
  let toOrigin = scalePt(center, -1);

  if (dotPt(n, toOrigin) < 0) {
    n = scalePt(n, -1);
  }

  return n;
}

// Returns the winding-defined unit normal, or the last known valid normal if a
// folded pose makes the triangle degenerate. That fallback keeps text visible
// and prevents NaN values from entering the orientation state machines.
function stableFaceNormalFromWinding(a, b, c, fallbackNormal) {
  let raw;
  let magnitude;

  try {
    raw = crossPt(subPt(b, a), subPt(c, a));
    magnitude = magPt(raw);
  } catch (error) {
    return fallbackNormal;
  }

  if (!isFinitePt(raw) || !Number.isFinite(magnitude) || magnitude < 1e-9) {
    return fallbackNormal;
  }

  return scalePt(raw, 1 / magnitude);
}

// Validates computed geometry before it replaces persistent fallback state.
function isFinitePt(p) {
  return (
    p &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    Number.isFinite(p.z)
  );
}

// Squared distance is sufficient for spread comparisons and avoids a square
// root in the central-junction calculation.
function distanceSqPt(a, b) {
  let dx = a.x - b.x;
  let dy = a.y - b.y;
  let dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}
