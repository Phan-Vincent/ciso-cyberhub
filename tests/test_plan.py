import json
import unittest

from hub.common import ROOT


class PlanTests(unittest.TestCase):
    def test_every_plan_link_is_a_real_page(self):
        from hub.plan import goals
        g = goals(None)
        self.assertGreaterEqual(len(g), 5)
        for key, goal in g.items():
            self.assertGreaterEqual(len(goal['tasks']), 8, key)
            for t in goal['tasks']:
                path = t['u'].split('#')[0].strip('/')
                self.assertTrue((ROOT / 'dist' / path / 'index.html').exists() or (ROOT / 'dist/index.html').exists() and not path, f'{key}: {t["u"]}')
                self.assertTrue(5 <= t['m'] <= 120)

    def test_it_cards(self):
        d = json.loads((ROOT / 'data/it_cards.json').read_text())
        ids = [c['id'] for c in d['cards']]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(all(c['deck'] in d['decks'] and c['front'] and c['back'] for c in d['cards']))
