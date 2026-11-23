// SPDX-License-Identifier: AGPL-3.0-only
import {createServer} from 'node:http';
import {accountHandler} from './http.mjs';
import {connectIdentity} from './oidc.mjs';

const clientId = process.env.AUREA_XCENTER_CLIENT_ID;
const secret = process.env.AUREA_XCENTER_CLIENT_SECRET;
const origin = 'https://aurea.xcenter.it';
if (!clientId || !secret || process.env.AUREA_ACCOUNT_ENABLED !== '1') {
  throw new Error('An activated Aurea X-Center ID registration is required.');
}
const identity = await connectIdentity({clientId, secret, callback:origin + '/account/callback'});
createServer(accountHandler({identity, origin})).listen(8793, '127.0.0.1');
