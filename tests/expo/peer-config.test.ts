// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parsePeerEndpoint, productionPeerEndpoint} from '../../src/remote/peer/config.ts';

test('production signaling retains its host, port and PeerServer path', () => {
  assert.deepEqual(parsePeerEndpoint(productionPeerEndpoint), {
    endpoint: productionPeerEndpoint, host: 'aurea.xcenter.it', port: 443,
    path: '/peer', secure: true, key: 'aurea',
  });
});

test('signaling configuration normalizes custom paths and rejects insecure or credentialed endpoints', () => {
  assert.equal(parsePeerEndpoint('https://beta.example.org:8443/test/peer/').endpoint, 'https://beta.example.org:8443/test/peer');
  for (const value of ['http://beta.example.org/peer', 'https://beta.example.org',
    'https://token@beta.example.org/peer', 'https://beta.example.org/peer?token=abc',
    'https://beta.example.org/peer#secret', 'https://beta.example.org/peer%2Fa']) {
    assert.throws(() => parsePeerEndpoint(value));
  }
});

test('the developer endpoint probe sends no cookies or pairing data', async context => {
  const {probePeerEndpoint} = await import('../../src/remote/peer/config.ts');
  const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
    new Response('e3da5477-694c-4534-97cf-e0d5d493a0cc'));
  await probePeerEndpoint('https://beta.example.org/peer/');
  const [request, options] = fetchMock.mock.calls[0]?.arguments ?? [];
  assert.equal(request, 'https://beta.example.org/peer/aurea/id');
  assert.equal(options?.credentials, 'omit');
  assert.equal(options?.redirect, 'error');
  assert.equal(options?.body, undefined);
});
