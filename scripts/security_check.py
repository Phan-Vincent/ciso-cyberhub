"""Narrow source guardrails, not a replacement for a security audit or secret scanner."""
import json
import re
from pathlib import Path
errors=[]
for file in Path('.github/workflows').glob('*.yml'):
    s=file.read_text()
    if 'pull_request_target:'in s:errors.append(f'{file}: privileged PR execution forbidden')
    for action in re.findall(r'uses:\s*(\S+)',s):
        if not re.fullmatch(r'[A-Za-z0-9_./-]+@[a-f0-9]{40}',action):errors.append(f'{file}: unpinned action')
for folder in ('hub','web','content','data'):
    for file in Path(folder).rglob('*'):
        if file.suffix not in ('.py','.ts','.json','.md'):continue
        text=file.read_text()
        if re.search(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',text):errors.append(f'{file}: private key marker')
        if re.search(r'gh[pousr]_[A-Za-z0-9]{30,}',text):errors.append(f'{file}: possible GitHub token')
        if file.suffix=='.ts'and re.search(r'\.innerHTML\s*=|\beval\(',text):errors.append(f'{file}: unsafe DOM/code sink')
        if file.suffix=='.py'and 'shell=True'in text:errors.append(f'{file}: shell execution')
package=json.loads(Path('package.json').read_text())
if package.get('dependencies')or package.get('devDependencies'):errors.append('Dependency inventory changed: review licenses and vulnerability audit requirements')
if errors:raise SystemExit('\n'.join(errors))
print('Pinned actions, narrow secret patterns, unsafe sinks and empty dependency inventory checked; not a full vulnerability audit.')
