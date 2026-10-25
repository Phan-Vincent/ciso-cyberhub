import unittest

from hub.common import ROOT, read_json
from hub.defend import DOMAINS, slug_for


class DefendTests(unittest.TestCase):
    def test_every_field_photo_has_a_page(self):
        captions = [p['caption'] for p in read_json(ROOT / 'data/photos.json') if p.get('slot') == 'field']
        for c in captions:
            self.assertTrue(slug_for(c), f'no /defend/ page for photo "{c}"')

    def test_pages_are_complete_and_sourced(self):
        for d in DOMAINS:
            with self.subTest(d['slug']):
                for key in ('what', 'attacks', 'incidents', 'defend', 'practice', 'careers'):
                    self.assertGreaterEqual(len(d[key]), 3, key)
                self.assertGreaterEqual(len(d['sources']), 4)
                for _t, url, _n in d['sources']:
                    self.assertTrue(url.startswith('https://'), url)
                for _t, path in d['practice']:
                    self.assertTrue(path.startswith('/'), path)


if __name__ == '__main__':
    unittest.main()


class ShiftAndBadgeTests(unittest.TestCase):
    def test_every_guide_has_a_balanced_shift(self):
        from hub.shifts import SHIFTS
        self.assertEqual(sorted(SHIFTS), sorted(d['slug'] for d in DOMAINS))
        for slug, (_role, _setting, steps, debrief, (_t, path)) in SHIFTS.items():
            with self.subTest(slug):
                self.assertEqual(len(steps), 4)
                self.assertTrue(debrief and path.startswith('/'))
                for _time, _sit, choices in steps:
                    verdicts = [v for _c, v, _w in choices]
                    self.assertEqual(len(verdicts), 3)
                    self.assertEqual(verdicts.count('best'), 1)
                    self.assertTrue(set(verdicts) <= {'best', 'ok', 'bad'})

    def test_badge_ids_match_the_browser_code(self):
        import re
        from hub.badges import BADGES
        ts = (ROOT / 'web/journey.ts').read_text()
        self.assertEqual([b[0] for b in BADGES], re.findall(r"\{ id: '([a-z-]+)', test:", ts))

    def test_competition_dates_are_ordered(self):
        from hub.competitions import EVENTS, COMPS
        ids = {c['id'] for c in COMPS}
        self.assertEqual([e[0] for e in EVENTS], sorted(e[0] for e in EVENTS))
        for start, end, cid, _label in EVENTS:
            self.assertLessEqual(start, end)
            self.assertIn(cid, ids)
