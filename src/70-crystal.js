/* GLAZECAST — crystal structure viewer.
 * Renders unit cells built from experimental CIFs (Crystallography Open
 * Database) — real lattice parameters, real symmetry-expanded atom positions.
 */
(function (root) {
'use strict';
var GC = root.GC = root.GC || {};
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

var ELEMENT = {
  O:  { color: [214, 74, 58],  r: 0.66, name: 'oxygen' },
  Si: { color: [206, 176, 116], r: 1.11, name: 'silicon' },
  Al: { color: [168, 178, 194], r: 1.21, name: 'aluminium' },
  Fe: { color: [176, 96, 52],  r: 1.32, name: 'iron' },
  Zn: { color: [126, 146, 176], r: 1.22, name: 'zinc' },
  Ti: { color: [150, 162, 184], r: 1.60, name: 'titanium' },
  Sn: { color: [186, 196, 206], r: 1.39, name: 'tin' },
  Zr: { color: [104, 168, 124], r: 1.75, name: 'zirconium' },
  Cu: { color: [196, 116, 66],  r: 1.32, name: 'copper' },
  Mg: { color: [140, 190, 118], r: 1.41, name: 'magnesium' },
  Ca: { color: [96, 148, 206],  r: 1.76, name: 'calcium' },
  K:  { color: [166, 126, 196], r: 2.03, name: 'potassium' },
  Cr: { color: [110, 146, 112], r: 1.39, name: 'chromium' },
  Bi: { color: [186, 140, 206], r: 1.48, name: 'bismuth' },
  Na: { color: [140, 130, 210], r: 1.02, name: 'sodium' },
  H:  { color: [230, 230, 230], r: 0.31, name: 'hydrogen' }
};
function el(sym) {
  return ELEMENT[sym] || { color: [170, 170, 170], r: 1.2, name: sym };
}

/* ---------- cell geometry ---------- */
function cellMatrix(cell) {
  var a = cell.a, b = cell.b, c = cell.c;
  var al = (cell.alpha || 90) * Math.PI / 180;
  var be = (cell.beta || 90) * Math.PI / 180;
  var ga = (cell.gamma || 90) * Math.PI / 180;
  var ca = Math.cos(al), cb = Math.cos(be), cg = Math.cos(ga), sg = Math.sin(ga);
  var V = Math.sqrt(Math.max(0, 1 - ca * ca - cb * cb - cg * cg + 2 * ca * cb * cg));
  return [
    [a, 0, 0],
    [b * cg, b * sg, 0],
    [c * cb, c * (ca - cb * cg) / sg, c * V / sg]
  ];
}

/* ---------- build a renderable model ---------- */
function model(struct) {
  var M = cellMatrix(struct.cell);
  /* COD data gives Cartesian positions already */
  var center = [
    0.5 * (M[0][0] + M[1][0] + M[2][0]),
    0.5 * (M[0][1] + M[1][1] + M[2][1]),
    0.5 * (M[0][2] + M[1][2] + M[2][2])
  ];
  var atoms = struct.atoms.map(function (a) {
    return { el: a.el, p: [a.p[0] - center[0], a.p[1] - center[1], a.p[2] - center[2]] };
  });

  var bonds = [];
  for (var dx = -1; dx <= 1; dx++) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dz = -1; dz <= 1; dz++) {
        var shift = [
          dx * M[0][0] + dy * M[1][0] + dz * M[2][0],
          dx * M[0][1] + dy * M[1][1] + dz * M[2][1],
          dx * M[0][2] + dy * M[1][2] + dz * M[2][2]
        ];
        for (var i = 0; i < atoms.length; i++) {
          for (var j = 0; j < atoms.length; j++) {
            if (i === j && dx === 0 && dy === 0 && dz === 0) continue;
            var ax = atoms[i].p, bx = atoms[j].p;
            var vx = bx[0] + shift[0] - ax[0];
            var vy = bx[1] + shift[1] - ax[1];
            var vz = bx[2] + shift[2] - ax[2];
            var d = Math.sqrt(vx * vx + vy * vy + vz * vz);
            var cut = 1.18 * (el(atoms[i].el).r + el(atoms[j].el).r);
            if (d > 0.4 && d < cut) bonds.push({ i: i, j: j, s: shift, d: d });
          }
        }
      }
    }
  }
  var seen = {};
  bonds = bonds.filter(function (b) {
    var k = b.i + '|' + b.j + '|' + b.s.join(',');
    var k2 = b.j + '|' + b.i + '|' + b.s.map(function (v) { return -v; }).join(',');
    if (seen[k] || seen[k2]) return false;
    seen[k] = 1; return true;
  });

  var R = 0;
  atoms.forEach(function (a) {
    R = Math.max(R, Math.sqrt(a.p[0] * a.p[0] + a.p[1] * a.p[1] + a.p[2] * a.p[2]) + el(a.el).r);
  });

  return { atoms: atoms, bonds: bonds, radius: R * 1.04, cell: M, center: center, source: struct };
}

/* ---------- rotation ---------- */
function rotate(p, yaw, pitch) {
  var cy = Math.cos(yaw), sy = Math.sin(yaw);
  var cp = Math.cos(pitch), sp = Math.sin(pitch);
  var x = p[0] * cy - p[2] * sy;
  var z = p[0] * sy + p[2] * cy;
  var y = p[1] * cp - z * sp;
  z = p[1] * sp + z * cp;
  return [x, y, z];
}

/* ---------- draw ---------- */
function draw(canvas, m, yaw, pitch, opts) {
  var dpr = Math.min(2, root.devicePixelRatio || 1);
  var W = canvas.clientWidth || 360, H = canvas.clientHeight || 360;
  canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  var scale = Math.min(W, H) * 0.40 / m.radius;
  var cx = W / 2, cy = H / 2;
  var proj = function (p) {
    var r = rotate(p, yaw, pitch);
    return { x: cx + r[0] * scale, y: cy - r[1] * scale, z: r[2] };
  };

  /* cell frame */
  if (opts && opts.frame !== false) {
    var corners = [];
    for (var i = 0; i < 8; i++) {
      var f = [(i & 1) ? 1 : 0, (i & 2) ? 1 : 0, (i & 4) ? 1 : 0];
      corners.push(proj([
        f[0] * m.cell[0][0] + f[1] * m.cell[1][0] + f[2] * m.cell[2][0] - m.center[0],
        f[0] * m.cell[0][1] + f[1] * m.cell[1][1] + f[2] * m.cell[2][1] - m.center[1],
        f[0] * m.cell[0][2] + f[1] * m.cell[1][2] + f[2] * m.cell[2][2] - m.center[2]
      ]));
    }
    var edges = [[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];
    ctx.strokeStyle = 'rgba(232,226,214,0.16)';
    ctx.lineWidth = 1;
    edges.forEach(function (e) {
      ctx.beginPath();
      ctx.moveTo(corners[e[0]].x, corners[e[0]].y);
      ctx.lineTo(corners[e[1]].x, corners[e[1]].y);
      ctx.stroke();
    });
  }

  /* bonds */
  var zb = [];
  m.bonds.forEach(function (b) {
    var a = m.atoms[b.i].p, c = m.atoms[b.j].p;
    var q = proj([a[0], a[1], a[2]]);
    var r = proj([c[0] + b.s[0], c[1] + b.s[1], c[2] + b.s[2]]);
    zb.push({ q: q, r: r, z: (q.z + r.z) / 2 });
  });
  zb.sort(function (p1, p2) { return p1.z - p2.z; });
  zb.forEach(function (b) {
    var t = clamp((b.z / m.radius + 1) / 2, 0, 1);
    ctx.strokeStyle = 'rgba(' + Math.round(130 + 95 * t) + ',' + Math.round(120 + 88 * t) + ',' + Math.round(108 + 74 * t) + ',0.7)';
    ctx.lineWidth = Math.max(1.4, 4.2 * (0.6 + 0.4 * t));
    ctx.beginPath(); ctx.moveTo(b.q.x, b.q.y); ctx.lineTo(b.r.x, b.r.y); ctx.stroke();
  });

  /* atoms, painter's order */
  var items = m.atoms.map(function (a) {
    var q = proj(a.p);
    var e = el(a.el);
    return { q: q, e: e, z: q.z };
  });
  items.sort(function (p1, p2) { return p1.z - p2.z; });
  items.forEach(function (it) {
    var t = clamp((it.z / m.radius + 1) / 2, 0, 1);
    var rad = Math.min(Math.min(W, H) * 0.062, Math.max(2.8, it.e.r * scale * 0.52 * (0.92 + 0.16 * t)));
    var g = ctx.createRadialGradient(
      it.q.x - rad * 0.35, it.q.y - rad * 0.38, rad * 0.1,
      it.q.x, it.q.y, rad * 1.05);
    var c = it.e.color;
    var lit = function (v, f) { return Math.min(255, Math.round(v * f)); };
    g.addColorStop(0, 'rgba(' + lit(c[0], 1.35) + ',' + lit(c[1], 1.35) + ',' + lit(c[2], 1.35) + ',1)');
    g.addColorStop(0.55, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',1)');
    g.addColorStop(1, 'rgba(' + lit(c[0], 0.55) + ',' + lit(c[1], 0.55) + ',' + lit(c[2], 0.55) + ',1)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(it.q.x, it.q.y, rad, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(20,18,16,0.35)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  });
}

/* ---------- interactive card ---------- */
function attach(canvas, struct) {
  var m = model(struct);
  var yaw = 0.62, pitch = -0.42;
  var dragging = false, lx = 0, ly = 0;
  function paint() { draw(canvas, m, yaw, pitch); }
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', function (e) {
    dragging = true; lx = e.clientX; ly = e.clientY;
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    yaw += (e.clientX - lx) * 0.01;
    pitch += (e.clientY - ly) * 0.01;
    pitch = clamp(pitch, -1.5, 1.5);
    lx = e.clientX; ly = e.clientY;
    paint();
  });
  canvas.addEventListener('pointerup', function () {
    dragging = false; canvas.style.cursor = 'grab';
  });
  root.addEventListener('resize', paint);
  /* the card is not laid out yet when attach() runs, so wait a frame and also
     watch for size changes */
  if (root.requestAnimationFrame) root.requestAnimationFrame(paint); else setTimeout(paint, 0);
  if (root.ResizeObserver) {
    new root.ResizeObserver(function () { paint(); }).observe(canvas);
  }
  return { paint: paint };
}

GC.crystal3d = { draw: draw, model: model, attach: attach, element: el, ELEMENT: ELEMENT };

})(typeof globalThis !== 'undefined' ? globalThis : this);
