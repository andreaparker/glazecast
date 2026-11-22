/* GLAZECAST — core data: firing cones, oxide properties, raw materials.
 * Classic script (no modules) so index.html works from file:// with no server.
 */
(function (root) {
'use strict';
var GC = root.GC = root.GC || {};

/* ------------------------------------------------------------------ *
 *  Orton self-supporting cone temperatures (approx, deg C)
 * ------------------------------------------------------------------ */
GC.CONES = {
  '022': 600, '021': 614, '020': 635, '019': 683, '018': 717, '017': 747,
  '016': 792, '015': 804, '014': 838, '013': 852, '012': 866, '011': 894,
  '010': 903, '09': 923, '08': 955, '07': 984, '06': 999, '05': 1046,
  '04': 1060, '03': 1086, '02': 1101, '01': 1117,
  '1': 1154, '2': 1162, '3': 1170, '4': 1186, '5': 1196, '6': 1222,
  '7': 1240, '8': 1255, '9': 1270, '10': 1305, '11': 1315, '12': 1325
};

/* ------------------------------------------------------------------ *
 *  Oxides
 *  mr      molar mass g/mol
 *  O       oxygen atoms per formula unit  (for NBO/T)
 *  T       tetrahedral network cations per formula unit
 *  cat     cations: {el, n, z, r}  r = Shannon ionic radius (A)
 *  role    former | intermediate | flux | colourant
 *  lambda  optical basicity contribution (Duffy & Ingram, approx)
 * ------------------------------------------------------------------ */
GC.OXIDES = {
  SiO2:  { label:'SiO2',  name:'silica',        mr:60.084,  O:2, T:1, role:'former',       lambda:0.48, cat:[{el:'Si',n:1,z:4,r:0.26}] },
  Al2O3: { label:'Al2O3', name:'alumina',       mr:101.961, O:3, T:2, role:'intermediate', lambda:0.60, cat:[{el:'Al',n:2,z:3,r:0.39}] },
  B2O3:  { label:'B2O3',  name:'boron oxide',   mr:69.620,  O:3, T:2, role:'former',       lambda:0.42, cat:[{el:'B',n:2,z:3,r:0.27}] },
  P2O5:  { label:'P2O5',  name:'phosphorus',    mr:141.944, O:5, T:2, role:'former',       lambda:0.40, cat:[{el:'P',n:2,z:5,r:0.17}] },
  Na2O:  { label:'Na2O',  name:'soda',          mr:61.979,  O:1, T:0, role:'flux',         lambda:1.15, cat:[{el:'Na',n:2,z:1,r:1.02}] },
  K2O:   { label:'K2O',   name:'potash',        mr:94.196,  O:1, T:0, role:'flux',         lambda:1.40, cat:[{el:'K',n:2,z:1,r:1.38}] },
  Li2O:  { label:'Li2O',  name:'lithia',        mr:29.881,  O:1, T:0, role:'flux',         lambda:1.00, cat:[{el:'Li',n:2,z:1,r:0.76}] },
  CaO:   { label:'CaO',   name:'calcia',        mr:56.077,  O:1, T:0, role:'flux',         lambda:1.00, cat:[{el:'Ca',n:1,z:2,r:1.00}] },
  MgO:   { label:'MgO',   name:'magnesia',      mr:40.304,  O:1, T:0, role:'flux',         lambda:0.78, cat:[{el:'Mg',n:1,z:2,r:0.72}] },
  BaO:   { label:'BaO',   name:'baria',         mr:153.326, O:1, T:0, role:'flux',         lambda:1.22, cat:[{el:'Ba',n:1,z:2,r:1.35}] },
  SrO:   { label:'SrO',   name:'strontia',      mr:103.619, O:1, T:0, role:'flux',         lambda:1.10, cat:[{el:'Sr',n:1,z:2,r:1.18}] },
  ZnO:   { label:'ZnO',   name:'zinc oxide',    mr:81.379,  O:1, T:0, role:'flux',         lambda:0.95, cat:[{el:'Zn',n:1,z:2,r:0.74}] },
  PbO:   { label:'PbO',   name:'lead oxide',    mr:223.200, O:1, T:0, role:'flux',         lambda:1.18, cat:[{el:'Pb',n:1,z:2,r:1.19}] },
  Bi2O3: { label:'Bi2O3', name:'bismuth oxide', mr:465.959, O:3, T:0, role:'flux',         lambda:1.13, cat:[{el:'Bi',n:2,z:3,r:1.03}] },
  Fe2O3: { label:'Fe2O3', name:'ferric oxide',  mr:159.688, O:3, T:0, role:'colourant',    lambda:0.72, cat:[{el:'Fe',n:2,z:3,r:0.65}] },
  FeO:   { label:'FeO',   name:'ferrous oxide', mr:71.844,  O:1, T:0, role:'flux',         lambda:0.90, cat:[{el:'Fe',n:1,z:2,r:0.78}] },
  TiO2:  { label:'TiO2',  name:'titania',       mr:79.866,  O:2, T:0, role:'intermediate', lambda:0.65, cat:[{el:'Ti',n:1,z:4,r:0.61}] },
  ZrO2:  { label:'ZrO2',  name:'zirconia',      mr:123.223, O:2, T:0, role:'opacifier',    lambda:0.72, cat:[{el:'Zr',n:1,z:4,r:0.72}] },
  SnO2:  { label:'SnO2',  name:'tin oxide',     mr:150.709, O:2, T:0, role:'opacifier',    lambda:0.60, cat:[{el:'Sn',n:1,z:4,r:0.69}] },
  MnO:   { label:'MnO',   name:'manganese',     mr:70.937,  O:1, T:0, role:'colourant',    lambda:0.95, cat:[{el:'Mn',n:1,z:2,r:0.83}] },
  CuO:   { label:'CuO',   name:'copper oxide',  mr:79.545,  O:1, T:0, role:'colourant',    lambda:0.90, cat:[{el:'Cu',n:1,z:2,r:0.73}] },
  CoO:   { label:'CoO',   name:'cobalt oxide',  mr:74.933,  O:1, T:0, role:'colourant',    lambda:0.90, cat:[{el:'Co',n:1,z:2,r:0.75}] },
  NiO:   { label:'NiO',   name:'nickel oxide',  mr:74.693,  O:1, T:0, role:'colourant',    lambda:0.90, cat:[{el:'Ni',n:1,z:2,r:0.69}] },
  Cr2O3: { label:'Cr2O3', name:'chrome oxide',  mr:151.990, O:3, T:0, role:'colourant',    lambda:0.75, cat:[{el:'Cr',n:2,z:3,r:0.62}] },
  V2O5:  { label:'V2O5',  name:'vanadia',       mr:181.880, O:5, T:0, role:'colourant',    lambda:0.78, cat:[{el:'V',n:2,z:5,r:0.54}] },
  Sb2O3: { label:'Sb2O3', name:'antimony',      mr:291.518, O:3, T:0, role:'opacifier',    lambda:0.80, cat:[{el:'Sb',n:2,z:3,r:0.76}] },
  CdO:   { label:'CdO',   name:'cadmium',       mr:128.410, O:1, T:0, role:'colourant',    lambda:1.05, cat:[{el:'Cd',n:1,z:2,r:0.95}] },
  CeO2:  { label:'CeO2',  name:'ceria',         mr:172.115, O:2, T:0, role:'opacifier',    lambda:0.70, cat:[{el:'Ce',n:1,z:4,r:0.87}] },
  Pr6O11:{ label:'Pr6O11',name:'praseodymia',   mr:1021.44, O:11,T:0, role:'colourant',    lambda:0.70, cat:[{el:'Pr',n:6,z:3.67,r:0.99}] },
  Nd2O3: { label:'Nd2O3', name:'neodymia',      mr:336.482, O:3, T:0, role:'colourant',    lambda:0.70, cat:[{el:'Nd',n:2,z:3,r:0.98}] },
  Er2O3: { label:'Er2O3', name:'erbia',         mr:382.561, O:3, T:0, role:'colourant',    lambda:0.70, cat:[{el:'Er',n:2,z:3,r:0.89}] },
  WO3:   { label:'WO3',   name:'tungsten oxide',mr:231.838, O:3, T:0, role:'colourant',    lambda:0.80, cat:[{el:'W',n:1,z:6,r:0.60}] },
  MoO3:  { label:'MoO3',  name:'molybdenum',    mr:143.938, O:3, T:0, role:'colourant',    lambda:0.80, cat:[{el:'Mo',n:1,z:6,r:0.59}] },
  UO3:   { label:'UO3',   name:'uranium oxide', mr:286.027, O:3, T:0, role:'colourant',    lambda:0.85, cat:[{el:'U',n:1,z:6,r:0.73}] },
  Ag2O:  { label:'Ag2O',  name:'silver oxide',  mr:231.735, O:1, T:0, role:'colourant',    lambda:1.00, cat:[{el:'Ag',n:2,z:1,r:1.15}] },
  Au2O3: { label:'Au2O3', name:'gold oxide',    mr:441.931, O:3, T:0, role:'colourant',    lambda:1.00, cat:[{el:'Au',n:2,z:3,r:0.85}] }
};

GC.TM = ['Fe', 'Cu', 'Co', 'Mn', 'Cr', 'Ni', 'V', 'U', 'Pr', 'Nd', 'Er', 'Ce', 'W', 'Mo', 'Ag', 'Au', 'Bi', 'Sb', 'Sn', 'Ti', 'Cd'];

/* ------------------------------------------------------------------ *
 *  Raw materials.  analysis: [oxide, wt%].  LOI is tracked separately.
 *  id keys are stable; UI shows `name`.
 * ------------------------------------------------------------------ */
function M(id, name, kind, analysis, loi, note) {
  return { id: id, name: name, kind: kind, analysis: analysis, loi: loi || 0, note: note || '' };
}

GC.MATERIALS = [
  /* --- glass formers / clay --- */
  M('silica',      'Silica (325 mesh)',      'former', [['SiO2',99.5],['Al2O3',0.3],['Fe2O3',0.04]], 0.2),
  M('quartz',      'Quartz flour',           'former', [['SiO2',98.5],['Al2O3',0.8],['Fe2O3',0.1]], 0.5),
  M('kaolin',      'Kaolin (EPK)',           'clay',   [['SiO2',45.6],['Al2O3',37.4],['Fe2O3',0.6],['TiO2',0.1],['CaO',0.1],['MgO',0.1],['K2O',0.2],['Na2O',0.1]], 15.7),
  M('ballclay',    'Ball clay (OM4)',        'clay',   [['SiO2',53.0],['Al2O3',30.0],['Fe2O3',1.0],['TiO2',1.2],['CaO',0.2],['MgO',0.3],['K2O',1.5],['Na2O',0.2]], 12.5),
  M('bentonite',   'Bentonite',              'clay',   [['SiO2',60.0],['Al2O3',20.0],['Fe2O3',3.0],['MgO',2.0],['CaO',1.0],['Na2O',2.0],['K2O',1.0]], 10.0),
  M('alumina',     'Alumina hydrate',        'former', [['Al2O3',65.4]], 34.6),
  M('mullite',     'Mullite (calcined)',     'former', [['Al2O3',72.0],['SiO2',28.0]], 0),

  /* --- feldspars / feldspathoids --- */
  M('custer',      'Potash feldspar (Custer)', 'flux', [['SiO2',64.65],['Al2O3',18.30],['K2O',10.02],['Na2O',2.93],['CaO',0.20],['MgO',0.08],['Fe2O3',0.09],['TiO2',0.06]], 0.43),
  M('sodafeld',    'Soda feldspar (NC-4)',   'flux',   [['SiO2',68.5],['Al2O3',19.0],['Na2O',10.5],['K2O',0.4],['CaO',0.4],['Fe2O3',0.1]], 0.3),
  M('nepheline',   'Nepheline syenite (A-270)','flux', [['SiO2',60.0],['Al2O3',23.5],['Na2O',9.8],['K2O',4.5],['CaO',0.5],['Fe2O3',0.1]], 0.5),
  M('spodumene',   'Spodumene',              'flux',   [['Li2O',7.5],['Al2O3',27.4],['SiO2',64.6],['Na2O',0.3],['Fe2O3',0.1]], 0.4),
  M('petalite',    'Petalite',               'flux',   [['Li2O',4.9],['Al2O3',16.7],['SiO2',78.0],['Na2O',0.2]], 0.4),

  /* --- alkaline earths --- */
  M('whiting',     'Whiting',                'flux',   [['CaO',56.0]], 44.0),
  M('wollastonite','Wollastonite',           'flux',   [['SiO2',51.7],['CaO',48.3]], 0),
  M('dolomite',    'Dolomite',               'flux',   [['CaO',30.4],['MgO',21.7],['SiO2',0.2]], 47.7),
  M('talc',        'Talc',                   'flux',   [['SiO2',63.5],['MgO',31.7],['CaO',0.2]], 4.6),
  M('magnesite',   'Magnesium carbonate',    'flux',   [['MgO',47.8]], 52.2),
  M('barium',      'Barium carbonate',       'flux',   [['BaO',77.7]], 22.3),
  M('strontium',   'Strontium carbonate',    'flux',   [['SrO',70.2]], 29.8),
  M('boneash',     'Bone ash',               'flux',   [['CaO',54.1],['P2O5',45.9]], 0),

  /* --- zinc / lead / bismuth --- */
  M('zinc',        'Zinc oxide',             'flux',   [['ZnO',100]], 0),
  M('leadbisil',   'Lead bisilicate frit',   'flux',   [['PbO',65.0],['SiO2',33.0],['Al2O3',1.5],['B2O3',0.5]], 0),
  M('bismuth',     'Bismuth trioxide',       'flux',   [['Bi2O3',100]], 0, 'Bi2O3. Melts 825 C. Strong flux at high loading; raises viscosity at low loading (Bi3+ field strength ~2.9 e/A).'),
  M('bismuthsub',  'Bismuth subnitrate',     'flux',   [['Bi2O3',79.5]], 20.5, 'Historical luster salt: decomposes to Bi2O3, easily reduced to metal by CO.'),

  /* --- boron --- */
  M('frit3134',    'Borax frit (3134)',      'flux',   [['SiO2',46.9],['B2O3',22.6],['CaO',20.4],['Na2O',9.3],['K2O',0.3],['Al2O3',0.1],['Fe2O3',0.05]], 0),
  M('gerstley',    'Gerstley borate',        'flux',   [['SiO2',22.0],['B2O3',21.0],['CaO',20.0],['Na2O',5.5],['MgO',2.0],['Al2O3',1.5],['Fe2O3',0.3]], 27.0),
  M('boricacid',   'Boric acid',             'flux',   [['B2O3',56.3]], 43.7),
  M('borax',       'Borax (decahydrate)',    'flux',   [['B2O3',36.5],['Na2O',16.3]], 47.2),

  /* --- alkali --- */
  M('sodaash',     'Soda ash',               'flux',   [['Na2O',58.5]], 41.5),
  M('potash',      'Potassium carbonate',    'flux',   [['K2O',68.2]], 31.8),
  M('lithium',     'Lithium carbonate',      'flux',   [['Li2O',40.4]], 59.6),

  /* --- opacifiers / oxides --- */
  M('tin',         'Tin oxide',              'opacifier', [['SnO2',100]], 0),
  M('zircopax',    'Zircon (Zircopax)',      'opacifier', [['ZrO2',65.0],['SiO2',33.0],['Al2O3',1.0],['Fe2O3',0.1]], 0),
  M('titania',     'Titanium dioxide',       'opacifier', [['TiO2',100]], 0),
  M('rutile',      'Rutile (raw)',           'opacifier', [['TiO2',95.0],['Fe2O3',1.5],['SiO2',1.0],['Al2O3',1.0]], 0, 'Raw rutile: acid-washed residues seed rutile needles.'),
  M('zirconia',    'Zirconium oxide',        'opacifier', [['ZrO2',99.0]], 0),
  M('ceria',       'Cerium oxide',           'opacifier', [['CeO2',99.0]], 0),

  /* --- colourants --- */
  M('ironred',     'Red iron oxide',         'colourant', [['Fe2O3',99.0],['SiO2',0.5]], 0.5),
  M('ironblack',   'Black iron oxide',       'colourant', [['Fe2O3',69.0],['FeO',31.0]], 0),
  M('cobaltcarb',  'Cobalt carbonate',       'colourant', [['CoO',63.0]], 37.0),
  M('cobaltox',    'Cobalt oxide',           'colourant', [['CoO',93.0]], 7.0),
  M('coppercarb',  'Copper carbonate',       'colourant', [['CuO',71.9]], 28.1),
  M('copperox',    'Copper oxide (black)',   'colourant', [['CuO',100]], 0),
  M('manganese',   'Manganese dioxide',      'colourant', [['MnO',81.6]], 18.4),
  M('mangancarb',  'Manganese carbonate',    'colourant', [['MnO',61.7]], 38.3),
  M('chrome',      'Chrome oxide',           'colourant', [['Cr2O3',99.0]], 1.0),
  M('nickel',      'Nickel oxide',           'colourant', [['NiO',99.0]], 1.0),
  M('vanadium',    'Vanadium pentoxide',     'colourant', [['V2O5',99.0]], 1.0),
  M('antimony',    'Antimony oxide',         'colourant', [['Sb2O3',99.0]], 1.0),
  M('silver',      'Silver oxide',           'colourant', [['Ag2O',99.0]], 1.0),
  M('praseo',      'Praseodymium oxide',     'colourant', [['Pr6O11',99.0]], 1.0),
  M('neodym',      'Neodymium oxide',        'colourant', [['Nd2O3',99.0]], 1.0),
  M('erbia',       'Erbium oxide',           'colourant', [['Er2O3',99.0]], 1.0),
  M('tungsten',    'Tungsten oxide',         'colourant', [['WO3',99.0]], 1.0),
  M('moly',        'Molybdenum oxide',       'colourant', [['MoO3',99.0]], 1.0),

  /* --- redox / special --- */
  M('sic',         'Silicon carbide',        'special', [['SiO2',2.0],['SiC',98.0]], 0, 'Consumes oxygen locally: the standard crystalline-glaze reduction trigger.'),
  M('tin_metal',   'Tin metal powder',       'special', [['SnO2',100]], 0, 'Sacrificial oxygen getter in reduction glazes.')
];

GC.MATERIAL_BY_ID = {};
GC.MATERIALS.forEach(function (m) { GC.MATERIAL_BY_ID[m.id] = m; });

/* ------------------------------------------------------------------ *
 *  Atmosphere presets -> effective "reduction strength" 0..1
 * ------------------------------------------------------------------ */
GC.ATMOSPHERES = [
  { id:'ox',   name:'Oxidation (clean air)',    strength:0.00, note:'pO2 ~ 0.21 atm; Fe stays Fe3+, Cu stays Cu2+, Bi stays Bi3+.' },
  { id:'neu',  name:'Neutral / light reduction',strength:0.28, note:'slightly starved air; Fe3+/Fe2+ boundary.' },
  { id:'red',  name:'Reduction (gas kiln)',     strength:0.58, note:'CO present; Fe2+ stable, Cu+ -> Cu0 begins, Bi3+ -> Bi0 begins.' },
  { id:'hred', name:'Heavy reduction',          strength:0.82, note:'strong CO/HC; Cu metal, Bi metal, Fe2+ dominant, Mn3+ -> Mn2+.' },
  { id:'wood', name:'Wood / soda (local redox)',strength:0.66, note:'fluctuating local reduction, strongest at the flame face.' }
];

/* cones for UI */
GC.CONE_LIST = ['06','05','04','03','02','01','1','2','3','4','5','6','7','8','9','10','11','12'];

GC.util = {
  clamp: function (x, a, b) { return x < a ? a : x > b ? b : x; },
  lerp: function (a, b, t) { return a + (b - a) * t; },
  sum: function (arr) { return arr.reduce(function (s, x) { return s + x; }, 0); },
  round: function (x, d) { var p = Math.pow(10, d); return Math.round(x * p) / p; }
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
