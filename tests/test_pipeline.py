import copy
import io
import json
import shutil
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch
from hub.common import ROOT, canonical_url, read_json, safe_url, write_json
from hub.http import Client, FetchError, MAX_BYTES
from hub.ingest import parse_feed, merge_news, parse_kev, apply_epss, apply_nvd, refresh, feed_date
from hub.validate import validate
from hub.markdown import render
from hub.catalog import proposal
from scripts.restore_proposals import decode_proposal_item, restore

STAMP='2024-01-02T00:00:00Z'
FIX=ROOT/'tests/fixtures'
SOURCE=read_json(ROOT/'data/sources.json')[1]

class Response:
    def __init__(self,body=b'ok',headers=None):self.body=body;self.headers=headers or {}
    def __enter__(self):return self
    def __exit__(self,*args):pass
    def read(self,n):return self.body[:n]

class PipelineTests(unittest.TestCase):
    def test_current_content_validates(self):self.assertEqual(validate()['objectives'],28)
    def test_source_urls_require_https(self):
        for u in ('http://example.org/','javascript:alert(1)','https://u:p@example.org/','https://example.org:444/','https://example.org/\nfoo'):
            with self.subTest(u=u),self.assertRaises(ValueError):safe_url(u)
    def test_canonicalization_preserves_meaningful_query(self):
        self.assertEqual(canonical_url('https://Example.org/x?b=2&utm_medium=mail&a=1#frag'),'https://example.org/x?a=1&b=2')
    def test_atom(self):
        items=parse_feed((FIX/'cert.xml').read_text(),SOURCE,STAMP)
        self.assertEqual(len(items),1);self.assertEqual(items[0]['cves'],['CVE-2099-12345']);self.assertIsNone(items[0]['summary'])
    def test_rss(self):
        s=read_json(ROOT/'data/sources.json')[2];x=parse_feed((FIX/'sans.xml').read_text(),s,STAMP)
        self.assertEqual(x[0]['published_at'],'2024-01-01T13:00:00Z');self.assertNotIn('article body',json.dumps(x))
    def test_dedup_is_idempotent(self):
        x=parse_feed((FIX/'cert.xml').read_text(),SOURCE,STAMP)
        y=copy.deepcopy(x);y[0]['retrieved_at']='2024-02-01T00:00:00Z'
        self.assertEqual(merge_news(x,y),x)
    def test_corrected_headline_updates_same_record(self):
        x=parse_feed((FIX/'cert.xml').read_text(),SOURCE,STAMP);y=copy.deepcopy(x);y[0]['title']='Corrected'
        self.assertEqual(merge_news(x,y)[0]['title'],'Corrected')
    def test_article_redirect_host_not_trusted(self):
        x=(FIX/'cert.xml').read_text().replace('www.kb.cert.org','attacker.invalid')
        self.assertEqual(parse_feed(x,SOURCE,STAMP),[])
    def test_invalid_xml(self):
        with self.assertRaises(Exception):parse_feed('<not-closed',SOURCE,STAMP)
    def test_html_outage_is_not_valid_empty_feed(self):
        with self.assertRaises(ValueError):parse_feed('<html><body>Offline</body></html>',SOURCE,STAMP)
    def test_dtd_rejected(self):
        with self.assertRaises(ValueError):parse_feed('<!DOCTYPE rss [<!ENTITY x "x">]><rss/>',SOURCE,STAMP)
    def test_bad_date_unknown(self):self.assertIsNone(feed_date('not a date'))
    def test_naive_date_unknown(self):self.assertIsNone(feed_date('2024-01-01T00:00:00'))
    def test_kev_schema(self):
        x=parse_kev(read_json(FIX/'kev.json'),STAMP);self.assertTrue(x[0]['kev']);self.assertIsNone(x[0]['cvss'])
    def test_empty_kev_cannot_erase_old_data(self):
        with self.assertRaises(ValueError):parse_kev({'vulnerabilities':[]},STAMP)
    def test_epss_separate_signal(self):
        x=parse_kev(read_json(FIX/'kev.json'),STAMP);matched=apply_epss(x,read_json(FIX/'epss.json'));self.assertEqual(matched,1);self.assertEqual(x[0]['epss'],.25);self.assertTrue(x[0]['kev'])
    def test_epss_invalid_range_atomic(self):
        x=parse_kev(read_json(FIX/'kev.json'),STAMP);bad=read_json(FIX/'epss.json');bad['data'][0]['epss']='NaN'
        with self.assertRaises(ValueError):apply_epss(x,bad)
        self.assertIsNone(x[0]['epss'])
    def test_nvd_primary_metric_and_reference_sanitization(self):
        x=parse_kev(read_json(FIX/'kev.json'),STAMP)[0]
        matched=apply_nvd(x,{'vulnerabilities':[{'cve':{'id':x['id'],'metrics':{'cvssMetricV31':[{'type':'Primary','source':'test','cvssData':{'baseScore':7.5,'version':'3.1'}}]},'references':[{'url':'javascript:alert(1)'},{'url':'https://example.org/advisory'}]}}]},STAMP)
        self.assertTrue(matched);self.assertEqual(x['cvss']['score'],7.5);self.assertEqual(x['references'],['https://example.org/advisory'])
    def test_nvd_wrong_id_not_applied(self):
        x=parse_kev(read_json(FIX/'kev.json'),STAMP)[0];matched=apply_nvd(x,{'vulnerabilities':[{'cve':{'id':'CVE-2099-99999'}}]},STAMP);self.assertFalse(matched);self.assertIsNone(x['cvss'])
    def test_malformed_enrichment_envelopes_raise_value_error(self):
        x=parse_kev(read_json(FIX/'kev.json'),STAMP)[0]
        for bad in (None, [], 'null', {'data': None}, {'data': [None]}):
            with self.subTest(bad=bad),self.assertRaises(ValueError):apply_epss([x], bad)
        for bad in (None, [], 'null', {'vulnerabilities': None}, {'vulnerabilities': [None]}):
            with self.subTest(bad=bad),self.assertRaises(ValueError):apply_nvd(x, bad, STAMP)
    def test_empty_or_null_enrichment_does_not_advance_last_success(self):
        with tempfile.TemporaryDirectory()as tmp:
            root=Path(tmp);shutil.copytree(ROOT/'data',root/'data');shutil.copytree(ROOT/'content',root/'content')
            write_json(root/'data/intelligence.json',{'mode':'source-reported','news':[],'sources':{'epss':{'last_success':'2024-01-01T00:00:00Z'},'nvd':{'last_success':'2024-01-01T00:00:00Z'}},'vulnerabilities':parse_kev(read_json(FIX/'kev.json'),STAMP)})
            def fake_get(url):
                if 'cisa.gov' in url: return (FIX/'kev.json').read_text()
                if 'cert.org' in url: return (FIX/'cert.xml').read_text()
                if 'sans.edu' in url: return (FIX/'sans.xml').read_text()
                if 'api.first.org' in url: return '{"data":[]}'
                if 'services.nvd.nist.gov' in url: return 'null'
                raise FetchError('unexpected url')
            with patch('hub.ingest.now',return_value=STAMP),patch('hub.ingest.Client.get',side_effect=fake_get),patch.object(Client,'sleep',lambda *a:None,create=True):
                res=refresh(root)
            self.assertIn('epss',res['failures']);self.assertIn('nvd',res['failures'])
            after=read_json(root/'data/intelligence.json')
            self.assertEqual(after['sources']['epss']['last_success'],'2024-01-01T00:00:00Z')
            self.assertEqual(after['sources']['nvd']['last_success'],'2024-01-01T00:00:00Z')
            self.assertTrue(after['sources']['epss']['error'])
            self.assertTrue(after['sources']['nvd']['error'])
    def test_large_file_proposal_restoration_uses_bounded_raw_retrieval(self):
        large_payload={'mode':'source-reported','news':[],'sources':{},'vulnerabilities':[{'id':f'CVE-2026-{10000+i}'}for i in range(500)]}
        raw_bytes=json.dumps(large_payload).encode('utf-8')
        item={'type':'file','size':1_358_645,'encoding':'none','content':''}
        restored=decode_proposal_item(item,'repos/org/repo/contents/data/intelligence.json?ref=abc',fetch_raw=lambda ep,limit:raw_bytes)
        self.assertEqual(restored,large_payload)
        with self.assertRaises(ValueError):
            decode_proposal_item({'type':'file','size':9_000_000,'encoding':'none','content':''},'ep',fetch_raw=lambda ep,limit:b'{}')
    def test_http_host_allowlist(self):
        client=Client({'example.org'},opener=lambda *a,**kw:Response())
        with self.assertRaises(FetchError):client.get('https://localhost/x')
        self.assertEqual(client.requests,0)
    def test_http_size_bound(self):
        client=Client({'example.org'},opener=lambda *a,**kw:Response(b'x'*(MAX_BYTES+1)))
        with self.assertRaises(FetchError):client.get('https://example.org/x')
    def test_retry_429_then_success(self):
        calls=[];sleeps=[]
        def open(*a,**kw):
            calls.append(1)
            if len(calls)==1:raise urllib.error.HTTPError('https://example.org',429,'limited',{'Retry-After':'2'},None)
            return Response()
        c=Client({'example.org'},opener=open,sleep=sleeps.append)
        self.assertEqual(c.get('https://example.org/'),'ok');self.assertEqual(sleeps,[2])
    def test_long_retry_after_defers(self):
        def open(*a,**kw):raise urllib.error.HTTPError('https://example.org',429,'limited',{'Retry-After':'120'},None)
        c=Client({'example.org'},opener=open,sleep=lambda n:self.fail('Should defer'))
        with self.assertRaises(FetchError):c.get('https://example.org/')
        self.assertEqual(c.requests,1)
    def test_budget_includes_retries(self):
        def open(*a,**kw):raise urllib.error.HTTPError('https://example.org',503,'down',{},None)
        c=Client({'example.org'},opener=open,sleep=lambda n:None,budget=2)
        with self.assertRaises(FetchError):c.get('https://example.org/')
        self.assertEqual(c.requests,2)
    def test_etag_304(self):
        with tempfile.TemporaryDirectory()as tmp:
            c=Client({'example.org'},cache=tmp,opener=lambda *a,**kw:Response(b'cached',{'ETag':'"one"'}))
            c.get('https://example.org/')
            def open(req,**kw):
                self.assertEqual(req.get_header('If-none-match'),'"one"');raise urllib.error.HTTPError(req.full_url,304,'unchanged',{},None)
            c.opener=open;self.assertEqual(c.get('https://example.org/'),'cached')
    def test_write_idempotency(self):
        with tempfile.TemporaryDirectory()as tmp:
            p=Path(tmp)/'a.json';self.assertTrue(write_json(p,{'x':1}));self.assertFalse(write_json(p,{'x':1}))
    def test_markdown_injection_escaped(self):
        out=render('<script>alert(1)</script>\n\n[click](javascript:alert)')
        self.assertNotIn('<script>',out);self.assertNotIn('href="javascript',out)
    def test_markdown_headings_ordered_lists_and_inline_tokens(self):
        out=render('## Section heading\n\n### Subsection\n\n- Bullet item\n\n1. First step\n2. Second step\n\n[`wireshark`](/tools/wireshark/) and \x0099\x00','/club')
        self.assertIn('<h2>Section heading</h2>',out)
        self.assertIn('<h3>Subsection</h3>',out)
        self.assertIn('<ul>\n<li>Bullet item</li>\n</ul>',out)
        self.assertIn('<ol>\n<li>First step</li>\n<li>Second step</li>\n</ol>',out)
        self.assertIn('<a href="/club/tools/wireshark/"><code>wireshark</code></a>',out)
        self.assertNotIn('\x00',out)
    def test_markdown_root_traversal_rejected(self):
        for url in ('/../escape', '/foo/../../escape', '/./escape'):
            with self.subTest(url=url):
                self.assertNotIn('href=', render(f'[t]({url})', '/cyberhub'))

    def test_all_data_schemas_reject_invalid_records(self):
        names = ('ai_leaderboard', 'duel', 'glossary', 'history_images', 'internships', 'it_cards', 'maintenance', 'pulse', 'research', 'trending')
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); shutil.copytree(ROOT/'data',root/'data'); shutil.copytree(ROOT/'content',root/'content')
            for name in names:
                path=root/'data'/f'{name}.json'; original=path.read_text()
                path.write_text('{}' if name != 'glossary' else '[]')
                with self.subTest(name=name), self.assertRaises((ValueError, KeyError, TypeError)):
                    validate(root)
                path.write_text(original)

    def test_duel_hard_level_accepted_and_other_levels_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);shutil.copytree(ROOT/'data',root/'data');shutil.copytree(ROOT/'content',root/'content')
            duel=read_json(root/'data/duel.json')
            duel['questions'][0]['level']=4;write_json(root/'data/duel.json',duel)
            validate(root)
            for bad in (0,5,True):
                duel['questions'][0]['level']=bad;write_json(root/'data/duel.json',duel)
                with self.subTest(level=bad),self.assertRaises(ValueError):validate(root)

    def test_boolean_cvss_score_rejected(self):
        with tempfile.TemporaryDirectory()as tmp:
            root=Path(tmp);shutil.copytree(ROOT/'data',root/'data');shutil.copytree(ROOT/'content',root/'content')
            intel=read_json(root/'data/intelligence.json');intel['vulnerabilities'][0]['cvss']={'score':True,'version':'3.1'}
            write_json(root/'data/intelligence.json',intel)
            with self.assertRaises(ValueError):validate(root)
    def test_base_path_links(self):self.assertIn('href="/club/labs/"',render('[Lab](/labs/)','/club'))
    def test_code_html_literal(self):self.assertIn('&lt;img',render('```html\n<img onerror=x>\n```'))
    def test_unclosed_fence_fails(self):
        with self.assertRaises(ValueError):render('```\nx')
    def test_catalog_proposals_never_approve(self):
        t=read_json(ROOT/'data/tools.json')[0]
        p=proposal(t,{'html_url':'https://github.com/renamed/repo','archived':True,'license':None},None,STAMP)
        self.assertEqual(p['status'],'pending-review');self.assertTrue(p['changes']['renamed']);self.assertEqual(p['changes']['maintenance_signal'],'archived')
    def test_fixture_refresh_and_partial_failure_preserves_last_success(self):
        with tempfile.TemporaryDirectory()as tmp:
            root=Path(tmp);shutil.copytree(ROOT/'data',root/'data');shutil.copytree(ROOT/'content',root/'content')
            write_json(root/'data/intelligence.json',{'mode':'source-reported','news':[],'sources':{},'vulnerabilities':[]})
            with patch('hub.ingest.now',return_value=STAMP):result=refresh(root,fixture_dir=FIX)
            self.assertEqual(result['failures'],[]);state=read_json(root/'data/intelligence.json');self.assertEqual(len(state['news']),2+sum(1 for s in read_json(root/'data/sources.json') if s['kind']=='rss')-2);self.assertEqual(len(state['vulnerabilities']),1);validate(root)
            old=copy.deepcopy(state)
            state['mode']='source-reported';write_json(root/'data/intelligence.json',state)
            with patch('hub.ingest.Client.get',side_effect=FetchError('outage')):
                failed=refresh(root)
            after=read_json(root/'data/intelligence.json');self.assertEqual(after['news'],old['news']);self.assertEqual(after['vulnerabilities'],old['vulnerabilities']);self.assertEqual(after['sources']['cisa-kev']['last_success'],STAMP);self.assertIn('cisa-kev',failed['failures'])
    def test_dry_run_changes_no_files(self):
        with tempfile.TemporaryDirectory()as tmp:
            root=Path(tmp);shutil.copytree(ROOT/'data',root/'data');before={p:p.read_bytes()for p in root.rglob('*')if p.is_file()};refresh(root,fixture_dir=FIX,dry_run=True);self.assertEqual(before,{p:p.read_bytes()for p in root.rglob('*')if p.is_file()})
    def test_fixture_mode_cannot_turn_into_live_reporting(self):
        with tempfile.TemporaryDirectory()as tmp:
            root=Path(tmp);shutil.copytree(ROOT/'data',root/'data');refresh(root,fixture_dir=FIX)
            with self.assertRaises(ValueError):refresh(root)
    def test_malformed_kev_record_rejected(self):
        for record in ('invalid', {'cveID':'CVE-2099-12345'}):
            with self.subTest(record=record),self.assertRaises(ValueError):parse_kev({'vulnerabilities':[record]},STAMP)
    def test_bad_quiz_mapping_rejected(self):
        with tempfile.TemporaryDirectory()as tmp:
            root=Path(tmp);shutil.copytree(ROOT/'data',root/'data');shutil.copytree(ROOT/'content',root/'content');d=read_json(root/'data/academy.json');d['questions'][0]['objective']='9.9';write_json(root/'data/academy.json',d)
            with self.assertRaises(ValueError):validate(root)

if __name__=='__main__':unittest.main()
