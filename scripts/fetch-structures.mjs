#!/usr/bin/env node
/* Fetch real crystal structures from the Crystallography Open Database.
 *
 * Every structure in data/structures.json keeps its COD id, so any claim on the
 * page can be checked against the original entry. COD data is public domain.
 *
 *   node scripts/fetch-structures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/* query text | expected formula (normalised, element-set + ratio) | label */
const WANTED = [
  { q: 'hematite',      want: { Fe: 2, O: 3 },  label: 'Hematite' },
  { q: 'willemite',     want: { Zn: 2, Si: 1, O: 4 }, label: 'Willemite' },
  { q: 'cassiterite',   want: { Sn: 1, O: 2 },  label: 'Cassiterite' },
  { q: 'zircon',        want: { Zr: 1, Si: 1, O: 4 }, label: 'Zircon' },
  { q: 'corundum',      want: { Al: 2, O: 3 },  label: 'Corundum' },
  { q: 'magnetite',     want: { Fe: 3, O: 4 },  label: 'Magnetite' },
  { q: 'spinel',        want: { Mg: 1, Al: 2, O: 4 }, label: 'Spinel' },
  { q: 'cuprite',       want: { Cu: 2, O: 1 },  label: 'Cuprite' },
  { q: 'rutile',        want: { Ti: 1, O: 2 },  label: 'Rutile' },
  { q: 'quartz',        want: { Si: 1, O: 2 },  label: 'Quartz' },
  { q: 'bismuth',       want: { Bi: 1 },        label: 'Bismuth' },
  { q: 'anorthite',     want: { Ca: 1, Al: 2, Si: 2, O: 8 }, label: 'Anorthite' },
  { q: 'diopside',      want: { Ca: 1, Mg: 1, Si: 2, O: 6 }, label: 'Diopside' },
  { q: 'zincite',       want: { Zn: 1, O: 1 },  label: 'Zincite' },
  { q: 'leucite',       want: { K: 1, Al: 1, Si: 2, O: 6 }, label: 'Leucite' },
  { q: 'wollastonite',  want: { Ca: 1, Si: 1, O: 3 }, label: 'Wollastonite' },
  { q: 'baddeleyite',   want: { Zr: 1, O: 2 },  label: 'Baddeleyite' },
  { q: 'chromite',      want: { Fe: 1, Cr: 2, O: 4 }, label: 'Chromite' }
];

function parseFormula(f) {
  const counts = {};
  const s = String(f || '').replace(/[-+]/g, ' ').trim();
  const re = /([A-Z][a-z]?)\s*(\d+(?:\.\d+)?)?/g;
  let m;
  while ((m = re.exec(s))) {
    if (!m[1]) continue;
    counts[m[1]] = (counts[m[1]] || 0) + (m[2] ? parseFloat(m[2]) : 1);
  }
  return counts;
}

function ratioMatch(have, want) {
  const hk = Object.keys(have), wk = Object.keys(want);
  if (hk.length !== wk.length) return false;
  const ref = wk.find((k) => have[k] !== undefined);
  if (!ref) return false;
  const hBase = have[ref], wBase = want[ref];
  return wk.every((k) => {
    const h = have[k];
    if (h === undefined) return false;
    return Math.abs((h / hBase) - (want[k] / wBase)) < 0.02;
  });
}

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'glazecast/0.2 (structure fetch)' } });
      if (r.ok) return await r.text();
      if (r.status === 404) return null;
    } catch (e) { /* retry */ }
    await new Promise((res) => setTimeout(res, 800 * (i + 1)));
  }
  return null;
}

/* ---- minimal CIF reader: cell, symmetry ops, atom sites ------------------ */
function num(v) { const m = String(v).match(/-?\d+(\.\d+)?(\(\d+\))?/); return m ? parseFloat(m[0].replace(/\(\d+\)/, '')) : NaN; }

function readCif(text) {
  const out = { cell: {}, symops: [], atoms: [], sg: null, formula: null };

  const cellKeys = ['a', 'b', 'c', 'alpha', 'beta', 'gamma'];
  cellKeys.forEach((k) => {
    const re = new RegExp('_cell_(?:length|angle)_' + k + '\\s+(\\S+)', 'i');
    const m = text.match(re);
    if (m) out.cell[k] = num(m[1]);
  });

  const sg = text.match(/_space_group_name_H-M_alt\s+'([^']+)'/);
  if (sg) out.sg = sg[1].trim();
  const itnum = text.match(/_space_group_IT_number\s+(\d+)/);
  if (itnum) out.sgNumber = parseInt(itnum[1], 10);
  const f = text.match(/_chemical_formula_sum\s+'([^']+)'/);
  if (f) out.formula = f[1].trim();

  /* symmetry operations: loop_ of _symmetry_equiv_pos_as_xyz */
  const symBlock = text.match(/_symmetry_equiv_pos_as_xyz[\s\S]*?(?=\n_[a-z#]|\nloop_|\ndata_|$)/);
  if (symBlock) {
    symBlock[0].split('\n').forEach((line) => {
      let l = line.trim().replace(/^['"]|['"]$/g, '');
      if (!l || l.startsWith('_') || /^[0-9]+$/.test(l)) return;
      if (/^[xyz0-9+\-\/.,\s]+$/i.test(l) && l.includes('x')) out.symops.push(l);
    });
  }

  /* atom sites */
  /* the atom loop runs until a line that starts with '_' but is NOT another
     _atom_site_* header (each header sits on its own line) */
  const siteBlock = text.match(/_atom_site_label[\s\S]*?(?=\n_(?!atom_site_)[a-z#]|\ndata_|$)/);
  if (siteBlock) {
    const lines = siteBlock[0].split('\n');
    const headers = [];
    const rows = [];
    let i = 0;
    for (; i < lines.length; i++) {
      const l = lines[i].trim();
      if (l.startsWith('_atom_site_')) headers.push(l.split(/\s+/)[0]);
      else if (l && !l.startsWith('_') && !l.startsWith('#') && l !== 'loop_' && !/^data_/.test(l)) rows.push(l);
    }
    const col = (name) => headers.indexOf(name);
    const cx = col('_atom_site_fract_x'), cy = col('_atom_site_fract_y'), cz = col('_atom_site_fract_z');
    const ct = col('_atom_site_type_symbol'), cl = col('_atom_site_label');
    rows.forEach((r) => {
      const t = r.match(/(?:'[^']*'|"[^"]*"|\S+)/g) || [];
      const x = num(t[cx]), y = num(t[cy]), z = num(t[cz]);
      if ([x, y, z].some((v) => !isFinite(v))) return;
      let el = ct >= 0 ? t[ct] : t[cl];
      el = String(el).replace(/[^A-Za-z]/g, '');
      const m = el.match(/[A-Z][a-z]?/);
      out.atoms.push({ el: m ? m[0] : el, x, y, z });
    });
  }
  return out;
}

/* ---- symmetry expansion -------------------------------------------------- */
function evalOp(op, p) {
  return op.split(',').map((expr) => {
    let s = expr.toLowerCase().replace(/\s+/g, '');
    s = s.replace(/(\d)\/(\d)/g, (_, a, b) => String(parseFloat(a) / parseFloat(b)));
    const terms = s.match(/[+-]?[^+-]+/g) || [];
    let v = 0;
    terms.forEach((term) => {
      const sign = term.startsWith('-') ? -1 : 1;
      const t = term.replace(/^[+-]/, '');
      if (t === 'x') v += sign * p[0];
      else if (t === 'y') v += sign * p[1];
      else if (t === 'z') v += sign * p[2];
      else if (t) v += sign * (parseFloat(t) || 0);
    });
    return v;
  });
}

function expand(cif) {
  const ops = cif.symops.length ? cif.symops : ['x,y,z'];
  const seen = new Set();
  const atoms = [];
  cif.atoms.forEach((a) => {
    ops.forEach((op) => {
      let [x, y, z] = evalOp(op, [a.x, a.y, a.z]);
      x = ((x % 1) + 1) % 1; y = ((y % 1) + 1) % 1; z = ((z % 1) + 1) % 1;
      const key = a.el + [x, y, z].map((v) => Math.round(v * 100)).join(',');
      if (seen.has(key)) return;
      seen.add(key);
      atoms.push({ el: a.el, x, y, z });
    });
  });
  return atoms;
}

/* ---- main ---------------------------------------------------------------- */
function atomCount(f) {
  const c = parseFormula(f);
  return Object.values(c).reduce((a, b) => a + b, 0);
}

const out = [];
for (const w of WANTED) {
  process.stdout.write(w.label.padEnd(14));
  const sr = await get('https://www.crystallography.net/cod/result.php?text=' + encodeURIComponent(w.q) + '&format=json');
  if (!sr) { console.log('search failed'); continue; }
  let hits;
  try { hits = JSON.parse(sr); } catch (e) { console.log('bad json'); continue; }
  const cands = hits.filter((h) => ratioMatch(parseFormula(h.formula), w.want)).slice(0, 8);
  if (!cands.length) { console.log('no formula match'); continue; }

  let took = null;
  for (const cand of cands) {
    const cifText = await get('https://www.crystallography.net/cod/' + cand.file + '.cif');
    if (!cifText) continue;
    const cif = readCif(cifText);
    if (!cif.cell || !cif.cell.a || !cif.atoms.length) continue;
    const atoms = expand(cif);
    /* reject asymmetric-unit-only files (no symmetry applied) and absurd cells */
    if (cif.symops.length < 2 && atoms.length < atomCount(cif.formula || cand.formula) * 1.5) continue;
    if (atoms.length > 420) continue;
    took = { cand, cif, atoms };
    break;
  }
  if (!took) { console.log('no usable entry'); continue; }

  out.push({
    id: w.label.toLowerCase(),
    name: w.label,
    formula: took.cif.formula || took.cand.formula,
    spaceGroup: took.cif.sg,
    spaceGroupNumber: took.cif.sgNumber,
    cell: took.cif.cell,
    symops: took.cif.symops.length,
    atoms: took.atoms,
    source: { database: 'COD', id: took.cand.file, url: 'https://www.crystallography.net/cod/' + took.cand.file + '.html' }
  });
  console.log('ok  COD ' + took.cand.file + '  ' + took.atoms.length + ' atoms  ' + (took.cif.sg || ''));
  await new Promise((res) => setTimeout(res, 300));
}

const dir = path.join(root, 'data');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'structures.json'), JSON.stringify(out));
console.log('\nwrote data/structures.json  (' + out.length + ' structures, ' + (fs.statSync(path.join(dir, 'structures.json')).size / 1024).toFixed(1) + ' kB)');
