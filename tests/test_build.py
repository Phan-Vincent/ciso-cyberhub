import hashlib
import json
import re
import struct
import unittest
from pathlib import Path
from hub.common import ROOT,read_json
from hub.build import Site
from scripts.check_site import check_site

class BuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):Site('/cyberhub').build();cls.out=ROOT/'dist'
    @classmethod
    def tearDownClass(cls):Site().build()

    def test_interactive_pages_have_h2_before_h3(self):
        readiness=(self.out/'academy/readiness/index.html').read_text()
        match=(self.out/'careers/match/index.html').read_text()
        redteam=(self.out/'ai/red-team/index.html').read_text()
        self.assertIn('<h2 class="sr-only">Question</h2><h3 id="c-prompt">', readiness)
        self.assertIn('<h2 class="sr-only">Your matched role</h2><h3>', match)
        self.assertIn('id="rt-inject" hidden><h2>Web page Vault can read</h2>', redteam)

    def test_all_internal_links_and_basic_accessibility(self):self.assertEqual(check_site(self.out,'/cyberhub')['errors'],0)
    def test_search_contains_catalog_lessons_and_labs(self):
        index=read_json(ROOT/'dist/assets/search.json');paths={r['path']for r in index}
        self.assertIn('/tools/wireshark/',paths);self.assertIn('/labs/packet-analysis/',paths);self.assertIn('/academy/cryptography-and-key-trust/',paths)
    def test_build_has_no_fixture_news(self):
        self.assertNotIn('CVE-2099-12345',(ROOT/'dist/intelligence/index.html').read_text());self.assertNotIn('CVE-2099-12345',(ROOT/'dist/vulnerabilities/index.html').read_text())
    def test_custom_license_not_marked_osi(self):
        tools=read_json(ROOT/'data/tools.json');self.assertEqual(next(t for t in tools if t['id']=='nmap')['license_status'],'custom')
    def test_unverified_curriculum_never_complete(self):self.assertFalse(read_json(ROOT/'data/academy.json')['complete'])
    def test_dataset_hashes(self):
        for name,digest in read_json(ROOT/'public/datasets/manifest.json')['sha256'].items():self.assertEqual(hashlib.sha256((ROOT/'public/datasets'/name).read_bytes()).hexdigest(),digest)
    def test_synthetic_pcap_structure_and_checksums(self):
        raw=(ROOT/'public/datasets/dns-training.pcap').read_bytes();self.assertEqual(struct.unpack('<I',raw[:4])[0],0xa1b2c3d4);offset=24;count=0
        while offset<len(raw):
            sec,usec,caplen,origlen=struct.unpack('<IIII',raw[offset:offset+16]);frame=raw[offset+16:offset+16+caplen];self.assertEqual(len(frame),origlen);self.assertEqual(frame[12:14],b'\x08\x00');ip=frame[14:34];value=sum(struct.unpack('!10H',ip));value=(value&65535)+(value>>16);value=(value&65535)+(value>>16);self.assertEqual(value,65535);offset+=16+caplen;count+=1
        self.assertEqual(count,4)
    def test_build_is_reproducible(self):
        before={str(p.relative_to(ROOT/'dist')):hashlib.sha256(p.read_bytes()).hexdigest()for p in (ROOT/'dist').rglob('*')if p.is_file()and' 'not in p.name}
        Site('/cyberhub').build()
        after={str(p.relative_to(ROOT/'dist')):hashlib.sha256(p.read_bytes()).hexdigest()for p in (ROOT/'dist').rglob('*')if p.is_file()and' 'not in p.name};self.assertEqual(before,after)
    def test_base_path_rejects_traversal(self):
        with self.assertRaises(ValueError):Site('/../escape')
    def test_feed_health_reports_stale_and_active_errors(self):
        s=Site('/cyberhub')
        healthy,dot,label=s.source_health({'last_success':'2020-01-01T00:00:00Z','last_attempt':'2026-10-22T00:00:00Z','error':'HTTP 503'})
        self.assertFalse(healthy);self.assertEqual(dot,'warn');self.assertIn('HTTP 503',label);self.assertIn('stale',label)
    def test_flashcard_is_an_interactive_button_with_live_status(self):
        html=(ROOT/'dist/academy/flashcards/index.html').read_text()
        self.assertIn('<button class="card flashcard" id="card-text" type="button" aria-pressed="false">',html)
        self.assertIn('aria-live="polite"',html)
        self.assertIn('Click the card, or press Enter or Space, to flip it.',html)
    def test_home_labels_the_attack_map_as_an_illustration(self):
        html=(ROOT/'dist/index.html').read_text()
        self.assertNotIn('Simulated / not live telemetry',html)
        self.assertIn('aria-label="Illustration of cyberattacks moving between countries on a rotating globe. Drag to spin it."',html)
        self.assertNotRegex(html.lower(),r'live (attack|threat) (map|feed)|real-time attacks')
        self.assertNotIn('core-yaw',html)
    def test_footer_lockup_uses_shared_css_frame(self):
        svg=(ROOT/'public/assets/brand/cyberhub-lockup-on-dark.svg').read_text()
        self.assertNotIn('M6 18 V6 H18',svg)
        css=(ROOT/'web/site.css').read_text()
        self.assertIn('.brand-frame::before',css)
        self.assertIn('--corner-len: 22px',css)
        self.assertIn('--corner-weight: 1.5px',css)
        home=(ROOT/'dist/index.html').read_text()
        self.assertEqual(home.count('class="brand-frame'),2)
        self.assertIn('class="brand-frame powered"',home)
    def test_geography_asset_is_vendored_complete_and_attributed(self):
        geo=read_json(ROOT/'public/assets/geo/ne_110m_countries.json')
        source=geo['source']
        self.assertGreaterEqual(len(geo['countries']),170)
        self.assertEqual(source['source_sha256'],'6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f')
        self.assertIn('natural-earth-vector',source['source_url'])
        self.assertEqual(source['license'],'Public domain')
        self.assertIn('naturalearthdata.com',source['attribution'])
        self.assertTrue(any(len(country['polygons'])>1 for country in geo['countries']))
        self.assertTrue(any(len(polygon)>1 for country in geo['countries'] for polygon in country['polygons']))
        for country in geo['countries']:
            self.assertTrue(country['code'] and country['name'])
            for polygon in country['polygons']:
                for ring in polygon:
                    self.assertGreaterEqual(len(ring),4)
                    self.assertEqual(ring[0],ring[-1])
                    for lon,lat in ring:
                        self.assertTrue(-180<=lon<=180 and -90<=lat<=90)
    def test_home_geography_is_local_and_annotation_free(self):
        html=(ROOT/'dist/index.html').read_text()
        self.assertIn('data-ready="loading"',html)
        js=(ROOT/'dist/assets/app.js').read_text()
        self.assertIn('/assets/geo/ne_110m_countries.json',js)
        for label in ('SIMULATED / ATTACK PATHS','SCENARIO 01 · NOT LIVE TELEMETRY','NODES 08 / ARCS 05','ILLUSTRATIVE EXERCISE'):
            self.assertNotIn(label,js)
    def test_site_is_dark_only(self):
        html=(ROOT/'dist/index.html').read_text()
        self.assertNotIn('id="theme"',html)
        self.assertIn('<meta name="color-scheme" content="dark">',html)
        theme=(ROOT/'web/theme.ts').read_text()
        self.assertIn("dataset.theme = 'dark'",theme)
    def test_endorsement_sentence_matches_config(self):
        home=(ROOT/'dist/index.html').read_text()
        self.assertIn('University endorsement pending.',home)
        self.assertNotIn('University and club endorsement pending.',home)
    def test_vulnerabilities_page_orders_newest_kev_first(self):
        html=(ROOT/'dist/vulnerabilities/index.html').read_text()
        dates=re.findall(r'Added:\s*(\d{4}-\d{2}-\d{2})',html)
        if len(dates)>=2:
            self.assertGreaterEqual(dates[0],dates[-1])
            self.assertEqual(dates,sorted(dates,reverse=True))
    def test_search_index_has_unescaped_text_and_404_is_noindex(self):
        index=read_json(ROOT/'dist/assets/search.json')
        for entry in index:
            self.assertIsNone(re.search(r'&(?:#\d+|#x[0-9a-fA-F]+|amp|lt|gt|quot|nbsp);',entry['text']))
        self.assertIn('<meta name="robots" content="noindex">',(ROOT/'dist/404.html').read_text())
    def test_content_pages_preserve_h2_hierarchy_and_ordered_lists(self):
        lesson=(ROOT/'dist/academy/choosing-security-controls/index.html').read_text()
        self.assertIn('<h2>Understand the concept</h2>',lesson)
        career=(ROOT/'dist/careers/soc-analyst/index.html').read_text()
        self.assertIn('<ol>',career)


class AccountConfigTests(unittest.TestCase):
    def test_supabase_config_is_validated_and_wired(self):
        import tempfile
        from hub.account import supabase
        class S: config = {}
        s = S(); self.assertEqual(supabase(s), ('', ''))
        s.config = {'supabase_url': 'https://evil.example.com', 'supabase_key': 'x' * 40}
        with self.assertRaises(ValueError): supabase(s)
        s.config = {'supabase_url': 'https://abcdefghijklmnopqrst.supabase.co', 'supabase_key': 'sb_secret_' + 'x' * 30}
        with self.assertRaises(ValueError): supabase(s)
        s.config = {'supabase_url': 'https://abcdefghijklmnopqrst.supabase.co/', 'supabase_key': 'sb_publishable_' + 'x' * 30}
        self.assertEqual(supabase(s)[0], 'https://abcdefghijklmnopqrst.supabase.co')
        with tempfile.TemporaryDirectory() as tmp:
            site = Site(''); site.out = Path(tmp)
            site.config = {**site.config, 'supabase_url': 'https://abcdefghijklmnopqrst.supabase.co', 'supabase_key': 'sb_publishable_' + 'x' * 30}
            site.page('/x/', 'X', '<p>x</p>')
            html = (Path(tmp) / 'x/index.html').read_text()
            self.assertIn("connect-src 'self' https://abcdefghijklmnopqrst.supabase.co wss://abcdefghijklmnopqrst.supabase.co;", html)
            self.assertIn('data-sb-url="https://abcdefghijklmnopqrst.supabase.co"', html)
            self.assertIn('assets/account.js', html)

class SiteReferenceTests(unittest.TestCase):
    def test_form_controls_and_id_references(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp,'index.html').write_text('<html lang="en"><meta http-equiv="Content-Security-Policy" content="x"><main><h1>X</h1><textarea></textarea><label for="missing">X</label><button aria-labelledby="gone" aria-controls="absent">X</button></main></html>')
            with self.assertRaisesRegex(ValueError,'Unlabeled form control') as error:check_site(tmp)
            for token in ('missing','gone','absent'):self.assertIn(token,str(error.exception))
