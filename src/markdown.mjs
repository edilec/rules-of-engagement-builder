import {escapeMarkdown} from './text.mjs';
export function renderMarkdown(doc){
 return Buffer.from(`# ${doc.title}\n\n**${doc.warning}**\n\n`+doc.sections.map(s=>`## ${s.title}\n\n`+s.lines.map(line=>`- ${escapeMarkdown(line)}`).join('\n')).join('\n\n')+'\n');
}
