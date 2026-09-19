'use strict';
// Execute RUN2-PROTOCOL.md exactly once. Do not edit after results are seen.
const fs = require('node:fs');
const vm = require('node:vm');
const os = require('node:os');
const cp = require('node:child_process');
const zlib = require('node:zlib');

const BASE_COMMIT = '6b75da086ba2c004c3ff87da3944c56af67d57f3';
const SEALED_COMMIT = 'c1a40ad827004d4e8e37a629a2904c8abe2c1a9b';
const EXPECTED = {
  'omega.js': '52b28ed7f9f920beb2fc8ce9d99485a0763bc453',
  'polyfill.js': 'f8e5b499c57541727ca8509f1ca8fe9afcbac5ca',
  'field.js': '9443ce6106c2ed84ca5b4d8e3ec49799105d08aa',
  'index.html': 'b28c8c5d51849bb2b3d1b84d87fac811bc3ec9e7'
};
const sourceHashes = Object.fromEntries(Object.keys(EXPECTED).map(file =>
  [file, cp.execFileSync('git', ['hash-object', file], {encoding:'utf8'}).trim()]));
for (const [file, hash] of Object.entries(EXPECTED)) {
  if (sourceHashes[file] !== hash) throw new Error(`Source hash mismatch: ${file}`);
}
const protocolHash = cp.execFileSync('git', ['hash-object', 'RUN2-PROTOCOL.md'], {encoding:'utf8'}).trim();
if (protocolHash !== 'ae37e2c1f67797988ceb1341c08417579c3858eb') throw new Error('Sealed protocol hash mismatch');
if (fs.existsSync('RUN2-RESULT.json') || fs.existsSync('RUN2-RAW.json.gz')) throw new Error('Run 2 output already exists; refusing rerun');

const consoleEntries = [], errors = [];
const capturedConsole = Object.fromEntries(['log','info','warn','error','debug'].map(level =>
  [level, (...args) => consoleEntries.push({level, message: args.map(String).join(' ')})]));
const context = vm.createContext({console: capturedConsole, TextEncoder, TextDecoder});
let rows = [], rawRounds = [];
const startedAtUtc = new Date().toISOString();
const R = 16, F = 1e-7, Q = 1e-8, REPLICATES = 100;
const quantile = (sorted, p) => sorted[Math.ceil(p * sorted.length) - 1];
function stats(values) {
  const sorted = values.slice().sort((a,b) => a-b), n=sorted.length;
  const mean = values.reduce((a,b)=>a+b,0)/n;
  const sd = Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/(n-1));
  return {count:n, mean, median:(sorted[(n/2)-1]+sorted[n/2])/2,
    sd, p95:quantile(sorted,.95), p99:quantile(sorted,.99), max:sorted[n-1]};
}
function effect(value, s) {
  const differenceFromMean=value-s.mean, differenceFromP99=value-s.p99;
  const z=s.sd ? differenceFromMean/s.sd : (differenceFromMean===0 ? 0 : differenceFromMean>0 ? '+Infinity' : '-Infinity');
  return {value, differenceFromMean, differenceFromP99, standardized:z, outside99:value>s.p99};
}
function counts(x,y) {
  let shared=0,total=0;
  for(let b=0;b<256;b++) for(let f=0;f<3;f++) {
    const u=x.addr[b][f]||[],v=y.addr[b][f]||[],m=Math.max(u.length,v.length);
    total+=m;
    let k=0;while(k<Math.min(u.length,v.length)&&u[k]===v[k])k++;
    shared+=k;
  }
  return {shared,total,mismatch:total-shared,latticeStep:total?1/total:0,derivedDistance:total?1-shared/total:0};
}
try {
  vm.runInContext(fs.readFileSync('omega.js','utf8'), context, {filename:'omega.js'});
  vm.runInContext(fs.readFileSync('polyfill.js','utf8'), context, {filename:'polyfill.js'});
  const field=fs.readFileSync('field.js','utf8');
  const marker='function run(){';
  const at=field.indexOf(marker);
  if(at<0) throw new Error('Original run marker missing');
  vm.runInContext(field.slice(0,at), context, {filename:'field.js'});
  const {env,perturb,add,dilute,see,scramble,omegaState,omegaDistance}=vm.runInContext(
    '({env,perturb,add,dilute,see,scramble,omegaState,omegaDistance})',context);
  const W=env(17);
  let A=add(W,perturb(101)),B=add(W,perturb(211)),C=W.slice(),S=A.slice();
  for(let k=0;k<=R;k++) {
    const a=omegaState(see(A,F,Q,1000+k));
    const b=omegaState(see(B,F,Q,2000+k));
    const c=omegaState(see(C,F,Q,3000+k));
    const s=omegaState(see(S,F,Q,4000+k));
    const originalAudit=[a,b,c,s].map(x=>x.audit);
    const ab=omegaDistance(a,b).distance,ac=omegaDistance(a,c).distance;
    const bc=omegaDistance(b,c).distance,as=omegaDistance(a,s).distance;
    const nulls=[],seeds=[];
    for(let i=0;i<REPLICATES;i++) {
      const seed=1000000+1000*k+i;
      seeds.push(seed);
      nulls.push(omegaState(see(C,F,Q,seed)));
    }
    const nullAudits=nulls.map(x=>x.audit);
    const pairs=[],distances=[];
    for(let i=0;i<REPLICATES;i++) for(let j=i+1;j<REPLICATES;j++) {
      const d=omegaDistance(nulls[i],nulls[j]).distance;
      pairs.push([i,j,d]);distances.push(d);
    }
    const st=stats(distances), ca=counts(a,c),cb=counts(b,c);
    if(Math.abs(ca.derivedDistance-ac)>1e-12 || Math.abs(cb.derivedDistance-bc)>1e-12)
      throw new Error(`Count diagnostic does not match original metric at k=${k}`);
    const eA=effect(ac,st),eB=effect(bc,st),eMean=effect((ac+bc)/2,st);
    rows.push({k,materialRatio:10**(-k),belowPerception:10**(-k)<F,
      nullNull:st, s1Null:eA,s2Null:eB,lineageNullMean:eMean,
      s1S2:effect(ab,st),s1Scramble:effect(as,st),
      persistenceBoth:eA.outside99&&eB.outside99,
      audits:{original:originalAudit,nullAllPass:nullAudits.every(x=>x.pass),nullFailures:nullAudits.map((v,i)=>v.pass?null:{i,...v}).filter(Boolean)},
      quantization:{s1Null:ca,s2Null:cb}});
    rawRounds.push({k,seeds,pairs});
    if(k<R){A=dilute(A,W);B=dilute(B,W);C=dilute(C,W);S=scramble(dilute(S,W),7000+k)}
  }
} catch(error) {
  errors.push({name:error.name,message:error.message,stack:error.stack});
}
const post=rows.filter(r=>r.belowPerception);
const survives=errors.length===0 && post.length===9 && post.every(r=>r.persistenceBoth);
const verdict=survives ? 'SURVIVES RUN 2 — post-perception relational persistence remains unexplained' :
  'CLOSED NEGATIVE — no demonstrated post-perception lineage persistence';
const identityLoss=rows.find(r=>!r.s1S2.outside99)?.k ?? null;
const bothNullLoss=rows.find(r=>!r.s1Null.outside99&&!r.s2Null.outside99)?.k ?? null;
const result={repository:'AlphaDataOmega/cell_phone',baseCommit:BASE_COMMIT,sealedProtocolCommit:SEALED_COMMIT,
  protocolBlobSha:protocolHash,startedAtUtc,finishedAtUtc:new Date().toISOString(),
  environment:{platform:process.platform,arch:process.arch,osRelease:os.release(),node:process.version,v8:process.versions.v8,
    execution:'Node vm; original Ω, polyfill, and field definitions; no DOM/canvas; one sealed run'},
  sourceHashes,settings:{rounds:R,perceptionFloor:F,noise:Q,nullObservationsPerRound:REPLICATES,
    nullSeedFormula:'1000000 + 1000*k + i, i=0..99',pairsPerRound:4950,
    percentile:'nearest rank',sd:'sample',envelope:'strictly greater than round-specific null-null p99',
    globalRule:'both lineages outside p99 at every k=8..16'},
  verdict:errors.length ? 'RUN FAILED — no scientific verdict' : verdict,
  identityLossRound:identityLoss,bothLineageNullLossRound:bothNullLoss,
  rows,rawArtifact:'RUN2-RAW.json.gz',console:consoleEntries,errors};
fs.writeFileSync('RUN2-RAW.json.gz',zlib.gzipSync(Buffer.from(JSON.stringify({format:'null seeds and unordered pair distances [i,j,d]',rounds:rawRounds})),{level:9}));
fs.writeFileSync('RUN2-RESULT.json',JSON.stringify(result,null,2)+'\n');
if(errors.length)process.exitCode=1;
