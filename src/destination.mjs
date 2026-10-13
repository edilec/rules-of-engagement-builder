import {lstat,realpath,mkdir} from 'node:fs/promises';
import {resolve,dirname,relative,isAbsolute,sep,join,basename} from 'node:path';
import {OutputProblem} from './rules.mjs';
const inside=(root,parent)=>{const r=relative(root,parent);return r===''||(!isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+sep));};
export const sameIdentity=(a,b)=>a.dev===b.dev&&a.ino===b.ino;
async function entry(path){try{return await lstat(path);}catch(e){if(e.code==='ENOENT')return null;throw new OutputProblem('output-directory-invalid');}}
async function checkedParent(path,root){
 let parent;try{parent=await realpath(dirname(path));if(root!==null&&!inside(await realpath(root),parent))throw new OutputProblem('output-parent-escape');}
 catch(e){if(e instanceof OutputProblem)throw e;throw new OutputProblem('output-directory-invalid');}return parent;
}
export async function assertWritableDestination(destination,{inputs=[],root=null}={}){
 const target=resolve(destination),existing=await entry(target);
 if(existing?.isSymbolicLink())throw new OutputProblem('output-destination-symlink');
 if(existing&&inputs.some(input=>sameIdentity(input,existing)))throw new OutputProblem('output-input-alias');
 if(existing)throw new OutputProblem('output-exists');
 const parent=await checkedParent(target,root);return join(parent,basename(target));
}
export async function prepareOutputDirectory(outDir,{outputRoot=null,inputs=[]}={}){
 const target=resolve(outDir);let existing=await entry(target),created=false;
 if(existing?.isSymbolicLink())throw new OutputProblem('output-destination-symlink');
 if(existing&&inputs.some(input=>sameIdentity(input,existing)))throw new OutputProblem('output-input-alias');
 if(existing&&!existing.isDirectory())throw new OutputProblem('output-directory-invalid');
 const parent=await checkedParent(target,outputRoot),anchored=join(parent,basename(target));
 if(!existing){try{await mkdir(anchored,{mode:0o700});created=true;}catch(e){if(e.code!=='EEXIST')throw new OutputProblem('output-directory-invalid');}existing=await entry(anchored);}
 if(existing?.isSymbolicLink())throw new OutputProblem('output-destination-symlink');
 if(!existing?.isDirectory())throw new OutputProblem('output-directory-invalid');
 const path=await realpath(anchored);
 if(outputRoot!==null&&!inside(await realpath(outputRoot),path))throw new OutputProblem('output-parent-escape');
 return {path,dev:existing.dev,ino:existing.ino,created};
}
