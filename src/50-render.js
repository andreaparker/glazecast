/* GLAZECAST drawing: the simulated surface and the TTT diagram.
 * Driven by the engine's numbers. There is no pre-drawn artwork.
 */
(function (root) {
'use strict';
var GC = root.GC = root.GC || {};

/* ---------------- tiny value noise --------------------------------------- */
function hash2(x, y) {
  var h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y) {
  var xi = Math.floor(x), yi = Math.floor(y);
  var xf = x - xi, yf = y - yi;
  var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  var a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function fbm(x, y, oct) {
  var s = 0, a = 0.5, f = 1;
  for (var i = 0; i < (oct || 4); i++) { s += a * vnoise(x * f, y * f); f *= 2.07; a *= 0.5; }
  return s;
}
function rnd(seed) {
  var s = seed;
  return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}
function lerp(a, b, t) { return a + (b - a) * t; }
function mixRGB(a, b, t) {
  return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))];
}
function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

/* ---------------- iridescent background ---------------------------------- */
function iridescentFill(ctx, W, H, metal, filmNm) {
  var pal = GC.color.iridescentPalette(metal, 2.1);
  var scale = 0.62;
  var w = Math.max(80, Math.floor(W * scale)), h = Math.max(60, Math.floor(H * scale));
  var img = ctx.createImageData(w, h);
  var d = img.data;
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var n = fbm(x / 26, y / 26, 4) * 0.62 + fbm(x / 7, y / 7, 2) * 0.38;
      n = Math.min(1, Math.max(0, (n - 0.16) / 0.62));
      var film = 48 + n * 250;
      var idx = Math.min(pal.length - 1, Math.max(0, Math.round(film / 10)));
      var c = pal[idx].rgb;
      var grey = (c[0] + c[1] + c[2]) / 3;
      var sat = 2.2;
      var light = 0.70 + 0.30 * fbm(x / 70 + 5, y / 70 + 5, 3);
      var i = (y * w + x) * 4;
      d[i] = Math.min(255, (grey + (c[0] - grey) * sat) * light);
      d[i + 1] = Math.min(255, (grey + (c[1] - grey) * sat) * light);
      d[i + 2] = Math.min(255, (grey + (c[2] - grey) * sat) * light);
      d[i + 3] = 255;
    }
  }
  var tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  tmp.getContext('2d').putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tmp, 0, 0, W, H);
}

/* ---------------- crystal shapes ----------------------------------------- */
function drawTriangle(ctx, x, y, r, rot, base, rim) {
  /* one faceted plate: bright upper-left face, dark lower-right, concentric
     ridge lines for the hopper steps */
  function tri(rr, dx, dy) {
    ctx.beginPath();
    for (var k = 0; k < 3; k++) {
      var a = rot + k * Math.PI * 2 / 3;
      var px = x + dx + Math.cos(a) * rr;
      var py = y + dy + Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  tri(r, 0, 0);
  var g = ctx.createLinearGradient(x - r * 0.75, y - r * 0.9, x + r * 0.55, y + r * 0.95);
  g.addColorStop(0, rgba(mixRGB(base, [255, 255, 255], 0.72), 1));
  g.addColorStop(0.28, rgba(mixRGB(base, [255, 250, 240], 0.30), 1));
  g.addColorStop(0.60, rgba(mixRGB(base, [150, 154, 168], 0.35), 1));
  g.addColorStop(1, rgba(mixRGB(base, [28, 32, 44], 0.78), 1));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.stroke();

  /* ridges */
  for (var i = 1; i <= 2; i++) {
    var rr = r * (1 - i * 0.3);
    var dx = Math.cos(rot + 2.2) * r * 0.045 * i;
    var dy = Math.sin(rot + 2.2) * r * 0.045 * i;
    tri(rr, dx, dy);
    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    ctx.lineWidth = Math.max(0.7, r * 0.016);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20,24,32,0.30)';
    ctx.lineWidth = Math.max(0.6, r * 0.012);
    ctx.stroke();
  }
}

function drawSpherulite(ctx, x, y, r, tint, rndf) {
  var g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(mixRGB(tint, [255, 255, 255], 0.72), 0.98));
  g.addColorStop(0.45, rgba(mixRGB(tint, [255, 250, 240], 0.25), 0.9));
  g.addColorStop(0.82, rgba(mixRGB(tint, [150, 138, 118], 0.45), 0.45));
  g.addColorStop(1, rgba(mixRGB(tint, [120, 110, 95], 0.5), 0.05));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(mixRGB(tint, [90, 82, 70], 0.55), 0.45);
  ctx.lineWidth = 0.7;
  for (var i = 0; i < 46; i++) {
    var a = (i / 46) * Math.PI * 2 + rndf() * 0.2;
    var r0 = r * (0.08 + rndf() * 0.2), r1 = r * (0.72 + rndf() * 0.28);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
    ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    ctx.stroke();
  }
}

function drawNeedles(ctx, x, y, r, tint, rot, rndf) {
  var n = 3 + Math.floor(rndf() * 4);
  for (var i = 0; i < n; i++) {
    var a = rot + (rndf() - 0.5) * 1.1;
    var len = r * (0.6 + rndf() * 0.8);
    var wid = Math.max(0.9, r * 0.06);
    ctx.save();
    ctx.translate(x + (rndf() - 0.5) * r * 0.5, y + (rndf() - 0.5) * r * 0.5);
    ctx.rotate(a);
    var g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, rgba(mixRGB(tint, [255, 255, 255], 0.4), 0.9));
    g.addColorStop(1, rgba(tint, 0.45));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -wid); ctx.lineTo(len, -wid * 0.25); ctx.lineTo(len, wid * 0.25); ctx.lineTo(0, wid);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function drawOctahedron(ctx, x, y, r, rot, tint) {
  var v = [];
  for (var k = 0; k < 6; k++) {
    var a = rot + k * Math.PI / 3;
    v.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.96]);
  }
  var facets = [
    [[0, 1, 2], 0.42],
    [[0, 2, 3], 0.16],
    [[0, 3, 4], -0.28],
    [[0, 4, 5], -0.10]
  ];
  for (var i = 0; i < facets.length; i++) {
    var f = facets[i];
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (var j = 0; j < f[0].length; j++) ctx.lineTo(v[f[0][j]][0], v[f[0][j]][1]);
    ctx.closePath();
    var lift = f[1];
    ctx.fillStyle = lift >= 0
      ? rgba(mixRGB(tint, [255, 255, 255], 0.10 + lift), 1)
      : rgba(mixRGB(tint, [30, 32, 40], -lift * 1.6), 1);
    ctx.fill();
  }
  ctx.beginPath();
  for (var k2 = 0; k2 < 6; k2++) {
    if (k2 === 0) ctx.moveTo(v[0][0], v[0][1]); else ctx.lineTo(v[k2][0], v[k2][1]);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = Math.max(0.7, r * 0.045);
  ctx.stroke();
}

function drawPoly(ctx, x, y, r, sides, rot, tint) {
  ctx.beginPath();
  for (var k = 0; k <= sides; k++) {
    var a = rot + k * Math.PI * 2 / sides;
    var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.86;
    if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  var g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, rgba(mixRGB(tint, [255, 255, 255], 0.55), 0.95));
  g.addColorStop(0.6, rgba(tint, 0.9));
  g.addColorStop(1, rgba(mixRGB(tint, [70, 64, 58], 0.35), 0.85));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = rgba(mixRGB(tint, [255, 255, 255], 0.6), 0.5);
  ctx.lineWidth = 0.8; ctx.stroke();
}

/* ---------------- the surface -------------------------------------------- */
/* Crystal instances are generated once per prediction (normalised coords), so
   a time slider can grow the same crystals in place instead of re-rolling. */
function buildCrystalSet(pred, W, H, pxPerMm) {
  if (pred._crystals) return pred._crystals;

  var hash = 0;
  try {
    JSON.stringify([pred.firing, pred.comp.mass]).split('').forEach(function (ch) {
      hash = (hash * 31 + ch.charCodeAt(0)) % 1000000007;
    });
  } catch (e) { /* keep 0 */ }
  var rndf = rnd(12345 + hash);
  var out = { crystals: [], metal: [], glassRGB: null };

  var app = pred.optics;
  var vis = pred.ranked.filter(function (r) { return r.visible && r.X > 0.06; });

  vis.slice(0, 3).forEach(function (ph, rank) {
    var p = ph.phase;
    var tint = hexToRgb(GC.engine.TINT[p.id] || '#efeae0');
    var hasChrome = (pred.comp.mass.Cr2O3 || 0) > 0.0005;
    if (p.id === 'cassiterite' && hasChrome) tint = hexToRgb('#d98ba8');
    if (p.id === 'rutile' && (pred.spec.species['Fe2+'] || 0) > 0.3) tint = hexToRgb('#6f7f97');

    var area = Math.min(0.85, ph.X * ph.volFrac * 14);
    var count = Math.round(4 + 90 * area * (rank === 0 ? 1 : 0.5));
    var sizeMm = ph.sizeMm * (0.6 + 0.8 / (1 + rank));

    /* birth time: the moment the k-th crystal's growth fraction is reached */
    var tl = ph.timeline || [];
    var Xf = ph.X || 1;
    for (var k = 0; k < count; k++) {
      var target = (k + 0.5) / count * Xf;
      var birth = 0;
      for (var i = 0; i < tl.length; i++) {
        if (tl[i].X >= target) { birth = tl[i].t; break; }
        birth = tl[i].t;
      }
      var inst = {
        phIdx: rank, p: p, shape: p.shape, tint: tint, rank: rank,
        nx: rndf(), ny: rndf(),
        rMm: sizeMm * (0.4 + rndf() * 0.9),
        rot: rndf() * Math.PI * 2,
        birth: birth
      };
      if (p.kind === 'metal') out.metal.push(inst); else out.crystals.push(inst);
    }
  });

  if (app.kind === 'metal') {
    var g = GC.color.appearance({ absorbers: app.absorbers || [], scatters: [] });
    out.glassRGB = g.rgb;
  }
  pred._crystals = out;
  return out;
}

function growthFrac(inst, ph, t) {
  /* interpolate the phase's accumulation profile at time t */
  var tl = ph.timeline || [];
  if (!tl.length) return 1;
  if (t >= tl[tl.length - 1].t) return 1;
  for (var i = 0; i < tl.length - 1; i++) {
    if (t <= tl[i + 1].t) {
      var f = (t - tl[i].t) / Math.max(1, tl[i + 1].t - tl[i].t);
      return GC.util.clamp(tl[i].X + f * (tl[i + 1].X - tl[i].X), 0, 1);
    }
  }
  return 1;
}

function surface(canvas, pred) { return surfaceAt(canvas, pred, null); }

function surfaceAt(canvas, pred, t) {
  if (!canvas) return;
  var dpr = Math.min(2, root.devicePixelRatio || 1);
  var W = canvas.clientWidth || 640, H = canvas.clientHeight || 420;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  var app = pred.optics;
  var pxPerMm = W / 24;
  var timed = t !== null && t !== undefined && isFinite(t);
  var set = buildCrystalSet(pred, W, H, pxPerMm);

  if (app.kind === 'metal') {
    /* the oxide film builds up while the piece cools; before that, glass */
    var fade = timed ? GC.util.clamp((pred.firing.peakC - pred.sched.T(t)) / 240, 0, 1) : 1;
    if (fade < 1 && set.glassRGB) {
      ctx.fillStyle = rgba(set.glassRGB, 1);
      ctx.fillRect(0, 0, W, H);
    }
    if (fade > 0.02) {
      ctx.save();
      ctx.globalAlpha = fade;
      iridescentFill(ctx, W, H, 'Bi', app.filmNm || 90);
      ctx.restore();
    }

    set.metal.forEach(function (inst) {
      var ph = pred.ranked[inst.phIdx];
      if (!ph) return;
      var f = timed ? growthFrac(inst, ph, t) : 1;
      if (f <= 0.01) return;
      var x = inst.nx * W, y = inst.ny * H;
      var r = Math.max(2, inst.rMm * pxPerMm * (0.25 + 0.75 * f));
      var rot = inst.rot;
      ctx.save();
      ctx.globalAlpha = GC.util.clamp(f * 2.4, 0, 1);
      ctx.translate(x + r * 0.10, y + r * 0.13);
      ctx.rotate(rot);
      ctx.beginPath();
      for (var kk = 0; kk < 3; kk++) {
        var aa = kk * Math.PI * 2 / 3;
        var px = Math.cos(aa) * r, py = Math.sin(aa) * r;
        if (kk === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(6,8,14,0.42)';
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = GC.util.clamp(f * 2.4, 0, 1);
      drawTriangle(ctx, x, y, r, rot, [222, 226, 234], 'rgba(255,250,242,0.9)');
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.30;
      var ig = ctx.createLinearGradient(x - r * 0.5, y - r * 0.5, x + r * 0.4, y + r * 0.4);
      ig.addColorStop(0, 'rgba(130,190,255,0.55)');
      ig.addColorStop(0.5, 'rgba(255,255,255,0)');
      ig.addColorStop(1, 'rgba(255,150,200,0.45)');
      ctx.fillStyle = ig;
      ctx.beginPath();
      for (var kq = 0; kq < 3; kq++) {
        var aq = rot + kq * Math.PI * 2 / 3;
        var pxq = x + Math.cos(aq) * r * 0.98, pyq = y + Math.sin(aq) * r * 0.98;
        if (kq === 0) ctx.moveTo(pxq, pyq); else ctx.lineTo(pxq, pyq);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    });
  } else {
    var base = app.rgb;
    var g = ctx.createLinearGradient(0, 0, W * 0.2, H);
    g.addColorStop(0, rgba(mixRGB(base, [255, 255, 255], 0.40), 1));
    g.addColorStop(0.42, rgba(mixRGB(base, [255, 255, 255], 0.06), 1));
    g.addColorStop(1, rgba(mixRGB(base, [44, 36, 28], 0.34), 1));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    var sp = ctx.createRadialGradient(W * 0.26, H * 0.16, 0, W * 0.26, H * 0.16, Math.max(W, H) * 0.8);
    sp.addColorStop(0, 'rgba(255,255,255,0.34)');
    sp.addColorStop(0.35, 'rgba(255,255,255,0.07)');
    sp.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sp; ctx.fillRect(0, 0, W, H);

    if ((app.matte || 0) < 0.5) {
      ctx.save();
      ctx.translate(W * 0.30, H * 0.24);
      ctx.rotate(-0.42);
      ctx.scale(1, 0.30);
      var hg = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.min(W, H) * 0.55);
      hg.addColorStop(0, 'rgba(255,255,255,' + (0.30 * (1 - (app.matte || 0) * 2)) + ')');
      hg.addColorStop(0.55, 'rgba(255,255,255,0.06)');
      hg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(0, 0, Math.min(W, H) * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var d = img.data, cw = canvas.width, ch = canvas.height;
    for (var yy = 0; yy < ch; yy += 2) {
      for (var xx = 0; xx < cw; xx += 2) {
        var i2 = (yy * cw + xx) * 4;
        var n2 = fbm(xx / (cw * 0.09), yy / (ch * 0.09), 3) - 0.5;
        var f2 = 1 + n2 * 0.22;
        d[i2] = Math.min(255, d[i2] * f2);
        d[i2 + 1] = Math.min(255, d[i2 + 1] * f2);
        d[i2 + 2] = Math.min(255, d[i2 + 2] * f2);
      }
    }
    ctx.putImageData(img, 0, 0);

    set.crystals.forEach(function (inst) {
      var ph = pred.ranked[inst.phIdx];
      if (!ph) return;
      var f = timed ? growthFrac(inst, ph, t) : 1;
      if (f <= 0.01) return;
      var x2 = inst.nx * W, y2 = inst.ny * H;
      var r2 = Math.max(2, inst.rMm * pxPerMm * (0.30 + 0.70 * f));
      var rot2 = inst.rot;
      var alpha = GC.util.clamp(f * 2.5, 0, 1) * (inst.rank === 0 ? 1 : 0.55);
      var shape = inst.shape;
      if (shape === 'spherulite') {
        ctx.globalAlpha = 0.20 * alpha;
        ctx.fillStyle = 'rgba(60,45,30,1)';
        ctx.beginPath(); ctx.arc(x2 + r2 * 0.16, y2 + r2 * 0.2, r2 * 2.9, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.globalAlpha = 0.22 * alpha;
        ctx.fillStyle = 'rgba(50,40,28,1)';
        ctx.beginPath(); ctx.arc(x2 + r2 * 0.2, y2 + r2 * 0.26, r2 * 0.95, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = alpha;
      if (shape === 'spherulite') drawSpherulite(ctx, x2, y2, r2 * 3.0, inst.tint, rnd(inst.nx * 999 + inst.ny * 777));
      else if (shape === 'needle') drawNeedles(ctx, x2, y2, r2, inst.tint, rot2, rnd(inst.nx * 33 + inst.ny * 55));
      else if (shape === 'octahedron') drawOctahedron(ctx, x2, y2, r2, rot2, inst.tint);
      else if (shape === 'hex') drawPoly(ctx, x2, y2, r2, 6, rot2, inst.tint);
      else if (shape === 'triangle') drawTriangle(ctx, x2, y2, r2, rot2, inst.tint, 'rgba(255,255,255,0.4)');
      else drawPoly(ctx, x2, y2, r2, 5, rot2, inst.tint);
      ctx.globalAlpha = 1;
    });
  }

  /* glaze sheen + vignette */
  var sheen = ctx.createLinearGradient(0, 0, W * 0.65, H);
  var sheenA = (app.kind === 'metal' ? 0.07 : 0.15) * (1 - (app.matte || 0) * 0.8);
  sheen.addColorStop(0, 'rgba(255,255,255,' + sheenA + ')');
  sheen.addColorStop(0.45, 'rgba(255,255,255,0.02)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen; ctx.fillRect(0, 0, W, H);

  var vg = ctx.createRadialGradient(W * 0.5, H * 0.45, Math.min(W, H) * 0.25, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

/* ---------------- TTT chart ---------------------------------------------- */
function ttt(canvas, pred) {
  if (!canvas) return;
  var dpr = Math.min(2, root.devicePixelRatio || 1);
  var W = canvas.clientWidth || 420, H = canvas.clientHeight || 260;
  canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  var padL = 62, padR = 14, padT = 26, padB = 40;
  var x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
  var tMin = 0, tMax = 5;              // log10 seconds
  var Tmin = 600, Tmax = 1400;
  function X(logt) { return x0 + (logt - tMin) / (tMax - tMin) * (x1 - x0); }
  function Y(T) { return y1 - (T - Tmin) / (Tmax - Tmin) * (y1 - y0); }
  function crisp(v) { return Math.round(v) + 0.5; }

  var INK = '#ece4d6', IRON = '#938a7e', AMBER = '#d98a3d';
  var MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

  /* grid: decades and 100 °C steps as hairlines, minor log ticks on the axis */
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(236,228,214,0.06)';
  for (var T = Tmin; T <= Tmax; T += 100) {
    ctx.beginPath(); ctx.moveTo(x0, crisp(Y(T))); ctx.lineTo(x1, crisp(Y(T))); ctx.stroke();
  }
  for (var lt = 1; lt < 5; lt++) {
    ctx.beginPath(); ctx.moveTo(crisp(X(lt)), y0); ctx.lineTo(crisp(X(lt)), y1); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(236,228,214,0.28)';
  ctx.beginPath();
  ctx.moveTo(crisp(x0), y0); ctx.lineTo(crisp(x0), crisp(y1)); ctx.lineTo(x1, crisp(y1));
  ctx.stroke();
  ctx.beginPath();
  for (var dec = 0; dec < 5; dec++) {
    for (var m = 1; m <= 9; m++) {
      var tx = crisp(X(dec + Math.log10(m)));
      var len = m === 1 ? 6 : 3;
      ctx.moveTo(tx, crisp(y1)); ctx.lineTo(tx, crisp(y1) + len);
    }
  }
  ctx.moveTo(crisp(X(5)), crisp(y1)); ctx.lineTo(crisp(X(5)), crisp(y1) + 6);
  for (var T2 = Tmin; T2 <= Tmax; T2 += 100) {
    ctx.moveTo(crisp(x0), crisp(Y(T2))); ctx.lineTo(crisp(x0) - (T2 % 200 ? 3 : 6), crisp(Y(T2)));
  }
  ctx.stroke();

  ctx.font = '10.5px ' + MONO;
  ctx.fillStyle = IRON;
  ctx.textAlign = 'center';
  var tl = ['1 s', '10 s', '100 s', '17 min', '2.8 h', '28 h'];
  for (var lt2 = 0; lt2 <= 5; lt2++) {
    ctx.textAlign = lt2 === 0 ? 'left' : lt2 === 5 ? 'right' : 'center';
    ctx.fillText(tl[lt2], X(lt2) + (lt2 === 0 ? -2 : 0), y1 + 20);
  }
  ctx.textAlign = 'right';
  for (var T3 = Tmin; T3 <= Tmax; T3 += 200) ctx.fillText(T3 + ' °C', x0 - 11, Y(T3) + 3.5);

  ctx.font = '600 9.5px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
  ctx.fillStyle = IRON;
  ctx.textAlign = 'right';
  ctx.fillText('TIME SINCE START OF FIRING, LOG', x1, y1 + 36);
  ctx.textAlign = 'left';
  ctx.fillText('TEMPERATURE', 0, y0 - 12);

  /* TTT curves */
  var vs = pred.ranked.filter(function (r) { return r.curve && r.curve.length && r.phase.kind !== 'metal'; }).slice(0, 4);
  var colors = [AMBER, IRON, IRON, IRON];
  vs.slice().reverse().forEach(function (r, i) {
    var idx = vs.length - 1 - i;
    var pts = r.curve.filter(function (p) { return p.T <= Tmax; });
    if (pts.length < 2) return;
    ctx.beginPath();
    pts.forEach(function (p, k) {
      var px = X(Math.min(tMax, p.logt)), py = Y(p.T);
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = colors[idx % colors.length];
    ctx.globalAlpha = idx === 0 ? 1 : 0.85 - idx * 0.18;
    ctx.lineWidth = idx === 0 ? 1.75 : 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  /* kiln path: temperature against time */
  var sched = pred.sched;
  ctx.beginPath();
  var started = false;
  for (var t = 0; t <= sched.total; t += Math.max(20, sched.total / 400)) {
    var temp = sched.T(t);
    if (temp < Tmin || temp > Tmax) continue;
    var px2 = X(Math.min(tMax, Math.log10(t + 1))), py2 = Y(temp);
    if (!started) { ctx.moveTo(px2, py2); started = true; } else ctx.lineTo(px2, py2);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.25;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  /* labels: the top phase named at the nose of its curve */
  if (vs.length) {
    var pts0 = vs[0].curve.filter(function (p) { return p.T <= Tmax && p.T >= Tmin; });
    var nose = pts0.reduce(function (a, p) { return !a || p.logt < a.logt ? p : a; }, null);
    var lab = vs[0].phase.name;
    ctx.font = 'italic 14px "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
    var lw = ctx.measureText(lab).width;
    var nx = nose ? X(Math.min(tMax, nose.logt)) : x0 + 10;
    var ny = nose ? Y(nose.T) : y0 + 14;
    ctx.fillStyle = AMBER;
    if (nose) { ctx.beginPath(); ctx.arc(nx, ny, 2.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = INK;
    if (nx - lw - 12 > x0) { ctx.textAlign = 'right'; ctx.fillText(lab, nx - 10, ny + 4); }
    else { ctx.textAlign = 'left'; ctx.fillText(lab, Math.min(nx + 10, x1 - lw), ny - 10); }
  }
  ctx.textAlign = 'right';
  ctx.font = '10.5px ' + MONO;
  ctx.fillStyle = IRON;
  ctx.fillText('→ right of a curve: crystallises', x1 - 4, y0 + 12);
  ctx.textAlign = 'left';
}

GC.render = { surface: surface, surfaceAt: surfaceAt, ttt: ttt, fbm: fbm };

})(typeof globalThis !== 'undefined' ? globalThis : this);
