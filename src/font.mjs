import {InputProblem} from './rules.mjs';
export function loadFont(bytes){
 try{
  const check=(p,n)=>{if(!Number.isSafeInteger(p)||p<0||p+n>bytes.length)throw new Error('font bounds');};
  const u16=p=>{check(p,2);return bytes.readUInt16BE(p);},i16=p=>{check(p,2);return bytes.readInt16BE(p);},u32=p=>{check(p,4);return bytes.readUInt32BE(p);};
  if(u32(0)!==0x00010000)throw new Error('sfnt');const tables={};
  for(let i=0;i<u16(4);i++){const p=12+i*16;check(p,16);const name=bytes.toString('ascii',p,p+4),offset=u32(p+8),length=u32(p+12);check(offset,length);tables[name]={offset,length};}
  const table=(name,min)=>{const t=tables[name];if(!t||t.length<min)throw new Error('table');return t.offset;};
  const head=table('head',54),hhea=table('hhea',36),hmtx=table('hmtx',4),maxp=table('maxp',6),cmap=table('cmap',4),names=table('name',6);
  const unitsPerEm=u16(head+18),glyphCount=u16(maxp+4),metrics=u16(hhea+34);
  if(!unitsPerEm||!metrics||metrics>glyphCount||tables.hmtx.length<metrics*4+(glyphCount-metrics)*2)throw new Error('metrics');
  let map;
  for(let i=0;i<u16(cmap+2);i++){const p=cmap+4+i*8;check(p,8);const platform=u16(p),encoding=u16(p+2),offset=cmap+u32(p+4);if((platform===0||(platform===3&&encoding===1))&&u16(offset)===4)map=offset;}
  if(map===undefined)throw new Error('cmap');const mapLength=u16(map+2);check(map,mapLength);const segments=u16(map+6)/2;if(!Number.isInteger(segments)||!segments)throw new Error('segments');
  const ends=map+14,starts=ends+2*segments+2,deltas=starts+2*segments,ranges=deltas+2*segments;
  if(ranges+2*segments>map+mapLength)throw new Error('segments bounds');
  let postscriptName='';const count=u16(names+2),store=names+u16(names+4);
  for(let i=0;i<count;i++){const p=names+6+i*12;check(p,12);if(u16(p+6)!==6)continue;const start=store+u16(p+10),length=u16(p+8);check(start,length);if(u16(p)===3){for(let j=0;j<length;j+=2)postscriptName+=String.fromCharCode(u16(start+j));break;}}
  if(!/^[A-Za-z0-9-]+$/u.test(postscriptName))throw new Error('name');
  function glyphFor(cp){
   if(!Number.isInteger(cp)||cp<0||cp>0xffff||cp>=0xd800&&cp<=0xdfff)return 0;
   for(let i=0;i<segments;i++){const end=u16(ends+2*i),start=u16(starts+2*i);if(cp>end)continue;if(cp<start)return 0;const delta=i16(deltas+2*i),range=u16(ranges+2*i);if(!range)return (cp+delta)&0xffff;const offset=ranges+2*i+range+2*(cp-start);if(offset+2>map+mapLength)throw new InputProblem('runtime-resource-unavailable');const raw=u16(offset);const glyph=raw?(raw+delta)&0xffff:0;return glyph<glyphCount?glyph:0;}return 0;
  }
  return {postscriptName,unitsPerEm,ascent:i16(hhea+4),descent:i16(hhea+6),bbox:[i16(head+36),i16(head+38),i16(head+40),i16(head+42)],glyphFor,advanceFor(g){if(g<0||g>=glyphCount)throw new InputProblem('runtime-resource-unavailable');return u16(hmtx+4*Math.min(g,metrics-1));}};
 }catch{throw new InputProblem('runtime-resource-unavailable');}
}
