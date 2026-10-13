import {InputProblem} from './rules.mjs';
import {LIMITS} from './budget.mjs';
export function textLines(text,font,width,pointSize,budget){
 const lines=[];let line='',used=0;
 for(const token of text.split(/(\s+)/u)){
  budget.check();if(!token)continue;
  if(/^\s+$/u.test(token)){if(line&&!line.endsWith(' ')){line+=' ';used+=font.advanceFor(font.glyphFor(32))*pointSize/font.unitsPerEm;}continue;}
  const tokenWidth=[...token].reduce((a,ch)=>a+font.advanceFor(font.glyphFor(ch.codePointAt(0)))*pointSize/font.unitsPerEm,0);
  if(line&&used+tokenWidth>width){lines.push(line.trimEnd());line='';used=0;}
  for(const ch of token){budget.check();const glyph=font.glyphFor(ch.codePointAt(0));if(!glyph)throw new InputProblem('unsupported-pdf-character');const w=font.advanceFor(glyph)*pointSize/font.unitsPerEm;if(line&&used+w>width){lines.push(line);line='';used=0;}line+=ch;used+=w;}
 }if(line)lines.push(line.trimEnd());return lines;
}
const stream=(bytes,extra='')=>Buffer.concat([Buffer.from(`<< /Length ${bytes.length}${extra} >>\nstream\n`),bytes,Buffer.from('\nendstream')]);
const encode=s=>'<'+[...s].map(ch=>ch.codePointAt(0).toString(16).padStart(4,'0')).join('')+'>';
export function renderPdf(doc,{font,fontBytes,budget,maxPages=LIMITS.pages,maxBytes=LIMITS.artifactBytes}){
 const pages=[[]];let y=790;
 const newPage=()=>{if(pages.length>=maxPages)throw new InputProblem('output-limit');pages.push([]);y=790;};
 function line(s,size=11){budget.check();if(y<64)newPage();pages.at(-1).push({text:s,size,y});y-=15;}
 function paragraph(s,size=11){for(const sLine of textLines(s,font,499,size,budget))line(sLine,size);}
 paragraph(doc.title,15);paragraph(doc.warning,11);y-=10;
 for(const section of doc.sections){budget.check();if(y<109)newPage();paragraph(section.title,12);for(const s of section.lines)paragraph(s);y-=10;}
 for(const page of pages)page.push({text:doc.warning,size:9,y:32});
 const used=[...new Set(pages.flatMap(p=>p.flatMap(l=>[...l.text].map(ch=>ch.codePointAt(0)))))].sort((a,b)=>a-b);
 if(used.some(cp=>cp>65535||!font.glyphFor(cp)))throw new InputProblem('unsupported-pdf-character');
 const objects=[null,null];const add=buffer=>{objects.push(Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer));return objects.length;};
 const scale=n=>Math.round(n*1000/font.unitsPerEm),fontFile=add(stream(fontBytes,` /Length1 ${fontBytes.length}`));
 const descriptor=add(`<< /Type /FontDescriptor /FontName /${font.postscriptName} /Flags 32 /FontBBox [${font.bbox.map(scale).join(' ')}] /ItalicAngle 0 /Ascent ${scale(font.ascent)} /Descent ${scale(font.descent)} /CapHeight ${scale(font.ascent)} /StemV 80 /FontFile2 ${fontFile} 0 R >>`);
 const map=Buffer.alloc((used.at(-1)+1)*2);for(const cp of used){budget.check();map.writeUInt16BE(font.glyphFor(cp),cp*2);}const mapId=add(stream(map));
 let unicode='/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /EdilecUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n';
 for(let i=0;i<used.length;i+=100){const part=used.slice(i,i+100);unicode+=part.length+' beginbfchar\n'+part.map(cp=>{const hex=cp.toString(16).padStart(4,'0');return `<${hex}> <${hex}>`;}).join('\n')+'\nendbfchar\n';}
 unicode+='endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n';const toUnicode=add(stream(Buffer.from(unicode)));
 const descendant=add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${font.postscriptName} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /CIDToGIDMap ${mapId} 0 R /DW 1000 /W [${used.map(cp=>`${cp} [${scale(font.advanceFor(font.glyphFor(cp)))}]`).join(' ')}] >>`);
 const fontId=add(`<< /Type /Font /Subtype /Type0 /BaseFont /${font.postscriptName} /Encoding /Identity-H /DescendantFonts [${descendant} 0 R] /ToUnicode ${toUnicode} 0 R >>`),pageIds=[];
 for(const page of pages){budget.check();const content=add(stream(Buffer.from(page.map(l=>`BT /F1 ${l.size} Tf 1 0 0 1 48 ${l.y} Tm ${encode(l.text)} Tj ET`).join('\n'))));pageIds.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${content} 0 R >>`));}
 objects[0]=Buffer.from('<< /Type /Catalog /Pages 2 0 R >>');objects[1]=Buffer.from(`<< /Type /Pages /Kids [${pageIds.map(n=>`${n} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
 const chunks=[Buffer.from('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n','latin1')],offsets=[];let total=chunks[0].length;
 for(const [i,object]of objects.entries()){budget.check();offsets.push(total);const chunk=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),object,Buffer.from('\nendobj\n')]);chunks.push(chunk);total+=chunk.length;if(total>maxBytes)throw new InputProblem('output-limit');}
 const xrefOffset=total,xref=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');chunks.push(Buffer.from(xref+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`));const bytes=Buffer.concat(chunks);if(bytes.length>maxBytes)throw new InputProblem('output-limit');budget.check();return bytes;
}
