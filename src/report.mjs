import {RULES} from './rules.mjs';
export {RULES} from './rules.mjs';
export const TOOL_ID='rules-of-engagement-builder';
export const byCodeUnit=(a,b)=>a<b?-1:a>b?1:0;
export function finding(ruleId,pointer='',role='@questionnaire',ordinal){
 const rule=RULES[ruleId];if(!rule)throw new Error('Unknown rule');
 const location={file:role};if(pointer)location.pointer=pointer;
 const result={ruleId,severity:rule.severity,message:rule.message,location};
 if(ordinal!==undefined)result.suggestion=`Inspect member ordinal ${ordinal} in the located object.`;
 return result;
}
export function makeReport({findings=[],incomplete=false,checked=0,filesWritten=[],retainedFiles=[],stagingCleanupIncomplete=false}={}){
 const rows=[...findings].sort((a,b)=>byCodeUnit(a.location.file,b.location.file)||byCodeUnit(a.location.pointer??'',b.location.pointer??'')||byCodeUnit(a.ruleId,b.ruleId));
 const status=incomplete||rows.some(f=>RULES[f.ruleId].incomplete)?'incomplete':rows.some(f=>f.severity==='error')?'fail':'pass';
 const names=[...filesWritten].sort(byCodeUnit);
 const report={schemaVersion:'1',tool:TOOL_ID,status,summary:{checked,errors:rows.filter(f=>f.severity==='error').length,warnings:rows.filter(f=>f.severity==='warning').length,filesWritten:names.length},findings:rows,filesWritten:names};
 if(retainedFiles.length)report.retainedFiles=[...retainedFiles].sort(byCodeUnit);
 if(stagingCleanupIncomplete)report.stagingCleanupIncomplete=true;
 return report;
}
export const exitCode=report=>({pass:0,fail:1,incomplete:2})[report.status];
