import {mkdtemp,mkdir,readFile,rm} from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const source=fileURLToPath(new URL('..',import.meta.url));
function command(name,args,options={}){const r=spawnSync(name,args,{cwd:source,env:{...process.env,npm_config_offline:'true',COREPACK_ENABLE_NETWORK:'0',CI:'true'},encoding:'utf8',timeout:60000,...options});if(r.status!==0)throw new Error(`Local ${name} verification failed: ${r.error?.code??r.status}`);return r.stdout;}
export async function packCheck(){
 const root=await mkdtemp(join(tmpdir(),'roe-pack-'));
 try{
  const sourcePkg=JSON.parse(await readFile(join(source,'package.json'),'utf8'));
  for(const name of ['dependencies','devDependencies','optionalDependencies','peerDependencies'])assert.deepEqual(Object.keys(sourcePkg[name]??{}),[]);
  for(const name of ['prepack','prepare','postpack','preinstall','install','postinstall'])assert.equal(sourcePkg.scripts?.[name],undefined);
  const tgz=join(root,'package.tgz'),packReceipt=join(root,'pack-network-count');
  command('pnpm',['pack','--out',tgz],{env:{...process.env,npm_config_offline:'true',npm_config_update_notifier:'false',COREPACK_ENABLE_NETWORK:'0',CI:'true',NODE_OPTIONS:`--import=${join(source,'test/preload-deny-network.mjs')}`,ROE_OFFLINE_ALLOW_LOCAL_PROCESS:'1',ROE_OFFLINE_RECEIPT:packReceipt}});
  const packNetworkAttempts=Number(await readFile(packReceipt,'utf8'));assert.equal(packNetworkAttempts,0);
  const entries=command('tar',['-tf',tgz]).trim().split('\n');
  for(const p of entries){assert.ok(p.startsWith('package/'));assert.ok(!p.split('/').includes('..'));assert.ok(!/\/(?:build|drafts|test|scripts|\.superpowers)\//u.test(p));assert.ok(!p.includes('.roe-stage-'));}
  for(const line of command('tar',['-tvf',tgz]).trim().split('\n'))assert.ok(line.startsWith('-')||line.startsWith('d'),'Archive links are refused');
  const extracted=join(root,'extracted');await mkdir(extracted);command('tar',['-xf',tgz,'-C',extracted]);const pkgRoot=join(extracted,'package'),pkg=JSON.parse(await readFile(join(pkgRoot,'package.json'),'utf8'));
  const hash=b=>createHash('sha256').update(b).digest('hex');
  assert.equal(hash(await readFile(join(pkgRoot,'assets/fonts/Vera.ttf'))),'c4c45690b345435b2cba52ecabe275f05e49b389b39fe68ad03afbb551288d3d');
  assert.equal(hash(await readFile(join(pkgRoot,'assets/fonts/bitstream-vera-license.txt'))),'3361d054759a2fc686a2c058be82deaf9c2e6fe549be9004d7935a6c1736315d');
  const input=join(pkgRoot,'examples/complete/questionnaire.json'),before=await readFile(input),receipt=join(root,'network-count');
  const r=spawnSync(process.execPath,['--import',join(source,'test/preload-deny-network.mjs'),join(pkgRoot,'bin/rules-of-engagement-builder.mjs'),'--input',input,'--out-dir',join(root,'drafts')],{cwd:root,env:{...process.env,ROE_OFFLINE_RECEIPT:receipt},encoding:'utf8',timeout:15000});
  assert.equal(r.status,0,r.stderr);const report=JSON.parse(r.stdout);assert.equal(report.status,'pass');assert.equal(report.summary.filesWritten,5);assert.deepEqual(await readFile(input),before);
  const networkAttempts=Number(await readFile(receipt,'utf8'));assert.equal(networkAttempts,0);
  return {entries,pkg,run:{code:r.status,report},networkAttempts,packNetworkAttempts,tarballHash:hash(await readFile(tgz))};
 }finally{await rm(root,{recursive:true,force:true});}
}
if(process.argv[1]&&realpathSync(resolve(process.argv[1]))===fileURLToPath(import.meta.url)){const r=await packCheck();process.stdout.write(`Offline package verified: ${r.entries.length} files; five drafts; zero network attempts.\n`);}
