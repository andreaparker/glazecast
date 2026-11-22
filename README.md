# GLAZECAST

Glaze chemistry in. Crystal structure out.

A predictive tool for the part of ceramics that gets treated as mystery: what actually grows on the
surface. Give it a recipe, an atmosphere, a cone and a cooling curve. It returns the crystalline
phase, its crystal system and space group, its habit and size, the colour, a simulated surface, and
the chain of reasoning that produced each one.

```
recipe ──► oxide moles ──► unity formula ──┬──► melt structure (NBO/T, optical basicity)
                                           │
atmosphere ──► redox speciation ───────────┼──► candidate phases + saturation ratio
                                           │
kiln schedule ──► T(t) ────────────────────┼──► TTT intersection ──► volume fraction, size
                                           │
crystals + dopants ────────────────────────┴──► ligand field + Mie + Fresnel ──► colour, surface
```

## Run it

| | |
|---|---|
| App | open `index.html`. No server, no build, no dependencies. |
| Single file | `dist/glazecast.html`. Everything inlined, send it to anyone. |
| Tests | `node tests/run.mjs`. 39 assertions against known glaze outcomes. |
| CLI | `node cli.mjs bi-red`, `node cli.mjs --json tenmoku`, `node cli.mjs --file myglaze.json` |
| Rebuild | `node build.mjs` inlines the modules into `dist/glazecast.html`. |

`cli.mjs` recipe file format:

```json
{ "name": "my glaze",
  "recipe": [{"id":"custer","wt":30},{"id":"silica","wt":20},{"id":"whiting","wt":15}],
  "firing": {"cone":"6","peakC":1222,"atmosphere":"red","cooling":"slow","holdC":1100,"holdMin":60,"soakMin":10} }
```

Material ids are listed in `src/00-core.js` (`GC.MATERIALS`).

## The case in the video

A cone-6 glaze with a few percent bismuth trioxide, fired in reduction, comes out with silver
triangular crystals on a pink-and-blue iridescent ground. Each step is forced:

1. Redox. `Bi³⁺ + 3e⁻ → Bi⁰`, E° = +0.31 V. On the reducibility ladder bismuth sits above iron,
   so the CO that only partly reduces Fe³⁺ has already taken bismuth most of the way to metal.
   At R = 0.58 the tool puts 92 % of the bismuth on the metal side. In clean air it puts 7 %,
   below the threshold, and predicts nothing. That matches what people who have
   [tested bismuth at cone 6 in oxidation](https://krill-crocodile-h3a7.squarespace.com/blog/playing-with-bismuth-in-cone-6-part-2-my-apology-to-bismuth)
   report: no crystals, a faint purple sheen, a stiffer glaze.
2. Immiscibility. Liquid bismuth does not dissolve in a silicate melt. It beads. That is why you
   get discrete crystals instead of a dissolved colour.
3. Lattice. Bismuth is rhombohedral A7 (R-3m, a = 4.546 Å, α = 57.24°), trigonal in habit:
   triangular plates, spiral growth steps, skeletal re-entrant edges. It freezes at 271 °C, long
   after the glaze has stiffened, so each droplet keeps the shape it grew in.
4. Optics. The metal is silver. The colour is not in the metal at all: a 40–200 nm skin of Bi₂O₃
   grows on it as it cools and thin-film interference does the rest. The tool computes the Fresnel
   reflectance of that film at every wavelength and integrates it against the CIE observer. Blue,
   pink, gold and teal are one chemistry at different film thicknesses.

The historical literature agrees: metallic bismuth deposits on glazes were a known reduction effect
in the [1909 *Keramic Studio*](https://ia600501.us.archive.org/23/items/keramicstud1019081909leon/keramicstud1019081909leon.pdf)
("salts of silver, copper and bismuth … under the action of carbon monoxide and hydrocarbons"),
and Bi₂O₃ is now the standard
[lead replacement in borosilicate glazes](https://hal.science/hal-05048865v1/preview/Article%20Ceramics%20International%202025.pdf)
because Bi³⁺ and Pb²⁺ are isoelectronic lone-pair ions.

The app ships both firings as presets, Bismuth reduced and Bismuth oxidised, so you can watch the
prediction flip on the atmosphere alone.

## What is actually computed

| Step | Method | Status |
|---|---|---|
| Recipe → oxides | mass balance, molar masses | exact |
| Unity formula | Seger normalisation to one flux mole | standard |
| Melt structure | NBO/T from oxygen/tetrahedral-cation balance; Duffy optical basicity | standard |
| Redox speciation | logistic partition per multivalent couple, ordered by silicate-melt reducibility | ordering real, thresholds calibrated |
| Saturation | per-phase threshold composition (critical unity of its key oxide) → `sat = unity/crit` | calibrated |
| Liquidus | `T_liq = T_m − K·ln(1 + 1/sat)`, K = 430 K | calibrated |
| Crystallisation | TTT curve per phase; kiln path integrated against it; seeded phases skip nucleation | calibrated |
| Structure & habit | crystal system, space group, habit from mineralogy | exact |
| Colour | ligand-field absorption bands, Beer–Lambert, van de Hulst scattering, Fresnel thin film, CIE 1931 → sRGB | optics exact, band strengths calibrated |
| Surface | render driven by the predicted phase, size, load and colour | illustration |

The chemistry is standard and exact where it can be: stoichiometry, redox order, crystal
structures, interference and colour science come from databases and textbook physics. The kinetics
are calibrated. Nucleation rates depend on the clay body, the interface and the kiln in ways no
desktop model resolves, so absolute times are rough; treat them as ±half a decade. The rankings,
the mechanisms and the levers are the reliable part.

Not modelled: real activity coefficients (FactSage/Thermo-Calc territory), interfacial energies,
nucleation density on a real body, glaze thickness variation, kiln atmosphere drift, and
body–glaze interaction beyond a linear-expansion warning.

## The levers tab

Each row is a real re-run of the whole pipeline: flip the atmosphere, slow the cooling, extend the
hold, push a cone. The tab reports which change replaces the dominant phase and which only make
the same crystal bigger. For the bismuth glaze, the atmosphere row is the only one that flips it.

## Validation

`node tests/run.mjs` asserts the engine reproduces documented behaviour:

| Case | Expectation |
|---|---|
| Bismuth, reduction | Bi metal first, trigonal hopper, mm-scale, metallic surface |
| Bismuth, oxidation | no bismuth phase at all; glassy verdict |
| Zinc crystalline | willemite first, >15 % crystallinity, pale surface |
| Tenmoku | magnetite/hematite first, dark surface |
| Copper red | no macroscopic copper; red-dominant colour from colloid |
| Chrome-tin | cassiterite first; pink (R > B > G) |
| Rutile blue | rutile first, seeded, bluer in reduction than oxidation |
| Cone 6 clear | glassy, no visible crystals, light |
| Optics | flat spectrum → white; zero-thickness film → bare-metal reflectance |
| Composition | anorthite end-member has NBO/T = 0 and unity 1:1:2 |

## Files

```
index.html            the app (loads the modules below as classic scripts)
dist/glazecast.html   the same app as one self-contained file
src/00-core.js        cones, oxide properties, 50+ raw materials with analyses, atmospheres
src/10-phases.js      34 crystalline phases: formula, structure, habit, thermochemistry, notes
src/20-color.js       CIE observer, absorption bands, scattering, thin-film Fresnel
src/30-engine.js      composition → redox → saturation → TTT → optics
src/40-presets.js     eight known outcomes
src/50-render.js      simulated surface + TTT chart
src/60-ui.js          interface
src/70-crystal.js     unit-cell renderer (real COD structures)
tests/run.mjs         regression suite
cli.mjs               command line
build.mjs             single-file bundler
```

## Where it stops being a model

1. Replace `CRIT` with a real thermodynamic database. Every phase carries a calibrated threshold
   composition. Swap it for activities from a slag/glass database (FactSage, Thermo-Calc, MELTS)
   and the saturation ratio becomes a Gibbs-energy driving force instead of a calibrated proxy.
2. Predict habit from structure instead of a habit library. Attachment-energy morphology
   (Bravais–Friedel–Donnay–Harker plus Hartman–Perdok periodic bond chains) derives the crystal
   shape from the space group. A weekend of surface-slab calculations per phase removes the last
   lookup table.

And the empirical step: a few thousand Glazy recipes with fired photos. The engine already
computes the descriptors; fitting the kinetic constants against real outcomes would tighten the
±half a decade.
