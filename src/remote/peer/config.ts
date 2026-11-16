// SPDX-License-Identifier: AGPL-3.0-only
export const productionPeerEndpoint = 'https://aurea.xcenter.it/peer';

export function parsePeerEndpoint(value: string) {
  const endpoint = new URL(value.trim());
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password ||
      endpoint.search || endpoint.hash || !/^\/[a-zA-Z0-9_/-]+$/.test(endpoint.pathname)) {
    throw new Error('Enter an HTTPS signaling address with a server path and no credentials.');
  }
  const path = endpoint.pathname.replace(/\/+$/, '');
  if (!path) throw new Error('Enter the signaling server path.');
  return {
    endpoint: endpoint.origin + path,
    host: endpoint.hostname,
    port: endpoint.port ? Number(endpoint.port) : 443,
    path,
    secure: true,
    key: 'aurea',
  };
}

export const configuredPeerEndpoint = process.env.EXPO_PUBLIC_AUREA_PEER_ENDPOINT || productionPeerEndpoint;

export async function probePeerEndpoint(value: string) {
  const {endpoint, key} = parsePeerEndpoint(value);
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 6000);
  try {
    const result = await fetch(endpoint + '/' + key + '/id', {
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      signal: abort.signal,
    });
    if (!result.ok || !/^[a-f0-9-]{36}$/i.test((await result.text()).trim())) {
      throw new Error('The endpoint did not return a PeerServer identity.');
    }
  } finally {
    clearTimeout(timeout);
  }
}
