# Run 2 sealed protocol

Sealed before execution. Baseline source commit: `6b75da086ba2c004c3ff87da3944c56af67d57f3`. The three run 1 files added later do not change the experiment. Run 2 uses the byte-identical `omega.js`, `polyfill.js`, and `field.js`; none of their constants, algorithms, seeds, controls, arms, dilution, perception, or Ω distance representation will be edited.

## Fixed design

- Rounds: `k = 0..16`; perception floor `F = 1e-7`; noise `Q = 1e-8`.
- Original universe and arms: `W=env(17)`, `S1=W+perturb(101)`, `S2=W+perturb(211)`, `NULL=W`, `SCRAMBLE=S1`; original dilution and scramble functions and seeds. Original observation seeds at round `k`: S1 `1000+k`, S2 `2000+k`, NULL `3000+k`, SCRAMBLE `4000+k`.
- Additional null observations: exactly 100 per round. For `i=0..99`, perception-noise seed is `1000000 + 1000*k + i`. This seed schedule and count are fixed before viewing any run 2 distance.
- At each round, apply the original `see`, `omegaState`, and `omegaDistance` to every added null observation. Calculate all 4,950 unordered null-null pair distances. Save every seed and pair distance in compressed raw JSON.
- For the identity check, save the original S1-S2, S1-NULL, S2-NULL, S1-SCRAMBLE, and original first-run mean lineage-NULL distances at each round. Use the same Ω metric for every comparison. The 100 null observations are an independent reference set; the original NULL observation is not a member of it.

## Predeclared analysis

- For each round's 4,950 null-null distances, report arithmetic mean, median, sample standard deviation (`n-1`), nearest-rank 95th percentile (`ceil(0.95*n)`), nearest-rank 99th percentile (`ceil(0.99*n)`), and maximum.
- Report each lineage-NULL distance and their mean. Standardized separation for each lineage and the mean is `(observed - nullMean)/nullSampleSD`; if SD is zero, use `0` for equality, `Infinity` above, and `-Infinity` below. Also report raw differences from the null mean and 99th percentile.
- A lineage is outside the 99% null envelope only if its distance is **strictly greater** than that round's null-null 99th percentile. Equality is inside. Round-level `PERSISTENCE` requires **both** S1-NULL and S2-NULL outside the envelope. No distance-positive criterion is used.
- `10^-k < F` first holds at `k=8`, so `k=8..16` are post-perception rounds. For a global `SURVIVES RUN 2` verdict, both lineages must be outside the 99% null envelope at **every** post-perception round. Otherwise the global verdict is `CLOSED NEGATIVE — no demonstrated post-perception lineage persistence`. Report any mixed rounds explicitly.
- Identity is detectable at a round if S1-S2 is strictly greater than that round's 99% null-null percentile. Compare the first round where identity becomes undetectable with the first where both lineage-NULL comparisons are undetectable; also report mixed rounds. This is a metric-based detectability check, not a causal identity claim.
- The scramble arm is a positive relational control. Report its S1-SCRAMBLE distance and whether it exceeds the same 99% null envelope at each round after scrambling begins (`k>=1`). No tuning or rescue is allowed.
- Address quantization diagnostic: independently count the exact shared-prefix numerator and total maximum-address-length denominator used by `omegaDistance`, without replacing it. For selected tail distances, report the integer mismatch count, denominator, and `1/denominator` lattice step; compare to first-run tail increments.

## Execution and artifacts

The harness will evaluate the committed Ω and polyfill scripts plus the original `field.js` definitions before its auto-run function, then perform the fixed loop above once. It will write `RUN2-RESULT.json` (all round rows, statistics, verdict, environment, source hashes, console/errors), `RUN2-RAW.json.gz` (all null seeds and pairwise distances), and `RUN2-RESULT.md` (human-readable report). It will not rerun or alter this protocol after observing results. A fatal error will be preserved and reported; any rerun would require a new protocol/version.

This is only a mathematical Ω simulation. Neither verdict provides evidence about water, homeopathy, cancer, biology, or physical fields.
