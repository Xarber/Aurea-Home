// SPDX-License-Identifier: AGPL-3.0-only
import {createServer} from 'node:http';
import {accountHandler} from './http.mjs';
import {createSessionStore} from './sessions.mjs';
import {connectIdentity} from './oidc.mjs';

const clientId = process.env.AUREA_XCENTER_CLIENT_ID;
const secret = process.env.AUREA_XCENTER_CLIENT_SECRET;
const origin = 'https://aurea.xcenter.it';
const port=Number(process.env.AUREA_ACCOUNT_PORT??'8793');
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid account service port.');
if (!clientId || !secret || process.env.AUREA_ACCOUNT_ENABLED !== '1') {
  throw new Error('An activated Aurea X-Center ID registration is required.');
}
const identity = await connectIdentity({clientId, secret, callback:origin + '/account/callback'});
const sessionStore=createSessionStore({directory:process.env.AUREA_ACCOUNT_STATE_DIRECTORY??process.env.STATE_DIRECTORY,keyMaterial:secret,clientId});
createServer(accountHandler({identity, origin, sessionStore})).listen(port, '127.0.0.1');
