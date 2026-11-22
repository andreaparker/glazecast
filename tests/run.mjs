/* GLAZECAST regression suite.
 * Each case is a glaze behaviour that is well documented in ceramics practice.
 * The engine has to rank the phase that potters actually see first.
 */
import { loadGC } from './harness.mjs';

const GC = loadGC();
const engine = GC.engine;

let pass = 0, fail = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; failures.push(name + (detail ? '  [' + detail + ']' : '')); console.log('  FAIL ' + name + (detail ? '  ' + detail : '')); }
}

function run(id) {
  const p = GC.PRESET_BY_ID[id];
  return engine.predict(p.recipe, p.firing);
}

function top(r) {
  const v = r.ranked.filter((x) => x.visible);
  return v.length ? v[0] : null;
}

console.log('\n1. composition + structure descriptors');
{
  const p = GC.PRESET_BY_ID['clear'];
  const c = engine.compose(p.recipe);
  // unity formula must be normalised to 1 flux mole
  const flux = c.r2o + c.ro;
  check('unity basis sums to 1', Math.abs(flux - 1) < 1e-9, flux.toFixed(4));
  check('unity SiO2 is 2-3', c.unity.SiO2 > 2 && c.unity.SiO2 < 3.2, c.unity.SiO2.toFixed(2));
  check('NBO/T positive and below 1', c.nboT > 0.05 && c.nboT < 1, c.nboT.toFixed(3));
  check('optical basicity in range', c.basicity > 0.5 && c.basicity < 0.8, c.basicity.toFixed(3));
  // anorthite end-member CaO.Al2O3.2SiO2: every oxygen is bridging -> NBO/T = 0
  const an = engine.compose([
    { id: 'whiting', wt: 56.077 / 0.56 },
    { id: 'alumina', wt: 101.961 / 0.654 },
    { id: 'silica', wt: 120.168 / 0.995 }
  ]);
  check('anorthite composition has NBO/T ~ 0', Math.abs(an.nboT) < 0.02, an.nboT.toFixed(3));
  check('anorthite unity is 1 CaO : 1 Al2O3 : 2 SiO2',
    Math.abs(an.unity.CaO - 1) < 0.01 && Math.abs(an.unity.Al2O3 - 1) < 0.01 && Math.abs(an.unity.SiO2 - 2) < 0.02,
    [an.unity.CaO, an.unity.Al2O3, an.unity.SiO2].map((v) => v.toFixed(2)).join(':'));
}

console.log('\n2. redox ladder');
{
  const p = GC.PRESET_BY_ID['bi-red'];
  const red = engine.speciate(engine.compose(p.recipe), p.firing);
  const ox = engine.speciate(engine.compose(p.recipe), { atmosphere: 'ox' });
  check('Bi reduced in reduction firing', red.species.Bi0 > 0.5, red.species.Bi0.toFixed(2));
  check('Bi not reduced in oxidation', ox.species.Bi0 < 0.1, ox.species.Bi0.toFixed(3));
  check('Fe2+ present in reduction', red.species['Fe2+'] > 0.3, red.species['Fe2+'].toFixed(2));
  check('Fe2+ absent in oxidation', ox.species['Fe2+'] < 0.1, ox.species['Fe2+'].toFixed(3));
  check('Mn stays oxidised in a cone 6 reduction', red.species['Mn3+'] === undefined || red.species['Mn3+'] > 0.5);
}

console.log('\n3. bismuth case (the video)');
{
  const red = run('bi-red');
  const ox = run('bi-ox');
  const t = top(red);
  check('reduction gives metallic bismuth', t && t.phase.id === 'bismuth', t && t.phase.id);
  check('it is a metal phase', t && t.phase.kind === 'metal');
  check('trigonal hopper habit', t && t.phase.system === 'trigonal' && /hopper/.test(t.phase.habit));
  check('crystals are mm scale', t && t.sizeMm > 0.15 && t.sizeMm < 4, t && t.sizeMm.toFixed(2));
  check('surface reads as metal', red.optics.kind === 'metal');
  check('oxidation kills the bismuth phase', !ox.ranked.some((r) => r.phase.id === 'bismuth'));
  check('oxidation verdict is glassy', ox.verdict.kind === 'glass', ox.verdict.headline);
  check('oxidation is not metallic', ox.optics.kind !== 'metal');
}

console.log('\n4. zinc crystalline');
{
  const r = run('zinc-crystal');
  const t = top(r);
  check('willemite wins', t && t.phase.id === 'willemite', t && t.phase.id);
  check('substantial crystallinity', t && t.X > 0.15, t && t.X.toFixed(2));
  check('crystalline-glaze surface is pale', r.optics.name === 'white' || /pale|off-white|cream/.test(r.optics.name), r.optics.name);
  const hot = engine.predict(GC.PRESET_BY_ID['zinc-crystal'].recipe,
    Object.assign({}, GC.PRESET_BY_ID['zinc-crystal'].firing, { holdC: 1180 }));
  check('holding hotter reduces crystal growth', !hot.ranked[0] || hot.ranked[0].X <= t.X + 1e-9);
}

console.log('\n5. iron in reduction (tenmoku)');
{
  const r = run('tenmoku');
  const t = top(r);
  check('magnetite or hematite wins', t && /magnet/.test(t.phase.id), t && t.phase.id);
  const [rr, gg, bb] = r.optics.rgb;
  check('surface is dark', (rr + gg + bb) / 3 < 110, r.optics.hex);
}

console.log('\n6. copper red');
{
  const r = run('copper-red');
  const [rr, gg, bb] = r.optics.rgb;
  check('no macroscopic copper crystals', !r.ranked.some((x) => x.phase.id === 'copper' && x.visible));
  check('colour is red-dominant', rr > bb * 1.4, r.optics.hex);
}

console.log('\n7. chrome-tin pink');
{
  const r = run('chrome-tin');
  const t = top(r);
  check('cassiterite wins', t && t.phase.id === 'cassiterite', t && t.phase.id);
  const [rr, gg, bb] = r.optics.rgb;
  check('colour is pink (red > blue > green)', rr > bb && bb > gg, r.optics.hex);
}

console.log('\n8. rutile');
{
  const blue = run('rutile-blue');
  const cream = engine.predict(GC.PRESET_BY_ID['rutile-blue'].recipe,
    Object.assign({}, GC.PRESET_BY_ID['rutile-blue'].firing, { atmosphere: 'ox' }));
  const t = top(blue);
  check('rutile wins in reduction', t && t.phase.id === 'rutile', t && t.phase.id);
  check('rutile is seeded, not dissolved', t && t.seeded === true);
  check('reduced rutile is bluer than oxidised', blue.optics.rgb[2] - blue.optics.rgb[0] > cream.optics.rgb[2] - cream.optics.rgb[0], blue.optics.hex + ' vs ' + cream.optics.hex);
}

console.log('\n9. null case');
{
  const r = run('clear');
  check('clear glaze stays glassy', r.verdict.kind === 'glass', r.verdict.headline);
  check('clear glaze has no visible crystals', r.ranked.filter((x) => x.visible).length === 0);
  check('clear glaze is light', r.optics.rgb[0] > 200, r.optics.hex);
}

console.log('\n10. sensitivity / levers');
{
  const p = GC.PRESET_BY_ID['bi-ox'];
  const ex = engine.explore(p.recipe, p.firing);
  const flip = ex.variants.find((v) => v.label === 'Fire in reduction');
  check('explore() finds the atmosphere lever', flip && flip.changed && flip.top === 'bismuth', flip && flip.label);
}

console.log('\n11. optics sanity');
{
  const w = GC.color.spectrumToRGB(() => 1);
  check('flat spectrum is white', w.every((v) => v > 248), w.join(','));
  const dark = GC.color.spectrumToRGB((l) => (l < 500 ? 0.05 : 0.9));
  check('step spectrum is not white', dark[0] > dark[2] + 30, dark.join(','));
  // 0 nm film must reproduce the bare metal reflectance
  const Rmetal = GC.color.filmReflectance(550, 0, 2.1, 1.9, 3.0);
  check('zero-thickness film = bare metal', Math.abs(Rmetal - 0.56) < 0.03, Rmetal.toFixed(3));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('\nFAILURES:\n' + failures.map((f) => ' - ' + f).join('\n')); process.exit(1); }
