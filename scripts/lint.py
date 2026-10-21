"""Dependency-free syntax/data/style lint. Not semantic TypeScript checking."""
import ast
import json
from pathlib import Path
errors=[]
for folder in ('hub','scripts','tests','web','data','content'):
    for p in Path(folder).rglob('*'):
        if p.suffix not in ('.py','.json','.ts','.mjs','.md','.css'):continue
        text=p.read_text()
        if not text.endswith('\n'):errors.append(f'{p}: missing final newline')
        for i,line in enumerate(text.splitlines(),1):
            if line.rstrip()!=line:errors.append(f'{p}:{i}: trailing whitespace')
        try:
            if p.suffix=='.py':ast.parse(text)
            if p.suffix=='.json':json.loads(text)
        except (ValueError,SyntaxError)as e:errors.append(f'{p}: {e}')
if errors:raise SystemExit('\n'.join(errors[:50]))
print('Python AST, JSON syntax and whitespace lint passed.')
