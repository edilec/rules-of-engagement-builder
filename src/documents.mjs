import {deepFreeze} from './questionnaire.mjs';
export const DRAFT_WARNING='DRAFT — NOT AUTHORIZED UNTIL SIGNED';
export const ARTIFACT_NAMES=Object.freeze(['authorization-letter.md','authorization-letter.pdf','rules-of-engagement.md','rules-of-engagement.pdf','scope-candidate.json']);
const domainLine=r=>`${r.name}; ${r.includeSubdomains?'including subdomains':'exact name only'}`;
const methodLine=m=>`${m.id}: ${m.description}`;
export function scopeCandidate(q){return {
 schemaVersion:'1',artifactType:'unsigned-scope-candidate',authorization:'not-authorized',requiresClientSignature:true,scopeId:q.engagementId,
 start:q.start,end:q.end,windows:q.windows,allowedDomains:q.allowedDomains,allowedCidrs:q.allowedCidrs,excludedDomains:q.excludedDomains,excludedCidrs:q.excludedCidrs,requiredContactRoles:['critical-finding','emergency']
};}
function sections(q){return [
 {title:'Parties and engagement',lines:[`Client: ${q.client.legalName}`,`Authorized representative: ${q.client.authorizedRepresentative.name}`,`Representative title: ${q.client.authorizedRepresentative.title}`,`Provider: ${q.provider.legalName}`,`Engagement ID: ${q.engagementId}`]},
 {title:'Approval requirement',lines:['Proposed engagement terms for client review. Testing may begin only after separate client authorization.','Generated documents and typed signature placeholders grant no permission.']},
 {title:'UTC validity and test windows',lines:[`Start: ${q.start}`,`End: ${q.end}`,...q.windows.map(w=>`${w.start} through ${w.end} (inclusive)`)]},
 {title:'Allowed targets',lines:[...q.allowedDomains.map(domainLine),...q.allowedCidrs]},
 {title:'Explicit exclusions',lines:['Exclusions override every allowance.',...q.excludedDomains.map(domainLine),...q.excludedCidrs,...(q.excludedDomains.length+q.excludedCidrs.length===0?['No explicit exclusions supplied.']:[])]},
 {title:'Permitted methods',lines:q.permittedMethods.map(methodLine)},
 {title:'Prohibited methods',lines:q.prohibitedMethods.map(methodLine)},
 {title:'Emergency and critical-finding contacts',lines:q.contacts.map(c=>`${c.role}: ${c.name}; ${c.channel}: ${c.address}`)},
 {title:'Data handling, retention and disposal',lines:[`Classification: ${q.dataHandling.classification}`,`Storage: ${q.dataHandling.storage}`,`Transfer: ${q.dataHandling.transfer}`,`Retention days: ${q.dataHandling.retentionDays}`,`Disposal: ${q.dataHandling.disposal}`]},
 {title:'Incident stop and escalation',lines:[`Incident stop rule: ${q.incidentStopRule}`,`Escalation channel: ${q.escalationChannel.channel}: ${q.escalationChannel.address}`]},
 {title:'Unsigned signature placeholders',lines:[`Client proposed placeholder: ${q.signatures.client}`,`Provider proposed placeholder: ${q.signatures.provider}`,'Both signatures and dates require separate human review. No signature is verified or collected by this tool.']}
];}
export function buildDocuments(q){
 if(!q||!Object.isFrozen(q))throw new Error('A validated immutable questionnaire is required.');
 return deepFreeze({documents:[{kind:'rules-of-engagement',title:'Rules of Engagement Draft',warning:DRAFT_WARNING,sections:sections(q)},{kind:'authorization-letter',title:'Client Authorization Letter Draft',warning:DRAFT_WARNING,sections:sections(q)}],candidate:scopeCandidate(q)});
}
export const documentText=doc=>[doc.title,doc.warning,...doc.sections.flatMap(s=>[s.title,...s.lines])].join('\n');
