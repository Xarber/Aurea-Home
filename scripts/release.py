#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-only
"""One release history feeds Android, Markdown, release notes and artifact validation."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import zipfile
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
HISTORY = ROOT / 'app/src/main/assets/release-history.json'

def history():
    data = json.loads(HISTORY.read_text())
    assert data['schema'] == 1
    codes = [item['code'] for item in data['releases']]
    assert codes == sorted(set(codes), reverse=True), 'Release codes must be unique and descending'
    for item in data['releases']:
        assert re.fullmatch(r'\d+\.\d+(\.\d+)?', item['version'])
        assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', item['date'])
        for field in ('highlights', 'fixes'):
            assert set(item[field]) == {'en', 'it'} and all(item[field].values())
        assert item['record'] in {'development', 'reconstructed', 'published'}
        assert bool(item.get('publications')) == (item['record'] == 'published')
        for publication in item.get('publications', []):
            assert publication['channel'] in {'stable', 'beta'}
            assert publication['tag'].startswith('v'+item['version'])
            assert re.fullmatch(r'[a-f0-9]{40}', publication['commit'])
            assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', publication['date'])
        assert item.get('features'), 'Every release requires descriptive feature rows'
        for feature in item['features']:
            assert feature['icon'] in {'code','history','transfer','sound','remote','controls','apps','inputs','airplay','info','shield'}
            for field in ('label','detail'):
                assert set(feature[field]) == {'en','it'} and all(feature[field].values())
        assert set(item['compatibility']) == {'en','it'}
    return data['releases']

def metadata():
    current = history()[0]
    gradle = (ROOT / 'app/build.gradle.kts').read_text()
    assert f'versionCode = {current["code"]}' in gradle
    assert f'versionName = "{current["version"]}"' in gradle
    assert f'"version":"{current["version"]}","code":{current["code"]}' in gradle, 'Generated build metadata must match version' 
    return current

def public_notes(release):
    rows = [f'## {release["version"]}']
    publications = release.get('publications', [])
    if publications:
        rows += ['', ' · '.join(
            f"[{item['channel'].capitalize()} · {item['date']}](https://github.com/Xarber/Aurea-Home/releases/tag/{item['tag']})"
            for item in publications)]
    else:
        status = 'Development' if release['record'] == 'development' else 'Reconstructed history'
        rows += ['', f'{status} · {release["date"]}']
    for feature in release['features']:
        rows += ['', f'### {feature["label"]["en"]}', '', feature['detail']['en']]
    if release['fixes']['en']:
        rows += ['', '### Fixes & Improvements', '', release['fixes']['en']]
    if release['compatibility']['en']:
        rows += ['', release['compatibility']['en']]
    return '\n'.join(rows) + '\n'


def changelog():
    return '# Changelog\n\n' + '\n'.join(public_notes(release) for release in history())


def git(*arguments):
    return subprocess.check_output(['git', *arguments], cwd=ROOT, text=True).strip(' \r\n')


def published_baseline(channel, revision):
    candidates = sorted(
        (item for release in history() for item in release.get('publications', [])
         if item['channel'] == ('beta' if channel == 'beta' else 'stable')),
        key=lambda item: (item['date'], item['tag']), reverse=True,
    )
    for item in candidates:
        if item['commit'] == revision:
            continue
        if subprocess.run(['git', 'merge-base', '--is-ancestor', item['commit'], revision],
                          cwd=ROOT, capture_output=True).returncode == 0:
            return item
    return None


def developer_notes(channel):
    revision = git('rev-parse', 'HEAD')
    baseline = published_baseline(channel, revision)
    base = baseline['commit'] if baseline else git('rev-parse', '98cbd64^')
    provenance = baseline['tag'] if baseline else 'Reconstructed baseline at the first Aurea development commit'
    commits = git('log', '--reverse', '--format=%H%x1f%s%x1f%b%x1e', base+'..'+revision)
    rows = [f'Aurea Home developer changelog\nChannel: {channel}\nSource: {revision}\nBaseline: {provenance}\n']
    for record in commits.split('\x1e'):
        if not record.strip():
            continue
        commit, title, body = record.strip(' \r\n').split('\x1f', 2)
        if not body.strip():
            files = git('diff-tree', '--no-commit-id', '--name-only', '-r', commit).splitlines()
            body = ('Files: ' + ', '.join(files[:6]) + (f' and {len(files)-6} more' if len(files)>6 else '')) if files else ''
        rows += [f'{title}\n{commit}\n{body.strip()}']
    return '\n\n'.join(rows) + '\n'


def generate(channel):
    (ROOT / 'CHANGELOG.md').write_text(changelog())
    (ROOT / 'assets/release-history.json').write_bytes(HISTORY.read_bytes())
    write_developer_notes(channel)


def write_developer_notes(channel):
    text = developer_notes(channel)
    (ROOT / 'app/src/main/assets/developer-changelog.txt').write_text(text)
    (ROOT / 'assets/developer-changelog.json').write_text(json.dumps({'text':text})+'\n')


def validate_embedded_web(archive, prefix=''):
    base = prefix + 'assets/remoteapp/'
    names = set(archive.namelist())
    assert base + 'index.html' in names, 'Missing embedded remote index'
    references = []
    class Resources(HTMLParser):
        def handle_starttag(self, tag, attributes):
            attributes = dict(attributes)
            value = attributes.get('src') if tag == 'script' else attributes.get('href') if tag == 'link' else None
            if value: references.append(value)
    Resources().feed(archive.read(base + 'index.html').decode('utf-8'))
    assert any(urlsplit(value).path.endswith('.js') for value in references), 'Remote has no JavaScript entry'
    for value in references:
        parsed = urlsplit(value)
        assert not parsed.scheme and not parsed.netloc, 'Embedded remote resource must be local'
        path = unquote(parsed.path).lstrip('/')
        assert '..' not in path.split('/'), 'Invalid remote asset path'
        assert base + path in names, 'Missing embedded remote resource: ' + path
    expected_root = ROOT / 'app/src/main/assets/remoteapp'
    if expected_root.is_dir():
        for resource in expected_root.rglob('*'):
            if resource.is_file():
                relative = resource.relative_to(expected_root).as_posix()
                assert base + relative in names, 'Android omitted exported web asset: ' + relative

def validate_archive(path, kind, commit, channel):
    current = metadata()
    assert path.is_file() and path.stat().st_size > 1024, f'Missing or empty artifact: {path}'
    prefix = '' if kind == 'apk' else 'base/'
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None, 'Corrupt ZIP'
        names = set(archive.namelist())
        validate_embedded_web(archive, prefix)
        assert prefix + 'manifest/AndroidManifest.xml' in names if kind == 'aab' else 'AndroidManifest.xml' in names
        assert ('BundleConfig.pb' in names) if kind == 'aab' else any(re.fullmatch(r'classes\d*\.dex', name) for name in names)
        abis = {'arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'}
        actual = {name.split('/')[1 if kind == 'apk' else 2] for name in names if name.startswith(prefix+'lib/') and name.endswith('/libairplay_native.so')}
        assert actual == abis, f'Native ABI mismatch: {actual}'
        embedded = json.loads(archive.read(prefix + 'assets/build-metadata.json'))
        assert embedded['commit'] == commit and embedded['channel'] == channel
        assert embedded['version'] == current['version'] and embedded['code'] == current['code']
        assert archive.read(prefix+'assets/release-history.json') == HISTORY.read_bytes()
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    path.with_suffix(path.suffix + '.sha256').write_text(f'{digest}  {path.name}\n')
    print(f'Validated {path.name}: four ABIs, metadata and SHA-256')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['check', 'generate', 'developer-notes', 'metadata', 'notes', 'validate'])
    parser.add_argument('--file', type=Path); parser.add_argument('--kind', choices=['apk', 'aab'])
    parser.add_argument('--commit', default=os.environ.get('GITHUB_SHA', 'unknown'))
    parser.add_argument('--channel', default=os.environ.get('MITV_BUILD_CHANNEL', 'testing'))
    args = parser.parse_args(); current = metadata()
    if args.action == 'check':
        assert (ROOT/'CHANGELOG.md').read_text() == changelog(), 'Run scripts/release.py generate'
        assert 'GNU AFFERO GENERAL PUBLIC LICENSE' in (ROOT/'LICENSE').read_text()
        assert 'GNU GENERAL PUBLIC LICENSE' in (ROOT/'LICENSES/GPL-3.0.txt').read_text()
        print('PASS: release history, version, changelog and license consistency')
    elif args.action == 'generate': generate(args.channel)
    elif args.action == 'developer-notes': write_developer_notes(args.channel)
    elif args.action == 'metadata':
        data = dict(version=current['version'], code=current['code'], commit=args.commit, channel=args.channel, variant='github-extended')
        (ROOT/'app/src/main/assets/build-metadata.json').write_text(json.dumps(data, indent=2)+'\n')
        print(json.dumps(data))
    elif args.action == 'notes':
        release = dict(current, record='development')
        release.pop('publications', None)
        print(public_notes(release).replace(f'Development · {current["date"]}', '', 1).rstrip())
        print('\n[Full changelog](https://aurea.xcenter.it/?changelog='+current['version']+')')
    elif args.action == 'validate': validate_archive(args.file, args.kind, args.commit, args.channel)

if __name__ == '__main__': main()
