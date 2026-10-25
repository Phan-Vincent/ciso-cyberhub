// PowerShell Lab: every level solvable with real-style cmdlets; ids match the lessons.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const f = join(mkdtempSync(join(tmpdir(), 'ps-')), 'ps.mjs');
writeFileSync(f, stripTypeScriptTypes(readFileSync(new URL('../web/pslab.ts', import.meta.url), 'utf8'), { mode: 'strip' }));
const { PS, PS_LEVELS } = await import(pathToFileURL(f).href);
const out = (sh, c) => sh.run(c).out.join('\n');
const grab = s => (s.match(/CISO\{[0-9a-f-]+\}/) || [])[0];
const SOLVE = {
  'ps-whoami': ['whoami'], 'ps-location': ['Get-Location'],
  'ps-list': sh => { const l = out(sh, 'Get-ChildItem C:\\Cases -Recurse'); assert.match(l, /IR-2026-17/); return grab(out(sh, 'Get-Content C:\\Cases\\IR-2026-17\\handoff.txt')); },
  'ps-hidden': sh => { assert.doesNotMatch(out(sh, 'ls ~\\Documents'), /stash/); assert.match(out(sh, 'ls ~\\Documents -Force'), /\.stash\.txt/); return grab(out(sh, 'cat ~\\Documents\\.stash.txt')); },
  'ps-tail': sh => grab(out(sh, 'Get-Content C:\\Logs\\app.log -Tail 1')),
  'ps-search': sh => grab(out(sh, 'Select-String -Pattern admin -Path C:\\Logs\\web.log')),
  'ps-process': sh => { const top = out(sh, 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 1').trim().split('\n').pop().trim().split(/\s+/); sh.run('Stop-Process -Id ' + top[0]); return null; },
  'ps-service': sh => out(sh, "Get-Service | Where-Object { $_.DisplayName -eq 'Windows Helper' }").trim().split('\n').pop().trim().split(/\s+/)[1],
  'ps-users': sh => out(sh, 'Get-LocalUser | Where-Object { $_.Enabled -eq true }').split('\n').map(l => l.trim().split(/\s+/)[0]).find(n => n && !n.startsWith('-') && !['Name', 'student', 'analyst'].includes(n)),
  'ps-admins': sh => out(sh, 'Get-LocalGroupMember -Group Administrators').split('\n').map(l => (l.match(/HUB-WIN01\\(\S+)/) || [])[1]).find(n => n && !['Administrator', 'analyst'].includes(n)),
  'ps-events': sh => out(sh, "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} | Measure-Object").match(/Count\s+:\s+(\d+)/)[1],
  'ps-persistence': sh => out(sh, 'Get-ItemProperty HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run').split('\n').find(l => /AppData/.test(l)).trim().split(/\s+/)[0],
  'ps-tasks': sh => out(sh, 'Get-ScheduledTask').split('\n').find(l => /-enc/.test(l)).trim().split(/\s+/)[1],
  'ps-hash': sh => { const bad = out(sh, 'cat C:\\Cases\\ioc.txt').trim().split('\n').pop(); const row = out(sh, 'Get-ChildItem ~\\Desktop\\Downloads | Get-FileHash').split('\n').find(l => l.includes(bad)); return row.trim().split('\\').pop(); },
  'ps-network': sh => { const rows = out(sh, 'Get-NetTCPConnection -State Established').split('\n').filter(l => /Established/.test(l)); const pids = rows.map(r => r.trim().split(/\s+/).pop());
    const odd = rows.find((r, i) => /rundll32/.test(out(sh, 'Get-Process -Id ' + pids[i]))); return odd.trim().split(/\s+/)[2]; },
};
test('every PowerShell level is solvable with cmdlets', () => {
  assert.deepEqual(Object.keys(SOLVE).sort(), PS_LEVELS.map(l => l.id).sort());
  for (let r = 0; r < 4; r++) for (const level of PS_LEVELS) {
    const sh = new PS(); let won = false; sh.onWin = () => { won = true; }; sh.load(level, []);
    const how = SOLVE[level.id]; if (Array.isArray(how)) how.forEach(c => sh.run(c)); else { const a = how(sh); if (level.submit) { assert.equal(String(a).toLowerCase(), sh.w.answer.toLowerCase(), level.id); assert.match(sh.run('submit ' + a).out.join(''), /Correct/); } }
    if (!level.submit) assert.ok(won, level.id + ' not solved');
  }
});
test('submit checks answers and errors look like PowerShell', async () => {
  const sh = new PS(); let won = false; sh.onWin = () => { won = true; }; sh.load(PS_LEVELS.find(l => l.id === 'ps-tail'), []);
  assert.match(sh.run('submit nope').err.join(''), /Not quite/); const a = sh.w.answer; sh.run('submit ' + a); await new Promise(r => setTimeout(r, 5)); assert.ok(won);
  assert.match(sh.run('Get-Bogus').err.join(''), /not recognized/); assert.match(sh.run('cd C:\\Nope').err.join(''), /does not exist/);
  sh.run('cd C:\\Logs'); assert.equal(sh.prompt(), 'PS C:\\Logs> ');
});

test('Where-Object -match handles invalid regex without throwing', () => {
  const sh = new PS();
  assert.doesNotThrow(() => sh.run("Get-Process | Where-Object { $_.Name -match '[' }"));
  assert.match(sh.run("Get-Process | Where-Object { $_.Name -match '[' }").err.join(''), /invalid|regex|pattern/i);
});
