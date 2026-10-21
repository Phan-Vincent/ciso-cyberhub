import hashlib
import json
import struct
import unittest
from pathlib import Path
from hub.common import ROOT,read_json
from hub.build import Site
from scripts.check_site import check_site

class BuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):Site('/cyberhub').build()
    def test_all_internal_links_and_basic_accessibility(self):self.assertEqual(check_site(ROOT/'dist','/cyberhub')['errors'],0)
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
        before={str(p.relative_to(ROOT/'dist')):hashlib.sha256(p.read_bytes()).hexdigest()for p in (ROOT/'dist').rglob('*')if p.is_file()}
        Site('/cyberhub').build()
        after={str(p.relative_to(ROOT/'dist')):hashlib.sha256(p.read_bytes()).hexdigest()for p in (ROOT/'dist').rglob('*')if p.is_file()};self.assertEqual(before,after)
    def test_base_path_rejects_traversal(self):
        with self.assertRaises(ValueError):Site('/../escape')
