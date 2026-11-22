/* GLAZECAST — crystalline phase database.
 * Thermo values are approximate literature figures, rounded; they set the
 * scale of the driving force and the TTT nose, not a precision phase diagram.
 */
(function (root) {
'use strict';
var GC = root.GC = root.GC || {};

function P(o) { return o; }

GC.PHASES = [
  /* ---------------- zinc silicates: the crystalline-glaze family ------------- */
  P({ id:'willemite', name:'Willemite', formula:'Zn2SiO4', kind:'silicate',
      req:{ ZnO:2, SiO2:1 }, Tm:1785, dHf:70000, Vm:55, n:1.72,
      system:'trigonal', sg:'R-3', shape:'spherulite',
      habit:'prismatic to acicular, radiating spherulites and bow-ties',
      color:'colourless', gloss:'glassy', nucleo:1.5, surface:0.8,
      note:'The classic crystalline-glaze phase. Needs ZnO unity roughly >0.25 and a slow pass through 1050-1150 C. Nucleates heterogeneously at the glaze/air interface, then grows inward as radiating fans.' }),

  P({ id:'zincite', name:'Zincite', formula:'ZnO', kind:'oxide',
      req:{ ZnO:1 }, Tm:2248, dHf:55000, Vm:14.5, n:2.0,
      system:'hexagonal', sg:'P63mc', shape:'needle',
      habit:'acicular needles and hexagonal prisms',
      color:'white', gloss:'adamantine', nucleo:1.2, surface:0.5,
      note:'Forms only in heavily zinced, silica-poor melts; usually willemite wins because it is the more stable sink for Zn.' }),

  P({ id:'gahnite', name:'Gahnite', formula:'ZnAl2O4', kind:'oxide',
      req:{ ZnO:1, Al2O3:1 }, Tm:2223, dHf:100000, Vm:55, n:1.79,
      system:'cubic', sg:'Fd-3m', shape:'octahedron',
      habit:'octahedra, sometimes hopper-faced',
      color:'colourless', gloss:'glassy', nucleo:0.9, surface:0.3,
      note:'Zn-Al spinel. Takes Co and Cr into the tetrahedral site and turns them into stable ceramic pigments.' }),

  /* ---------------- iron: tenmoku, oil spot, iron saturate ------------------- */
  P({ id:'hematite', name:'Hematite', formula:'Fe2O3', kind:'oxide',
      req:{ Fe2O3:1 }, Tm:1838, dHf:80000, Vm:30.4, n:3.0,
      system:'trigonal', sg:'R-3c', shape:'tabular',
      habit:'tabular rhombohedra, rosettes, specular platelets',
      color:'red-brown', gloss:'metallic', nucleo:1.2, surface:1.0,
      needs:{ species:'Fe3+', min:0.25 },
      note:'Exsolves in the last 50-80 C of cooling in oxidised iron glazes. At the surface the platelets lie flat and give the specular "oil spot" sheen.' }),

  P({ id:'magnetite', name:'Magnetite', formula:'Fe3O4', kind:'oxide',
      req:{ Fe2O3:0.5, FeO:0.5 }, Tm:1870, dHf:90000, Vm:44.5, n:2.42,
      system:'cubic', sg:'Fd-3m', shape:'octahedron',
      habit:'octahedra and dendritic skeletons',
      color:'black', gloss:'metallic', nucleo:1.1, surface:0.6,
      needs:{ species:'Fe2+', min:0.35 },
      note:'The black, slightly magnetic iron phase of reduction firings. Grows fast because Fe2+ diffuses easily in the reduced melt.' }),

  P({ id:'zincferrite', name:'Zinc ferrite', formula:'ZnFe2O4', kind:'oxide',
      req:{ ZnO:1, Fe2O3:1 }, Tm:1900, dHf:95000, Vm:44.0, n:2.1,
      system:'cubic', sg:'Fd-3m', shape:'octahedron',
      habit:'octahedra',
      color:'dark brown', gloss:'dull', nucleo:1.0, surface:0.2,
      note:'Competes with willemite for Zn when iron is high; kills the crystalline glaze effect.' }),

  /* ---------------- titanium ------------------------------------------------- */
  P({ id:'rutile', name:'Rutile', formula:'TiO2', kind:'oxide',
      req:{ TiO2:1 }, Tm:2116, dHf:65000, Vm:18.8, n:2.7,
      system:'tetragonal', sg:'P42/mnm', shape:'needle',
      habit:'acicular needles, hair-like crystals, star twins',
      color:'cream-white', gloss:'adamantine', nucleo:1.7, surface:0.7,
      note:'Raw rutile never fully dissolves at cone 6 (liquidus ~1420 C), so it seeds itself: needles grow on the undissolved grains. That is why rutile is so much more "reactive" than TiO2.' }),

  P({ id:'anatase', name:'Anatase', formula:'TiO2', kind:'oxide',
      req:{ TiO2:1 }, Tm:1900, dHf:60000, Vm:20.1, n:2.5,
      system:'tetragonal', sg:'I41/amd', shape:'octahedron',
      habit:'bipyramidal microcrystals',
      color:'white', gloss:'dull', nucleo:0.8, surface:0.2,
      note:'Low-temperature polymorph; converts to rutile above ~800 C, so it survives only in low-fire or fast-cooled work.' }),

  /* ---------------- tin / zirconium: opacifiers ----------------------------- */
  P({ id:'cassiterite', name:'Cassiterite', formula:'SnO2', kind:'oxide',
      req:{ SnO2:1 }, Tm:1903, dHf:55000, Vm:21.6, n:2.0,
      system:'tetragonal', sg:'P42/mnm', shape:'octahedron',
      habit:'prismatic to dipyramidal, twinned',
      color:'white', gloss:'adamantine', nucleo:1.3, surface:0.4,
      note:'Tin opacifier. With 0.2-0.5% Cr and Ca it becomes the chrome-tin pink pigment: Cr3+ in the cassiterite lattice.' }),

  P({ id:'zircon', name:'Zircon', formula:'ZrSiO4', kind:'silicate',
      req:{ ZrO2:1, SiO2:1 }, Tm:1949, dHf:90000, Vm:39.2, n:1.95,
      system:'tetragonal', sg:'I41/amd', shape:'octahedron',
      habit:'dipyramidal microcrystals',
      color:'white', gloss:'dull', nucleo:1.0, surface:0.3,
      note:'Very refractory: below ~1500 C it simply stays as undissolved opacifier particles. It does not really crystallise out of the melt.' }),

  P({ id:'baddeleyite', name:'Baddeleyite', formula:'ZrO2', kind:'oxide',
      req:{ ZrO2:1 }, Tm:2988, dHf:87000, Vm:21.2, n:2.2,
      system:'monoclinic', sg:'P21/c', shape:'blade',
      habit:'bladed, curved',
      color:'white', gloss:'dull', nucleo:0.6, surface:0.2,
      note:'Zirconia without enough silica to make zircon. Refractory; mostly stays undissolved.' }),

  /* ---------------- alumina / silica / clays -------------------------------- */
  P({ id:'corundum', name:'Corundum', formula:'Al2O3', kind:'oxide',
      req:{ Al2O3:1 }, Tm:2345, dHf:110000, Vm:25.6, n:1.77,
      system:'trigonal', sg:'R-3c', shape:'tabular',
      habit:'tabular hexagonal plates',
      color:'colourless', gloss:'glassy', nucleo:0.7, surface:0.2,
      note:'Only in alumina-rich, flux-poor glazes. Takes Cr (ruby) or Fe/Ti (sapphire).' }),

  P({ id:'mullite', name:'Mullite', formula:'Al6Si2O13', kind:'silicate',
      req:{ Al2O3:3, SiO2:1 }, Tm:2120, dHf:120000, Vm:135, n:1.64,
      system:'orthorhombic', sg:'Pbam', shape:'needle',
      habit:'acicular needles, matte felting',
      color:'white', gloss:'dull', nucleo:0.6, surface:0.2,
      note:'The matte-maker of high-alumina glazes: a felt of needles at the surface scatters light.' }),

  P({ id:'anorthite', name:'Anorthite', formula:'CaAl2Si2O8', kind:'silicate',
      req:{ CaO:1, Al2O3:1, SiO2:2 }, Tm:1826, dHf:130000, Vm:101, n:1.58,
      system:'triclinic', sg:'P-1', shape:'blade',
      habit:'lath-like crystals, dull',
      color:'white', gloss:'dull', nucleo:0.9, surface:0.4,
      note:'Calcium feldspar: the usual cause of a "dry" matte in high-Ca glazes cooled slowly.' }),

  P({ id:'diopside', name:'Diopside', formula:'CaMgSi2O6', kind:'silicate',
      req:{ CaO:1, MgO:1, SiO2:2 }, Tm:1664, dHf:100000, Vm:66, n:1.68,
      system:'monoclinic', sg:'C2/c', shape:'needle',
      habit:'prismatic, radiating',
      color:'white', gloss:'glassy', nucleo:1.0, surface:0.4,
      note:'Ca-Mg pyroxene; gives a soft satin matte and hosts Cr as chrome-diopside green.' }),

  P({ id:'wollastonite', name:'Wollastonite', formula:'CaSiO3', kind:'silicate',
      req:{ CaO:1, SiO2:1 }, Tm:1813, dHf:60000, Vm:40, n:1.63,
      system:'triclinic', sg:'P-1', shape:'blade',
      habit:'bladed, fibrous, radiating',
      color:'white', gloss:'dull', nucleo:1.1, surface:0.5,
      note:'High-lime, low-alumina melts devitrify to wollastonite on slow cooling: a harsh, dry matte.' }),

  P({ id:'celsian', name:'Celsian', formula:'BaAl2Si2O8', kind:'silicate',
      req:{ BaO:1, Al2O3:1, SiO2:2 }, Tm:1863, dHf:120000, Vm:105, n:1.59,
      system:'monoclinic', sg:'I2/c', shape:'blade',
      habit:'prismatic laths',
      color:'white', gloss:'dull', nucleo:0.8, surface:0.3,
      note:'Barium feldspar; barium is the one alkaline earth that reliably stays glossy, so celsian only appears in slow-cooled high-Ba work.' }),

  /* ---------------- alkali silicates ---------------------------------------- */
  P({ id:'leucite', name:'Leucite', formula:'KAlSi2O6', kind:'silicate',
      req:{ K2O:1, Al2O3:1, SiO2:2 }, Tm:1962, dHf:100000, Vm:88, n:1.51,
      system:'tetragonal', sg:'I41/a', shape:'octahedron',
      habit:'trapezohedral, rounded, often skeletal',
      color:'white', gloss:'dull', nucleo:0.7, surface:0.3,
      note:'Potash-rich melts. Its 2% thermal expansion mismatch is what crazes so many high-potash glazes.' }),

  P({ id:'nepheline', name:'Nepheline', formula:'NaAlSiO4', kind:'silicate',
      req:{ Na2O:1, Al2O3:1, SiO2:1 }, Tm:1799, dHf:90000, Vm:54, n:1.53,
      system:'hexagonal', sg:'P63', shape:'octahedron',
      habit:'prismatic, rounded',
      color:'white', gloss:'dull', nucleo:0.8, surface:0.3,
      note:'Soda-rich, silica-poor melts (nepheline syenite bodies).' }),

  P({ id:'spodumene', name:'Spodumene', formula:'LiAlSi2O6', kind:'silicate',
      req:{ Li2O:1, Al2O3:1, SiO2:2 }, Tm:1693, dHf:80000, Vm:66, n:1.66,
      system:'monoclinic', sg:'C2/c', shape:'blade',
      habit:'prismatic, elongated',
      color:'white', gloss:'glassy', nucleo:0.8, surface:0.3,
      note:'Lithia source; usually dissolves fully and re-precipitates only in slow cools.' }),

  P({ id:'lidisilicate', name:'Lithium disilicate', formula:'Li2Si2O5', kind:'silicate',
      req:{ Li2O:1, SiO2:2 }, Tm:1306, dHf:60000, Vm:60, n:1.55,
      system:'orthorhombic', sg:'Ccc2', shape:'spherulite',
      habit:'lath rosettes, spherulites',
      color:'white', gloss:'glassy', nucleo:1.7, surface:0.6,
      note:'The workhorse of glass-ceramics: it nucleates and grows fast just above 800 C, which is why lithium crystalline glazes bloom so easily.' }),

  P({ id:'quartz', name:'Quartz', formula:'SiO2', kind:'oxide',
      req:{ SiO2:1 }, Tm:1986, dHf:9500, Vm:22.7, n:1.55,
      system:'trigonal', sg:'P3221', shape:'hex',
      habit:'hexagonal dipyramids',
      color:'white', gloss:'glassy', nucleo:0.5, surface:0.1,
      note:'Survives only as undissolved grains; it does not grow from a glaze melt.' }),

  P({ id:'cristobalite', name:'Cristobalite', formula:'SiO2', kind:'oxide',
      req:{ SiO2:1 }, Tm:1986, dHf:8500, Vm:25.7, n:1.48,
      system:'cubic', sg:'Fd-3m', shape:'spherulite',
      habit:'spherulitic, fine-grained',
      color:'white', gloss:'dull', nucleo:1.0, surface:0.6,
      note:'High-temperature silica polymorph. A thin cristobalite skin is a common cause of "crazing on cooling" and of a faint matte.' }),

  /* ---------------- phosphorus ---------------------------------------------- */
  P({ id:'apatite', name:'Apatite', formula:'Ca5(PO4)3(OH)', kind:'silicate',
      req:{ CaO:5, P2O5:1.5 }, Tm:1923, dHf:150000, Vm:160, n:1.65,
      system:'hexagonal', sg:'P63/m', shape:'hex',
      habit:'hexagonal prisms, needles',
      color:'white', gloss:'dull', nucleo:1.2, surface:0.4,
      note:'Bone ash or tricalcium phosphate in a high-Ca glaze; a soft opal matte.' }),

  /* ---------------- copper --------------------------------------------------- */
  P({ id:'cuprite', name:'Cuprite', formula:'Cu2O', kind:'oxide',
      req:{ CuO:2 }, Tm:1505, dHf:55000, Vm:23.4, n:2.85,
      system:'cubic', sg:'Pn-3m', shape:'octahedron',
      habit:'octahedra, dendritic skeletons, red internal reflections',
      color:'deep red', gloss:'adamantine', nucleo:1.3, surface:0.5,
      needs:{ species:'Cu+', min:0.25 },
      note:'Ruby-red cuprite is what makes a copper-red glaze look red under a hand lens; the colour is a mix of colloidal Cu and Cu2O.' }),

  P({ id:'tenorite', name:'Tenorite', formula:'CuO', kind:'oxide',
      req:{ CuO:1 }, Tm:1599, dHf:45000, Vm:12.6, n:2.6,
      system:'monoclinic', sg:'C2/c', shape:'blade',
      habit:'black scales and crusts',
      color:'black', gloss:'dull', nucleo:0.9, surface:0.4,
      needs:{ species:'Cu2+', min:0.3 },
      note:'Oxidised copper: black, crusty, and usually a fault in a copper red.' }),

  P({ id:'copper', name:'Copper metal', formula:'Cu', kind:'metal',
      req:{ CuO:1 }, Tm:1358, dHf:13000, Vm:7.1, n:0.6,
      system:'cubic', sg:'Fm-3m', shape:'bead',
      habit:'colloidal nanospheres (10-60 nm) or metallic dendrites',
      color:'copper-red', gloss:'metallic', nucleo:2.0, surface:0.5,
      needs:{ species:'Cu0', min:0.12 },
      note:'Red is a size effect: 10-30 nm particles absorb at ~570 nm and look ruby; grow them past 100 nm and the glaze turns liver-brown and metallic.' }),

  P({ id:'silver', name:'Silver metal', formula:'Ag', kind:'metal',
      req:{ Ag2O:0.5 }, Tm:1235, dHf:11300, Vm:10.3, n:0.2,
      system:'cubic', sg:'Fm-3m', shape:'bead',
      habit:'colloidal clusters, dendritic films',
      color:'yellow', gloss:'metallic', nucleo:2.0, surface:0.6,
      needs:{ species:'Ag0', min:0.1 },
      note:'Silver luster: yellow to gold, and it tarnishes to purple-black in sulphur.' }),

  /* ---------------- bismuth: the case in the video --------------------------- */
  P({ id:'bismuth', name:'Bismuth metal', formula:'Bi', kind:'metal',
      req:{ Bi2O3:0.5 }, Tm:544.7, dHf:11300, Vm:21.3, n:0.5,
      system:'trigonal', sg:'R-3m', shape:'triangle',
      habit:'hopper crystals: triangular plates with spiral growth steps and skeletal re-entrant edges',
      color:'silver', gloss:'metallic', nucleo:2.2, surface:0.7,
      needs:{ species:'Bi0', min:0.08 },
      note:'Bi3+ + 3e- -> Bi0 (E0 +0.31 V). Reduced bismuth is immiscible with the silicate melt, so it beads into droplets; each droplet freezes at 271 C into a hopper crystal with the trigonal symmetry of the rhombohedral lattice (a = 4.55 A, alpha = 57.2 deg). The iridescence is a 40-200 nm Bi2O3 tarnish film.' }),

  P({ id:'bismuthoxide', name:'Bismuth oxide (a)', formula:'Bi2O3', kind:'oxide',
      req:{ Bi2O3:1 }, Tm:1098, dHf:45000, Vm:52.4, n:2.5,
      system:'monoclinic', sg:'P21/c', shape:'blade',
      habit:'yellow microcrystals, crusts',
      color:'pale yellow', gloss:'adamantine', nucleo:1.0, surface:0.5,
      needs:{ species:'Bi3+', min:0.2 },
      note:'Oxidised bismuth stays as a glass former/flux; it only crystallises as Bi2O3 in heavily loaded, slowly cooled glazes.' }),

  P({ id:'eulytite', name:'Eulytite', formula:'Bi4Si3O12', kind:'silicate',
      req:{ Bi2O3:2, SiO2:3 }, Tm:1273, dHf:120000, Vm:200, n:2.1,
      system:'cubic', sg:'I-43d', shape:'octahedron',
      habit:'euhedral dodecahedra',
      color:'pale yellow', gloss:'adamantine', nucleo:1.2, surface:0.4,
      needs:{ species:'Bi3+', min:0.3 },
      note:'Bismuth silicate, the phase to expect in an oxidised high-bismuth glaze held near 800-900 C. Pale yellow, high refractive index.' }),

  P({ id:'sillenite', name:'Sillenite', formula:'Bi12SiO20', kind:'oxide',
      req:{ Bi2O3:6, SiO2:1 }, Tm:1173, dHf:150000, Vm:330, n:2.3,
      system:'cubic', sg:'I23', shape:'octahedron',
      habit:'tetrahedral, strongly striated',
      color:'pale yellow', gloss:'adamantine', nucleo:1.1, surface:0.4,
      needs:{ species:'Bi3+', min:0.35 },
      note:'Bi12SiO20, the gamma-phase of the Bi2O3-SiO2 system: cubic, optically active, and a sign of a very bismuth-rich oxidised melt.' }),

  /* ---------------- cobalt / nickel / chrome / manganese --------------------- */
  P({ id:'thenardite', name:'Cobalt aluminate', formula:'CoAl2O4', kind:'oxide',
      req:{ CoO:1, Al2O3:1 }, Tm:2233, dHf:100000, Vm:40.2, n:1.85,
      system:'cubic', sg:'Fd-3m', shape:'octahedron',
      habit:'octahedra',
      color:'deep blue', gloss:'dull', nucleo:1.1, surface:0.3,
      note:'The stable blue spinel pigment. Once cobalt is locked into CoAl2O4 the colour stops moving with the glaze chemistry.' }),

  P({ id:'chromite', name:'Chromite', formula:'FeCr2O4', kind:'oxide',
      req:{ FeO:1, Cr2O3:1 }, Tm:2473, dHf:100000, Vm:44, n:2.1,
      system:'cubic', sg:'Fd-3m', shape:'octahedron',
      habit:'octahedra',
      color:'black', gloss:'metallic', nucleo:1.0, surface:0.3,
      needs:{ species:'Cr3+', min:0.4 },
      note:'Chrome + iron in reduction: black spinel, and the reason chrome greens go muddy in a reduction kiln.' }),

  P({ id:'spinel', name:'Spinel', formula:'MgAl2O4', kind:'oxide',
      req:{ MgO:1, Al2O3:1 }, Tm:2408, dHf:100000, Vm:39.7, n:1.72,
      system:'cubic', sg:'Fd-3m', shape:'octahedron',
      habit:'octahedra',
      color:'colourless', gloss:'glassy', nucleo:0.9, surface:0.2,
      note:'Mg-Al spinel: a refractory scatterer, occasionally seen in high-magnesia mattes.' }),

  P({ id:'hausmannite', name:'Hausmannite', formula:'Mn3O4', kind:'oxide',
      req:{ MnO:3, }, Tm:1833, dHf:60000, Vm:44, n:2.15,
      system:'tetragonal', sg:'I41/amd', shape:'octahedron',
      habit:'bipyramidal, granular',
      color:'brown-black', gloss:'dull', nucleo:1.0, surface:0.3,
      note:'Oxidised manganese at high temperature; on cooling it can exsolve as brown-black dendrites.' }),

  P({ id:'cerianite', name:'Cerianite', formula:'CeO2', kind:'oxide',
      req:{ CeO2:1 }, Tm:2673, dHf:60000, Vm:23.9, n:2.2,
      system:'cubic', sg:'Fm-3m', shape:'octahedron',
      habit:'fine cubic crystallites',
      color:'pale cream', gloss:'dull', nucleo:0.9, surface:0.2,
      note:'Cerium opacifier; redox-active (Ce3+/Ce4+) and can tint a glaze towards cream in reduction.' })
];

GC.PHASE_BY_ID = {};
GC.PHASES.forEach(function (p) { GC.PHASE_BY_ID[p.id] = p; });

/* species that get a redox fraction, with the couple they represent */
GC.REDOX = [
  { el:'Ag', ox:'Ag0',  oxidised:'Ag+',  ease:0.96, label:'Ag+ + e- -> Ag0',  E0:0.80 },
  { el:'Au', ox:'Au0',  oxidised:'Au3+', ease:0.98, label:'Au3+ + 3e- -> Au0',E0:1.50 },
  { el:'Cu', ox:'Cu0',  oxidised:'Cu2+', ease:0.74, label:'Cu2+ + 2e- -> Cu0',E0:0.34 },
  { el:'Bi', ox:'Bi0',  oxidised:'Bi3+', ease:0.70, label:'Bi3+ + 3e- -> Bi0',E0:0.31 },
  { el:'Sb', ox:'Sb0',  oxidised:'Sb3+', ease:0.64, label:'Sb3+ + 3e- -> Sb0',E0:0.15 },
  { el:'Sn', ox:'Sn2+', oxidised:'Sn4+', ease:0.46, label:'Sn4+ + 2e- -> Sn2+',E0:0.15 },
  { el:'Fe', ox:'Fe2+', oxidised:'Fe3+', ease:0.44, label:'Fe3+ + e- -> Fe2+', E0:0.77 },
  { el:'U',  ox:'U5+',  oxidised:'U6+',  ease:0.38, label:'U6+ + e- -> U5+',  E0:0.16 },
  { el:'V',  ox:'V4+',  oxidised:'V5+',  ease:0.36, label:'V5+ + e- -> V4+',  E0:0.99 },
  { el:'Cr', ox:'Cr3+', oxidised:'Cr6+', ease:0.30, label:'Cr6+ + 3e- -> Cr3+',E0:1.33 },
  { el:'Mn', ox:'Mn2+', oxidised:'Mn3+', ease:0.24, label:'Mn3+ + e- -> Mn2+', E0:1.51 },
  { el:'Ti', ox:'Ti3+', oxidised:'Ti4+', ease:0.18, label:'Ti4+ + e- -> Ti3+', E0:0.10 }
];

})(typeof globalThis !== 'undefined' ? globalThis : this);
