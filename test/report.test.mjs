import test from 'node:test';import assert from 'node:assert/strict';
import {finding,makeReport,exitCode,byCodeUnit} from '../src/report.mjs';
test('complete contradiction fails; incomplete rule dominates forgotten flag',()=>{
 const f=finding('method-policy-conflict','/permittedMethods/0/id');let r=makeReport({findings:[f],checked:1});assert.equal(r.status,'fail');assert.equal(exitCode(r),1);
 r=makeReport({findings:[f,finding('emergency-contact-missing','/contacts')],checked:1});assert.equal(r.status,'incomplete');assert.equal(exitCode(r),2);
});
test('report has deterministic code-unit ordering and safe provenance',()=>{
 assert.deepEqual(['a_b','a-b','a','Z'].sort(byCodeUnit),['Z','a','a-b','a_b']);
 const r=makeReport({findings:[finding('timestamp-invalid','/windows/2/end'),finding('timestamp-invalid','/windows/10/end')],checked:1});assert.deepEqual(r.findings.map(f=>f.location.pointer),['/windows/10/end','/windows/2/end']);
 assert.equal(r.tool,'rules-of-engagement-builder');assert.equal(r.schemaVersion,'1');assert.equal(r.findings[0].location.file,'@questionnaire');assert.throws(()=>finding('invalid'),/Unknown rule/);
});
test('clean report has zero findings and stable file list',()=>{const r=makeReport({checked:1,filesWritten:['scope-candidate.json','authorization-letter.md']});assert.deepEqual(r.findings,[]);assert.equal(exitCode(r),0);assert.equal(r.summary.filesWritten,2);assert.deepEqual(r.filesWritten,['authorization-letter.md','scope-candidate.json']);});
