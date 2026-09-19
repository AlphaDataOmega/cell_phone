'use strict';
const N=256,D=256,T=Math.PI*2,P=(Math.sqrt(5)-1)/2,$=x=>document.getElementById(x);
const O=globalThis.ΑΔΩ,Bridge=globalThis.CellPhonePolyfill;
if(!O||!Bridge)throw new Error('Ω runtime/polyfill not loaded');
function rng(s){return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function env(seed){const r=rng(seed),a=new Float64Array(N*D);for(let i=0;i<a.length;i++)a[i]=(r()-.5)*2e-3;return a}
function perturb(seed){const r=rng(seed),a=new Float64Array(N*D);for(let b=0;b<N;b++)for(let j=0;j<D;j++){const p=T*j*P;a[b*D+j]=Math.sin(p*(1+b%7)+seed%11)+.41*Math.cos(p*(1+b%5))+(r()-.5)*.02}return a}
function add(a,b){const o=new Float64Array(a.length);for(let i=0;i<a.length;i++)o[i]=a[i]+b[i];return o}
function dilute(a,w){const o=new Float64Array(a.length);for(let i=0;i<a.length;i++)o[i]=.1*a[i]+.9*w[i];return o}
function see(a,f,n,seed){const r=rng(seed),o=new Float64Array(a.length);for(let i=0;i<a.length;i++){let v=a[i]+(r()-.5)*2*n;o[i]=Math.abs(v)<f?0:v}return o}
function scramble(a,seed){const r=rng(seed),o=a.slice();for(let b=0;b<N;b++)for(let j=D-1;j>0;j--){const k=(r()*(j+1))|0,i=b*D+j,q=b*D+k;[o[i],o[q]]=[o[q],o[i]]}return o}
function omegaState(perceived){
 const lens=Bridge.omegaLens(perceived),audit=Bridge.audit(perceived,lens);
 const face=new Array(N),ids=[];
 for(let b=0;b<N;b++){face[b]=O.faces(lens,b);ids.push(b)}
 const maps=[0,1,2].map(f=>O.τ(ids.map(b=>({id:b,r:face[b][f].r,th:face[b][f].th}))));
 const addr=new Array(N);
 for(let b=0;b<N;b++)addr[b]=[maps[0].get(b),maps[1].get(b),maps[2].get(b)];
 return{addr,audit};
}
function omegaDistance(x,y){let same=0,total=0,depth=0;for(let b=0;b<N;b++){const a=x.addr[b],c=y.addr[b];for(let f=0;f<3;f++){const u=a[f]||[],v=c[f]||[],m=Math.max(u.length,v.length);total+=m;let k=0;while(k<Math.min(u.length,v.length)&&u[k]===v[k])k++;same+=k;depth+=O.θ(a,c)}}return{distance:total?1-same/total:0,theta:depth/N}}
function run(){
 const R=+$('rounds').value,F=10**(-+$('floor').value),Q=10**(-+$('noise').value),W=env(17);
 let A=add(W,perturb(101)),B=add(W,perturb(211)),C=W.slice(),S=A.slice(),rows=[],depth=0,auditPass=true;
 for(let k=0;k<=R;k++){
  const a=omegaState(see(A,F,Q,1000+k)),b=omegaState(see(B,F,Q,2000+k)),c=omegaState(see(C,F,Q,3000+k)),s=omegaState(see(S,F,Q,4000+k));
  auditPass=auditPass&&a.audit.pass&&b.audit.pass&&c.audit.pass&&s.audit.pass;
  const ab=omegaDistance(a,b),ac=omegaDistance(a,c),bc=omegaDistance(b,c),as=omegaDistance(a,s);
  const lineage=ab.distance,againstNull=(ac.distance+bc.distance)/2,scr=as.distance;
  if(againstNull>0)depth=k;
  rows.push({k,ab:lineage,an:againstNull,as:scr,theta:ab.theta,mat:10**(-k)});
  if(k<R){A=dilute(A,W);B=dilute(B,W);C=dilute(C,W);S=scramble(dilute(S,W),7000+k)}
 }
 const z=rows.at(-1);$('material').textContent=z.mat<F?'below perception':z.mat.toExponential(1);$('lineage').textContent=z.ab.toFixed(4);$('nullsep').textContent=z.an.toFixed(4);$('depth').textContent=depth+' / '+R+(auditPass?' ✓':' !');draw(rows);globalThis.cellPhoneLastRun=rows;
}
function draw(rows){const c=$('chart'),g=c.getContext('2d'),W=c.width,H=c.height,p=48;g.clearRect(0,0,W,H);g.font='13px system-ui';g.fillStyle='#8d98a3';g.strokeStyle='#293038';for(let i=0;i<5;i++){let y=p+i*(H-2*p)/4;g.beginPath();g.moveTo(p,y);g.lineTo(W-p,y);g.stroke();g.fillText((1-i*.25).toFixed(2),8,y+4)}[['ab',[]],['an',[10,6]],['as',[3,6]]].forEach(([key,dash],ix)=>{g.setLineDash(dash);g.strokeStyle=['#eef2f5','#a4afb9','#68737d'][ix];g.beginPath();rows.forEach((r,i)=>{const v=Math.max(0,Math.min(1,r[key])),x=p+i*(W-2*p)/(rows.length-1),y=p+(1-v)*(H-2*p);i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke()});g.setLineDash([]);g.fillStyle='#c8d0d7';g.fillText('Ω address distance: solid S₁↔S₂   dashed lineage↔null   dotted S₁↔scramble',p,H-15)}
['rounds','floor','noise'].forEach(id=>$(id).addEventListener('input',()=>{$('roundsOut').textContent=$('rounds').value;$('floorOut').textContent='1e-'+$('floor').value;$('noiseOut').textContent='1e-'+$('noise').value}));$('run').addEventListener('click',run);run();