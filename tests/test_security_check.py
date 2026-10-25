import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

class SecurityCheckTests(unittest.TestCase):
    def test_new_sinks_and_scripts_are_scanned(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            for folder in ('.github/workflows','web','scripts'): (root/folder).mkdir(parents=True)
            (root/'package.json').write_text('{"dependencies":{},"devDependencies":{}}')
            (root/'web/a.ts').write_text('el.outerHTML = x; el.insertAdjacentHTML(x,y); document.write(x); new Function(x)')
            (root/'scripts/a.mjs').write_text('new Function(x)')
            (root/'scripts/a.py').write_text('subprocess.run(x, shell=True)')
            result=subprocess.run(['python3',str(ROOT/'scripts/security_check.py')],cwd=root,capture_output=True,text=True)
            self.assertNotEqual(result.returncode,0)
            self.assertIn('web/a.ts: unsafe DOM/code sink',result.stderr)
            self.assertIn('scripts/a.mjs: unsafe DOM/code sink',result.stderr)
            self.assertIn('scripts/a.py: shell execution',result.stderr)
