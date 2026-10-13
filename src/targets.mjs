import {isIP} from 'node:net';
import {domainToASCII} from 'node:url';
import {InputProblem} from './rules.mjs';
export function parseDomainRule(value,pointer){
 const bad=()=>{throw new InputProblem('domain-invalid',pointer);};
 if(!value||typeof value.name!=='string'||typeof value.includeSubdomains!=='boolean'||/[\s%/:@*]/u.test(value.name)||isIP(value.name))bad();
 const name=domainToASCII(value.name.replace(/\.$/u,'')).toLowerCase();
 if(!name||name.length>253||name.split('.').some(x=>!x||x.length>63||!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(x))||isIP(name))bad();
 return {name,includeSubdomains:value.includeSubdomains};
}
export const domainMatches=(rule,host)=>host===rule.name||(rule.includeSubdomains&&host.endsWith('.'+rule.name));
function addressValue(s){
 const family=isIP(s);if(!family||s.includes('%'))throw new Error('address');
 if(family===4)return {family,width:32,value:s.split('.').reduce((a,n)=>(a<<8n)|BigInt(n),0n),canonical:s};
 let t=s.toLowerCase();
 if(t.includes('.')){const colon=t.lastIndexOf(':');const tail=t.slice(colon+1).split('.').map(Number);t=t.slice(0,colon+1)+((tail[0]<<8)|tail[1]).toString(16)+':'+((tail[2]<<8)|tail[3]).toString(16);}
 const halves=t.split('::');const left=halves[0]?halves[0].split(':'):[],right=halves[1]?halves[1].split(':'):[];
 const words=(halves.length===2?[...left,...Array(8-left.length-right.length).fill('0'),...right]:left).map(x=>parseInt(x,16));
 let value=0n;for(const word of words)value=(value<<16n)|BigInt(word);
 let bestStart=-1,bestLength=1;for(let i=0;i<8;i++){if(words[i]!==0)continue;let j=i;while(j<8&&words[j]===0)j++;if(j-i>bestLength){bestStart=i;bestLength=j-i;}i=j-1;}
 const hex=words.map(x=>x.toString(16));
 const canonical=bestStart<0?hex.join(':'):hex.slice(0,bestStart).join(':')+'::'+hex.slice(bestStart+bestLength).join(':');
 return {family,width:128,value,canonical};
}
export function parseCidr(raw,pointer){
 try{
  if(typeof raw!=='string'||!/^[^/]+\/(?:0|[1-9]\d*)$/u.test(raw))throw new Error('cidr');
  const [s,p]=raw.split('/'),address=addressValue(s),prefix=Number(p);
  if(prefix>address.width)throw new Error('prefix');
  const hostMask=(1n<<BigInt(address.width-prefix))-1n;
  if((address.value&hostMask)!==0n)throw new Error('host bits');
  return {family:address.family,start:address.value,end:address.value|hostMask,canonical:address.canonical+'/'+prefix};
 }catch{throw new InputProblem('cidr-invalid',pointer);}
}
export function cidrContains(rule,s){const a=addressValue(s);return a.family===rule.family&&rule.start<=a.value&&rule.end>=a.value;}
export function effectiveTargetsEmpty(allowed,excluded){
 const domainsEmpty=allowed.domains.every(a=>excluded.domains.some(e=>domainMatches(e,a.name)&&(!a.includeSubdomains||e.includeSubdomains)));
 const cidrsEmpty=allowed.cidrs.every(a=>{
  const ranges=excluded.cidrs.filter(e=>e.family===a.family).sort((x,y)=>x.start<y.start?-1:x.start>y.start?1:0);let cursor=a.start;
  for(const e of ranges){if(e.end<cursor)continue;if(e.start>cursor)return false;cursor=e.end+1n;if(cursor>a.end)return true;}return false;
 });return domainsEmpty&&cidrsEmpty;
}
