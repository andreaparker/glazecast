/* GLAZECAST engine.
 *
 * chain:  recipe -> oxide moles -> unity formula
 *         atmosphere -> redox speciation (which oxidation states exist)
 *         speciation + melt structure -> candidate phases + liquidus depression
 *         kiln schedule -> time-temperature path -> TTT intersection -> volume fraction
 *         crystals + dopants -> optics -> appearance
 *
 * Calibration: the thermodynamic skeleton (which oxides, which structures,
 * which redox couples, liquidus depression, driving force) is standard.
 * The absolute kinetic constants are calibrated against known glaze outcomes.
 * Real nucleation rates in a glaze depend on the body, the interface and the
 * kiln, and no desktop model resolves those. Times are good to +/- half a
 * decade; the rankings are the output to rely on.
 */
(function (root) {
'use strict';
var GC = root.GC = root.GC || {};
var U = GC.util;
var R_GAS = 8.314462;

/* oxide thermal expansion contributions, x1e-7 /C (additive, Appen-type) */
var ALPHA = {
  SiO2: 5, Al2O3: 55, B2O3: 5, P2O5: 50, Na2O: 395, K2O: 465, Li2O: 270,
  CaO: 130, MgO: 60, BaO: 200, SrO: 180, ZnO: 70, PbO: 130, Bi2O3: 150,
  Fe2O3: 110, FeO: 120, TiO2: 80, ZrO2: 25, SnO2: 40, MnO: 100, CuO: 90,
  CoO: 90, NiO: 90, Cr2O3: 70, V2O5: 120, Sb2O3: 120, CeO2: 60,
  Pr6O11: 90, Nd2O3: 90, Er2O3: 80
};

/* ------------------------------------------------------------------ *
 * Saturation thresholds, in unity-formula units of the key oxide.
 * These are the compositions at which the phase actually starts to appear
 * in real glazes; they stand in for the activity coefficients that a full
 * thermodynamic database would supply.
 * ------------------------------------------------------------------ */
var CRIT = {
  willemite:    { ZnO: 0.35 },
  zincite:      { ZnO: 0.60 },
  gahnite:      { ZnO: 0.30, Al2O3: 0.25 },
  hematite:     { Fe2O3: 0.10 },
  magnetite:    { FeO: 0.06, Fe2O3: 0.06 },
  zincferrite:  { ZnO: 0.20, Fe2O3: 0.10 },
  rutile:       { TiO2: 0.08 },
  anatase:      { TiO2: 0.08 },
  cassiterite:  { SnO2: 0.10 },
  zircon:       { ZrO2: 0.12 },
  baddeleyite:  { ZrO2: 0.30 },
  corundum:     { Al2O3: 0.90 },
  mullite:      { Al2O3: 0.70 },
  anorthite:    { CaO: 0.55, Al2O3: 0.35 },
  diopside:     { CaO: 0.45, MgO: 0.30 },
  wollastonite: { CaO: 0.65 },
  celsian:      { BaO: 0.20 },
  leucite:      { K2O: 0.35 },
  nepheline:    { Na2O: 0.50 },
  spodumene:    { Li2O: 0.10 },
  lidisilicate: { Li2O: 0.12 },
  quartz:       { SiO2: 5.0 },
  cristobalite: { SiO2: 4.5 },
  apatite:      { P2O5: 0.08, CaO: 0.30 },
  cuprite:      { CuO: 0.015 },
  tenorite:     { CuO: 0.012 },
  copper:       { CuO: 0.004 },
  silver:       { Ag2O: 0.002 },
  bismuth:      { Bi2O3: 0.004 },
  bismuthoxide: { Bi2O3: 0.15 },
  eulytite:     { Bi2O3: 0.08, SiO2: 0.50 },
  sillenite:    { Bi2O3: 0.20 },
  thenardite:   { CoO: 0.005, Al2O3: 0.20 },
  chromite:     { FeO: 0.05, Cr2O3: 0.010 },
  spinel:       { MgO: 0.40, Al2O3: 0.60 },
  hausmannite:  { MnO: 0.05 },
  cerianite:    { CeO2: 0.05 }
};

var KD = 430;            /* K of liquidus depression per e-fold of undersaturation */
var SAT_FLOOR = 0.62;    /* below this saturation ratio the phase cannot exist     */

var emptyMap = function () { return Object.create(null); };

/* ------------------------------------------------------------------ *
 * 1. composition
 * ------------------------------------------------------------------ */
function compose(recipe) {
  var moles = emptyMap(), mass = emptyMap(), totalMass = 0, loi = 0, used = [];

  recipe.forEach(function (line) {
    var mat = GC.MATERIAL_BY_ID[line.id];
    if (!mat || !(line.wt > 0)) return;
    used.push({ id: line.id, name: mat.name, wt: line.wt });
    totalMass += line.wt;
    loi += line.wt * (mat.loi || 0) / 100;
    mat.analysis.forEach(function (pair) {
      var ox = GC.OXIDES[pair[0]];
      if (!ox) return;
      var m = line.wt * pair[1] / 100;
      mass[pair[0]] = (mass[pair[0]] || 0) + m;
      moles[pair[0]] = (moles[pair[0]] || 0) + m / ox.mr;
    });
  });

  var totalMoles = 0, oxygens = 0, tetra = 0, lamNum = 0, lamDen = 0, fluxBasis = 0;
  Object.keys(moles).forEach(function (k) {
    var n = moles[k], ox = GC.OXIDES[k];
    totalMoles += n;
    oxygens += n * ox.O;
    tetra += n * ox.T;
    lamNum += n * ox.O * ox.lambda;
    lamDen += n * ox.O;
    if (ox.role === 'flux') fluxBasis += n;
  });
  if (fluxBasis <= 0) fluxBasis = totalMoles || 1;

  var unity = emptyMap();
  Object.keys(moles).forEach(function (k) { unity[k] = moles[k] / fluxBasis; });

  var nboT = tetra > 0 ? (oxygens / tetra) - 2 : 0;
  var basicity = lamDen > 0 ? lamNum / lamDen : 0.6;

  var r2o = (moles.Na2O || 0) + (moles.K2O || 0) + (moles.Li2O || 0);
  var ro = (moles.CaO || 0) + (moles.MgO || 0) + (moles.BaO || 0) + (moles.SrO || 0) +
           (moles.ZnO || 0) + (moles.PbO || 0) + (moles.Bi2O3 || 0) + (moles.FeO || 0) +
           (moles.MnO || 0) + (moles.CuO || 0) + (moles.CoO || 0) + (moles.NiO || 0);

  var cte = 0, cteDen = 0;
  Object.keys(moles).forEach(function (k) {
    var a = ALPHA[k];
    if (a === undefined) return;
    cte += moles[k] * a; cteDen += moles[k];
  });
  cte = cteDen > 0 ? cte / cteDen : 50;

  return {
    recipe: recipe, used: used,
    totalMass: totalMass || 1, loi: loi,
    moles: moles, mass: mass, unity: unity,
    totalMoles: totalMoles, fluxBasis: fluxBasis,
    nboT: nboT, basicity: basicity,
    r2o: r2o / fluxBasis, ro: ro / fluxBasis,
    siAl: (moles.SiO2 || 0) / Math.max(moles.Al2O3 || 1e-9, 1e-9),
    b2o3: unity.B2O3 || 0, cte: cte
  };
}

/* ------------------------------------------------------------------ *
 * 2. firing schedule -> T(t)
 * ------------------------------------------------------------------ */
function buildSchedule(firing) {
  var amb = 25;
  var tauMin = { fast: 25, normal: 75, slow: 200, vslow: 420 }[firing.cooling] || 75;
  var tau = tauMin * 60;
  var holdC = firing.holdC;
  var holdS = (firing.holdMin || 0) * 60;
  var soakS = (firing.soakMin || 0) * 60;
  var segs = [];
  var peak = firing.peakC;
  var t = 0;

  if (soakS > 0) { segs.push({ t0: 0, t1: soakS, T: peak, kind: 'hold' }); t = soakS; }

  if (holdC && holdC < peak) {
    var dur = tau * Math.log((peak - amb) / Math.max(holdC - amb, 1));
    segs.push({ t0: t, t1: t + dur, T0: peak, tau: tau, kind: 'cool' });
    t += dur;
    if (holdS > 0) { segs.push({ t0: t, t1: t + holdS, T: holdC, kind: 'hold' }); t += holdS; }
    peak = holdC;
  }
  segs.push({ t0: t, t1: t + tau * 6, T0: peak, tau: tau, kind: 'cool' });

  function T(ts) {
    if (ts <= 0) return firing.peakC;
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      if (ts <= s.t1) return s.kind === 'hold' ? s.T : amb + (s.T0 - amb) * Math.exp(-(ts - s.t0) / s.tau);
    }
    return amb;
  }
  var total = t + tau * 6;

  var bins = new Float64Array(220);
  var dt = 10;
  for (var s2 = 0; s2 < total; s2 += dt) {
    var i2 = Math.floor((T(s2) - 300) / 10);
    if (i2 >= 0 && i2 < bins.length) bins[i2] += dt;
  }

  return {
    T: T, total: total, bins: bins, peak: firing.peakC, holdC: holdC, holdS: holdS,
    tau: tau, hasHold: holdS > 0,
    coolingRate: { fast: 300, normal: 110, slow: 55, vslow: 28 }[firing.cooling] || 110
  };
}

/* ------------------------------------------------------------------ *
 * 3. redox speciation
 * ------------------------------------------------------------------ */
var REDOX_FLOOR = { Ag: 0.85, Au: 0.85, Sb: 0.06, Cr: 0.82, Mn: 0.15, Ti: 0.02 };

function speciate(comp, firing) {
  var R = GC.ATMOSPHERES.filter(function (a) { return a.id === firing.atmosphere; })[0];
  var strength = R ? R.strength : 0;
  var sic = comp.mass.SiC || 0;
  if (sic > 0) strength += 0.22 * Math.min(1, sic / 2);
  strength = U.clamp(strength, 0, 1.05);

  var out = { strength: strength, species: {}, elements: [] };
  GC.REDOX.forEach(function (r) {
    var amt = 0;
    Object.keys(comp.moles).forEach(function (k) {
      GC.OXIDES[k].cat.forEach(function (c) { if (c.el === r.el) amt += comp.moles[k] * c.n; });
    });
    if (amt <= 1e-9) return;
    var floor = REDOX_FLOOR[r.el] || 0;
    var reduced = floor + (1 - floor) / (1 + Math.exp(-(strength - (1 - r.ease)) / 0.115));
    out.species[r.ox] = reduced;
    out.species[r.oxidised] = 1 - reduced;
    out.elements.push({
      el: r.el, reducedFrac: reduced, species: r.ox, total: amt,
      label: r.label, ease: r.ease, threshold: 1 - r.ease, floor: floor
    });
  });
  out.R = strength;
  return out;
}

/* effective moles of each oxide after redox partitioning */
function pools(comp, spec) {
  var p = emptyMap();
  Object.keys(comp.moles).forEach(function (k) { p[k] = comp.moles[k]; });
  var fFe = spec.species['Fe2+'] || 0;
  var totalFe = 2 * (comp.moles.Fe2O3 || 0) + (comp.moles.FeO || 0);
  if (totalFe > 1e-12) {
    p.FeO = totalFe * fFe;
    p.Fe2O3 = totalFe * (1 - fFe) / 2;
  }
  return p;
}

/* ------------------------------------------------------------------ *
 * 4. candidate phases
 * ------------------------------------------------------------------ */
function candidates(comp, spec, sched) {
  var pool = pools(comp, spec);
  var volGlaze = comp.totalMass / 2.6;
  var out = [];

  GC.PHASES.forEach(function (p) {
    if (p.needs) {
      var f = spec.species[p.needs.species];
      if (f === undefined || f < p.needs.min) return;
    }
    var crit = CRIT[p.id];
    if (!crit) return;

    var sat = Infinity, limiting = null, capacity = Infinity;
    Object.keys(p.req).forEach(function (k) {
      var c = crit[k];
      if (c !== undefined) {
        var u = (pool[k] || 0) / comp.fluxBasis;
        sat = Math.min(sat, u / c);
      }
      var avail = (pool[k] || 0) / p.req[k];
      if (avail < capacity) { capacity = avail; limiting = k; }
    });
    if (!isFinite(sat)) sat = 10;
    if (sat < SAT_FLOOR || !isFinite(capacity) || capacity <= 1e-9) return;

    if (p.kind === 'metal') {
      var el = GC.OXIDES[Object.keys(p.req)[0]].cat[0].el;
      var entry = spec.elements.filter(function (e) { return e.el === el; })[0];
      if (!entry) return;
      capacity *= entry.reducedFrac;
    }

    var volFrac = capacity * p.Vm / Math.max(volGlaze, 1e-6);
    if (volFrac < 0.0004) return;

    /* liquidus of this phase in this melt */
    var TmEff = p.kind === 'metal'
      ? p.Tm
      : Math.min(p.Tm, p.Tm - KD * Math.log(1 + 1 / sat));

    out.push({
      phase: p, volFrac: Math.min(1, volFrac), capacity: capacity, sat: sat,
      TmEff: TmEff, undissolved: TmEff > sched.peak, limiting: limiting,
      nucleo: p.nucleo * (TmEff > sched.peak ? 1.8 : 1),
      pool: pool
    });
  });
  return out;
}

/* ------------------------------------------------------------------ *
 * 5. TTT + growth
 * ------------------------------------------------------------------ */
function kinetics(cand, comp, sched, firing) {
  var p = cand.phase;

  /* a metal is already a separate liquid at temperature: it just freezes */
  if (p.kind === 'metal') {
    var coolF = { fast: 0.45, normal: 0.75, slow: 1.0, vslow: 1.0 }[firing.cooling] || 0.75;
    var Xm = Math.min(1, Math.pow(cand.volFrac / 0.012, 0.6)) * coolF;
    var sm = U.clamp(0.75 * Math.pow(cand.volFrac / 0.01, 1 / 3) * (0.55 + 0.5 * coolF), 0.01, 3.5);
    /* the metal solidifies over the ~120 K straddling its freezing point */
    var rec = Math.max(10, Math.floor(sched.total / 360));
    var timeline = [];
    for (var s2 = 0; s2 <= sched.total; s2 += rec) {
      var temp = sched.T(s2);
      var frac = U.clamp((p.Tm + 60 - temp) / 120, 0, 1);
      timeline.push({ t: s2, T: temp, X: Xm * frac });
    }
    return {
      U: cand.volFrac / 0.012, X: Xm, Xeq: 1, metal: true,
      curve: [{ T: p.Tm + 40, logt: 12 }, { T: p.Tm + 1, logt: -0.4 }],
      best: { T: p.Tm, tn: 0, margin: 9, tRes: 0 }, sizeMm: sm,
      Q: 0, tBelow: 0, tBest: 0, Tbest: p.Tm, timeline: timeline
    };
  }

  var Q = 280000 + 120000 * U.clamp(1 - comp.nboT / 1.2, 0, 1);
  var tau0 = 8e-12;
  var surf = 1 + 4 * (p.surface || 0.3);
  var Tm = cand.TmEff;
  var seeded = cand.undissolved;

  /* Equilibrium crystallinity.
   * Only the fraction of the melt that is *supersaturated* can precipitate:
   * excess = 1 - 1/sat. A phase sitting at its threshold gets nothing; a phase
   * at three times its threshold precipitates most of its own oxide. This is
   * the lever rule doing the job an activity model would do. */
  /* effective arrest temperature: the melt keeps crystallising as it cools, but
     stops making progress once it is stiff (~800 C). Weight the hold and the
     cooling leg equally. */
  var Tend = Math.sqrt(((firing.holdC || 950) + 273) * 1123);
  var excess = U.clamp(1 - 1 / cand.sat, 0, 0.92);
  var thermal = U.clamp((Tm - Tend) / (Tm * 0.5), 0, 1);
  var Xeq = excess * (0.35 + 0.65 * thermal);

  function tNeeded(T) {
    var dT = Tm - T;
    if (dT <= 1) return Infinity;
    /* seeded phases have no nucleation barrier: their TTT is growth-limited and
       nearly straight. Unseeded phases get the full C-shaped curve. */
    var tnuc = seeded ? 0 : tau0 * Math.exp(Q / (R_GAS * T)) * Math.pow(Tm / dT, 1.5) / (cand.nucleo * surf);
    var DF = U.clamp(1 - Math.exp(-(p.dHf * dT) / (R_GAS * T * Tm)), 0, 1);
    var D = 1e-2 * Math.exp(-0.75 * Q / (R_GAS * T));
    var Ug = U.clamp(D / 1e-6 * DF, 1e-12, 5e-4);          // m/s
    return tnuc + 1e-5 / Ug;                                 // 10 um to become visible
  }

  var curve = [];
  for (var T = Math.min(Tm + 40, 1750); T >= 700; T -= 10) {
    var t = tNeeded(T);
    curve.push({ T: T, logt: !isFinite(t) ? 12 : U.clamp(Math.log10(t), -2, 12) });
  }

  var supply = Math.pow(U.clamp(cand.volFrac / 0.03, 0.04, 1), 0.5);
  var Uacc = 0, best = { margin: -99 }, tBelow = 0, dt = 10;
  var rec = Math.max(10, Math.floor(sched.total / 360));
  var timeline = [];
  var nextRec = 0;
  for (var s = 0; s < sched.total; s += dt) {
    var temp = sched.T(s);
    if (temp > Tm) continue;
    if (temp < 700) break;
    var tn = tNeeded(temp);
    if (!isFinite(tn)) continue;
    Uacc += dt / tn;
    tBelow += dt;
    if (s >= nextRec) {
      timeline.push({ t: s, T: temp, X: Xeq * (1 - Math.exp(-Uacc)) * supply });
      nextRec = s + rec;
    }
    var margin = Math.log10(dt) - Math.log10(tn);
    if (margin > best.margin) best = { margin: margin, T: temp, tn: tn, tRes: dt };
  }
  timeline.push({ t: sched.total, T: 25, X: Xeq * (1 - Math.exp(-Uacc)) * supply });

  var X = Xeq * (1 - Math.exp(-Uacc)) * supply;

  var Tb = best.T || Tm - 60;
  var dTb = Math.max(Tm - Tb, 5);
  var DFb = U.clamp(1 - Math.exp(-(p.dHf * dTb) / (R_GAS * Tb * Tm)), 0, 1);
  var Db = 1e-2 * Math.exp(-0.75 * Q / (R_GAS * Tb));
  var Ub = U.clamp(Db / 1e-6 * DFb, 0, 5e-4);
  var tGrow = Math.min(tBelow, sched.hasHold ? 7200 : 3600);
  var sizeMm = U.clamp(Ub * tGrow * 1000, 0.002, 3.5);

  return {
    U: Uacc, X: X, Xeq: Xeq, supply: supply, curve: curve, best: best,
    sizeMm: sizeMm, Q: Q, tBelow: tBelow, tBest: best.tn || Infinity,
    Tbest: best.T || null, seeded: seeded, timeline: timeline
  };
}

/* ------------------------------------------------------------------ *
 * 6. optics
 * ------------------------------------------------------------------ */
var STRENGTH = {
  CoO: 4.5, CuO: 9.0, Fe2O3: 0.42, FeO: 0.42, MnO: 2.6, Cr2O3: 9.0, NiO: 2.5,
  V2O5: 2.5, UO3: 1.5, Nd2O3: 1.6, Pr6O11: 1.6, Er2O3: 1.8, CeO2: 0.2,
  Ag2O: 4.0, Au2O3: 4.0, TiO2: 0.02, SnO2: 0.0, ZrO2: 0.0, Bi2O3: 0.02, CdO: 3.0
};

function speciesOf(el, spec) {
  var e = spec.elements.filter(function (x) { return x.el === el; })[0];
  if (!e) return null;
  var r = e.reducedFrac;
  var map = {
    Cu: [['Cu2+', 1 - r], ['Cu0', r * 0.62], ['Cu+', r * 0.38]],
    Fe: [['Fe3+', 1 - r], ['Fe2+', r]],
    Bi: [['Bi3+', 1 - r]],
    Mn: [['Mn3+', 1 - r], ['Mn2+', r]],
    Cr: [['Cr3+', 1 - r]],
    Ti: [['Ti4+', 1], ['Ti3+', r]],
    Ag: [['Ag0', r]],
    Ni: [['Ni2+', 1]], Co: [['Co2+', 1]],
    V: [['V5+', 1 - r], ['V4+', r]],
    U: [['U6+', 1 - r], ['U5+', r]],
    Nd: [['Nd3+', 1]], Pr: [['Pr3+', 1]], Er: [['Er3+', 1]], Cd: [['Cd2+', 1]]
  };
  return map[el] || null;
}

var TINT = {
  magnetite: '#191a1e', hematite: '#6a2b1d', cuprite: '#7d1b12', tenorite: '#16130f',
  chromite: '#16180f', hausmannite: '#2b1e13', zincferrite: '#2f2017',
  willemite: '#efebe2', zincite: '#f2efe8', rutile: '#e9dfc9', cassiterite: '#f3f0ea',
  zircon: '#f2f0ea', corundum: '#eeece6', anorthite: '#efece5', wollastonite: '#f0ede6',
  diopside: '#e9ece2', celsian: '#f0ede6', leucite: '#efece4', nepheline: '#efece4',
  spodumene: '#efece4', lidisilicate: '#efece4', quartz: '#f0eee8', cristobalite: '#f0eee8',
  apatite: '#f1eee7', mullite: '#efece4', gahnite: '#eeeae6', spinel: '#f0ece4',
  thenardite: '#1c2a6e', bismuthoxide: '#e6cf74', eulytite: '#efe2a8', sillenite: '#f0e6b0',
  cerianite: '#f0ead8', baddeleyite: '#f2f0ea', bismuth: '#c9c9cc', copper: '#b0553c',
  silver: '#dfe0e2'
};

var DARK = {
  magnetite: 1.7, hematite: 1.4, cuprite: 1.3, tenorite: 1.6, chromite: 1.6,
  hausmannite: 1.4, zincferrite: 1.3, thenardite: 1.2, bismuthoxide: 1.0
};
function tintWeight(id) {
  if (DARK[id]) return DARK[id];
  return 0.30;                      // transparent silicates mostly add haze, not hue
}
function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function mix(a, b, t) {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

function optics(comp, spec, ranked, firing) {
  var absorbers = [];
  var lost = {};

  ranked.forEach(function (r) {
    if (r.phase.kind === 'metal' && r.X > 0.08) {
      var el = GC.OXIDES[Object.keys(r.phase.req)[0]].cat[0].el;
      lost[el] = (lost[el] || 0) + Math.min(0.95, r.X);
    }
  });

  Object.keys(comp.mass).forEach(function (ox) {
    var o = GC.OXIDES[ox];
    if (!o) return;
    var wt = comp.mass[ox] / comp.totalMass * 100;
    if (wt < 0.004) return;
    var st = STRENGTH[ox];
    if (!st) return;
    o.cat.forEach(function (c) {
      var sp = speciesOf(c.el, spec);
      if (!sp) return;
      var keep = 1 - (lost[c.el] || 0);
      sp.forEach(function (pair) {
        if (pair[1] <= 0) return;
        absorbers.push({ species: pair[0], strength: wt * st * pair[1] * keep });
      });
    });
  });

  var scatters = [];
  ranked.forEach(function (r) {
    if (r.X <= 0.03 || r.volFrac <= 0.002 || r.phase.kind === 'metal') return;
    if (r.phase.n < 1.55) return;
    scatters.push({ r: Math.max(r.sizeMm * 1e-3 / 2, 2e-8), phi: Math.min(0.4, r.X * r.volFrac), n: r.phase.n });
  });

  var metalPhase = ranked.filter(function (r) {
    return r.phase.kind === 'metal' && r.visible && r.X > 0.12;
  })[0];

  var coolF = { fast: 0.25, normal: 0.55, slow: 0.85, vslow: 1.0 }[firing.cooling] || 0.55;
  var filmNm = 25 + 95 * coolF;

  var app;
  if (metalPhase) {
    var mt = metalPhase.phase.id === 'copper' ? 'Cu' : metalPhase.phase.id === 'silver' ? 'Ag' : 'Bi';
    app = GC.color.appearance({ metal: { type: mt, filmNm: filmNm, nFilm: 2.1 } });
    app.metalPhase = metalPhase;
    app.filmNm = filmNm;
  } else {
    app = GC.color.appearance({ absorbers: absorbers, scatters: scatters });
  }
  /* crystals on the surface contribute their own colour, not just haze */
  var hasChrome = (comp.mass.Cr2O3 || 0) > 0.0005;
  var coverage = 0;
  if (!metalPhase) {
    var wsum = 0, acc = [0, 0, 0];
    ranked.forEach(function (r) {
      if (!r.visible || r.X < 0.05 || r.volFrac < 0.002) return;
      var w = U.clamp(r.X * r.volFrac / 0.04 * tintWeight(r.phase.id), 0, 1.4);
      if (w <= 0.01) return;
      var hex = TINT[r.phase.id] || '#eeeae4';
      if (r.phase.id === 'cassiterite' && hasChrome && (spec.species['Cr3+'] || 0) > 0.3) { hex = '#d98ba8'; w = U.clamp(w * 9, 0.55, 0.88); }
      if (r.phase.id === 'rutile' && (spec.species['Fe2+'] || 0) > 0.3) { hex = '#6f7f97'; w = U.clamp(w * 5, 0.30, 0.80); }
      var c = hexToRgb(hex);
      acc[0] += c[0] * w; acc[1] += c[1] * w; acc[2] += c[2] * w;
      wsum += w;
    });
    if (wsum > 0.01) {
      var avg = [acc[0] / wsum, acc[1] / wsum, acc[2] / wsum];
      app.rgb = mix(app.rgb, avg, U.clamp(wsum, 0, 0.93));
      coverage = U.clamp(wsum, 0, 1);
    }
    app.rgb = app.rgb.map(function (v) { return U.clamp(v, 0, 255); });
  }
  app.coverage = U.clamp(coverage, 0, 1);
  app.matte = U.clamp(coverage * 0.9 + scatters.reduce(function (s2, x) { return s2 + x.phi * 2; }, 0), 0, 1);
  app.absorbers = absorbers;
  app.scatters = scatters;
  app.name = app.kind === 'metal'
    ? (metalPhase.phase.id === 'bismuth' ? 'iridescent bismuth' : 'metallic ' + metalPhase.phase.id)
    : GC.color.colourName(app.rgb);
  app.hex = GC.color.toHex(app.rgb);
  return app;
}

/* ------------------------------------------------------------------ *
 * 7. predict
 * ------------------------------------------------------------------ */
function predict(recipe, firing) {
  var comp = compose(recipe);
  var spec = speciate(comp, firing);
  var sched = buildSchedule(firing);
  var cands = candidates(comp, spec, sched);
  var volGlaze = comp.totalMass / 2.6;

  var ranked = cands.map(function (c) {
    var k = kinetics(c, comp, sched, firing);
    return {
      phase: c.phase, X: k.X, Xeq: k.Xeq, U: k.U, volFrac: c.volFrac, TmEff: c.TmEff,
      sat: c.sat, undissolved: c.undissolved, sizeMm: k.sizeMm, curve: k.curve,
      best: k.best, supply: k.supply, Q: k.Q, limiting: c.limiting, tBelow: k.tBelow,
      tBest: k.tBest, Tbest: k.Tbest, timeline: k.timeline || null,
      capacity: c.capacity, req: c.phase.req, seeded: !!k.seeded
    };
  }).filter(function (r) { return r.X > 0.02; })
    .sort(function (a, b) { return b.X - a.X; });

  /* sequential depletion: earlier phases eat the shared oxides */
  var pool = pools(comp, spec);
  ranked.forEach(function (r) {
    var cap = Infinity;
    Object.keys(r.req).forEach(function (k) {
      var a = (pool[k] || 0) / r.req[k];
      if (a < cap) cap = a;
    });
    var frac = r.capacity > 0 ? Math.min(1, cap / r.capacity) : 0;
    r.X *= frac;
    r.volFrac *= frac;
    Object.keys(r.req).forEach(function (k) {
      pool[k] = Math.max(0, (pool[k] || 0) - cap * r.req[k]);
    });
    r.visible = r.phase.kind !== 'metal' || r.volFrac >= 0.005;
  });
  ranked = ranked.filter(function (r) { return r.X > 0.02; })
    .sort(function (a, b) { return b.X - a.X; });

  var app = optics(comp, spec, ranked, firing);

  var warnings = [];
  var dCte = comp.cte - 62;
  if (dCte > 38) warnings.push({ level: 'high', text: 'Expansion is ~' + Math.round(comp.cte) + 'e-7/C against a stoneware body (~62). The glaze will sit in tension: crazing is likely.' });
  else if (dCte < -18) warnings.push({ level: 'med', text: 'Glaze expansion well below the body: shivering / dunting risk on rims.' });
  if ((comp.unity.Bi2O3 || 0) > 0.05) warnings.push({ level: 'info', text: 'Bi2O3 at ' + comp.unity.Bi2O3.toFixed(2) + ' unity is a heavy-metal flux with the same lone-pair chemistry as PbO. Far lower oral toxicity than lead, but a metallic bismuth surface is still not a food surface.' });
  if ((comp.unity.PbO || 0) > 0.02) warnings.push({ level: 'high', text: 'Lead in the formula. No food contact without a leach test.' });
  if (app.kind === 'metal') warnings.push({ level: 'med', text: 'A metallic bismuth / copper / silver surface oxidises and is not dishwasher- or food-safe.' });
  if (comp.nboT > 1.0) warnings.push({ level: 'med', text: 'Very depolymerised melt (NBO/T ' + comp.nboT.toFixed(2) + '): expect running and possible crawling.' });
  var vis = ranked.filter(function (r) { return r.visible; });
  if (vis.length && vis[0].phase.id === 'cristobalite') warnings.push({ level: 'med', text: 'Cristobalite has a big thermal expansion mismatch with the body; a thick cristobalite skin is a classic cause of late crazing.' });

  var verdict = buildVerdict(ranked, app, comp, spec);

  return {
    comp: comp, spec: spec, sched: sched, ranked: ranked, optics: app,
    warnings: warnings, verdict: verdict, firing: firing
  };
}

function buildVerdict(ranked, app, comp, spec) {
  var vis = ranked.filter(function (r) { return r.visible; });
  if (!vis.length || vis[0].X < 0.08) {
    var sat = app.absorbers.reduce(function (m, a) { return Math.max(m, a.strength); }, 0);
    var chrom = app.absorbers.length ? app.absorbers[0].species.replace(/[0-9+].*$/, '') : '';
    return {
      headline: sat > 0.35 ? 'Glassy ' + app.name + ' — no crystal wins' : 'Glassy. No crystal wins.',
      detail: 'No phase reaches its liquidus and then actually nucleates in the time available, so the surface freezes as a supercooled glass. The look is set by the dissolved ' +
        (chrom ? chrom : 'colourants') + ', not by crystals.',
      kind: 'glass'
    };
  }
  var d = vis[0], p = d.phase;
  var metal = p.kind === 'metal';
  return {
    headline: (metal ? 'Metallic ' + (p.id === 'bismuth' ? 'bismuth' : p.id) : p.name) +
      ' — ' + p.system + ' ' + (metal ? 'hopper' : p.shape) + ' habit',
    detail: p.note,
    kind: metal ? 'metal' : 'crystal',
    phase: p,
    amount: d.X,
    secondary: vis.slice(1, 3).map(function (r) { return { name: r.phase.name, X: r.X }; })
  };
}

/* ------------------------------------------------------------------ *
 * 8. "what would change it"
 * ------------------------------------------------------------------ */
function explore(recipe, firing) {
  var base = predict(recipe, firing);
  var vis = base.ranked.filter(function (r) { return r.visible; });
  var baseTop = vis.length ? vis[0].phase.id : 'glass';
  var baseX = vis.length ? vis[0].X : 0;
  var out = [];

  function run(label, fir) {
    var r = predict(recipe, fir);
    var v = r.ranked.filter(function (x) { return x.visible; });
    var top = v[0];
    out.push({
      label: label,
      top: top ? top.phase.id : 'glass',
      topName: top ? top.phase.name : 'glass',
      X: top ? top.X : 0,
      changed: (top ? top.phase.id : 'glass') !== baseTop,
      delta: (top ? top.X : 0) - baseX,
      headline: r.verdict.headline
    });
  }

  run(firing.atmosphere === 'ox' ? 'Fire in reduction' : 'Fire in oxidation',
    Object.assign({}, firing, { atmosphere: firing.atmosphere === 'ox' ? 'red' : 'ox' }));
  run('Cool one step slower', Object.assign({}, firing, {
    cooling: firing.cooling === 'fast' ? 'normal' : firing.cooling === 'normal' ? 'slow' : 'vslow'
  }));
  run('+45 min soak at ' + Math.round(firing.holdC || firing.peakC) + ' C',
    Object.assign({}, firing, { holdMin: (firing.holdMin || 0) + 45 }));
  run('+1 cone peak', Object.assign({}, firing, { peakC: firing.peakC + 25 }));

  return { base: base, variants: out };
}

GC.engine = {
  compose: compose, speciate: speciate, pools: pools, buildSchedule: buildSchedule,
  candidates: candidates, kinetics: kinetics, optics: optics,
  predict: predict, explore: explore, CRIT: CRIT, KD: KD, TINT: TINT, DARK: DARK
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
