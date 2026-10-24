import json
import shutil
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from hub.common import ROOT
from hub.http import FetchError
from hub.pulse import refresh

FIX = ROOT / 'tests/fixtures/pulse'


def fake(url):
    if 'nvd.nist.gov' in url: return (FIX / 'nvd.json').read_text()
    if 'arxiv.org' in url: return (FIX / 'arxiv.xml').read_text()
    if 'search_by_date' in url: return json.dumps({'hits': [{'objectID': '1', 'title': 'Ask HN: Who wants to be hired? (October 2026)'}, {'objectID': '42', 'title': 'Ask HN: Who is hiring? (October 2026)'}]})
    if 'story_42' in url: return json.dumps({'nbHits': 30 if 'LLM' in url else 20 if 'security' in url else 400})
    raise FetchError('unexpected ' + url)


class PulseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp()); (self.tmp / 'data').mkdir()
        shutil.copy(ROOT / 'data/intelligence.json', self.tmp / 'data/intelligence.json')

    def tearDown(self): shutil.rmtree(self.tmp)

    def test_reads_every_metric(self):
        st = refresh(self.tmp, fake, datetime(2026, 10, 24, tzinfo=timezone.utc)); row = st['series'][-1]
        self.assertEqual((row['cves_7d'], row['ai_papers_7d'], row['hn_total'], row['hn_llm'], row['hn_security']), (812, 57, 400, 30, 20))
        self.assertEqual(row['hn_month'], 'October 2026'); self.assertEqual(st['errors'], [])

    def test_failures_keep_last_values_and_one_row_per_day(self):
        refresh(self.tmp, fake, datetime(2026, 10, 23, tzinfo=timezone.utc))
        def down(url): raise FetchError('down')
        st = refresh(self.tmp, down, datetime(2026, 10, 24, tzinfo=timezone.utc))
        self.assertEqual(st['series'][-1]['cves_7d'], 812); self.assertEqual(len(st['errors']), 3)
        st = refresh(self.tmp, down, datetime(2026, 10, 24, 18, tzinfo=timezone.utc))
        self.assertEqual([r['date'] for r in st['series']], ['2026-10-23', '2026-10-24'])


if __name__ == '__main__':
    unittest.main()
