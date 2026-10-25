// Resume tailor: skill matching, checks and the no-fabrication prompt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const f = join(mkdtempSync(join(tmpdir(), 'rt-')), 'resume.mjs');
writeFileSync(f, stripTypeScriptTypes(readFileSync(new URL('../web/resume.ts', import.meta.url), 'utf8'), { mode: 'strip' }));
const { analyze, skillsIn, tailorPrompt } = await import(pathToFileURL(f).href);

const resume = `Alex Student  alex@example.com  github.com/alex
Education: B.S. Computer Science, Cal State San Bernardino
Skills: Python, Linux, Wireshark, Splunk, Git
Projects
- Built a home lab with pfSense and Wazuh, triaging 40+ alerts a week
- Responsible for updating the club website`;
const job = 'Security Analyst Intern. Requirements: Python, Linux, SIEM (Splunk), incident response, AWS, communication skills.';

test('skills are detected on word boundaries with aliases', () => {
  assert.deepEqual(skillsIn('We use Splunk and pfSense on Ubuntu').sort(), ['Firewalls', 'Linux', 'SIEM', 'Splunk'].sort());
  assert.ok(!skillsIn('javascript').includes('Java'));
  assert.ok(skillsIn('C++ and C#').includes('C++'));
});

test('analysis splits matched and missing skills and flags weak bullets', () => {
  const a = analyze(resume, job);
  for (const k of ['Python', 'Linux', 'SIEM', 'Splunk']) assert.ok(a.matched.includes(k), k);
  for (const k of ['Incident response', 'AWS']) assert.ok(a.missing.includes(k), k);
  assert.equal(a.weak.length, 1);
  assert.ok(a.score > 0 && a.score <= 100);
  assert.ok(a.checks.find(c => /email/.test(c.text)).ok);
});

test('tailoring prompt forbids invented experience and lists gaps', () => {
  const p = tailorPrompt(resume, job, 'Security Analyst Intern at Acme', analyze(resume, job));
  assert.match(p, /Never invent experience/);
  assert.match(p, /Gaps to address honestly/);
  assert.match(p, /AWS/);
});

test('cover letter prompt keeps the no-fabrication rules and placeholders', async () => {
  const { coverPrompt } = await import(pathToFileURL(f).href);
  const a = analyze('Jane Doe\nBuilt a Splunk dashboard for the CISO club. Python scripts for log parsing. Linux home lab.', 'Security intern: Splunk, Python, AWS, incident response, Linux.');
  const p = coverPrompt('Jane Doe\nresume text', 'posting text', 'SOC Intern at Acme', a, 'Jane Doe');
  assert.match(p, /Never invent experience/);
  assert.match(p, /\[PLACEHOLDER\]/);
  assert.match(p, /Sign it as Jane Doe/);
  assert.match(p, /SOC Intern at Acme/);
  assert.match(p, /Gaps to address honestly/);
});

test('docxText reports malformed zip offsets and sizes as unreadable', async () => {
  const { docxText } = await import(pathToFileURL(f).href);
  const zip = () => { const b = new ArrayBuffer(120); const v = new DataView(b); v.setUint32(0, 0x02014b50, true); v.setUint16(28, 17, true); new Uint8Array(b).set(new TextEncoder().encode('word/document.xml'), 46); v.setUint32(70, 0x06054b50, true); v.setUint16(80, 1, true); return { b, v }; };
  for (const mutate of [v => v.setUint32(86, 119, true), v => { v.setUint32(86, 0, true); v.setUint32(42, 119, true); }, v => { v.setUint32(86, 0, true); v.setUint32(20, 999, true); }]) {
    const { b, v } = zip(); mutate(v);
    await assert.rejects(docxText(b), /No document text found/);
  }
});
