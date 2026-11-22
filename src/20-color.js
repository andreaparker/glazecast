/* GLAZECAST — optics: ligand-field absorption, Mie-lite scattering,
 * thin-film interference, and CIE colour.  Real colour science, not a palette.
 */
(function (root) {
'use strict';
var GC = root.GC = root.GC || {};

/* ---------------- CIE 1931 colour matching (Wyman/Sloan/Shirley fit) ------- */
function g(x, mu, s1, s2) {
  var t = (x - mu) * (x < mu ? 1 / s1 : 1 / s2);
  return Math.exp(-0.5 * t * t);
}
function cmf(lam) {
  var x = 1.056 * g(lam, 599.8, 37.9, 31.0) + 0.362 * g(lam, 442.0, 16.0, 26.7) - 0.065 * g(lam, 501.1, 20.4, 26.2);
  var y = 0.821 * g(lam, 568.8, 46.9, 40.5) + 0.286 * g(lam, 530.9, 16.3, 31.1);
  var z = 1.217 * g(lam, 437.0, 11.8, 36.0) + 0.681 * g(lam, 459.0, 26.0, 13.8);
  return [x, y, z];
}

/* ---------------- spectrum -> sRGB ---------------------------------------- */
function linRGB(X, Y, Z) {
  return [
    3.2406 * X - 1.5372 * Y - 0.4986 * Z,
    -0.9689 * X + 1.8758 * Y + 0.0415 * Z,
    0.0557 * X - 0.2040 * Y + 1.0570 * Z
  ];
}
function encode(v) {
  v = Math.max(0, v);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}
function srgbFromXYZ(X, Y, Z, white) {
  var lin = linRGB(X, Y, Z);
  var w = white || linRGB(0.95047, 1.0, 1.08883);
  return [encode(lin[0] / w[0]), encode(lin[1] / w[1]), encode(lin[2] / w[2])]
    .map(function (v) { return Math.round(GC.util.clamp(v, 0, 1) * 255); });
}

function integrate(fn, lo, hi) {
  var X = 0, Y = 0, Z = 0, norm = 0;
  for (var lam = lo; lam <= hi; lam += 2) {
    var v = fn(lam);
    if (!isFinite(v)) v = 0;
    var c = cmf(lam);
    X += v * c[0]; Y += v * c[1]; Z += v * c[2];
    norm += c[1];
  }
  return [X / norm, Y / norm, Z / norm];
}

var WHITE_LIN = null;
function spectrumToRGB(fn) {
  if (!WHITE_LIN) WHITE_LIN = linRGB.apply(null, integrate(function () { return 1; }, 380, 730));
  var xyz = integrate(fn, 380, 730);
  return srgbFromXYZ(xyz[0], xyz[1], xyz[2], WHITE_LIN);
}

/* ---------------- absorption bands --------------------------------------- */
var BANDS = {
  'Co2+':   [{ l: 590, w: 50, s: 1.00 }, { l: 625, w: 65, s: 0.55 }, { l: 480, w: 60, s: 0.30 }],
  'Co2+oc': [{ l: 510, w: 70, s: 0.55 }, { l: 590, w: 60, s: 0.22 }],
  'Cu2+':   [{ l: 830, w: 170, s: 1.00 }, { l: 460, w: 70, s: 0.15 }],
  'Cu+':    [],
  'Cu0':    [{ l: 545, w: 105, s: 1.00 }, { l: 460, w: 80, s: 0.90 }],
  'Fe3+':   [{ l: 420, w: 70, s: 1.00 }, { l: 500, w: 100, s: 0.30 }, { l: 860, w: 120, s: 0.15 }],
  'Fe2+':   [{ l: 1050, w: 200, s: 1.00 }, { l: 640, w: 140, s: 0.25 }],
  'Mn3+':   [{ l: 505, w: 85, s: 1.00 }],
  'Mn2+':   [{ l: 545, w: 45, s: 0.15 }],
  'Cr3+':   [{ l: 455, w: 55, s: 0.70 }, { l: 600, w: 65, s: 0.85 }],
  'Cr6+':   [{ l: 372, w: 46, s: 1.00 }],
  'Ni2+':   [{ l: 420, w: 60, s: 0.70 }, { l: 660, w: 100, s: 0.60 }, { l: 1100, w: 160, s: 0.50 }],
  'V5+':    [{ l: 382, w: 62, s: 1.00 }],
  'V4+':    [{ l: 610, w: 130, s: 0.35 }],
  'U6+':    [{ l: 425, w: 72, s: 1.00 }],
  'U5+':    [{ l: 620, w: 120, s: 0.30 }],
  'Ti4+':   [],
  'Ti3+':   [{ l: 580, w: 180, s: 0.55 }],
  'Nd3+':   [{ l: 582, w: 26, s: 1.00 }, { l: 525, w: 22, s: 0.60 }, { l: 745, w: 30, s: 0.40 }],
  'Pr3+':   [{ l: 445, w: 26, s: 0.80 }],
  'Er3+':   [{ l: 522, w: 28, s: 1.00 }],
  'Ce4+':   [{ l: 335, w: 55, s: 0.30 }],
  'Ag0':    [{ l: 412, w: 52, s: 1.00 }],
  'Au0':    [{ l: 532, w: 62, s: 1.00 }],
  'Cd2+':   [{ l: 400, w: 40, s: 1.00 }],
  'Sb3+':   [],
  'Sn4+':   []
};

function absorptionAt(lam, absorbers) {
  var A = 0;
  for (var i = 0; i < absorbers.length; i++) {
    var a = absorbers[i];               // {species, strength}
    var bands = BANDS[a.species];
    if (!bands || !bands.length) continue;
    var s = 0;
    for (var j = 0; j < bands.length; j++) {
      var t = (lam - bands[j].l) / bands[j].w;
      s += bands[j].s * Math.exp(-t * t);
    }
    A += a.strength * s;
  }
  return A;
}

/* ---------------- scattering (van de Hulst anomalous diffraction) --------- */
function scatterQ(r, lam, m) {
  var x = 2 * Math.PI * r / (lam * 1e-9) * 1.5;   // size parameter in the medium
  if (x > 1e4) return 2;
  var p = 2 * x * (m - 1);
  if (Math.abs(p) < 1e-4) return 4 * x * x * x * (m - 1) * (m - 1) / 3;
  return 2 - (4 / p) * Math.sin(p) + (4 / (p * p)) * (1 - Math.cos(p));
}

/* scattering coefficient per wavelength (1/m) */
function scatterMu(lam, scatters, phiScale) {
  var mu = 0;
  for (var i = 0; i < scatters.length; i++) {
    var s = scatters[i];                       // {r (m), phi, n}
    if (s.phi <= 1e-6) continue;
    var q = scatterQ(s.r, lam, s.n / 1.52);
    mu += 3 * s.phi * q / (4 * s.r);
  }
  return mu * (phiScale || 1);
}

/* ---------------- thin film on a metal ----------------------------------- */
function cmul(ar, ai, br, bi) { return [ar * br - ai * bi, ar * bi + ai * br]; }
function cdiv(ar, ai, br, bi) {
  var d = br * br + bi * bi;
  return [(ar * br + ai * bi) / d, (ai * br - ar * bi) / d];
}

/* reflectance of air / film(n1) / substrate(n2,k2) at normal incidence */
function filmReflectance(lamNm, dNm, n1, n2, k2) {
  var r01r = (1 - n1) / (1 + n1), r01i = 0;
  var den = (n1 + n2) * (n1 + n2) + k2 * k2;
  var r12r = (n1 * n1 - n2 * n2 - k2 * k2) / den;
  var r12i = (2 * n1 * k2) / den;
  var beta = 2 * Math.PI * n1 * dNm / lamNm;
  var er = Math.cos(2 * beta), ei = -Math.sin(2 * beta);
  var tr = r12r * er - r12i * ei, ti = r12r * ei + r12i * er;
  var nr = r01r + tr, ni = r01i + ti;
  var dr = 1 + (r01r * tr - r01i * ti), di = (r01r * ti + r01i * tr);
  var r = cdiv(nr, ni, dr, di);
  return r[0] * r[0] + r[1] * r[1];
}

var METAL_N = {
  Bi: { n: 1.90, k: 3.00, base: 0.55 },
  Cu: { n: 0.95, k: 2.60, base: 0.60 },
  Ag: { n: 0.15, k: 3.60, base: 0.92 },
  Au: { n: 0.35, k: 2.80, base: 0.80 }
};

function iridescentPalette(metal, nFilm) {
  var m = METAL_N[metal] || METAL_N.Bi;
  var out = [];
  for (var d = 0; d <= 340; d += 10) {
    var rgb = spectrumToRGB(function (lam) {
      var R = filmReflectance(lam, d, nFilm, m.n, m.k);
      return m.base * 0.45 + 0.55 * R;    // metal body + interference
    });
    out.push({ d: d, rgb: rgb });
  }
  return out;
}

/* ---------------- the appearance call ------------------------------------ */
/* opts: { absorbers:[{species,strength}], scatters:[{r,phi,n}], metal:{type,filmNm,colour}, body }
 */
function appearance(opts) {
  var abs = opts.absorbers || [];
  var sc = opts.scatters || [];
  var metal = opts.metal || null;
  var body = opts.body === undefined ? 0.88 : opts.body;

  if (metal) {
    var mn = METAL_N[metal.type] || METAL_N.Bi;
    var film = metal.filmNm || 0;
    var rgbM = spectrumToRGB(function (lam) {
      var R = film > 0 ? filmReflectance(lam, film, metal.nFilm || 2.1, mn.n, mn.k) : 0;
      var base = 0.30 + 0.78 * Math.min(1, R);
      return Math.min(1, base) * (0.72 + 0.35 * mn.base) + 0.05;
    });
    return { rgb: rgbM, kind: 'metal', opacity: 1, note: 'metallic' };
  }

  var rgb = spectrumToRGB(function (lam) {
    var A = absorptionAt(lam, abs);
    var T = Math.exp(-A);
    var mu = scatterMu(lam, sc);
    var L = 0.00035;                      // 0.35 mm glaze, two passes
    var transmitted = T * T * Math.exp(-mu * L);
    var veil = 1 - Math.exp(-mu * L);
    var v = 0.018 + 0.982 * (body * transmitted * (1 - veil) + 0.92 * veil);
    return v;
  });

  var mu550 = scatterMu(550, sc) * 0.00035;
  var opacity = GC.util.clamp(1 - Math.exp(-mu550), 0, 1);
  return { rgb: rgb, kind: 'glass', opacity: opacity, note: '' };
}

function toHex(rgb) {
  return '#' + rgb.map(function (v) {
    var h = Math.round(GC.util.clamp(v, 0, 255)).toString(16);
    return h.length < 2 ? '0' + h : h;
  }).join('');
}

function toCss(rgb, a) {
  return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (a === undefined ? 1 : a) + ')';
}

/* perceived colour name, for the verdict line */
function colourName(rgb) {
  var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
  var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  var v = mx, s = mx === 0 ? 0 : (mx - mn) / mx;
  var h = 0;
  var d = mx - mn;
  if (d > 1e-4) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  if (v < 0.12) return 'near-black';
  if (s < 0.10) return v > 0.75 ? 'white' : v > 0.42 ? 'grey' : 'charcoal';
  if (s < 0.22) return v > 0.7 ? 'off-white' : 'smoke';
  var names = [
    [15, 'crimson'], [40, 'orange-red'], [55, 'amber'], [70, 'yellow-ochre'],
    [90, 'chartreuse'], [140, 'green'], [170, 'teal'], [200, 'sky blue'],
    [225, 'cobalt blue'], [255, 'indigo'], [285, 'violet'], [320, 'magenta'],
    [345, 'rose'], [361, 'crimson']
  ];
  for (var i = 0; i < names.length; i++) {
    if (h < names[i][0]) {
      var base = names[i][1];
      if (v < 0.32) return 'deep ' + base;
      if (v > 0.82 && s < 0.5) return 'pale ' + base;
      return base;
    }
  }
  return 'crimson';
}

GC.color = {
  cmf: cmf,
  spectrumToRGB: spectrumToRGB,
  srgbFromXYZ: srgbFromXYZ,
  absorptionAt: absorptionAt,
  scatterQ: scatterQ,
  scatterMu: scatterMu,
  filmReflectance: filmReflectance,
  iridescentPalette: iridescentPalette,
  appearance: appearance,
  toHex: toHex,
  toCss: toCss,
  colourName: colourName,
  BANDS: BANDS,
  METAL_N: METAL_N
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
