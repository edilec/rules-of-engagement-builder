import {finding} from './report.mjs';
const forbidden=/[\u0000-\u001F\u007F-\u009F\u2028\u2029\u200E\u200F\u202A-\u202E\u2066-\u2069]|\p{Cf}/gu;
const secrets=/(?:-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bBearer\s+\S+|\beyJ[\w-]+\.[\w-]+\.[\w-]+|\b(?:password|api[_-]?key|secret|token)\s*[:=]\s*\S+)/iu;
export const renderedText=raw=>raw.replace(forbidden,'').trim();
export function validateText(raw,{pointer='',identity=false,maxUnits=4096}={}){
 const refuse=id=>({value:null,findings:[finding(id,pointer)]});
 if(typeof raw!=='string')return refuse('input-shape-invalid');
 if(secrets.test(raw))return refuse('secret-like-content');
 const value=renderedText(raw);
 if(!value)return refuse('required-text-unusable');
 if(raw.length>maxUnits)return refuse('text-limit');
 if(/\p{Surrogate}/u.test(raw))return refuse('unsupported-pdf-character');
 if(identity&&(value!==raw.trim()||/\p{Cf}/u.test(raw)))return refuse('unsafe-boundary-text');
 return {value,findings:[]};
}
export const escapeMarkdown=s=>s.replace(/&/gu,'&amp;').replace(/</gu,'&lt;').replace(/>/gu,'&gt;').replace(/[\\`*_{}[\]()#+.!|~-]/gu,'\\$&');
