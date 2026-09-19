'use strict';
// Render saved Run 2 data. This does not execute the experiment.
const fs=require('node:fs'),crypto=require('node:crypto'),zlib=require('node:zlib');
const o=JSON.parse(fs.readFileSync('RUN2-RESULT.json','utf8'));
const first=JSON.parse(fs.readFileSync('FIRST-RUN.json','utf8'));
const rawBytes=fs.readFileSync('RUN2-RAW.json.gz');
const raw=JSON.parse(zlib.gunzipSync(rawBytes));
if(o.rows.length!==17||raw.rounds.length!==17||raw.rounds.some(r=>r.seeds.length!==100||r.pairs.length!==4950))throw Error('Raw shape mismatch');
for(let k=0;k<17;k++){
 const a=o.rows[k],b=first.rows[k];
 if(a.k!==b.k||Math.abs(a.s1S2.value-b.ab)>1e-12||Math.abs(a.lineageNullMean.value-b.an)>1e-12||Math.abs(a.s1Scramble.value-b.as)>1e-12)throw Error('Run 1 row mismatch at '+k);
}
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const f=n=>Number(n).toFixed(7),z=n=>typeof n==='number'?n.toFixed(2):String(n);
const lines=[
 '# Run 2 result', '',
 `**Verdict: ${o.verdict}.**`, '',
 `The sealed protocol was committed at \`${o.sealedProtocolCommit}\` before execution. The unchanged simulation source is commit \`${o.baseCommit}\`. Exactly 100 independently seeded NULL observations per round yielded 4,950 unordered null-null distances at each of 17 rounds. The raw seeds and pair distances are in \`RUN2-RAW.json.gz\`.`, '',
 'Round-level persistence required **both** S1-NULL and S2-NULL to be strictly above the round-specific null-null 99th percentile. The global survival rule required this at every below-perception round (k=8..16). Only S1 was above at k=8; S2 was inside. Neither was above at k=9..16. Therefore the predeclared survival rule fails.', '',
 '## Null floor and lineage comparison', '',
 'Distances use the committed Ω address metric. SD is sample SD, percentiles are nearest rank, and z(mean) is the standardized effect size of the mean of the two lineage-NULL distances relative to the null-null distribution. The JSON also records separate z values and 99% decisions for each lineage.', '',
 '| k | Null mean | Median | SD | p95 | p99 | Max | S1-NULL | S2-NULL | Their mean | z(mean) | Outside p99 (S1/S2) |',
 '|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:---:|'
];
for(const r of o.rows){const n=r.nullNull;lines.push(`| ${r.k} | ${f(n.mean)} | ${f(n.median)} | ${f(n.sd)} | ${f(n.p95)} | ${f(n.p99)} | ${f(n.max)} | ${f(r.s1Null.value)} | ${f(r.s2Null.value)} | ${f(r.lineageNullMean.value)} | ${z(r.lineageNullMean.standardized)} | ${r.s1Null.outside99?'Y':'N'}/${r.s2Null.outside99?'Y':'N'} |`)}
lines.push('', '## Identity and positive control', '',
 'S1-S2 first enters the null-null 99% envelope at k=7, when the material ratio equals the perception floor. S2-NULL enters at k=8, and both lineage-NULL comparisons are inside by k=9. Thus the Ω metric loses S1/S2 identity before it loses both lineage/null distinctions. The one-arm k=8 excess is not round-level persistence under the sealed rule.', '',
 '| k | S1-S2 | S1-SCRAMBLE | Identity outside p99 | Scramble outside p99 |',
 '|---:|---:|---:|:---:|:---:|');
for(const r of o.rows)lines.push(`| ${r.k} | ${f(r.s1S2.value)} | ${f(r.s1Scramble.value)} | ${r.s1S2.outside99?'Y':'N'} | ${r.k? r.s1Scramble.outside99?'Y':'N':'—'} |`);
lines.push('', 'After scrambling begins at k=1, S1-SCRAMBLE stays around 0.906–0.946 and exceeds the same null envelope in every round. This is the unchanged positive relational control.', '',
 '## Quantization check', '',
 'The committed `omegaDistance` counts shared address prefixes and the sum T of maximum address lengths over 256 entries × 3 faces, then returns `1 - shared/T`. For fixed T its mathematical lattice step is `1/T`; no metric was changed. The saved integer diagnostics exactly reproduce the committed metric.', '',
 'At tail round k=9, S1-NULL has 3 mismatches over T=3717, giving 0.0008071025020177647. S2-NULL has zero, so their mean is 0.00040355125100888234. A fixed T=3717 permits a one-count step of about 0.000269034; the observed nonzero distances often involve three or more mismatches because multiple addresses/faces can change together. At k=12, S1-NULL is 3/3717 and S2-NULL is 8/3719 (0.002151115891368627), whose mean is 0.0014791091966931957. The first-run 0.0013451708366962745 also equals 5/3717. These small tail values arise on finite address-count lattices and overlap the independently measured null-null floor.', '',
 '## Integrity and environment', '',
 `- Baseline source blob hashes: \`${JSON.stringify(o.sourceHashes)}\`.`,
 `- Sealed protocol blob SHA: \`${o.protocolBlobSha}\`.`,
 `- Run: ${o.startedAtUtc} to ${o.finishedAtUtc}; ${o.environment.platform}/${o.environment.arch}; OS ${o.environment.osRelease}; Node ${o.environment.node}; V8 ${o.environment.v8}.`,
 `- Original arm rows match all 17 rows in \`FIRST-RUN.json\` for S1-S2, mean lineage-NULL, and S1-SCRAMBLE. All original and additional null polyfill audits passed: ${o.rows.every(r=>r.audits.original.every(a=>a.pass)&&r.audits.nullAllPass)}.`,
 `- Console entries: ${o.console.length}; errors: ${o.errors.length}.`,
 `- \`RUN2-RESULT.json\` SHA-256: \`${sha(fs.readFileSync('RUN2-RESULT.json'))}\`.`,
 `- \`RUN2-RAW.json.gz\` SHA-256: \`${sha(rawBytes)}\`.`, '',
 'This experiment tests only the mathematical Ω simulation. The verdict is not evidence about real water, homeopathy, cancer, biology, or physical fields.', ''
);
fs.writeFileSync('RUN2-RESULT.md',lines.join('\n'));
