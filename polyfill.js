'use strict';
// Representation-only bridge from perceived universe state to Ω's lens contract.
// No lineage id, history, persistence accumulator, labels, or hidden state.
(function(root){
 const DIM=256,BYTES=256,SIZE=DIM*BYTES;
 function omegaLens(perceived){
  if(!perceived||perceived.length!==SIZE) throw new RangeError('perceived field must contain 65536 coordinates');
  const lens=new Float32Array(SIZE);
  for(let i=0;i<SIZE;i++){const v=Number(perceived[i]);lens[i]=Number.isFinite(v)?v:0}
  return lens;
 }
 function audit(perceived,lens){
  if(!perceived||!lens||perceived.length!==SIZE||lens.length!==SIZE)return{pass:false,reason:'shape'};
  let changed=0,maxError=0,nonzeroIn=0,nonzeroOut=0;
  for(let i=0;i<SIZE;i++){const a=Number.isFinite(Number(perceived[i]))?Number(perceived[i]):0,b=lens[i];if(a!==0)nonzeroIn++;if(b!==0)nonzeroOut++;const e=Math.abs(a-b);if(e>maxError)maxError=e;if(Math.fround(a)!==b)changed++}
  return{pass:changed===0,changed,maxError,nonzeroIn,nonzeroOut,size:SIZE};
 }
 root.CellPhonePolyfill=Object.freeze({omegaLens,audit,DIM,BYTES,SIZE});
})(typeof globalThis!=='undefined'?globalThis:this);
