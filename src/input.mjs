import {open} from 'node:fs/promises';
import {LIMITS,createBudget} from './budget.mjs';
import {parseJson} from './json.mjs';
import {InputProblem} from './rules.mjs';
import {finding} from './report.mjs';
export const inputFailure=error=>({value:null,incomplete:true,findings:[finding(error instanceof InputProblem?error.ruleId:'input-unreadable',error instanceof InputProblem?error.pointer:'','@questionnaire',error instanceof InputProblem?error.ordinal:undefined)]});
export function parseQuestionnaireBytes(bytes,{budget=createBudget(),limits=LIMITS}={}){
 try{
  budget.check();if(bytes.length>limits.bytes)throw new InputProblem('input-too-large');
  let text;try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{throw new InputProblem('input-invalid-utf8');}
  return {value:parseJson(text,{budget,maxDepth:limits.depth,maxNodes:limits.nodes}),incomplete:false,findings:[]};
 }catch(error){return inputFailure(error);}
}
export async function readQuestionnaire(path,{budget=createBudget(),inputs=[]}={}){
 let file;
 try{
  file=await open(path,'r');const before=await file.stat();inputs.push({path,dev:before.dev,ino:before.ino});
  if(!before.isFile())throw new InputProblem('input-unreadable');
  if(before.size>LIMITS.bytes)throw new InputProblem('input-too-large');
  const chunks=[];let count=0;
  for(;;){budget.check();const chunk=Buffer.alloc(Math.min(65536,LIMITS.bytes+1-count));const {bytesRead}=await file.read(chunk,0,chunk.length,null);budget.check();if(!bytesRead)break;chunks.push(chunk.subarray(0,bytesRead));count+=bytesRead;if(count>LIMITS.bytes)throw new InputProblem('input-too-large');}
  const after=await file.stat();
  if(before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs||count!==after.size)throw new InputProblem('input-unreadable');
  return parseQuestionnaireBytes(Buffer.concat(chunks),{budget});
 }catch(error){return inputFailure(error);}finally{if(file)await file.close();}
}
