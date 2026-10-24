import json
import unittest

from hub.build import Site
from hub.daily import FAMILY_IDS, family_of, figure, puzzles
from hub.play import MATCH, ROLES


class PlayTest(unittest.TestCase):
    def test_families(self):
        self.assertEqual(family_of('Foo Router OS Command Injection Vulnerability'), 'injection')
        self.assertEqual(family_of('Browser Use-After-Free Vulnerability'), 'memory')
        self.assertEqual(family_of('VPN Authentication Bypass Vulnerability'), 'auth')
        self.assertEqual(family_of('Server Path Traversal Vulnerability'), 'path')
        self.assertIsNone(family_of('Product Remote Code Execution Vulnerability'))

    def test_puzzles_are_compact_and_valid(self):
        vulns = [{'id': 'CVE-2026-0001', 'title': 'X SQL Injection Vulnerability', 'vendor': 'V', 'product': 'P', 'date_added': '2026-10-01', 'due_date': '2026-10-22', 'cvss': None, 'epss': None},
                 {'id': 'bad', 'title': 'X SQL Injection Vulnerability'}, {'id': 'CVE-2026-0002', 'title': 'Unclear issue'}]
        p = puzzles(vulns)
        self.assertEqual([x['id'] for x in p], ['CVE-2026-0001'])
        self.assertEqual(p[0]['family'], 'injection')
        self.assertIn(p[0]['family'], FAMILY_IDS)

    def test_figures_are_csp_safe(self):
        for fid in FAMILY_IDS:
            svg = figure(fid)
            self.assertNotIn('style=', svg)
            self.assertNotIn('<script', svg)

    def test_match_weights_name_real_roles(self):
        for _q, answers in MATCH:
            self.assertEqual(len(answers), 4)
            for _a, weights in answers:
                self.assertTrue(set(weights) <= set(ROLES))


if __name__ == '__main__':
    unittest.main()
