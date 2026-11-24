// SPDX-License-Identifier: AGPL-3.0-only
import * as oidc from 'openid-client';

const issuer = 'https://id.xcenter.it';

export async function connectIdentity({clientId, secret, callback}) {
  const configuration = await oidc.discovery(new URL(issuer), clientId, {}, oidc.ClientSecretBasic(secret));
  const metadata = configuration.serverMetadata();
  for (const endpoint of [metadata.authorization_endpoint, metadata.token_endpoint, metadata.jwks_uri, metadata.userinfo_endpoint, metadata.device_authorization_endpoint]) {
    if (new URL(endpoint).origin !== issuer) throw new Error('Unexpected identity endpoint');
  }
  configuration.timeout = 6;
  oidc.enableNonRepudiationChecks(configuration);

  const renewable=metadata.scopes_supported?.includes('offline_access')&&metadata.grant_types_supported?.includes('refresh_token');
  const baseScope='openid profile app_data';
  const scope=stay=>renewable&&stay?baseScope+' offline_access':baseScope;

  async function account(tokens,stay) {
    const claims = tokens.claims();
    if (!claims?.sub || !tokens.access_token) throw new Error('Missing verified identity');
    const profile = await oidc.fetchUserInfo(configuration, tokens.access_token, claims.sub);
    return {accessToken: tokens.access_token, refreshToken:renewable&&stay?tokens.refresh_token:undefined, expiresIn: tokens.expires_in, sub:claims.sub,
      name: typeof profile.name === 'string' ? profile.name.slice(0, 120) : undefined};
  }

  return {
    async validateSession(session) {
      try {
        await oidc.fetchUserInfo(configuration, session.accessToken, session.sub);
        return true;
      } catch (error) {
        if (error?.response?.status === 401 || error?.response?.status === 403 || error?.error === 'invalid_token') return false;
        throw error;
      }
    },
    async refresh(session) {
      const tokens=await oidc.refreshTokenGrant(configuration,session.refreshToken);
      if(!tokens.access_token||!tokens.refresh_token)throw new Error('Missing rotated credentials');
      const claims=tokens.claims();
      if(claims&&claims.sub!==session.sub)throw new Error('Unexpected identity');
      const profile=await oidc.fetchUserInfo(configuration,tokens.access_token,session.sub);
      return {sub:session.sub, name:typeof profile.name==='string'?profile.name.slice(0,120):session.name,
        accessToken:tokens.access_token,refreshToken:tokens.refresh_token,expiresIn:tokens.expires_in};
    },
    async beginDevice(stay) {
      const nonce = oidc.randomNonce();
      const details = await oidc.initiateDeviceAuthorization(configuration, {scope:scope(stay), nonce, ...(renewable&&stay?{prompt:'consent'}:{})});
      const verification = new URL(details.verification_uri_complete);
      if (verification.origin !== issuer || verification.pathname !== '/device' ||
          verification.searchParams.get('code') !== details.user_code) throw new Error('Unexpected verification URL');
      return {code:details.user_code, verification:verification.href, expiresIn:details.expires_in,
        async complete(signal) {
          const tokens = await oidc.pollDeviceAuthorizationGrant(configuration, details, {}, {signal});
          if (tokens.claims()?.nonce !== nonce) throw new Error('Invalid device nonce');
          return account(tokens,stay);
        },
      };
    },
    async begin(stay) {
      const state = oidc.randomState();
      const nonce = oidc.randomNonce();
      const verifier = oidc.randomPKCECodeVerifier();
      const url = oidc.buildAuthorizationUrl(configuration, {
        redirect_uri: callback, scope:scope(stay),
        ...(renewable&&stay?{prompt:'consent'}:{}),
        state, nonce, code_challenge_method: 'S256',
        code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      });
      return {url, state, nonce, verifier, stay};
    },
    async complete(query, transaction) {
      const url = new URL(callback);
      url.search = query;
      const tokens = await oidc.authorizationCodeGrant(configuration, url, {
        expectedState: transaction.state, expectedNonce: transaction.nonce,
        pkceCodeVerifier: transaction.verifier, idTokenExpected: true,
      });
      return account(tokens,transaction.stay);
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
