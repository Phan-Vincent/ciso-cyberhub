import unittest

from hub.history import ERAS, EVENTS
from hub.trending import clean_models, clean_repos


class TrendingTest(unittest.TestCase):
    def test_filters_unsafe_and_duplicates(self):
        repos = [
            {'full_name': 'a/good-scanner', 'description': 'Finds secrets', 'stargazers_count': 50, 'html_url': 'https://github.com/a/good-scanner'},
            {'full_name': 'b/ai-jailbreaks', 'description': 'paste-ready jailbreak prompts', 'stargazers_count': 900, 'html_url': 'https://github.com/b/ai-jailbreaks'},
            {'full_name': 'c/tool-kr', 'description': 'Korean edition (upstream: a/tool)', 'stargazers_count': 800, 'html_url': 'https://github.com/c/tool-kr'},
            {'full_name': 'd/good-scanner', 'description': 'mirror', 'stargazers_count': 10, 'html_url': 'https://github.com/d/good-scanner'},
            {'full_name': 'e/nodesc', 'description': '', 'stargazers_count': 999, 'html_url': 'https://github.com/e/nodesc'},
        ]
        out = clean_repos(repos, {'a/good-scanner': 40})
        self.assertEqual([r['name'] for r in out], ['a/good-scanner'])
        self.assertEqual(out[0]['gain'], 10)

    def test_models_filter(self):
        models = [{'id': 'org/Model-7B', 'pipeline_tag': 'text-generation', 'trendingScore': 5},
                  {'id': 'x/Model-Uncensored-GGUF', 'pipeline_tag': 'text-generation'},
                  {'id': 'y/model-abliterated', 'pipeline_tag': 'text-generation'},
                  {'id': 'z/embedder', 'pipeline_tag': 'feature-extraction'}]
        self.assertEqual([m['id'] for m in clean_models(models)], ['org/Model-7B'])


class HistoryTest(unittest.TestCase):
    def test_events_are_complete(self):
        eras = {e[0] for e in ERAS}
        ids = [e[0] for e in EVENTS]
        self.assertEqual(len(ids), len(set(ids)))
        for eid, era, year, title, story, lesson, cands, query, src in EVENTS:
            self.assertIn(era, eras, eid)
            self.assertTrue(year and title and story and lesson and src.startswith('https://'), eid)


if __name__ == '__main__':
    unittest.main()
