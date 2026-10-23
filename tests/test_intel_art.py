import unittest
from hub.intel_art import classify, intel_art


class IntelArtTest(unittest.TestCase):
    def test_topics(self):
        self.assertEqual(classify('Critical PHP Vulnerability (CVE-2026-109618)')[0], 'web')
        self.assertEqual(classify('New ransomware gang hits hospitals')[0], 'ransom')
        self.assertEqual(classify('Phishing kit targets Microsoft 365 users')[0], 'phish')
        self.assertEqual(classify('Fortinet firewall flaw under attack')[0], 'edge')
        self.assertEqual(classify('Something unusual happened')[0], 'vuln')

    def test_svg_is_safe_and_labelled(self):
        svg = intel_art({'title': 'Critical <script> CVE-2026-1234 in WordPress plugin', 'source': 'Test'})
        self.assertIn('role="img"', svg)
        self.assertIn('CVE-2026-1234', svg)
        self.assertNotIn('<script>', svg)
        self.assertNotIn('style=', svg)


if __name__ == '__main__':
    unittest.main()
