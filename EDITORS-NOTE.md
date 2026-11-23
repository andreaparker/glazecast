# Editor's note

README.md
- Cut the tagline and the "treated as mystery" opener. The intro now says what goes in and what comes out.
- Renamed "The case in the video" to "Worked example" and "Where it stops being a model" to "Next steps". Dropped "actually" from "What is computed".
- Took out lines that only set mood ("Each step is forced", "It beads", "The historical literature agrees", "send it to anyone"). The facts in them stay.
- The Glazy fitting paragraph is now item 3 of the list. No numbers, links or citations changed.

index.html
- Took em-dashes out of the title and the cooling options. Split the proposition, the hold note and the colophon into short sentences.
- Removed the bold on "calibrated" in the colophon.

structures.html
- Cut "not as recalled" and the em-dash from the lede. H1 is now "Unit cells".
- Card label "system" changed to "space group", because the value shown is the space group (e.g. "R -3 c").

src/60-ui.js
- Took em-dashes out of the TTT, kinetics and levers hints. Removed bold emphasis on "left" and on the nucleation time.
- Cut "those are the levers worth pulling" and "a chemistry problem, not a firing problem". Retitled the levers headings in plain words.

src/30-engine.js, src/50-render.js
- Header comments only. Removed the em-dashes, "Honesty note" and "canned art".

For the author to check (not changed)
- TTT hint: "appears if your cooling path passes to the left of its curve". The chart puts log time on x. A path that stays left of a C-curve has had less time than the phase needs, which normally means no crystal. The sentence may be inverted. Check it against the engine.
- I could not run `node tests/run.mjs` or `node build.mjs` in this session. dist/glazecast.html is stale until rebuilt.
