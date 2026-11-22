/* GLAZECAST — presets: real, recognisable glaze behaviours used as both
 * starting points and regression cases.
 */
(function (root) {
'use strict';
var GC = root.GC = root.GC || {};

function R(a) { return a.map(function (x) { return { id: x[0], wt: x[1] }; }); }

GC.PRESETS = [
  {
    id: 'bi-red',
    name: 'Bismuth, reduced',
    tag: 'the video',
    blurb: 'Cone 6, reduction, slow cool. Bi2O3 reduces to metal; the metal beads, freezes as trigonal hopper plates, and tarnishes to a thin oxide film that interferes in colour.',
    recipe: R([['custer',30],['silica',20],['whiting',15],['kaolin',15],['frit3134',15],['zinc',5],['bismuth',6]]),
    firing: { cone:'6', peakC:1222, atmosphere:'red', cooling:'slow', holdC:1100, holdMin:60, soakMin:10 }
  },
  {
    id: 'bi-ox',
    name: 'Bismuth, oxidised',
    tag: 'the control',
    blurb: 'Same recipe, clean air. No metal: Bi3+ stays a lone-pair flux, stiffening the melt and tinting it faintly. This is the experiment most people run first and conclude "bismuth does nothing".',
    recipe: R([['custer',30],['silica',20],['whiting',15],['kaolin',15],['frit3134',15],['zinc',5],['bismuth',6]]),
    firing: { cone:'6', peakC:1222, atmosphere:'ox', cooling:'slow', holdC:1100, holdMin:60, soakMin:10 }
  },
  {
    id: 'zinc-crystal',
    name: 'Zinc crystalline',
    tag: 'willemite',
    blurb: '25% ZnO and a long hold at 1100 C. Willemite nucleates at the free surface and grows inward as radiating spherulites.',
    recipe: R([['custer',20],['silica',20],['whiting',10],['kaolin',10],['zinc',25],['frit3134',15]]),
    firing: { cone:'6', peakC:1222, atmosphere:'ox', cooling:'vslow', holdC:1100, holdMin:90, soakMin:10 }
  },
  {
    id: 'tenmoku',
    name: 'Tenmoku',
    tag: 'Fe3O4',
    blurb: 'Cone 10, reduction. Iron drops to Fe2+, magnetite exsolves on cooling, and the surface goes black with a metallic sheen that breaks to rust on the edges.',
    recipe: R([['custer',30],['silica',25],['whiting',15],['kaolin',10],['ironred',10],['dolomite',5],['bentonite',2]]),
    firing: { cone:'10', peakC:1305, atmosphere:'red', cooling:'slow', holdC:1150, holdMin:30, soakMin:10 }
  },
  {
    id: 'copper-red',
    name: 'Copper red',
    tag: 'colloid',
    blurb: '0.5% CuO, heavy reduction, fast cool. Copper metal condenses as 10-40 nm colloids whose plasmon absorption eats green and leaves ruby.',
    recipe: R([['custer',30],['silica',25],['whiting',15],['kaolin',10],['frit3134',10],['zinc',5],['coppercarb',0.5]]),
    firing: { cone:'10', peakC:1305, atmosphere:'hred', cooling:'fast', holdC:1150, holdMin:0, soakMin:10 }
  },
  {
    id: 'chrome-tin',
    name: 'Chrome-tin pink',
    tag: 'pigment',
    blurb: 'Cr3+ substituted into cassiterite, charge-balanced by Ca. Needs oxidation: reduce it and the pink turns muddy green.',
    recipe: R([['custer',30],['silica',22],['whiting',18],['kaolin',12],['tin',8],['chrome',0.3],['zinc',5]]),
    firing: { cone:'6', peakC:1222, atmosphere:'ox', cooling:'normal', holdC:1100, holdMin:20, soakMin:10 }
  },
  {
    id: 'rutile-blue',
    name: 'Rutile blue',
    tag: 'needles',
    blurb: 'Raw rutile never dissolves at cone 6, so it seeds itself. In reduction the Ti-Fe pair tints the needles blue-grey; in oxidation you get cream.',
    recipe: R([['custer',30],['silica',22],['whiting',14],['kaolin',12],['rutile',6],['ironred',2],['zinc',4]]),
    firing: { cone:'6', peakC:1222, atmosphere:'red', cooling:'slow', holdC:1100, holdMin:30, soakMin:10 }
  },
  {
    id: 'clear',
    name: 'Cone 6 clear',
    tag: 'baseline',
    blurb: 'A well-behaved glossy base. Nothing saturates, nothing nucleates: the useful null result.',
    recipe: R([['custer',30],['silica',20],['whiting',15],['kaolin',15],['frit3134',15],['zinc',5]]),
    firing: { cone:'6', peakC:1222, atmosphere:'ox', cooling:'normal', holdC:1100, holdMin:0, soakMin:10 }
  }
];

GC.PRESET_BY_ID = {};
GC.PRESETS.forEach(function (p) { GC.PRESET_BY_ID[p.id] = p; });

})(typeof globalThis !== 'undefined' ? globalThis : this);
