#!/usr/bin/env node
import {stat} from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {buildDrafts} from '../src/index.mjs';
import {exitCode} from '../src/report.mjs';
const HELP=`rules-of-engagement-builder --input questionnaire.json --out-dir drafts/ [--output-root existing-directory] [--human]\n\nOffline unsigned drafts. stdout: JSON report; stderr: help and optional summary.\nExisting output files and output-directory symlinks are refused. Optional --output-root confines real output parents; without it, ancestor symlinks are followed.\nExit 0: five complete drafts; 1: complete policy contradiction; 2: incomplete input/generation or bad configuration.\nDRAFT — NOT AUTHORIZED UNTIL SIGNED\n`;
export function parseArgs(argv){
 const options={},seen=new Set(),names={'--input':'inputPath','--out-dir':'outDir','--output-root':'outputRoot','--human':'human','--help':'help'};
 for(let i=0;i<argv.length;i++){const flag=argv[i];if(!Object.hasOwn(names,flag)||seen.has(flag))throw new Error('config');const name=names[flag];seen.add(flag);if(flag==='--human'||flag==='--help')options[name]=true;else{const value=argv[++i];if(!value||value.startsWith('--'))throw new Error('config');options[name]=value;}}
 if(!options.help&&(!options.inputPath||!options.outDir))throw new Error('config');return options;
}
export async function runCli(argv,{stdout=process.stdout,stderr=process.stderr,build=buildDrafts}={}){
 let options;try{options=parseArgs(argv);if(options.outputRoot&&!(await stat(options.outputRoot)).isDirectory())throw new Error('config');}catch{stderr.write('Invalid CLI configuration. Use --help.\n');return 2;}
 if(options.help){stderr.write(HELP);return 0;}
 const report=await build(options);stdout.write(JSON.stringify(report)+'\n');
 if(options.human)stderr.write(report.status==='pass'?`Generated ${report.summary.filesWritten} draft files. DRAFT — NOT AUTHORIZED UNTIL SIGNED\n`:`Draft generation ${report.status}. No complete draft set was published.\n`);
 return exitCode(report);
}
if(process.argv[1]&&realpathSync(resolve(process.argv[1]))===fileURLToPath(import.meta.url))process.exitCode=await runCli(process.argv.slice(2));
