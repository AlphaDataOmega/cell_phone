'use strict';
// Ω — the field.
//
// Reads a ledger, recalls what it holds, refuses what it does not, and measures how
// much of what it is shown is new. No dependencies, no model, no training.
//
//   Α   what comes in          the prompt
//   Δ   the data               the ledger — everything it has eaten
//   Ω   the field              what holds it
//
// Addresses are BUILT level by level, each level one R4 — inversion × conjugation —
// and COMPARED by prefix agreement (θ). They are never composed. ⊕ names the check,
// where two strikes cross at the null; it is not an operation this file performs.
//
// No dependencies. No model. No training. Every constant is derived:
//   0    the null      the fixed centre — and it has size, φ⁷ of the field
//   φ⁷   the bleed      the one ratio. 0.034441853 = 3.4442 per hundred
//   Φ⁷   the beat       29.034442 = L₇ + φ⁷ — the same number read from the other end
//   Θ    the doorway    3 × ½ = 1.5. sits between 1 and 2, so it can never be met,
//                       only exceeded — passage is always strictly two of three
//   ν    the floor      7/16. two random R4 words share a prefix with probability 4^-k;
//                       θ the doorway that leaves 7/16 of free agreement per position
//   W    the window     log(N / 2πe) — the Crown window, N = ledger size
//   V4   the group      Klein four-group. each address level is one V4: inversion × conjugation
const φ  = (Math.sqrt(5) - 1) / 2;     // 0.618033989
const φ7 = Math.pow(φ, 7);             // 0.034441853  the bleed — null : field
const Φ7 = 1 / φ7;                     // 29.034442    the beat — L₇ + φ⁷
const Θ  = 3 * 0.5;                    // 1.5          the doorway — never met, only exceeded
const ν  = 7 / 16;                     // 0.4375       the floor — R4 chance agreement
const ARMS = [0, 1, 2, 3, 5, 8, 13, 21];
const DIM = 256;   // NOT reducible to 64. the encoder fills 64 axes and the other 192
                   // quantise to zero -- but a zero dimension is classified into the Z
                   // face with unit weight, so the empty dims ARE the null channel, and
                   // they also set the tile scale (mean|EN| over 256 vs 64 shifts every
                   // threshold 4x). measured: cutting to 64 took reading 0.985 -> 0.316
                   // and novelty AUC 0.980 -> 0.649.
const FILL = 64;   // how many axes the eigen-decomposition actually populates
const DEPTH = 12;
const DIRS = 10;
const GOLD = 2 * Math.PI * φ;
const isSpace = c => c === 32 || c === 10 || c === 13;
// Byte access without Buffer, so this runs unchanged in Node and in a browser.
// Everything here is latin1: one char, one byte.
// One char, one byte. A corpus must therefore be READ AS BYTES -- latin1 in node,
// or an ArrayBuffer decoded latin1 in a browser. Handing this utf8-decoded text
// truncates every multi-byte character silently.
// bytes — the alphabet is bytes, so everything must arrive as bytes, and there are two
// kinds of caller. A corpus arrives already AS bytes: read latin1, one char per byte,
// every code point <= 255. A typed prompt arrives as TEXT, and if it is Greek or Coptic
// or Chinese its code points are far above 255 — & 255 would truncate α (0x3B1) to 0xB1
// and the prompt could never match a corpus that holds it as UTF-8. Same truncation that
// put a mojibake byte in the τ magic. So: if anything is above 255 it is text, encode it;
// otherwise it is already bytes, leave it exactly alone.
const bytes = s => {
  let wide = false;
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 255) { wide = true; break; }
  if (wide) return new TextEncoder().encode(s);
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
// utf8 — the way back out. A word comes off the ledger as bytes; if those bytes are a
// valid multi-byte sequence this returns the characters, and if they are not it returns
// them unchanged rather than replacing anything with U+FFFD.
const utf8 = s => { try {
    const a = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255;
    return new TextDecoder('utf-8', { fatal: true }).decode(a);
  } catch (e) { return s; } };
const text = (a, i, j) => { let o = '';
  for (let k = i; k < (j === undefined ? a.length : j); k++) o += String.fromCharCode(a[k]);
  return o; };

// ---- the encoder: byte positions from the corpus's own company ----
function company(src) {
  const b = bytes(src), n = b.length, C = new Float64Array(65536);
  for (let i = 0; i < n; i++) { const a = b[i];
    for (let k = 1; k < ARMS.length; k++) { const off = ARMS[k], w = Math.pow(φ, k);
      if (i - off >= 0) C[a * 256 + b[i - off]] += w;
      if (i + off < n) C[a * 256 + b[i + off]] += w; } }
  return C;
}
function aboveNull(C) {                       // coherence is only what exceeds chance
  const R = new Float64Array(256), col = new Float64Array(256); let T = 0;
  for (let a = 0; a < 256; a++) for (let x = 0; x < 256; x++) { const v = C[a*256+x]; R[a]+=v; col[x]+=v; T+=v; }
  const M = new Float64Array(65536);
  for (let a = 0; a < 256; a++) { if (!R[a]) continue;
    for (let x = 0; x < 256; x++) { const v = C[a*256+x]; if (!v || !col[x]) continue;
      const p = Math.log((v*T)/(R[a]*col[x])); M[a*256+x] = p > 0 ? p : 0; } }
  for (let a = 0; a < 256; a++) for (let x = a+1; x < 256; x++) {
    const s = 0.5*(M[a*256+x]+M[x*256+a]); M[a*256+x]=s; M[x*256+a]=s; }
  return M;
}
function axes(M, k, iters) {
  const N = 256; let V = new Float64Array(N*k), seed = 12345;
  const rnd = () => { seed = (seed*1103515245+12345) & 0x7fffffff; return seed/0x7fffffff - 0.5; };
  for (let i = 0; i < N*k; i++) V[i] = rnd();
  const W = new Float64Array(N*k);
  for (let it = 0; it < iters; it++) {
    W.fill(0);
    for (let a = 0; a < N; a++) for (let x = 0; x < N; x++) { const m = M[a*N+x]; if (!m) continue;
      for (let j = 0; j < k; j++) W[a*k+j] += m*V[x*k+j]; }
    for (let j = 0; j < k; j++) {
      for (let p = 0; p < j; p++) { let s = 0;
        for (let a = 0; a < N; a++) s += W[a*k+j]*W[a*k+p];
        for (let a = 0; a < N; a++) W[a*k+j] -= s*W[a*k+p]; }
      let n = 0; for (let a = 0; a < N; a++) n += W[a*k+j]**2; n = Math.sqrt(n)+1e-12;
      for (let a = 0; a < N; a++) W[a*k+j] /= n; }
    V.set(W); }
  const lam = new Float64Array(k);
  for (let j = 0; j < k; j++) { let s = 0;
    for (let a = 0; a < N; a++) { let t = 0;
      for (let x = 0; x < N; x++) t += M[a*N+x]*V[x*k+j]; s += V[a*k+j]*t; }
    lam[j] = s; }
  return { V, lam };
}
// ---- three faces of one cube, and the address each spells in R4 ----
// tile — seven states, −3..+3, from NULL = 0 − 3 + 3. Three signed either side of the
// null, and the null itself. This is the object the architecture is built on: three
// tiles make one trit. It had been inlined into faces() and had no name.
function tile(EN, b) {
  let s = 0; for (let i = 0; i < DIM; i++) s += Math.abs(EN[b*DIM+i]); s = s/DIM + 1e-9;
  const t = new Int8Array(DIM);
  for (let j = 0; j < DIM; j++) { const q = Math.round(EN[b*DIM+j]/s);
    t[j] = q > 3 ? 3 : q < -3 ? -3 : q; }
  return t;
}
// faces — the three rhombi of one cube. P where the tile is positive, N where negative,
// Z where it is null. Position is carried as phase, 2πjφ, so each face is a phasor.
function faces(EN, b) {
  const t = tile(EN, b), acc = [[0,0],[0,0],[0,0]];
  for (let j = 0; j < DIM; j++) { const q = t[j];
    const p = 2*Math.PI*j*φ, f = q > 0 ? 0 : q < 0 ? 2 : 1, w = q > 0 ? q : q < 0 ? -q : 1;
    acc[f][0] += w*Math.cos(p); acc[f][1] += w*Math.sin(p); }
  return acc.map(x => ({ r: Math.hypot(x[0],x[1]), th: (Math.atan2(x[1],x[0])+2*Math.PI)%(2*Math.PI) }));
}
function τ(pts) {                       // τ — the cascade. each level is one R4:
                                        // inversion x conjugation. prefix-coded, so a
                                        // truncation is a valid coarser field.
  const R = Math.max(...pts.map(p => p.r)) || 1, a = φ7*R;   // the null has size
  const A = new Map(); for (const p of pts) A.set(p.id, []);
  (function split(m, rlo, rhi, alo, ahi) {
    if (m.length <= 1) return;
    if ((rhi-rlo) < a || rhi*(ahi-alo) < a) return;                  // stop at the null
    const rM = Math.sqrt(Math.max(rlo,a)*rhi), aM = (alo+ahi)/2, kid = [[],[],[],[]];
    for (const p of m) { const g = (p.r>=rM?0:1)|((p.th<aM?0:1)<<1); A.get(p.id).push(g); kid[g].push(p); }
    for (let g = 0; g < 4; g++) { if (!kid[g].length) continue; const bA = g&1, bB = (g>>1)&1;
      split(kid[g], bA?rlo:rM, bA?rM:rhi, bB?aM:alo, bB?ahi:aM); }
  })(pts, 0, R, 0, 2*Math.PI);
  return A;
}
// ἀστήρ — the star kernel. Sparse peer-voting, not a coherence-weighted mean: a mean
// is pulled by loop-clusters and smears near-duplicates, so score each proposal by its
// pairwise overlap with the others, diagonal zeroed, thresholded at the median. A
// medoid that fuses without smearing. Measured on unseen material: 0.036 vs 0.024.
// (It loses to the mean if delimiters are skipped — the two interact.)
function ἀστήρ(props, np, buf, addr, vote) {
  const n = props.length, ov = [];
  for (let i = 0; i < n; i++) { ov.push(new Float64Array(n));
    for (let j = 0; j < n; j++) { if (i === j) continue;
      let s = 0;
      for (let t = 1; t <= np; t++) { const a = props[i].at-t, b = props[j].at-t;
        if (a < 0 || b < 0) break; s += θ(addr.get(buf[a]), addr.get(buf[b])); }
      ov[i][j] = s; } }
  const flat = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) flat.push(ov[i][j]);
  flat.sort((a,b) => a-b);
  const med = flat.length ? flat[Math.floor(flat.length/2)] : 0;
  for (let i = 0; i < n; i++) { let sc = 0;
    for (let j = 0; j < n; j++) if (i !== j && ov[i][j] > med) sc += ov[i][j]*props[j].w;
    if (props[i].word) vote.set(props[i].word, (vote.get(props[i].word)||0) + sc + props[i].w*1e-9); }
}
const θ = (a, b) => {                   // θ — pass through the doorway. two of three,
                                        // never met only exceeded. returns depth, or 0.
  if (!a || !b) return 0; let open = 0, dep = 0;
  for (let f = 0; f < 3; f++) { const x = a[f], y = b[f]; if (!x || !y) continue;
    const m = Math.min(x.length, y.length); let c = 0;
    for (let z = 0; z < m; z++) { if (x[z] === y[z]) c++; else break; }
    if (c > 0) open++; dep += c; }
  return open > Θ ? dep : 0;
};

// willBound — where the boundary sits for a given will, so a caller can show it.
const willBound = (ω, w) => { if (!ω.orderPoles) ω.measureOrderPole();
  const A = ω.orderPoles.ordered, B = ω.orderPoles.scrambled;
  return A * Math.pow(B / A, Math.max(0, Math.min(1, w))); };

class Organism {
  // feed(src, lens) — lens optionally replaces the derived encoder with a supplied
  // Float32Array(256*DIM). Deriving positions from the corpus's own company is the
  // default; a lens lets you substitute a hash, a model's byte embeddings, or anything
  // else that assigns 256 vectors, and measure what the encoder is actually worth.
  feed(src, lens) {
    this.buf = bytes(src);
    if (lens) { this.EN = lens; }
    else {
      const { V, lam } = axes(aboveNull(company(src)), FILL, 30);
      this.EN = new Float32Array(256*DIM);
      for (let a = 0; a < 256; a++) for (let j = 0; j < FILL; j++)
        this.EN[a*DIM+j] = V[a*FILL+j]*Math.sqrt(Math.abs(lam[j]));
    }
    this.live = new Set(); for (let i = 0; i < this.buf.length; i++) this.live.add(this.buf[i]);
    const F = []; for (let b = 0; b < 256; b++) F.push(faces(this.EN, b));
    const W3 = [0,1,2].map(f => τ([...this.live].map(b => ({ id: b, r: F[b][f].r, th: F[b][f].th }))));
    this.addr = new Map();
    for (const b of this.live) this.addr.set(b, [W3[0].get(b), W3[1].get(b), W3[2].get(b)]);
    this.trit = b => { const A = this.addr.get(b); return (A && A[0] && A[0].length) ? A[0][0] : 0; };
    this.pos = []; for (let i = 1; i < this.buf.length; i++) if (isSpace(this.buf[i-1])) this.pos.push(i);
    // the index: keyed on NON-delimiter bytes -- every word start is preceded by a space,
    // and all spaces share a trit, so keying on buf[i-1] gives ONE branch at level one.
    this.trie = new Map();
    for (const i of this.pos) { if (i < DEPTH*3+2) continue;
      const kb = this.keyBytes(this.buf, i); if (kb.length < DEPTH) continue;
      let k = ''; for (let t = 0; t < DEPTH; t++) { k += this.trit(kb[t]);
        if (!this.trie.has(k)) this.trie.set(k, []); this.trie.get(k).push(i); } }
    this.window = this.W || Math.max(4, Math.round(Math.log(this.pos.length/(2*Math.PI*Math.E))));
    this.target = Math.max(64, Math.round(Math.exp(Math.log(this.pos.length) - this.window)));
    this.poles = null;
    this.liftoff();                 // floor the window where the pole becomes measurable
    return this;
  }
  keyBytes(src, i) { const o = []; let j = i-1;
    // Delimiters stay IN the key by default. Every word start is preceded by whitespace
    // and all whitespace shares a trit, so level one of the trie has a single branch --
    // which looks like a bug and is not one: the delimiter is what makes the key encode
    // WORD BOUNDARIES. Measured both ways:
    //                     keep (default)   skip
    //   abstention           1.000         0.990
    //   reading, unseen      0.036         0.008
    //   reading, stored      0.984         0.996
    // Skipping buys 0.012 on material already saturated and costs the two that matter.
    while (j >= 0 && o.length < DEPTH) { if (this.skipDelims && isSpace(src[j])) { j--; continue; } o.push(src[j]); j--; }
    return o; }
  pool(q) {
    const seq = []; for (let j = q.length-1; j >= 0 && seq.length < DEPTH; j--) { if (this.skipDelims && isSpace(q[j].b)) continue; seq.push(q[j]); }
    let k = '', cand = null;
    for (let t = 0; t < seq.length; t++) { k += this.trit(seq[t].b); const c = this.trie.get(k);
      if (!c || !c.length) break; cand = c; if (c.length <= this.target) break; }
    return cand;
  }
  read(ctx) {                                  // -> {leftover, novelty, word} or null
    const all = [...bytes(ctx)];
    const q = all.map(b => ({ b, A: this.addr.get(b) })).filter(x => x.A);
    if (!q.length) return null;
    // MINIMUM EVIDENCE. Bytes outside the ledger's own alphabet are dropped here, and
    // that is right — but it means a prompt written in a script the ledger has never
    // seen collapses to whatever punctuation survives, usually the trailing space. A
    // space matches every word boundary in the ledger perfectly, so leftover comes back
    // 0.0000, which is the MAXIMUM-confidence value. Measured before this guard: "  ",
    // "\t ", "a ", and prompts in Chinese and Arabic all returned speaks = true with
    // leftover 0.0000 — the same score as a verbatim quotation — and listen() runs its
    // walk on speaks, so the field emitted text on all of them.
    //
    // The bar is Θ, the same doorway the faces already pass through — three halves,
    // never met, only exceeded. Applied twice, in the two places evidence can be thin:
    //
    //   how much is there    addressable non-delimiter bytes must EXCEED Θ = 1.5
    //   how much survived    the readable fraction must EXCEED Θ/3 = ½
    //
    // Both are the doorway's own rule, strictly greater in both cases, so a tie is
    // impossible here for the same reason it is impossible there. An earlier version of
    // this guard used 3 and 0.5, which were picked. These are not.
    const live = q.filter(x => !isSpace(x.b)).length;
    if (!(live > Θ)) return null;                         // not more than three halves
    if (!(q.length / all.length > Θ/3)) return null;      // not more than half readable
    const cand = this.pool(q); if (!cand || !cand.length) return null;
    const DENS = this.density || 800;   // saturates here; 300 costs reading 0.996->0.916
    const step = Math.max(1, Math.floor(cand.length/DENS)), pool = [];
    for (let c = 0; c < cand.length; c += step) if (cand[c] >= DEPTH*3) pool.push(cand[c]);
    if (!pool.length) return null;
    const np = Math.min(this.window, q.length);
    let cap = 0; for (let t = 1; t <= np; t++) { const A = q[q.length-t].A;
      cap += (A[0]||[]).length + (A[1]||[]).length + (A[2]||[]).length; }
    // the sunflower: ten directions, merging inward, alternating - + - +
    const sd = []; for (let i = 0; i < q.length && i < 400; i++) { const kk = q.length-1-i;
      sd.push({ off: i+1, r: Math.sqrt(kk+1), sec: Math.floor(DIRS*((GOLD*kk)%(2*Math.PI))/(2*Math.PI))%DIRS, A: q[q.length-1-i].A }); }
    const per = [], vote = new Map(), props = [];
    for (let d = 0; d < DIRS; d++) {
      const mine = sd.filter(x => x.sec === d).sort((a,b) => b.r-a.r);
      const row = new Float64Array(pool.length);
      if (mine.length) for (let c = 0; c < pool.length; c++) { const at = pool[c];
        let v = 0, w = 1;
        for (const s of mine) { if (at-s.off < 0) continue; v += w*θ(s.A, this.addr.get(this.buf[at-s.off])); w *= 1/φ; }
        row[c] = v; }
      per.push(row);
      if (mine.length) { let bi = 0, bv = -1e18;
        for (let c = 0; c < pool.length; c++) if (row[c] > bv) { bv = row[c]; bi = c; }
        props.push({ at: pool[bi], w: bv, word: this.wordAt(pool[bi]) }); } }
    if (props.length && !this.centroid) ἀστήρ(props, np, this.buf, this.addr, vote);
    if (this.centroid) for (const p of props) if (p.word) vote.set(p.word, (vote.get(p.word)||0) + p.w);
    // unsigned sum = agreement (the reader).  signed = what does NOT cancel (the novelty).
    let best = -1e18, agree = -1e18, resid = -1e18;
    for (let c = 0; c < pool.length; c++) { let ag = 0, re = 0;
      for (let d = 0; d < DIRS; d++) { ag += per[d][c]; re += (d%2?1:-1)*per[d][c]; }
      if (ag > agree) agree = ag;
      const m = Math.abs(re); if (m > resid) resid = m;
      let s = 0; const at = pool[c];
      for (let t = 1; t <= np; t++) { if (at-t < 0) break; s += θ(q[q.length-t].A, this.addr.get(this.buf[at-t])); }
      if (s > best) best = s; }
    const fl = np*ν, sig = Math.max(0, best-fl), cp = Math.max(1e-9, cap-fl);
    let word = null, bv = -1;
    for (const [w, v] of vote) if (v > bv) { bv = v; word = w; }
    let at = -1;
    for (const p of props) if (p.word === word) { at = p.at; break; }
    return { leftover: cap > fl ? 1-(sig/cp) : 1, novelty: agree > 0 ? resid/agree : 0, word, at };
  }
  wordAt(at) { let e = at; while (e < this.buf.length && !isSpace(this.buf[e])) e++;
    return text(this.buf, at, e); }
  // The window is the Crown window, FLOORED BY THE POLE'S OWN LIFTOFF.
  //
  // W = log(N/2πe) is right for a large ledger and too small for a small one: below
  // some depth every thinning still contains an exact match, the answered pole sits on
  // the origin, and the span is measured against nothing. Measured on a 15KB ledger the
  // Crown window gives 5 and the pole does not lift until 8 — so 1.000/1.000 at W=5 is
  // vacuous, scored in a space with no room to be wrong in.
  //
  // The floor is not chosen. Walk W up until the field's own thinnings stop explaining
  // themselves perfectly. The pole says where it becomes measurable.
  liftoff(maxW) {
    const crown = this.window;
    for (let W = crown; W <= (maxW || 24); W++) {
      this.window = W; this.poles = null;
      const P = this.measurePoles(120);
      if (P.answered > 1e-9) { this.window = W; return W; }   // keep the poles it just measured
    }
    this.window = crown; this.poles = null; return crown;
  }
  // the two poles, measured from the field's own material -- never set
  measurePoles(n) {
    let seed = 17; const rnd = () => { seed = (seed*1103515245+12345) & 0x7fffffff; return seed/0x7fffffff; };
    const A = [], S = [];
    for (let t = 0; t < (n||160); t++) {
      const q = this.pos[Math.floor(rnd()*this.pos.length)]; if (q < 600) continue;
      const seg = text(this.buf, q-400, q).split(/\s+/).filter(Boolean);
      if (seg.length < 8) continue;
      const a = this.read(seg.filter((_,i) => i%2===0).join(' ') + ' '); if (a) A.push(a.leftover);
      const bb = [...this.buf.slice(q-400, q)];                 // shuffled at the level it READS
      for (let i = bb.length-1; i > 0; i--) { const j = Math.floor(rnd()*(i+1)); [bb[i],bb[j]] = [bb[j],bb[i]]; }
      const s = this.read(text(Uint8Array.from(bb), 0)); if (s) S.push(s.leftover); }
    const med = x => { const y = [...x].sort((u,v) => u-v); return y[Math.floor(y.length/2)]; };
    this.poles = { answered: med(A), stranger: med(S) };
    return this.poles;
  }
  // ⊕ — the two strikes. They are genuinely different quantities, which is what took
  // four attempts to find: a reverse residual, a coverage count and a concentration are
  // all rescalings of the first strike and separate nothing.
  //
  //   leftover   reads W bytes    — is this language I hold?      junk 0.648 · mine 0.000
  //   novelty    reads 400 bytes  — is it ordered as I hold it?   mine 0.117 · shuffled 0.473
  //
  // The second was computed on every call and used only as a detector. It separates a
  // passage from its OWN WORDS SHUFFLED at AUC 0.4929 of a possible 0.5000 — because it
  // reads through the ten directions across 400 bytes while the leftover reads W.
  //
  //   both near answered   ->  mine, and in order          it speaks
  //   leftover near, novelty far  ->  my words, not my order   it holds
  //   leftover far         ->  not mine                    it refuses
  measureOrderPole(n) {
    let seed = 23; const rnd = () => { seed = (seed*1103515245+12345) & 0x7fffffff; return seed/0x7fffffff; };
    const ord = [], dis = [];
    // ACROSS THE RANGE, not at one length. novelty is not length-stable -- measured
    // on the story it peaks around 200-260 bytes (real median 0.21) and settles near
    // 0.12-0.14 above and below, because the ten sectors fill unevenly in that band.
    // A pole taken at a single length puts the boundary in the wrong place for the
    // others: calibrated at 380, recall at 260 fell to 0.885 while 120 and 380 held
    // at 1.000. Sampling the range makes the boundary honest for all of them.
    const LENS = [120, 180, 240, 300, 400, 550, 750];
    for (let t = 0; t < (n||140); t++) {
      const L = LENS[t % LENS.length];
      const q = this.pos[Math.floor(rnd()*this.pos.length)]; if (q < L+40) continue;
      const a = this.read(text(this.buf, q-L, q));
      if (a) ord.push(a.novelty);
      const w = [];                                   // its own words, order destroyed
      const nw = Math.max(8, Math.round(L/6));
      for (let i = 0; i < nw; i++) { const p = this.pos[Math.floor(rnd()*this.pos.length)];
        let e = p; while (e < this.buf.length && !isSpace(this.buf[e])) e++;
        w.push(text(this.buf, p, e)); }
      const b = this.read(w.join(' ') + ' ');
      if (b) dis.push(b.novelty); }
    const med = x => { const y = [...x].sort((u,v) => u-v); return y[Math.floor(y.length/2)]; };
    this.orderPoles = { ordered: med(ord), scrambled: med(dis) };
    return this.orderPoles;
  }
  hear(ctx) {
    if (!this.poles) this.measurePoles();
    if (!this.orderPoles) this.measureOrderPole();
    const r = this.read(ctx);
    if (!r) return { speaks: false, holds: false, verdict: 'nowhere to land' };
    const near = (v, a, b) => Math.abs(Math.log((v+1e-12)/(a+1e-12))) < Math.abs(Math.log((v+1e-12)/(b+1e-12)));
    const mine    = near(r.leftover, this.poles.answered, this.poles.stranger);
    // WILL. near() is a log comparison, so its boundary is the geometric mean of the two
    // poles. That is one point on a line, and the line is the whole range the field has
    // to decide in: it recognises its own words, and it is asked whether the order is
    // also its own. will = 0.5 IS the geometric mean, so the default is arithmetically
    // identical to near() and nothing moves unless somebody moves it.
    //
    // Measured on Δ/V·001, 240 probes:  0.0 -> speaks 1.7%   0.5 -> 88.8%   0.65+ -> 100%
    // 236 of the 240 land between the poles, so the range is real, not decorative.
    const A = this.orderPoles.ordered, B = this.orderPoles.scrambled;
    const w = this.will === undefined ? 0.5 : Math.max(0, Math.min(1, this.will));
    const bound = A * Math.pow(B / A, w);
    const inOrder = A <= B ? (r.novelty < bound) : (r.novelty > bound);
    const verdict = !mine ? 'not mine' : (inOrder ? 'mine, in order' : 'my words, not my order');
    // The second strike QUALIFIES, it does not veto. Gating speech on it cost recall
    // 1.000 -> 0.990: three real passages from the ledger were held as 'not my order'
    // when they are in the ledger in exactly that order. ἁρμονία decides whether to
    // speak; ῥυθμός reports whether the measure is his. Both are returned either way.
    return { speaks: mine, inOrder, holds: mine && !inOrder, verdict,
             word: r.word, at: r.at, leftover: r.leftover, novelty: r.novelty };
  }
}
// ---- the page-facing shape ----
// listen() is what a front end calls. It returns the verdict, the word, and the trits
// so the walk can be drawn: ▪ + / ▫ − / ▨ =  — one tile per address level.
function listen(ω, prompt, walkN) {
  const h = ω.hear(prompt);
  if (h.verdict === 'nowhere to land') return { kind: 'BURP', verdict: h.verdict, text: '', trits: [], trace: [] };
  const kind = !h.speaks ? 'BURP' : (h.inOrder ? 'SPEAK' : 'HOLD');
  // trace — where in the ledger each step landed. This is the walk: the field moving
  // through its own memory, one position per word.
  const out = [], trace = [];
  let ctx = prompt;
  // Every step re-enters through the doorway. Adding the trace, an earlier version of
  // this called read() directly, which skipped that test and let the walk carry on
  // through contexts the field would no longer have claimed. hear() is the gate; the
  // trace comes off it.
  if (h.speaks) for (let i = 0; i < (walkN || 12); i++) {
    const g = ω.hear(ctx); if (!g.speaks || !g.word) break;
    out.push(g.word); trace.push({ at: g.at, word: g.word, ἁρμονία: g.leftover, ῥυθμός: g.novelty });
    ctx = (ctx + g.word + ' ').slice(-400); }
  const trits = [];
  for (const b of bytes(prompt).slice(-24)) { const A = ω.addr.get(b);
    trits.push(A && A[0] && A[0].length ? A[0][0] : 1); }
  return { kind, verdict: h.verdict, text: out.join(' '), word: h.word, trits, trace,
           ἁρμονία: h.leftover, ῥυθμός: h.novelty,
           poles: ω.poles, orderPoles: ω.orderPoles };
}
const ΑΔΩ = { Organism, listen, utf8, willBound, tile, faces, θ, τ, ἀστήρ, φ, φ7, Φ7, Θ, ν, DIM, FILL, DIRS };
if (typeof module !== 'undefined' && module.exports) module.exports = ΑΔΩ;
else if (typeof globalThis !== 'undefined') globalThis.ΑΔΩ = ΑΔΩ;
