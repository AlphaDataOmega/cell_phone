# Run 2 result

**Verdict: CLOSED NEGATIVE — no demonstrated post-perception lineage persistence.**

The sealed protocol was committed at `c1a40ad827004d4e8e37a629a2904c8abe2c1a9b` before execution. The unchanged simulation source is commit `6b75da086ba2c004c3ff87da3944c56af67d57f3`. Exactly 100 independently seeded NULL observations per round yielded 4,950 unordered null-null distances at each of 17 rounds. The raw seeds and pair distances are in `RUN2-RAW.json.gz`.

Round-level persistence required **both** S1-NULL and S2-NULL to be strictly above the round-specific null-null 99th percentile. The global survival rule required this at every below-perception round (k=8..16). Only S1 was above at k=8; S2 was inside. Neither was above at k=9..16. Therefore the predeclared survival rule fails.

## Null floor and lineage comparison

Distances use the committed Ω address metric. SD is sample SD, percentiles are nearest rank, and z(mean) is the standardized effect size of the mean of the two lineage-NULL distances relative to the null-null distribution. The JSON also records separate z values and 99% decisions for each lineage.

| k | Null mean | Median | SD | p95 | p99 | Max | S1-NULL | S2-NULL | Their mean | z(mean) | Outside p99 (S1/S2) |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:---:|
| 0 | 0.0005582 | 0.0008071 | 0.0005873 | 0.0021511 | 0.0021511 | 0.0021511 | 0.9480488 | 0.9474199 | 0.9477343 | 1612.80 | Y/Y |
| 1 | 0.0005582 | 0.0008071 | 0.0005850 | 0.0021511 | 0.0021511 | 0.0021511 | 0.9456947 | 0.9456947 | 0.9456947 | 1615.52 | Y/Y |
| 2 | 0.0005352 | 0.0008071 | 0.0005638 | 0.0013452 | 0.0021511 | 0.0021511 | 0.9438976 | 0.9444581 | 0.9441779 | 1673.63 | Y/Y |
| 3 | 0.0005308 | 0.0008071 | 0.0005637 | 0.0013452 | 0.0021511 | 0.0021511 | 0.9332674 | 0.9308893 | 0.9320783 | 1652.64 | Y/Y |
| 4 | 0.0005593 | 0.0008071 | 0.0005870 | 0.0021511 | 0.0021511 | 0.0021511 | 0.7123322 | 0.7143214 | 0.7133268 | 1214.28 | Y/Y |
| 5 | 0.0005326 | 0.0008071 | 0.0005637 | 0.0013452 | 0.0021511 | 0.0021511 | 0.4228703 | 0.4243354 | 0.4236028 | 750.59 | Y/Y |
| 6 | 0.0005504 | 0.0008071 | 0.0005841 | 0.0021511 | 0.0021511 | 0.0021511 | 0.0752916 | 0.0791843 | 0.0772380 | 131.30 | Y/Y |
| 7 | 0.0005340 | 0.0008071 | 0.0005637 | 0.0013452 | 0.0021511 | 0.0021511 | 0.0072522 | 0.0088614 | 0.0080568 | 13.35 | Y/Y |
| 8 | 0.0005340 | 0.0008071 | 0.0005668 | 0.0013452 | 0.0021511 | 0.0021511 | 0.0029562 | 0.0008071 | 0.0018816 | 2.38 | Y/N |
| 9 | 0.0005286 | 0.0008071 | 0.0005692 | 0.0013452 | 0.0021511 | 0.0021511 | 0.0008071 | 0.0000000 | 0.0004036 | -0.22 | N/N |
| 10 | 0.0005549 | 0.0008071 | 0.0006000 | 0.0021511 | 0.0021511 | 0.0021511 | 0.0008071 | 0.0008071 | 0.0008071 | 0.42 | N/N |
| 11 | 0.0005582 | 0.0008071 | 0.0005873 | 0.0021511 | 0.0021511 | 0.0021511 | 0.0008071 | 0.0000000 | 0.0004036 | -0.26 | N/N |
| 12 | 0.0005113 | 0.0008071 | 0.0005399 | 0.0013452 | 0.0021511 | 0.0021511 | 0.0008071 | 0.0021511 | 0.0014791 | 1.79 | N/N |
| 13 | 0.0005549 | 0.0008071 | 0.0005881 | 0.0021511 | 0.0021511 | 0.0021511 | 0.0008071 | 0.0000000 | 0.0004036 | -0.26 | N/N |
| 14 | 0.0005365 | 0.0008071 | 0.0005651 | 0.0013452 | 0.0021511 | 0.0021511 | 0.0008071 | 0.0008071 | 0.0008071 | 0.48 | N/N |
| 15 | 0.0005340 | 0.0008071 | 0.0005714 | 0.0021511 | 0.0021511 | 0.0021511 | 0.0008071 | 0.0000000 | 0.0004036 | -0.23 | N/N |
| 16 | 0.0005567 | 0.0008071 | 0.0005877 | 0.0021511 | 0.0021511 | 0.0021511 | 0.0008071 | 0.0008071 | 0.0008071 | 0.43 | N/N |

## Identity and positive control

S1-S2 first enters the null-null 99% envelope at k=7, when the material ratio equals the perception floor. S2-NULL enters at k=8, and both lineage-NULL comparisons are inside by k=9. Thus the Ω metric loses S1/S2 identity before it loses both lineage/null distinctions. The one-arm k=8 excess is not round-level persistence under the sealed rule.

| k | S1-S2 | S1-SCRAMBLE | Identity outside p99 | Scramble outside p99 |
|---:|---:|---:|:---:|:---:|
| 0 | 0.2631579 | 0.0000000 | Y | — |
| 1 | 0.2350532 | 0.9459787 | Y | Y |
| 2 | 0.2294766 | 0.9409035 | Y | Y |
| 3 | 0.2408219 | 0.9396338 | Y | Y |
| 4 | 0.0820621 | 0.9144899 | Y | Y |
| 5 | 0.0099596 | 0.9146732 | Y | Y |
| 6 | 0.0042861 | 0.9062958 | Y | Y |
| 7 | 0.0016133 | 0.9111762 | N | Y |
| 8 | 0.0021511 | 0.9316049 | N | Y |
| 9 | 0.0008071 | 0.9094912 | N | Y |
| 10 | 0.0000000 | 0.9111494 | N | Y |
| 11 | 0.0008071 | 0.9082636 | N | Y |
| 12 | 0.0013452 | 0.9191395 | N | Y |
| 13 | 0.0008071 | 0.9134710 | N | Y |
| 14 | 0.0000000 | 0.9071012 | N | Y |
| 15 | 0.0008071 | 0.9082840 | N | Y |
| 16 | 0.0000000 | 0.9140025 | N | Y |

After scrambling begins at k=1, S1-SCRAMBLE stays around 0.906–0.946 and exceeds the same null envelope in every round. This is the unchanged positive relational control.

## Quantization check

The committed `omegaDistance` counts shared address prefixes and the sum T of maximum address lengths over 256 entries × 3 faces, then returns `1 - shared/T`. For fixed T its mathematical lattice step is `1/T`; no metric was changed. The saved integer diagnostics exactly reproduce the committed metric.

At tail round k=9, S1-NULL has 3 mismatches over T=3717, giving 0.0008071025020177647. S2-NULL has zero, so their mean is 0.00040355125100888234. A fixed T=3717 permits a one-count step of about 0.000269034; the observed nonzero distances often involve three or more mismatches because multiple addresses/faces can change together. At k=12, S1-NULL is 3/3717 and S2-NULL is 8/3719 (0.002151115891368627), whose mean is 0.0014791091966931957. The first-run 0.0013451708366962745 also equals 5/3717. These small tail values arise on finite address-count lattices and overlap the independently measured null-null floor.

## Integrity and environment

- Baseline source blob hashes: `{"omega.js":"52b28ed7f9f920beb2fc8ce9d99485a0763bc453","polyfill.js":"f8e5b499c57541727ca8509f1ca8fe9afcbac5ca","field.js":"9443ce6106c2ed84ca5b4d8e3ec49799105d08aa","index.html":"b28c8c5d51849bb2b3d1b84d87fac811bc3ec9e7"}`.
- Sealed protocol blob SHA: `ae37e2c1f67797988ceb1341c08417579c3858eb`.
- Run: 2026-09-19T08:27:12.887Z to 2026-09-19T08:33:23.374Z; win32/x64; OS 10.0.26200; Node v22.18.0; V8 12.4.254.21-node.27.
- Original arm rows match all 17 rows in `FIRST-RUN.json` for S1-S2, mean lineage-NULL, and S1-SCRAMBLE. All original and additional null polyfill audits passed: true.
- Console entries: 0; errors: 0.
- `RUN2-RESULT.json` SHA-256: `775c97f5b015cdadef43c223abf744b88657854642c2229cac1a7b586a58dce6`.
- `RUN2-RAW.json.gz` SHA-256: `007d963686bd964d79064c4d000b4bff007a87ae806ddd5176d9a8f846ece019`.

This experiment tests only the mathematical Ω simulation. The verdict is not evidence about real water, homeopathy, cancer, biology, or physical fields.
