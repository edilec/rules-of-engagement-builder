import {finding,byCodeUnit,RULES} from './report.mjs';
import {createBudget,LIMITS} from './budget.mjs';
import {validateText} from './text.mjs';
import {parseDomainRule,parseCidr,effectiveTargetsEmpty} from './targets.mjs';
const text=(identity=false,max=4096)=>({kind:'text',identity,max});
const enumeration=(values,rule='input-shape-invalid')=>({kind:'enum',values,rule});
const object=fields=>({kind:'object',fields});const array=item=>({kind:'array',item});
const domain=object({name:text(true),includeSubdomains:{kind:'boolean'}});
const method=object({id:text(true,128),description:text()});
const channel=enumeration(['email','phone','other'],'contact-invalid');
export const questionnaireSchema=object({schemaVersion:enumeration(['1'],'unsupported-schema-version'),
 client:object({legalName:text(true),authorizedRepresentative:object({name:text(true),title:text(true)})}),provider:object({legalName:text(true)}),engagementId:text(true,128),start:text(true),end:text(true),
 windows:array(object({start:text(true),end:text(true)})),allowedDomains:array(domain),allowedCidrs:array(text(true)),excludedDomains:array(domain),excludedCidrs:array(text(true)),
 contacts:array(object({role:enumeration(['emergency','critical-finding'],'contact-invalid'),name:text(true),channel,address:text(true)})),
 permittedMethods:array(method),prohibitedMethods:array(method),dataHandling:object({classification:text(),storage:text(),transfer:text(),retentionDays:{kind:'retention'},disposal:text()}),incidentStopRule:text(),
 escalationChannel:object({channel,address:text(true)}),signatures:object({client:text(),provider:text()})});
export function toJsonSchema(s){
 if(s.kind==='object')return {type:'object',additionalProperties:false,required:Object.keys(s.fields),properties:Object.fromEntries(Object.entries(s.fields).map(([k,v])=>[k,toJsonSchema(v)]))};
 if(s.kind==='array')return {type:'array',items:toJsonSchema(s.item)};
 if(s.kind==='text')return {type:'string',minLength:1,maxLength:s.max};
 if(s.kind==='enum')return {type:'string',enum:s.values};
 if(s.kind==='retention')return {type:'integer',minimum:0,maximum:Number.MAX_SAFE_INTEGER};
 return {type:s.kind};
}
export function deepFreeze(v){if(v&&typeof v==='object'){for(const x of Object.values(v))deepFreeze(x);Object.freeze(v);}return v;}
export function validateQuestionnaire(raw,{budget=createBudget(),font}={}){
 const findings=[];const add=(id,p='',ordinal)=>findings.push(finding(id,p,'@questionnaire',ordinal));
 function walk(v,s,p){
  budget.check();
  if(s.kind==='object'){
   if(!v||typeof v!=='object'||Array.isArray(v)){add('input-shape-invalid',p);return null;}
   const result={};let ordinal=0;
   for(const key of Object.keys(v)){ordinal++;if(!Object.hasOwn(s.fields,key))add('unknown-field',p,ordinal);}
   for(const [key,child]of Object.entries(s.fields)){if(!Object.hasOwn(v,key)){add('required-field-missing',p+'/'+key);result[key]=null;}else result[key]=walk(v[key],child,p+'/'+key);}return result;
  }
  if(s.kind==='array'){if(!Array.isArray(v)){add('input-shape-invalid',p);return null;}return v.map((x,i)=>walk(x,s.item,p+'/'+i));}
  if(s.kind==='text'){
   const r=validateText(v,{pointer:p,identity:s.identity,maxUnits:s.max});findings.push(...r.findings);
   if(r.value&&font&&[...r.value].some(ch=>!font.glyphFor(ch.codePointAt(0))||/\p{Mark}/u.test(ch))){add('unsupported-pdf-character',p);return null;}return r.value;
  }
  if(s.kind==='enum'){if(!s.values.includes(v)){add(s.rule,p);return null;}return v;}
  if(s.kind==='retention'){if(!Number.isSafeInteger(v)||v<0){add('retention-invalid',p);return null;}return v;}
  if(typeof v!==s.kind){add('input-shape-invalid',p);return null;}return v;
 }
 let q;
 try{
  q=walk(raw,questionnaireSchema,'');
  if(q){
   const list=n=>Array.isArray(q[n])?q[n]:[];
   for(const [names,limit,id]of [[['allowedDomains','allowedCidrs'],LIMITS.targets,'target-limit'],[['excludedDomains','excludedCidrs'],LIMITS.exclusions,'exclusion-limit'],[['windows'],LIMITS.windows,'window-limit'],[['contacts'],LIMITS.contacts,'contact-limit'],[['permittedMethods'],LIMITS.methods,'method-limit'],[['prohibitedMethods'],LIMITS.methods,'method-limit']])if(names.reduce((a,n)=>a+list(n).length,0)>limit)add(id,'/'+names[0]);
   if(Array.isArray(q.allowedDomains)&&Array.isArray(q.allowedCidrs)&&!q.allowedDomains.length&&!q.allowedCidrs.length)add('allowed-targets-empty','/allowedDomains');
   if(Array.isArray(q.windows)&&!q.windows.length)add('window-list-empty','/windows');
   for(const n of ['permittedMethods','prohibitedMethods']){if(Array.isArray(q[n])&&!q[n].length)add('method-list-empty','/'+n);const seen=new Set();for(const [i,m]of list(n).entries())if(m?.id){if(seen.has(m.id))add('method-id-duplicate',`/${n}/${i}/id`);seen.add(m.id);if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(m.id))add('input-shape-invalid',`/${n}/${i}/id`);}}
   if(q.engagementId&&!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(q.engagementId))add('input-shape-invalid','/engagementId');
   for(const [role,id]of [['emergency','emergency-contact-missing'],['critical-finding','critical-contact-missing']])if(!list('contacts').some(c=>c&&c.role===role&&c.name&&c.channel&&c.address))add(id,'/contacts');
   for(const [i,c]of list('contacts').entries())if(!c?.name||!c.channel||!c.address)add('contact-invalid',`/contacts/${i}`);
   if(!q.escalationChannel?.address||!q.escalationChannel?.channel)add('contact-invalid','/escalationChannel');
   const utc=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(v)&&Number.isFinite(Date.parse(v))&&new Date(Date.parse(v)).toISOString()===v.slice(0,-1)+'.000Z';
   for(const [v,p]of [[q.start,'/start'],[q.end,'/end'],...list('windows').flatMap((w,i)=>[[w?.start,`/windows/${i}/start`],[w?.end,`/windows/${i}/end`]])])if(v&&!utc(v))add('timestamp-invalid',p);
   const parsed={};
   for(const n of ['allowedDomains','excludedDomains','allowedCidrs','excludedCidrs']){parsed[n]=[];for(const [i,v]of list(n).entries())try{if(v===null)continue;const x=n.endsWith('Domains')?parseDomainRule(v,`/${n}/${i}`):parseCidr(v,`/${n}/${i}`);parsed[n].push(x);}catch(e){add(e.ruleId??'input-shape-invalid',e.pointer??`/${n}/${i}`);}}
   // Do not compare against an index from missing/malformed evidence.
   if(!findings.length){
    if(q.end<=q.start)add('engagement-interval-invalid','/end');
    for(const [i,w]of q.windows.entries()){if(w.end<=w.start)add('window-interval-invalid',`/windows/${i}/end`);if(w.start<q.start||w.end>q.end)add('window-outside-engagement',`/windows/${i}`);}
    const denied=new Set(q.prohibitedMethods.map(m=>m.id));for(const [i,m]of q.permittedMethods.entries())if(denied.has(m.id))add('method-policy-conflict',`/permittedMethods/${i}/id`);
    if(effectiveTargetsEmpty({domains:parsed.allowedDomains,cidrs:parsed.allowedCidrs},{domains:parsed.excludedDomains,cidrs:parsed.excludedCidrs}))add('all-targets-excluded','/allowedDomains');
   }
   if(!findings.length){
    for(const n of ['allowedDomains','excludedDomains'])q[n]=parsed[n].sort((a,b)=>byCodeUnit(a.name,b.name)||Number(a.includeSubdomains)-Number(b.includeSubdomains));
    for(const n of ['allowedCidrs','excludedCidrs'])q[n]=parsed[n].map(x=>x.canonical).sort(byCodeUnit);
    for(const n of ['permittedMethods','prohibitedMethods'])q[n].sort((a,b)=>byCodeUnit(a.id,b.id));
    q.contacts.sort((a,b)=>byCodeUnit(a.role,b.role)||byCodeUnit(a.name,b.name)||byCodeUnit(a.channel,b.channel)||byCodeUnit(a.address,b.address));
    q.windows.sort((a,b)=>byCodeUnit(a.start,b.start)||byCodeUnit(a.end,b.end));const merged=[];
    for(const w of q.windows){const last=merged.at(-1);if(last&&w.start<=last.end){if(w.end>last.end)last.end=w.end;}else merged.push({...w});}q.windows=merged;
   }
  }
  budget.check();
 }catch(e){add(e.ruleId??'input-shape-invalid',e.pointer??'');}
 return {model:findings.length?null:deepFreeze(q),findings,incomplete:findings.some(f=>RULES[f.ruleId].incomplete)};
}
