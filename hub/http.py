"""Bounded HTTPS client. No arbitrary redirects, credentials, shell, or feed code."""
import hashlib
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit
from .common import safe_url, write_json

MAX_BYTES = 8_000_000

class FetchError(RuntimeError):
    pass

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise FetchError('Redirect requires source configuration review')

class Client:
    def __init__(self, hosts, cache=None, budget=60, opener=None, sleep=time.sleep):
        self.hosts = set(hosts)
        self.cache = Path(cache) if cache else None
        self.budget = budget
        self.requests = 0
        self.opener = opener or urllib.request.build_opener(NoRedirect()).open
        self.sleep = sleep

    def get(self, url):
        safe_url(url)
        if urlsplit(url).hostname not in self.hosts:
            raise FetchError('Host is not on the source allowlist')
        key = hashlib.sha256(url.encode()).hexdigest()
        entry = self.cache / (key + '.json') if self.cache else None
        cached = None
        if entry and entry.exists():
            try:
                cached = json.loads(entry.read_text())
            except (ValueError, OSError):
                pass
        headers = {'User-Agent': 'CISOCyberHub/0.1 (+educational feed reader)', 'Accept': 'application/json, application/atom+xml, application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8'}
        if cached and cached.get('etag'):
            headers['If-None-Match'] = cached['etag']
        token = os.environ.get('GITHUB_TOKEN')
        if token and urlsplit(url).hostname == 'api.github.com':
            headers['Authorization'] = 'Bearer ' + token
        for attempt in range(3):
            if self.requests >= self.budget:
                raise FetchError('Request budget exhausted')
            self.requests += 1
            try:
                with self.opener(urllib.request.Request(url, headers=headers), timeout=12) as r:
                    body = r.read(MAX_BYTES + 1)
                    if len(body) > MAX_BYTES:
                        raise FetchError('Response size limit exceeded')
                    text = body.decode('utf-8-sig')
                    if entry:
                        write_json(entry, {'etag': r.headers.get('ETag'), 'text': text})
                    return text
            except urllib.error.HTTPError as e:
                if e.code == 304 and cached:
                    return cached['text']
                if e.code in (429, 500, 502, 503, 504) and attempt < 2:
                    retry = e.headers.get('Retry-After', '')
                    # Never ignore a long Retry-After and immediately retry.
                    if retry and (not retry.isdigit() or int(retry) > 20):
                        raise FetchError(f'HTTP {e.code}: retry deferred to next scheduled run') from e
                    self.sleep(max(2 ** attempt, int(retry or 0)))
                    continue
                raise FetchError(f'HTTP {e.code}') from e
            except (urllib.error.URLError, TimeoutError, UnicodeDecodeError, OSError) as e:
                if attempt < 2:
                    self.sleep(2 ** attempt)
                    continue
                raise FetchError(type(e).__name__) from e
        raise FetchError('Retry budget exhausted')
