import {readdir,readFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import {join} from 'node:path';
async function files(dir){const all=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())all.push(...await files(p));else all.push(p);}return all.sort();}
for(const dir of ['src','bin','test','scripts'])for(const p of await files(dir))if(p.endsWith('.mjs')){const r=spawnSync(process.execPath,['--check',p],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??2);}
for(const dir of ['docs','examples'])for(const p of await files(dir))if(p.endsWith('.json'))JSON.parse(await readFile(p,'utf8'));
process.stdout.write('Syntax and local JSON checks passed.\n');
