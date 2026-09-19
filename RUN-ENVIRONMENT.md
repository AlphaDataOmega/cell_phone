# First run record

- Repository: `AlphaDataOmega/cell_phone` (private GitHub repository)
- Commit: `6b75da086ba2c004c3ff87da3944c56af67d57f3` (`main` at retrieval)
- Source integrity: the seven retrieved files match their GitHub blob SHA-1 IDs, recorded in `FIRST-RUN.json`. No committed source file or control value was changed.
- Host: Windows x64, OS release `10.0.26200`.
- Capture runtime: Node.js `v22.18.0`, V8 `12.4.254.21-node.27`.
- Committed browser control values: 16 rounds, perception floor `1e-7`, noise `1e-8`.

The page was first loaded in the Codex in-app browser from a local HTTP server. Its automatic run completed with this rendered output: material `below perception`; S1/S2 distance `0.0000`; lineage/null distance `0.0008`; persistence `16 / 16 ✓`. The browser console log API returned no entries, including no errors.

The browser interface could read the rendered values but could not access the page's in-memory `cellPhoneLastRun` array. To preserve all 17 row objects, `capture-first-run.cjs` evaluated the same committed `omega.js`, `polyfill.js`, and `field.js` in their HTML order with a minimal DOM/canvas shim. It read the control values from the committed HTML. This was the first Node capture, after the browser load. Its rendered summary matched the browser's first load. `FIRST-RUN.json` contains the complete Node capture rows, its console entries and errors, environment, commit, and source hashes. The shim does not execute a real canvas or browser layout.

This is a mathematical simulation. Its output is not evidence of a physical, biological, homeopathic, or medical effect.
