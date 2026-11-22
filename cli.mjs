#!/usr/bin/env node
/* GLAZECAST command line: run a preset or a recipe file and print the report.
 *
 *   node cli.mjs                       list presets
 *   node cli.mjs bi-red                run a preset
 *   node cli.mjs --json bi-red         machine-readable result
 *   node cli.mjs --file myglaze.json   {recipe:[{id,wt}], firing:{...}}
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const ctx = vm.createContext({ console, Math, JSON, Object, Array, Number, String, isFinite, Infinity, NaN });
ctx.globalThis = ctx;
for (const f of ['00-core.js', '10-phases.js', '20-color.js', '30-engine.js', '40-presets.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'src', f), 'utf8'), ctx, { filename: f });
}
const GC = ctx.GC;

const args = process.argv.slice(2);
const json = args.includes('--json');
const fileIdx = args.indexOf('--file');
let recipe, firing, label;

if (fileIdx >= 0) {
  const spec = JSON.parse(fs.readFileSync(args[fileIdx + 1], 'utf8'));
  recipe = spec.recipe; firing = spec.firing; label = spec.name || 'custom';
} else {
  const id = args.find((a) => !a.startsWith('--')) || 'bi-red';
  const p = GC.PRESET_BY_ID[id];
  if (!p) {
    console.log('presets:\n' + GC.PRESETS.map((x) => '  ' + x.id.padEnd(14) + x.name).join('\n'));
    process.exit(1);
  }
  recipe = p.recipe; firing = p.firing; label = p.name;
}

const t0 = Date.now();
const r = GC.engine.predict(recipe, firing);
const ms = Date.now() - t0;

if (json) {
  const out = {
    label, hex: r.optics.hex, colour: r.optics.name, kind: r.optics.kind,
    verdict: r.verdict.headline, detail: r.verdict.detail,
    nboT: +r.comp.nboT.toFixed(3), basicity: +r.comp.basicity.toFixed(3),
    cte: Math.round(r.comp.cte), SiAl: +r.comp.siAl.toFixed(2),
    redox: Object.fromEntries(r.spec.elements.map((e) => [e.species, +e.reducedFrac.toFixed(3)])),
    phases: r.ranked.map((x) => ({
      id: x.phase.id, name: x.phase.name, system: x.phase.system, spaceGroup: x.phase.sg,
      habit: x.phase.habit, X: +x.X.toFixed(3), volFrac: +x.volFrac.toFixed(4),
      sizeMm: +x.sizeMm.toFixed(3), sat: +x.sat.toFixed(2), seeded: x.seeded, visible: x.visible
    })),
    warnings: r.warnings.map((w) => w.text)
  };
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

function wrap(t, width, indent) {
  const words = String(t).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > width) { lines.push(line.trim()); line = w; }
    else line += ' ' + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.map((l) => indent + l).join('\n');
}

const c = r.comp;
console.log('\n  ' + label.toUpperCase());
console.log('  ' + '-'.repeat(64));
console.log('  NBO/T ' + c.nboT.toFixed(2) + '   basicity ' + c.basicity.toFixed(2) +
  '   SiO2:Al2O3 ' + c.siAl.toFixed(1) + '   expansion ' + Math.round(c.cte) + 'e-7/C');
console.log('  atmosphere R=' + r.spec.strength.toFixed(2) + '   ' +
  r.spec.elements.map((e) => e.el + ' ' + Math.round(e.reducedFrac * 100) + '% ' + e.species).join('  '));
console.log('\n  ' + r.verdict.headline);
console.log('  surface: ' + r.optics.hex + ' (' + r.optics.name + ')');
console.log(wrap(r.verdict.detail, 86, '  '));
console.log('\n  phases');
r.ranked.slice(0, 8).forEach((x) => {
  console.log('   ' + (x.visible ? '>' : ' ') + ' ' + x.phase.name.padEnd(20) +
    ' X ' + (x.X * 100).toFixed(0).padStart(3) + '%  ' +
    (x.volFrac * 100).toFixed(1).padStart(5) + ' vol%  ' +
    (x.sizeMm < 0.05 ? (x.sizeMm * 1000).toFixed(0) + 'um' : x.sizeMm.toFixed(2) + 'mm').padStart(8) +
    '  sat ' + x.sat.toFixed(2) + (x.seeded ? '  seeded' : '') + '  ' + x.phase.system);
});
if (r.warnings.length) {
  console.log('\n  flags');
  r.warnings.forEach((w) => console.log(wrap('! ' + w.text, 84, '   ')));
}
console.log('\n  ' + ms + ' ms\n');
