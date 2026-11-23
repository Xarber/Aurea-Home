// SPDX-License-Identifier: AGPL-3.0-only
import * as oidc from 'openid-client';

const issuer = 'https://id.xcenter.it';

export async function connectIdentity({clientId, secret, callback}) {
  const configuration = await oidc.discovery(new URL(issuer), clientId, {}, oidc.ClientSecretBasic(secret));
  const metadata = configuration.serverMetadata();
  for (const endpoint of [metadata.authorization_endpoint, metadata.token_endpoint, metadata.jwks_uri, metadata.userinfo_endpoint, metadata.device_authorization_endpoint]) {
    if (new URL(endpoint).origin !== issuer) throw new Error('Unexpected identity endpoint');
  }
  oidc.enableNonRepudiationChecks(configuration);

  async function account(tokens) {
    const claims = tokens.claims();
    if (!claims?.sub || !tokens.access_token) throw new Error('Missing verified identity');
    const profile = await oidc.fetchUserInfo(configuration, tokens.access_token, claims.sub);
    return {accessToken: tokens.access_token, expiresIn: tokens.expires_in, sub:claims.sub,
      name: typeof profile.name === 'string' ? profile.name.slice(0, 120) : undefined};
  }

  return {
    async beginDevice() {
      const nonce = oidc.randomNonce();
      const details = await oidc.initiateDeviceAuthorization(configuration, {scope:'openid profile app_data', nonce});
      const verification = new URL(details.verification_uri_complete);
      if (verification.origin !== issuer || verification.pathname !== '/device' ||
          verification.searchParams.get('code') !== details.user_code) throw new Error('Unexpected verification URL');
      return {code:details.user_code, verification:verification.href, expiresIn:details.expires_in,
        async complete(signal) {
          const tokens = await oidc.pollDeviceAuthorizationGrant(configuration, details, {}, {signal});
          if (tokens.claims()?.nonce !== nonce) throw new Error('Invalid device nonce');
          return account(tokens);
        },
      };
    },
    async begin() {
      const state = oidc.randomState();
      const nonce = oidc.randomNonce();
      const verifier = oidc.randomPKCECodeVerifier();
      const url = oidc.buildAuthorizationUrl(configuration, {
        redirect_uri: callback, scope: 'openid profile app_data',
        state, nonce, code_challenge_method: 'S256',
        code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      });
      return {url, state, nonce, verifier};
    },
    async complete(query, transaction) {
      const url = new URL(callback);
      url.search = query;
      const tokens = await oidc.authorizationCodeGrant(configuration, url, {
        expectedState: transaction.state, expectedNonce: transaction.nonce,
        pkceCodeVerifier: transaction.verifier, idTokenExpected: true,
      });
      return account(tokens);
    },
    async preferences(session, method, revision, preferences, profile) {
      const url = issuer + '/v1/apps/' + encodeURIComponent(clientId) + '/data/preferences/' + profile;
      const headers = {Authorization: 'Bearer ' + session.accessToken};
      if (method !== 'GET') headers['If-Match'] = '"' + revision + '"';
      if (method === 'PUT') headers['Content-Type'] = 'application/json';
      const response = await fetch(url, {method, headers, redirect:'error', signal:AbortSignal.timeout(6000),
        body: method === 'PUT' ? JSON.stringify({data:preferences, public:false}) : undefined});
      if (method === 'GET' && response.status === 404) return {status:404};
      if (!response.ok || method !== 'GET') return {status:response.status};
      const record = await response.json();
      return {status:200, revision:record.revision ?? response.headers.get('etag')?.match(/^"(\d+)"$/)?.[1], data:record.data};
    },
  };
}
