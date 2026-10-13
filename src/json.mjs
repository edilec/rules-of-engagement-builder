import {InputProblem} from './rules.mjs';
const known=new Set(['schemaVersion','client','legalName','authorizedRepresentative','name','title','provider','engagementId','start','end','windows','allowedDomains','allowedCidrs','excludedDomains','excludedCidrs','includeSubdomains','contacts','role','channel','address','permittedMethods','prohibitedMethods','id','description','dataHandling','classification','storage','transfer','retentionDays','disposal','incidentStopRule','escalationChannel','signatures']);
// Recursion is capped before entry, so the maximum call depth is ten, not input-controlled.
export function parseJson(text,{budget,maxDepth=10,maxNodes=20000}){
 let pos=0,nodes=0;
 const bad=()=>{throw new InputProblem('input-invalid-json');};
 const whitespace=()=>{while(pos<text.length && /[\x20\x09\x0a\x0d]/u.test(text[pos])){if((pos&1023)===0)budget.check();pos++;}};
 function string(){
  const start=pos++;let escaped=false;
  while(pos<text.length){
   if((pos&1023)===0)budget.check();
   const ch=text[pos++];
   if(!escaped&&ch==='"'){
    let value;try{value=JSON.parse(text.slice(start,pos));}catch{bad();}
    if(/\p{Surrogate}/u.test(value))bad();return value;
   }
   if(!escaped&&ch==='\\')escaped=true;else escaped=false;
  }bad();
 }
 function value(depth,pointer){
  budget.check();whitespace();
  if(depth>maxDepth)throw new InputProblem('input-depth-limit',pointer);
  if(++nodes>maxNodes)throw new InputProblem('input-node-limit',pointer);
  const c=text[pos];
  if(c==='"')return string();
  if(c==='{'||c==='['){
   const object=c==='{',end=object?'}':']',result=object?Object.create(null):[],keys=new Set();let ordinal=0;
   pos++;whitespace();if(text[pos]===end){pos++;return result;}
   for(;;){
    let key;const index=ordinal++;
    if(object){if(text[pos]!=='"')bad();key=string();if(keys.has(key))throw new InputProblem('input-duplicate-key',pointer,index+1);keys.add(key);whitespace();if(text[pos++]!==':')bad();}
    const child=object?(known.has(key)?pointer+'/'+key:pointer):pointer+'/'+index;
    const v=value(depth+1,child);
    if(object)Object.defineProperty(result,key,{value:v,enumerable:true,writable:true,configurable:true});else result.push(v);
    whitespace();const next=text[pos++];if(next===end)return result;if(next!==',')bad();whitespace();if(text[pos]===end)bad();
   }
  }
  const literal=/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u.exec(text.slice(pos));
  if(!literal)bad();pos+=literal[0].length;let result;try{result=JSON.parse(literal[0]);}catch{bad();}if(typeof result==='number'&&!Number.isFinite(result))bad();return result;
 }
 const result=value(1,'');whitespace();if(pos!==text.length)bad();budget.check();return result;
}
