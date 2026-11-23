#!/usr/bin/env node
/* Run every extracted Glazy glaze through the GLAZECAST engine and emit a
 * compact, filterable dataset for the web page.
 *
 *   node scripts/analyze-glazes.mjs
 *
 * Firing assumed: first listed atmosphere, cone from the first token of the
 * cone field, slow cooling, 30 min hold 120 C under peak. These assumptions are
 * stated on the page that consumes the data.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ctx = vm.createContext({ console, Math, JSON, Object, Array, Number, String, isFinite, Infinity, NaN });
ctx.globalThis = ctx;
for (const f of ['00-core.js', '10-phases.js', '20-color.js', '30-engine.js', '40-presets.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'src', f), 'utf8'), ctx, { filename: f });
}
const GC = ctx.GC;

const raw = JSON.parse(fs.readFileSync(path.join(root, 'data', 'glazes-raw.json'), 'utf8'));

function coneTemp(s) {
  if (!s) return { t: 1222, label: '?' };
  const first = String(s).split(/[\s\-–,]+/).find((t) => t.length);
  if (!first) return { t: 1222, label: '?' };
  if (GC.CONES[first]) return { t: GC.CONES[first], label: first };
  return { t: 1222, label: first };
}

function atmosphere(list) {
  const a = (list || [])[0] || 'Oxidation';
  const s = String(a).toLowerCase();
  if (s.includes('reduction')) return 'red';
  if (s.includes('wood') || s.includes('soda') || s.includes('salt')) return 'wood';
  if (s.includes('neutral')) return 'neu';
  return 'ox';
}

GC.MATERIAL_BY_ID.__virtual = {
  id: '__virtual', name: 'virtual analysis', kind: 'flux', analysis: [], loi: 0
};

const out = [];
const t0 = Date.now();
let skipped = 0;
for (let i = 0; i < raw.length; i++) {
  const g = raw[i];
  const { t, label } = coneTemp(g.cone);
  const firing = {
    cone: label, peakC: t,
    atmosphere: atmosphere(g.atmospheres),
    cooling: 'slow', holdC: Math.max(900, t - 122), holdMin: 30, soakMin: 10
  };
  const analysis = Object.entries(g.analysis).filter(([k]) => GC.OXIDES[k]);
  if (!analysis.length) { skipped++; continue; }
  GC.MATERIAL_BY_ID.__virtual.analysis = analysis;

  let pred;
  try {
    pred = GC.engine.predict([{ id: '__virtual', wt: 100 }], firing);
  } catch (e) { skipped++; continue; }

  const vis = pred.ranked.filter((r) => r.visible);
  const top = vis[0] || null;
  const c = pred.comp;
  out.push({
    id: g.id, name: g.name, author: g.author, state: g.state,
    sub: g.subtype, cone: g.cone, atm: (g.atmospheres || []).join('+'),
    phase: top ? top.phase.id : null, phaseName: top ? top.phase.name : null,
    kind: pred.verdict.kind, hex: pred.optics.hex,
    nboT: Math.round(c.nboT * 100) / 100,
    siAl: Math.round(c.siAl * 10) / 10,
    uSiO2: Math.round((c.unity.SiO2 || 0) * 100) / 100,
    uAl2O3: Math.round((c.unity.Al2O3 || 0) * 100) / 100,
    uB2O3: Math.round((c.unity.B2O3 || 0) * 100) / 100,
    cte: Math.round(c.cte),
    flux: Math.round(c.fluxBasis * 100) / 100
  });
  if (i % 5000 === 0) console.log(i, 'of', raw.length, `${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

fs.writeFileSync(path.join(root, 'data', 'glazes.json'), JSON.stringify(out));
console.log('\ndone:', out.length, 'records,', skipped, 'skipped,',
  `${((Date.now() - t0) / 1000).toFixed(0)}s`,
  (fs.statSync(path.join(root, 'data', 'glazes.json')).size / 1024 / 1024).toFixed(1), 'MB');
