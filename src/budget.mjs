import {performance} from 'node:perf_hooks';
import {InputProblem} from './rules.mjs';
export const LIMITS=Object.freeze({bytes:1048576,targets:500,exclusions:100,windows:100,contacts:20,methods:100,textUnits:4096,idUnits:128,depth:10,nodes:20000,milliseconds:5000,pages:1024,artifactBytes:8388608});
export function createBudget({now=performance.now,maxMilliseconds=LIMITS.milliseconds}={}){
 const start=now();return {check(){if(now()-start>maxMilliseconds)throw new InputProblem('evaluation-deadline');},elapsed(){return now()-start;}};
}
