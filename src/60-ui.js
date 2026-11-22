/* GLAZECAST — interface */
(function (root) {
'use strict';
var GC = root.GC;
var $ = function (id) { return document.getElementById(id); };
var util = GC.util;

var state = { presetId: 'bi-red', recipe: null, firing: null, tab: 'crystals', explore: null,
              playFrac: 1, playing: false };
var STRUCTURED = {hematite:1,willemite:1,cassiterite:1,zircon:1,corundum:1,magnetite:1,spinel:1,cuprite:1,rutile:1,quartz:1,bismuth:1,anorthite:1,diopside:1,zincite:1,leucite:1,wollastonite:1,baddeleyite:1,chromite:1};
var lastKey = '';

/* ---------------- formatting --------------------------------------------- */
function pct(x) { return Math.round(x * 100) + '%'; }
function pcv(x) { return (x * 100).toFixed(1) + ' vol%'; }
function mm(x) { return x < 0.05 ? Math.round(x * 1000) + ' µm' : x.toFixed(x < 1 ? 2 : 1) + ' mm'; }
function temp(x) { return Math.round(x) + ' °C'; }
function dur(s) {
  if (!isFinite(s)) return 'never';
  if (s < 90) return Math.round(s) + ' s';
  if (s < 5400) return Math.round(s / 60) + ' min';
  return (s / 3600).toFixed(1) + ' h';
}
function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
/* set the unit after a number in a lighter weight: "1100 °C" -> 1100<small> °C</small> */
function u(s) {
  return String(s).replace(/(\d)\s?(°C\/h|°C|µm|mm|min|vol%|mol|pts|%|g|s|h)(?=$|[\s·/])/g, '$1<small class="u">&#8201;$2</small>');
}
function pad2(n) { return String(n).padStart(2, '0'); }

/* ---------------- boot ---------------------------------------------------- */
function boot() {
  var coneSel = $('f-cone');
  GC.CONE_LIST.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = 'cone ' + c + '  ·  ' + GC.CONES[c] + ' °C';
    coneSel.appendChild(o);
  });
  GC.ATMOSPHERES.forEach(function (a) {
    var o = document.createElement('option');
    o.value = a.id; o.textContent = a.name;
    $('f-atm').appendChild(o);
  });

  var chips = $('presets');
  GC.PRESETS.forEach(function (p, n) {
    var b = document.createElement('button');
    b.className = 'chip';
    b.dataset.id = p.id;
    b.innerHTML = '<span class="i">' + pad2(n + 1) + '</span><span class="nm">' + esc(p.name) + '</span><span class="k">' + esc(p.tag) + '</span>';
    b.onclick = function () { loadPreset(p.id); };
    chips.appendChild(b);
  });

  $('f-cone').onchange = function () {
    state.firing.cone = this.value;
    state.firing.peakC = GC.CONES[this.value];
    $('f-peak').value = state.firing.peakC;
    recompute();
  };
  $('f-atm').onchange = function () { state.firing.atmosphere = this.value; recompute(); };
  $('f-cool').onchange = function () { state.firing.cooling = this.value; recompute(); };
  $('f-peak').onchange = function () { state.firing.peakC = +this.value || state.firing.peakC; recompute(); };
  $('f-holdc').onchange = function () { state.firing.holdC = +this.value; recompute(); };
  $('f-holdm').onchange = function () { state.firing.holdMin = +this.value; recompute(); };
  $('f-soak').onchange = function () { state.firing.soakMin = +this.value; recompute(); };

  var slider = $('t-slider');
  slider.oninput = function () {
    state.playing = false;
    state.playFrac = parseFloat(this.value) || 1;
    drawTimed();
    $('t-play').textContent = '\u25b6';
  };
  $('t-play').onclick = function () { togglePlay(); };

  $('add-row').onclick = function () {
    state.recipe.push({ id: 'silica', wt: 5 });
    buildRows();
    recompute();
  };

  $('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) setTab(b.dataset.tab);
  });

  root.addEventListener('resize', debounce(function () {
    if (state.pred) { GC.render.surface($('surface'), state.pred); if (state.tab === 'kinetics') drawTTT(); }
  }, 200));

  var h = location.hash.replace(/^#/, '').split('/');
  loadPreset(GC.PRESET_BY_ID[h[0]] ? h[0] : 'bi-red');
  var timeSeg = null;
  if (h[1] && /^\d/.test(h[1])) timeSeg = h[1];
  else if (h[1]) setTab(h[1]);
  if (!timeSeg && h[2] && /^\d/.test(h[2])) timeSeg = h[2];
  if (timeSeg) {
    state.playFrac = GC.util.clamp(parseFloat(timeSeg) || 1, 0, 1);
    setTimeout(drawTimed, 80);
  }
}

function setTab(tab) {
  if (!tab) return;
  state.tab = tab;
  [].forEach.call(document.querySelectorAll('#tabs button'), function (x) {
    x.classList.toggle('on', x.dataset.tab === tab);
  });
  [].forEach.call(document.querySelectorAll('.pane'), function (x) {
    x.classList.toggle('on', x.id === 'pane-' + tab);
  });
  if (tab === 'kinetics') requestAnimationFrame(drawTTT);
}

function loadPreset(id) {
  var p = GC.PRESET_BY_ID[id];
  if (!p) return;
  state.presetId = id;
  state.recipe = p.recipe.map(function (l) { return { id: l.id, wt: l.wt }; });
  state.firing = Object.assign({}, p.firing);
  [].forEach.call(document.querySelectorAll('#presets .chip'), function (c) {
    c.classList.toggle('on', c.dataset.id === id);
  });
  $('preset-blurb').textContent = p.blurb;
  $('f-cone').value = p.firing.cone;
  $('f-peak').value = p.firing.peakC;
  $('f-atm').value = p.firing.atmosphere;
  $('f-cool').value = p.firing.cooling;
  $('f-holdc').value = p.firing.holdC;
  $('f-holdm').value = p.firing.holdMin;
  $('f-soak').value = p.firing.soakMin;
  buildRows();
  recompute();
}

/* ---------------- recipe rows -------------------------------------------- */
function groups() {
  return [
    ['former', 'Formers'], ['clay', 'Clays'], ['flux', 'Fluxes'],
    ['opacifier', 'Opacifiers'], ['colourant', 'Colourants'], ['special', 'Redox']
  ];
}

function buildRows() {
  var host = $('recipe-rows');
  host.innerHTML = '';
  var optCache = '';
  groups().forEach(function (g) {
    var items = GC.MATERIALS.filter(function (m) { return m.kind === g[0]; });
    if (!items.length) return;
    optCache += '<optgroup label="' + g[1] + '">';
    items.forEach(function (m) {
      optCache += '<option value="' + m.id + '">' + esc(m.name) + '</option>';
    });
    optCache += '</optgroup>';
  });

  state.recipe.forEach(function (line, i) {
    var row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = '<select data-i="' + i + '" aria-label="material ' + (i + 1) + '">' + optCache + '</select>' +
      '<input type="number" step="0.1" min="0" data-i="' + i + '" value="' + line.wt + '" aria-label="grams">' +
      '<button class="del" data-i="' + i + '" title="remove" aria-label="remove material">×</button>';
    host.appendChild(row);
    var sel = row.querySelector('select');
    sel.value = line.id;
  });

  host.onchange = function (e) {
    var t = e.target;
    if (!t.dataset || t.dataset.i === undefined) return;
    var i = +t.dataset.i;
    if (t.tagName === 'SELECT') state.recipe[i].id = t.value;
    else state.recipe[i].wt = +t.value;
    recompute();
  };
  host.onclick = function (e) {
    if (!e.target.classList.contains('del')) return;
    state.recipe.splice(+e.target.dataset.i, 1);
    buildRows();
    recompute();
  };
}

/* ---------------- compute ------------------------------------------------ */
function recompute() {
  var key = JSON.stringify([state.recipe, state.firing]);
  if (key === lastKey) return;
  lastKey = key;
  var pred = GC.engine.predict(state.recipe, state.firing);
  state.pred = pred;
  state.explore = GC.engine.explore(state.recipe, state.firing);
  state.playFrac = 1;
  state.playing = false;
  render(pred);
  $('t-slider').value = '1';
  $('t-readout').textContent = 'fired';
  $('t-play').textContent = '\u25b6';
}

function render(pred) {
  var comp = pred.comp, app = pred.optics, vis = pred.ranked.filter(function (r) { return r.visible; });
  var top = vis[0] || null;

  $('batch-total').textContent = 'batch ' + Math.round(comp.totalMass) + ' g';
  $('batch-loi').textContent = 'LOI ' + comp.loi.toFixed(1) + ' g';

  $('v-headline').textContent = pred.verdict.headline;
  $('v-detail').textContent = pred.verdict.detail;

  var conf = confidence(pred);
  $('v-conf').innerHTML = '<span class="pip" style="background:' + conf.color + '"></span>' +
    '<span>confidence <b>' + conf.level + '</b> · ' + conf.why + '</span>';

  var facts = [];
  facts.push(['Surface', '<span class="swatch" style="background:' + app.hex + '"></span>' + app.name]);
  if (top) {
    facts.push(['Crystal system', top.phase.system]);
    facts.push(['Space group', '<span class="mono">' + top.phase.sg + '</span>']);
    facts.push(['Habit', top.phase.shape]);
    facts.push(['Crystal size', u(mm(top.sizeMm))]);
    facts.push(['Crystal load', u((top.volFrac * 100).toFixed(1) + ' vol%')]);
    facts.push(['Nucleation', top.phase.kind === 'metal' ? 'metal separates' : top.seeded ? 'seeded / undissolved' : 'from the melt']);
  } else {
    facts.push(['Opacity', app.opacity > 0.5 ? 'opaque' : app.opacity > 0.12 ? 'opalescent' : 'transparent']);
    facts.push(['Expansion', Math.round(comp.cte) + 'e-7']);
    facts.push(['NBO/T', comp.nboT.toFixed(2)]);
    facts.push(['Unity SiO2', (comp.unity.SiO2 || 0).toFixed(2)]);
    facts.push(['Crystalline', 'none']);
    facts.push(['Si:Al', comp.siAl.toFixed(1)]);
  }
  $('v-facts').innerHTML = facts.map(function (f) {
    return '<div><dt>' + f[0] + '</dt><dd>' + f[1] + '</dd></div>';
  }).join('');

  $('surface-badge').textContent = app.kind === 'metal' ? 'metal · simulated' : 'simulated';
  GC.render.surface($('surface'), pred);

  renderChain(pred);
  renderCrystals(pred);
  renderKinetics(pred);
  renderChemistry(pred);
  renderLevers(pred);
  if (state.tab === 'kinetics') drawTTT();
}

function confidence(pred) {
  var vis = pred.ranked.filter(function (r) { return r.visible; });
  if (!vis.length) return { level: 'high', why: 'nothing saturates', color: '#76a99b' };
  var top = vis[0], second = vis[1];
  var s = 0;
  if (top.X > 0.35) s += 1;
  if (top.seeded) s += 1;
  if (!second || top.X > second.X * 2) s += 1;
  if (top.phase.kind === 'metal') s += 1;
  var why = top.seeded ? 'phase never dissolved' :
    (second ? 'margin over ' + second.phase.name : 'only candidate');
  return s >= 3 ? { level: 'high', why: why, color: '#76a99b' }
    : s >= 2 ? { level: 'medium', why: why, color: '#d98a3d' }
      : { level: 'low', why: 'close call', color: '#c9735e' };
}

/* ---------------- narrative chain ---------------------------------------- */
function renderChain(pred) {
  var comp = pred.comp, spec = pred.spec;
  var vis = pred.ranked.filter(function (r) { return r.visible; });
  var top = vis[0] || null;
  var cards = [];

  cards.push(['Melt', 'SiO2:Al2O3 ' + comp.siAl.toFixed(1) + '<br>NBO/T ' + comp.nboT.toFixed(2) + ' · Λ ' + comp.basicity.toFixed(2)]);

  var best = spec.elements.slice().sort(function (a, b) { return Math.abs(b.reducedFrac - 0.5) - Math.abs(a.reducedFrac - 0.5); })[0];
  cards.push(['Redox', best ? best.el + ' ' + pct(best.reducedFrac) + ' as ' + best.species.replace(/[0-9]*[+-]?$/, '') + '<br>R ' + spec.strength.toFixed(2) : 'no couple<br>R ' + spec.strength.toFixed(2)]);

  if (top && top.phase.kind === 'metal') {
    cards.push(['Kinetics', top.phase.name + '<br>freezes at ' + temp(top.phase.Tm - 273) + ' · ' + pcv(top.volFrac) + ' metal']);
  } else if (top) {
    cards.push(['Kinetics', top.phase.name + '<br>' + (top.seeded ? 'seeded' : 'nucleates') + ' · ' + dur(top.tBest) + ' at ' + (top.Tbest ? temp(top.Tbest - 273) : '—')]);
  } else {
    cards.push(['Kinetics', 'no TTT crossing<br>glass']);
  }

  $('chain').innerHTML = cards.map(function (c) {
    return '<div><dt>' + c[0] + '</dt><dd>' + c[1] + '</dd></div>';
  }).join('');
}

/* ---------------- crystals pane ------------------------------------------ */
function renderCrystals(pred) {
  var vis = pred.ranked.filter(function (r) { return r.visible || r.phase.kind !== 'metal'; }).slice(0, 7);
  var rows = vis.map(function (r, i) {
    var p = r.phase;
    var tag = r.seeded ? '<span class="tag">seeded</span>' : '';
    return '<div class="ph">' +
      '<div class="n">' + pad2(i + 1) + '</div>' +
      '<div class="main"><div class="nm">' + esc(p.name) + '<small>' + esc(p.formula) + '</small>' + tag + '</div>' +
      '<div class="meta">' + p.system + ' · ' + p.sg + ' · ' + esc(p.habit) + '</div></div>' +
      '<div class="bar"><i style="width:' + Math.min(100, Math.sqrt(r.volFrac) * 190) + '%"></i></div>' +
      '<div class="val"><b>' + (r.volFrac * 100).toFixed(1) + '<small class="u">%</small></b>' + mm(r.sizeMm) + ' · ' + pct(r.X) + '</div>' +
      '</div>';
  }).join('');

  var ladder = pred.spec.elements.slice().sort(function (a, b) { return b.ease - a.ease; }).map(function (e) {
    var p = Math.round(e.reducedFrac * 100);
    return '<div class="lad"><div class="el">' + e.el + '</div>' +
      '<div class="track"><i style="width:' + p + '%"></i></div>' +
      '<div class="pct">' + p + '<small class="u">%</small> ' + e.species.replace(/[0-9]*[+-]?$/, '') + '</div></div>';
  }).join('');

  $('pane-crystals').innerHTML =
    '<div class="split"><div>' +
    '<h3>Ranked phases</h3>' +
    (rows ? '<div class="rank">' + rows + '</div>' : '<p class="hint">Nothing above threshold. The melt is undersaturated in every phase in the database.</p>') +
    '</div><div>' +
    '<h3>Redox ladder</h3>' +
    '<div class="ladder">' + ladder + '</div>' +
    '<p class="hint" style="margin-top:16px">Each bar is the fraction of that element in its reduced state at your atmosphere (R = ' +
    pred.spec.strength.toFixed(2) + '); the tick marks half. The ladder is why bismuth goes metallic in a reduction kiln and does nothing in oxidation: ' +
    'its couple sits above iron, so the same CO that reduces Fe3+ has already reduced Bi3+.</p>' +
    '</div></div>';
}

/* ---------------- kinetics pane ------------------------------------------ */
function renderKinetics(pred) {
  var vis = pred.ranked.filter(function (r) { return r.visible; });
  var top = vis[0];
  var sched = pred.sched;
  var desc = [
    ['peak', temp(sched.peak)],
    ['hold', sched.holdS ? temp(sched.holdC) + ' / ' + Math.round(sched.holdS / 60) + ' min' : 'none'],
    ['cooling', Math.round(sched.coolingRate) + ' °C/h'],
    ['time > 900 °C', dur((sched.bins.reduce(function (s, v, i) {
      return i * 10 + 300 > 900 ? s + v : s;
    }, 0)))],
    ['top phase', top ? top.phase.name : 'none'],
    ['time to nucleate', top && top.phase.kind === 'metal' ? 'freezes ' + temp(top.phase.Tm - 273) : top ? dur(top.tBest) : '—']
  ];

  $('pane-kinetics').innerHTML =
    '<div class="split"><div>' +
    '<h3>Time–temperature–transformation</h3>' +
    '<div class="chart"><canvas id="ttt"></canvas></div>' +
    '<div class="legend">' +
    '<span><i style="background:#d98a3d"></i>top phase</span>' +
    '<span><i style="background:#938a7e"></i>competitors</span>' +
    '<span><i class="dash"></i>your kiln path</span>' +
    '<span class="aside">log time × temperature</span></div>' +
    '<p class="hint" style="margin-top:18px">A phase only appears if your cooling path passes to the <b>left</b> of its curve — ' +
    'inside the time it needs at that temperature. C-shaped curves are the signature of nucleation theory: too hot and the driving force is tiny, too cold and diffusion stops.</p>' +
    '</div><div>' +
    '<h3>Your schedule</h3>' +
    '<dl class="desc">' + desc.map(function (d) { return '<div><dt>' + d[0] + '</dt><dd>' + u(d[1]) + '</dd></div>'; }).join('') + '</dl>' +
    '<p class="hint" style="margin-top:18px">' + kineticsNote(pred) + '</p>' +
    '</div></div>';
}

function kineticsNote(pred) {
  var vis = pred.ranked.filter(function (r) { return r.visible; });
  var top = vis[0];
  if (top && top.phase.kind === 'metal') {
    return 'Metals are not a nucleation problem. ' + top.phase.name + ' is already a separate liquid at your peak temperature, so it simply freezes at ' +
      temp(top.phase.Tm - 273) + ' on the way down. What matters is how much of the metal was reduced and how slowly you passed the freezing point: slower cooling gives fewer, larger, better-formed hopper plates.';
  }
  if (!top) {
    var best = pred.ranked[0];
    if (!best) return 'No phase even reaches its saturation threshold, so temperature and time cannot help. Change the chemistry.';
    return 'The closest phase is ' + best.phase.name + ' at ' + pct(best.sat) + ' of its threshold — it never becomes supersaturated, so no hold will make it appear. That is a chemistry problem, not a firing problem.';
  }
  var t = top.tBest, T = top.Tbest ? top.Tbest - 273 : null;
  var held = pred.sched.holdS / 60;
  var parts = [];
  parts.push(top.phase.name + ' needs about <b>' + dur(t) + '</b> at ' + temp(T) + ' to reach a visible crystal size.');
  if (held > 0) parts.push('You hold for ' + held + ' min at ' + temp(pred.sched.holdC) + ', so the growth window is ' + (held * 60 > t ? 'comfortably open' : 'marginal') + '.');
  parts.push(dur(top.tBelow) + ' of the schedule sits below the liquidus of ' + temp(top.TmEff - 273) + '.');
  if (top.seeded) parts.push('It never fully dissolves at your peak, so undissolved grains are acting as seeds — that is why it starts so readily.');
  return parts.join(' ');
}

function drawTTT() {
  if (state.pred) GC.render.ttt($('ttt'), state.pred);
}

/* ---------------- chemistry pane ----------------------------------------- */
function renderChemistry(pred) {
  var comp = pred.comp;
  var desc = [
    ['NBO/T', comp.nboT.toFixed(2), ''],
    ['basicity Λ', comp.basicity.toFixed(2), ''],
    ['SiO2:Al2O3', comp.siAl.toFixed(1), ''],
    ['R2O:RO', (comp.r2o / Math.max(comp.ro, 1e-6)).toFixed(2), ''],
    ['B2O3', (comp.unity.B2O3 || 0).toFixed(2), ''],
    ['exp · 1e-7', Math.round(comp.cte), ''],
    ['LOI', comp.loi.toFixed(1) + ' g', ''],
    ['unity basis', comp.fluxBasis.toFixed(2) + ' mol', '']
  ];

  var ox = Object.keys(comp.unity)
    .filter(function (k) { return comp.unity[k] > 0.004; })
    .sort(function (a, b) { return comp.unity[b] - comp.unity[a]; })
    .map(function (k) {
      var wt = (comp.mass[k] || 0) / comp.totalMass * 100;
      return '<tr><td class="k">' + GC.OXIDES[k].label + '</td><td class="num">' + comp.unity[k].toFixed(3) +
        '</td><td class="num">' + wt.toFixed(2) + '</td></tr>';
    }).join('');

  var warn = pred.warnings.length
    ? pred.warnings.map(function (w) {
      return '<div class="warn ' + w.level + '">' + esc(w.text) + '</div>';
    }).join('')
    : '<div class="warn info">Nothing structural to flag: expansion is compatible, no heavy-metal loading, no runaway flux.</div>';

  $('pane-chemistry').innerHTML =
    '<h3>Melt descriptors</h3>' +
    '<dl class="desc">' + desc.map(function (d) { return '<div><dt>' + d[0] + '</dt><dd>' + u(d[1]) + '</dd></div>'; }).join('') + '</dl>' +
    '<div class="cols">' +
    '<div><h3>Unity formula</h3><table><thead><tr><th>oxide</th><th class="num">unity</th><th class="num">wt%</th></tr></thead><tbody>' + ox + '</tbody></table></div>' +
    '<div><h3>Saturation vs threshold</h3>' + saturationTable(pred) + '</div>' +
    '<div><h3>Flags</h3>' + warn + '</div>' +
    '</div>';
}

function saturationTable(pred) {
  var rows = pred.ranked.slice(0, 5).map(function (r) {
    var ok = r.sat >= 1;
    return '<tr><td class="k">' + esc(r.phase.name) + '</td><td class="num">' + r.sat.toFixed(2) + '×</td>' +
      '<td class="num" style="color:' + (ok ? '#76a99b' : '#c9735e') + '">' + (ok ? 'super' : 'under') + '</td></tr>';
  }).join('');
  if (!rows) return '<p class="hint">No phase came within reach of its threshold.</p>';
  return '<table><thead><tr><th>phase</th><th class="num">sat</th><th class="num">state</th></tr></thead><tbody>' + rows +
    '</tbody></table><p class="hint">1.00× is the composition where the phase first appears. Above 1 the melt is supersaturated and can precipitate it; below 1 nothing you do to the firing will help.</p>';
}

/* ---------------- levers pane -------------------------------------------- */
function renderLevers(pred) {
  var ex = state.explore;
  if (!ex) return;
  var rows = ex.variants.map(function (v) {
    var d = v.delta >= 0 ? '+' + Math.round(v.delta * 100) + ' pts' : Math.round(v.delta * 100) + ' pts';
    return '<div class="lever' + (v.changed ? ' flip' : '') + '">' +
      '<div class="lbl">' + esc(v.label) + '</div>' +
      '<div class="res">→ ' + (v.top === 'glass' ? 'stays glassy' : esc(v.topName)) + '</div>' +
      '<div class="d' + (v.delta < 0 ? ' neg' : '') + '">' + d + '</div></div>';
  }).join('');

  $('pane-levers').innerHTML =
    '<div class="split"><div>' +
    '<h3>What actually changes the answer</h3>' + rows +
    '</div><div>' +
    '<h3>Reading this</h3>' +
    '<p class="hint" style="margin-top:16px">Each row is a real re-run of the chemistry through the same model: flip the atmosphere, slow the cooling, extend the hold, push the cone. ' +
    'A marked row means the dominant phase changes outright — those are the levers worth pulling. The rest just make the same crystal bigger or smaller.</p>' +
    '<p class="key"><i></i>dominant phase changes</p>' +
    '</div></div>';
}

/* ---- firing replay ------------------------------------------------------- */
function fmtDur(sec) {
  if (sec < 90) return Math.round(sec) + ' s';
  if (sec < 5400) return Math.round(sec / 60) + ' min';
  return (sec / 3600).toFixed(1) + ' h';
}

function drawTimed() {
  var pred = state.pred;
  if (!pred) return;
  var t = state.playFrac * pred.sched.total;
  var end = state.playFrac >= 0.999;
  GC.render.surfaceAt($('surface'), pred, end ? null : t);

  var T = pred.sched.T(t);
  var set = pred._crystals || { crystals: [], metal: [] };
  var born = 0, total = set.crystals.length + set.metal.length;
  set.crystals.concat(set.metal).forEach(function (c) { if (c.birth <= t) born++; });
  var top = pred.ranked.filter(function (r) { return r.visible; })[0];
  var label = end ? 'fired' : (born === 0 ? 'melt' : (born < total ? 'crystallising' : 'cooling'));
  var extra = end && top ? ' · ' + top.phase.name : '';
  $('t-readout').textContent = label + ' · ' + fmtDur(t) + ' · ' + Math.round(T) + ' \u00b0C' + extra;
  var slider = $('t-slider');
  if (slider) slider.value = String(state.playFrac);
}

function togglePlay() {
  if (state.playing) {
    state.playing = false;
    $('t-play').textContent = '\u25b6';
    return;
  }
  if (state.playFrac >= 1) state.playFrac = 0;
  state.playing = true;
  $('t-play').textContent = '\u2759\u2759';
  var last = (root.performance && root.performance.now) ? root.performance.now() : Date.now();
  function step(now) {
    if (!state.playing) return;
    var dt = (now - last) / 1000;
    last = now;
    state.playFrac = Math.min(1, state.playFrac + dt / 16);
    drawTimed();
    if (state.playFrac >= 1) {
      state.playing = false;
      $('t-play').textContent = '\u25b6';
      return;
    }
    root.requestAnimationFrame(step);
  }
  root.requestAnimationFrame(step);
}

function debounce(fn, ms) {
  var t;
  return function () { clearTimeout(t); t = setTimeout(fn, ms); };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})(typeof window !== 'undefined' ? window : this);
