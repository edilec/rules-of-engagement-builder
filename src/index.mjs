import {open} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createBudget,LIMITS} from './budget.mjs';
import {readQuestionnaire,parseQuestionnaireBytes} from './input.mjs';
import {validateQuestionnaire} from './questionnaire.mjs';
import {buildDocuments} from './documents.mjs';
import {renderMarkdown} from './markdown.mjs';
import {loadFont} from './font.mjs';
import {renderPdf} from './pdf.mjs';
import {publishArtifacts} from './write.mjs';
import {makeReport,finding} from './report.mjs';
import {InputProblem,RULES} from './rules.mjs';
export {TOOL_ID} from './report.mjs';
const fontPath=fileURLToPath(new URL('../assets/fonts/Vera.ttf',import.meta.url));
async function readFont(inputs,budget){
 let file;try{budget.check();file=await open(fontPath,'r');const s=await file.stat();inputs.push({path:fontPath,dev:s.dev,ino:s.ino});if(!s.isFile()||s.size>LIMITS.bytes)throw new Error('font');const fontBytes=await file.readFile();budget.check();return {fontBytes,font:loadFont(fontBytes)};}catch(e){if(e.ruleId==='evaluation-deadline')throw e;throw new InputProblem('runtime-resource-unavailable');}finally{if(file)await file.close();}
}
function evaluateValue(value,{budget,font,fontBytes}){
 const evaluation=validateQuestionnaire(value,{budget,font});
 if(evaluation.findings.length)return {evaluation,bundle:null,artifacts:[],report:makeReport({findings:evaluation.findings,incomplete:evaluation.incomplete,checked:1})};
 const bundle=buildDocuments(evaluation.model),artifacts=bundle.documents.flatMap(doc=>[{name:doc.kind+'.md',bytes:renderMarkdown(doc)},{name:doc.kind+'.pdf',bytes:renderPdf(doc,{font,fontBytes,budget})}]);
 artifacts.push({name:'scope-candidate.json',bytes:Buffer.from(JSON.stringify(bundle.candidate,null,2)+'\n')});
 if(artifacts.some(a=>a.bytes.length>LIMITS.artifactBytes))throw new InputProblem('output-limit');budget.check();
 return {evaluation,bundle,artifacts,report:makeReport({checked:1})};
}
const failure=(e,checked)=>makeReport({checked,incomplete:true,findings:[finding(RULES[e.ruleId]?e.ruleId:'runtime-resource-unavailable',e.pointer??'','@runtime')]});
// Pure evaluation prepares artifacts but does not claim that files were published.
export function evaluateBytes(bytes,{now,font,fontBytes,limits=LIMITS}={}){
 const budget=createBudget({now});try{const parsed=parseQuestionnaireBytes(bytes,{budget,limits});if(parsed.incomplete)return {evaluation:null,bundle:null,artifacts:[],report:makeReport({findings:parsed.findings,incomplete:true})};return evaluateValue(parsed.value,{budget,font,fontBytes});}catch(e){return {evaluation:null,bundle:null,artifacts:[],report:failure(e,1)};}
}
export async function buildDrafts({inputPath,outDir,outputRoot=null},{now,io}={}){
 const budget=createBudget({now}),inputs=[];let checked=0;
 try{
  const parsed=await readQuestionnaire(inputPath,{budget,inputs});if(parsed.incomplete)return makeReport({findings:parsed.findings,incomplete:true});checked=1;
  const resource=await readFont(inputs,budget),result=evaluateValue(parsed.value,{budget,...resource});if(result.report.status!=='pass')return result.report;
  const published=await publishArtifacts(result.artifacts,{outDir,outputRoot,inputs,budget,...(io?{io}:{})});
  return makeReport({checked:1,findings:published.findings,incomplete:published.incomplete,filesWritten:published.written,retainedFiles:published.retained});
 }catch(e){return failure(e,checked);}
}
