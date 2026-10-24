"""Publish refreshed source-reported intelligence straight to the default branch.

Runs only in trusted default-branch automation after the full check suite, tests,
production build and site check have passed on the refreshed data. It commits only
data/intelligence.json and data/internships.json (attributed records, no code), through the Git
Data API, with a non-forced ref update: if main moved during the run, the update is
refused and the next scheduled run tries again. Catalog and curriculum proposals still
go through scripts/propose.py for human review.
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from propose import api, command  # noqa: E402

PUBLISH = ['data/intelligence.json', 'data/internships.json']


def main() -> int:
    repo = os.environ['GITHUB_REPOSITORY']
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repo):
        raise ValueError('Invalid repository')
    changed = [p for p in PUBLISH if Path(p).exists() and command(['git', 'status', '--porcelain', '--', p])]
    if not changed:
        print('No intelligence changes to publish')
        return 0
    data = json.loads(Path('data/intelligence.json').read_text())
    if data.get('mode') != 'source-reported':
        raise SystemExit('Refusing to publish fixture data')
    default = api(f'repos/{repo}')['default_branch']
    base_sha = command(['git', 'rev-parse', 'HEAD'])
    head = api(f'repos/{repo}/git/ref/heads/{default}')['object']['sha']
    if head != base_sha:
        print(f'::warning::{default} moved during this run; skipping publish, the next run will retry.')
        return 0
    base = api(f'repos/{repo}/git/commits/{base_sha}')
    tree = api(f'repos/{repo}/git/trees', 'POST', {'base_tree': base['tree']['sha'], 'tree': [
        {'path': p, 'mode': '100644', 'type': 'blob', 'content': Path(p).read_text()} for p in changed]})
    commit = api(f'repos/{repo}/git/commits', 'POST', {'message': 'Refresh source-reported data (automated)\n\nHeadlines, CISA KEV records and internship listings only. Checks, tests, build and site check passed in this run.', 'tree': tree['sha'], 'parents': [base_sha]})
    api(f'repos/{repo}/git/refs/heads/{default}', 'PATCH', {'sha': commit['sha'], 'force': False})
    # Keep the review proposal step from re-proposing what is now on main.
    subprocess.run(['git', 'checkout', '--', *changed], check=True)
    print(f'Published intelligence update {commit["sha"][:7]} to {default}.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
