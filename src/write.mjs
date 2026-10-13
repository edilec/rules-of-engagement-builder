import * as fs from 'node:fs/promises';
import {join} from 'node:path';
import {ARTIFACT_NAMES} from './documents.mjs';
import {OutputProblem} from './rules.mjs';
import {finding,byCodeUnit} from './report.mjs';
import {assertWritableDestination,prepareOutputDirectory,sameIdentity} from './destination.mjs';
import {LIMITS} from './budget.mjs';
// Private trusted output directories are required: portable Node lacks openat-style ancestor anchoring.
export async function publishArtifacts(artifacts,{outDir,outputRoot=null,inputs=[],budget,io=fs}){
 let directory,stage,stageIdentity;let preserveStage=false;const promoted=[],findings=[],retained=[];
 async function assertDirectory(){const now=await io.lstat(directory.path);if(!now.isDirectory()||now.isSymbolicLink()||!sameIdentity(now,directory))throw new OutputProblem('output-directory-invalid');}
 async function cleanStage(){if(!stage)return;const current=await io.lstat(stage);if(!current.isDirectory()||!sameIdentity(current,stageIdentity))throw new OutputProblem('output-cleanup-failed');await io.rm(stage,{recursive:true});stage=null;}
 try{
  budget.check();
  if(artifacts.length!==5||new Set(artifacts.map(a=>a.name)).size!==5||artifacts.some(a=>!ARTIFACT_NAMES.includes(a.name)||!Buffer.isBuffer(a.bytes)))throw new OutputProblem('output-write-failed');
  if(artifacts.some(a=>a.bytes.length>LIMITS.artifactBytes))throw new OutputProblem('output-limit');
  directory=await prepareOutputDirectory(outDir,{outputRoot,inputs});
  for(const a of artifacts)await assertWritableDestination(join(directory.path,a.name),{root:outputRoot,inputs});
  await assertDirectory();stage=await io.mkdtemp(join(directory.path,'.roe-stage-'));await io.chmod(stage,0o700);stageIdentity=await io.lstat(stage);
  for(const a of artifacts){budget.check();const handle=await io.open(join(stage,a.name),'wx',0o600);try{await handle.writeFile(a.bytes);await handle.sync();}finally{await handle.close();}}
  for(const a of artifacts){
   budget.check();await assertDirectory();const destination=join(directory.path,a.name);
   const identity=await io.lstat(join(stage,a.name));
   // link is an atomic no-replace promotion on the same filesystem; ordinary rename would overwrite.
   await io.link(join(stage,a.name),destination);promoted.push({name:a.name,path:destination,dev:identity.dev,ino:identity.ino});
   await assertDirectory();
   if(!sameIdentity(identity,await io.lstat(destination)))throw new OutputProblem('output-write-failed');
  }
  await assertDirectory();const handle=await io.open(directory.path,'r');try{await handle.sync();}finally{await handle.close();}
  budget.check();await cleanStage();return {written:promoted.map(p=>p.name).sort(byCodeUnit),retained:[],findings:[],incomplete:false};
 }catch(e){
  findings.push(finding(e instanceof OutputProblem?e.ruleId:e.ruleId==='evaluation-deadline'?e.ruleId:'output-write-failed','','@output'));
  // Move the public leaf into private quarantine before checking/deleting it. A lstat/unlink
  // pair on the public path would delete a replacement inserted between those two operations.
  for(const p of promoted.reverse()){
   let quarantined=false;
   try{
    const currentStage=await io.lstat(stage);
    if(!currentStage.isDirectory()||!sameIdentity(currentStage,stageIdentity))throw new Error('stage identity changed');
    const quarantine=join(stage,'.rollback-'+p.name);
    await io.rename(p.path,quarantine);quarantined=true;
    const current=await io.lstat(quarantine);
    if(sameIdentity(current,p))await io.unlink(quarantine);
    else{
     retained.push(p.name);
     // An unexpected inode belongs to somebody else. Restore only without replacement.
     // If another destination has appeared, keep private quarantine and never recursively remove it.
     try{await io.link(quarantine,p.path);await io.unlink(quarantine);}catch{preserveStage=true;}
    }
   }catch(error){if(error.code!=='ENOENT'||quarantined){retained.push(p.name);if(quarantined)preserveStage=true;}}
  }
  if(!preserveStage)try{await cleanStage();}catch{preserveStage=true;}
  if(preserveStage){for(const a of artifacts)if(!retained.includes(a.name))retained.push(a.name);findings.push(finding('output-cleanup-failed','','@output'));}
  if(retained.length&&!findings.some(f=>f.ruleId==='output-cleanup-failed'))findings.push(finding('output-cleanup-failed','','@output'));
  return {written:[],retained:[...new Set(retained)].sort(byCodeUnit),findings,incomplete:true,...(preserveStage?{stagingCleanupIncomplete:true}:{})};
 }
}
