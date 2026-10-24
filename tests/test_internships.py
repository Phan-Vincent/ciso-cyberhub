import unittest
from datetime import datetime, timezone

from hub.internships import CSUSB, miles, place, scan

NOW = datetime(2026, 10, 24, tzinfo=timezone.utc)
TS = int(datetime(2026, 10, 20, tzinfo=timezone.utc).timestamp())
OLD = int(datetime(2026, 8, 1, tzinfo=timezone.utc).timestamp())


def job(**k):
    base = {'active': True, 'is_visible': True, 'company_name': 'Acme', 'title': 'Security Analyst Intern', 'url': 'https://example.com/j/1',
            'category': 'Software', 'terms': ['Summer 2027'], 'date_posted': TS, 'locations': ['Riverside, CA']}
    base.update(k)
    return base


class InternshipTest(unittest.TestCase):
    def test_distance_and_places(self):
        self.assertLess(miles(CSUSB, (34.1083, -117.2898)), 10)  # San Bernardino
        self.assertEqual(place('Remote in USA')[1], 'Remote (US)')
        self.assertIsNone(place('San Jose, CA'))  # not in the SoCal table
        self.assertIsNone(place('Austin, TX'))
        d, city = place('Irvine, CA')
        self.assertEqual(city, 'Irvine')
        self.assertTrue(30 < d < 60)

    def test_scan_filters_and_flags(self):
        out = scan([
            job(),
            job(title='Hardware Intern', locations=['San Jose, CA']),          # too far, dropped
            job(active=False),                                                 # inactive, dropped
            job(url='http://insecure.example.com'),                            # non-HTTPS, dropped
            job(title='Data Intern', locations=['Remote in USA'], date_posted=OLD),
            job(),                                                             # duplicate, dropped
        ], NOW)
        items = out['items']
        self.assertEqual(len(items), 2)
        first, remote = items
        self.assertEqual((first['zone'], first['security'], first['new']), ('near', True, True))
        self.assertEqual((remote['zone'], remote['security'], remote['new']), ('remote', False, False))
        self.assertIn('SimplifyJobs', out['source']['name'])


if __name__ == '__main__':
    unittest.main()
