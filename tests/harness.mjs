import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, '..', 'src');
const FILES = ['00-core.js', '10-phases.js', '20-color.js', '30-engine.js', '40-presets.js'];

export function loadGC() {
  const context = vm.createContext({ console, Math, JSON, Object, Array, Number, String, isFinite, Infinity, NaN });
  context.globalThis = context;
  for (const f of FILES) {
    const code = fs.readFileSync(path.join(src, f), 'utf8');
    vm.runInContext(code, context, { filename: f });
  }
  return context.GC;
}

export const BASE = [
  ['custer', 30], ['silica', 20], ['whiting', 15], ['kaolin', 15], ['frit3134', 15], ['zinc', 5]
];

export function recipe(lines) {
  return lines.map(([id, wt]) => ({ id, wt }));
}

export function firing(o = {}) {
  return Object.assign({
    cone: '6', peakC: 1222, atmosphere: 'red', cooling: 'slow',
    holdC: 1100, holdMin: 60, soakMin: 10
  }, o);
}

export function show(title, r) {
  const c = r.comp;
  console.log('\n=== ' + title + ' ===');
  console.log('NBO/T', c.nboT.toFixed(3), '| basicity', c.basicity.toFixed(3),
    '| SiO2/Al2O3', c.siAl.toFixed(1), '| CTE', Math.round(c.cte) + 'e-7', '| R', r.spec.R.toFixed(2));
  console.log('appearance', r.optics.hex, r.optics.name, r.optics.kind, 'opacity', (r.optics.opacity || 0).toFixed(2));
  console.log('verdict:', r.verdict.headline);
  r.ranked.slice(0, 6).forEach((x) => {
    console.log('   ' + x.phase.name.padEnd(22) + ' X=' + x.X.toFixed(3).padStart(6) +
      '  vf=' + (x.volFrac * 100).toFixed(1).padStart(5) + '%' +
      '  TmEff=' + Math.round(x.TmEff - 273) + 'C' +
      '  size=' + (x.sizeMm < 0.01 ? (x.sizeMm * 1000).toFixed(0) + 'um' : x.sizeMm.toFixed(2) + 'mm') +
      '  U=' + x.U.toExponential(1));
  });
}
