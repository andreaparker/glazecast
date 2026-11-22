# Design brief — GLAZECAST

You are art-directing a single-page web tool. It already works; your job is to make it beautiful.

## What the page is

GLAZECAST predicts what crystal will grow on a pottery glaze. You type a glaze recipe, choose its
firing (cone / atmosphere / cooling), and it tells you the crystalline phase, its crystal system and
habit, the crystal size, the colour, and shows a simulated surface plus a time–temperature chart.

The audience is ceramicists and materials people. They are sceptical of hype and allergic to
dashboard chrome. The page should feel like an instrument made by someone with taste, not a startup
landing page.

## The one constraint that matters

**Do not change the engine or its interface.**
- Read-only: `src/00-core.js`, `src/10-phases.js`, `src/20-color.js`, `src/30-engine.js`,
  `src/40-presets.js`, `tests/`, `cli.mjs`, `build.mjs`.
- Editable: `index.html` (styles + static markup), `src/60-ui.js` (markup *strings* and class
  names only — every `document.getElementById` / query used there must keep working), and
  `src/50-render.js` (only the visual treatment of the canvas drawing; keep `GC.render.surface` and
  `GC.render.ttt` signatures).
- Every element id that `src/60-ui.js` looks up must still exist with the same id.
- All existing features must still work: 8 preset chips, recipe rows (add / edit / delete),
  cone + peak + atmosphere + cooling + hold controls, 4 tabs (Crystals / Kinetics / Chemistry /
  Levers), both canvases.
- **No network resources.** No CDN fonts, no external images, no icon libraries. It must look
  correct opened from `file://` with no internet. Use system font stacks and inline SVG/CSS.
- Must be readable at 1440×900 and stack into a single legible column at 900 px wide.

## Art direction

The reference world is *ceramic materials, kiln atmosphere, glaze chemistry*: iron oxide, bone ash,
cobalt, copper red, bismuth iridescence, kiln brick, graphite.

- **Register:** editorial and precise. Think a museum wall label next to a technical instrument.
  Closer to a Swiss poster or a lab notebook than to a product page.
- **Type:** a real hierarchy. A serif display face for the verdict and section openers (system
  stack: `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`), a monospace for all
  numbers and data (`ui-monospace, "SF Mono", Menlo`), and a neutral sans for prose. Use size,
  weight and letter-spacing to build hierarchy instead of boxes.
- **Palette:** warm near-black ground, bone/parchment ink, iron-grey secondary, and one kiln accent
  (amber) used sparingly — a highlight, not a theme. A secondary oxidised-teal is allowed for
  "super/success" data states. Avoid pure #000 and pure #fff.
- **Texture:** subtle, CSS-only. A faint grain (repeating-linear-gradient or an inline SVG filter),
  a soft vignette, a hairline rule system. Nothing glossy.
- **Space:** generous. The surface canvas is the hero and should feel like a plate on a wall, with
  air around it. Right now everything is packed into a 1440px two-column app shell; you may
  restructure into a scrolling editorial page (hero → instrument → evidence) as long as the
  controls stay adjacent to the results and nothing needs a click to become visible except tabs.
- **Motion:** restrained. A short reveal on load, smooth hover/underline states, a gentle cross-fade
  when tabs switch. No parallax, no bouncing, no gradient animations.
- **Data display:** numbers should read like an instrument — tabular numerals, consistent alignment,
  units in a lighter weight. Bars and ladders should be hairlines, not chunky pills.

## What to avoid (these are the AI-design tells)

- Centred hero + three rounded feature cards + big rounded CTA.
- Everything in rounded rectangles with soft drop shadows.
- Purple/blue gradients, glassmorphism, "glow" effects.
- Emoji as icons.
- Uniform 16px padding everywhere; no rhythm between sections.
- Gradient text, huge bold sans headlines, badge/pill soup.
- Cards inside cards inside cards.

Prefer: asymmetry, a strong left-aligned grid, hairline dividers, one accent colour, real negative
space, small caps for labels, numbers in mono.

## Suggested structure (you may improve it)

1. **Masthead** — wordmark, one-line proposition, and the dominant action (nothing to click; it is
   already live).
2. **Hero result** — the surface canvas large, the verdict headline set in the serif, the key facts
   in a quiet grid, the colour swatch.
3. **Instrument** — recipe + firing controls as a compact, precise panel (a lab bench, not a form).
4. **Evidence** — the tabs: ranked phases, TTT chart, chemistry, levers. Give the TTT chart room.
5. **Colophon** — the method note, set small and calm.

## Self-check before you finish

- Open `index.html` mentally and trace every id used in `src/60-ui.js`; none may be missing.
- `GC.render.surface` and `GC.render.ttt` still receive a canvas and a prediction, and still draw.
- No `@import`, no `url(http...)`, no `<link href="http...">`.
- Both canvases have explicit CSS height so they are not zero-height on first paint.
- Contrast: body text ≥ 4.5:1 against its background.

Work directly in the files. Do not ask questions; make the calls yourself and leave the page
looking like a designer did it.
