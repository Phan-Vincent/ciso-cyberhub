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
