"""Commit only allowlisted JSON to a bot branch, then open/update its review PR.
Runs only after trusted default-branch automation, never pull_request_target.
Requires gh and a scoped GH_TOKEN; no title or source text enters shell syntax.
"""
import json
import os
import re
import subprocess
from pathlib import Path

ALLOWED=['data/intelligence.json','data/review-queue.json','data/catalog-state.json','data/maintenance.json']
MAX_PROPOSAL_BYTES=8_000_000

def command(args,**kwargs):return subprocess.run(args,check=True,text=True,capture_output=True,**kwargs).stdout.strip()
def api(path,method='GET',data=None,headers=None):
    args=['gh','api','--method',method]
    for k,v in (headers or {}).items():args+=['-H',f'{k}: {v}']
    args.append(path)
    if data is not None:args+=['--input','-']
    return json.loads(command(args,input=json.dumps(data)if data is not None else None))

def raw_api(path,limit=MAX_PROPOSAL_BYTES):
    proc=subprocess.Popen(['gh','api','-H','Accept: application/vnd.github.raw+json',path],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    try:
        body=proc.stdout.read(limit+1) if proc.stdout else b''
        stderr=proc.stderr.read() if proc.stderr else b''
    finally:
        if proc.poll() is None:proc.kill()
        proc.wait()
    if proc.returncode!=0:raise RuntimeError(stderr.decode('utf-8','replace').strip() or f'gh api failed for {path}')
    if len(body)>limit:raise ValueError('Proposal file exceeds size bound')
    return body

def main():
    repo=os.environ['GITHUB_REPOSITORY']
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',repo):raise ValueError('Invalid repository')
    # Workflow concurrency ensures one updater. Preserve a pending proposal's branch data.
    branch='automation/source-review';default=api('repos/'+repo)['default_branch']
    changes=[p for p in ALLOWED if Path(p).exists() and command(['git','status','--porcelain','--',p])]
    if not changes:print('No data changes');return
    base_sha=command(['git','rev-parse','HEAD']);base=api(f'repos/{repo}/git/commits/{base_sha}')
    tree=api(f'repos/{repo}/git/trees','POST',{'base_tree':base['tree']['sha'],'tree':[{'path':p,'mode':'100644','type':'blob','content':Path(p).read_text()}for p in changes]})
    parent_file=Path('.cache/proposal-parent')
    previous=parent_file.read_text().strip() if parent_file.exists() else None
    parents=[previous,base_sha] if previous and previous!=base_sha else [base_sha]
    commit=api(f'repos/{repo}/git/commits','POST',{'message':'Propose source and maintenance updates','tree':tree['sha'],'parents':parents})
    # The branch exists if the workflow checked it out; otherwise create it, without force.
    exists=bool(previous)
    if exists:api(f'repos/{repo}/git/refs/heads/{branch}','PATCH',{'sha':commit['sha'],'force':False})
    else:
        # A stale merged branch can remain. Rebase its next proposal by creating a merge commit
        # with the old head as parent, preserving a non-forced branch update.
        result=subprocess.run(['gh','api',f'repos/{repo}/git/ref/heads/{branch}'],text=True,capture_output=True)
        if result.returncode==0:
            old_sha=json.loads(result.stdout)['object']['sha']
            commit=api(f'repos/{repo}/git/commits','POST',{'message':'Propose source and maintenance updates','tree':tree['sha'],'parents':[old_sha,base_sha]})
            api(f'repos/{repo}/git/refs/heads/{branch}','PATCH',{'sha':commit['sha'],'force':False})
        else:
            api(f'repos/{repo}/git/refs','POST',{'ref':'refs/heads/'+branch,'sha':commit['sha']})
    prs=api(f'repos/{repo}/pulls?state=open&head={repo.split("/")[0]}:{branch}')
    if not prs:
        api(f'repos/{repo}/pulls','POST',{'head':branch,'base':default,'title':'Review source and maintenance updates','body':'Automated, bounded source retrieval. Review changed data, failures, licenses and source attribution. No tool or curriculum is automatically approved. The bot does not merge or deploy. Run CI after approving the workflow if GitHub suppresses bot-triggered events.'})
    print('Review branch updated; no merge or deployment performed.')
if __name__=='__main__':main()
