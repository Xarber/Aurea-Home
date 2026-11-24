// SPDX-License-Identifier: AGPL-3.0-only
import {createHash, randomBytes, timingSafeEqual} from 'node:crypto';
import {createDeviceLogins} from './devices.mjs';
import {createInvitations} from './invitations.mjs';
import {createSessions} from './sessions.mjs';

const validToken = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const sessionCookie = '__Host-aurea-session';
const loginCookie = '__Host-aurea-login';
const token = () => randomBytes(32).toString('base64url');
const cookie = (name, value, age) => name + '=' + value + '; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=' + age;

function readCookie(request, name) {
  return request.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(name + '='))?.slice(name.length + 1);
}

function parsePreferences(value, profile) {
  if (profile === 'tv-appearance') {
    const fields = ['schema','language','wallpaper','motion','musicTint','glass','blur'];
    if (value?.schema !== 1 || !['en','it'].includes(value.language) ||
        typeof value.wallpaper !== 'string' || !/^[a-z0-9_-]{1,32}$/.test(value.wallpaper) ||
        !['motion','musicTint','glass','blur'].every(key => typeof value[key] === 'boolean') ||
        Object.keys(value).length !== fields.length) return undefined;
    return Object.fromEntries(fields.map(key => [key,value[key]]));
  }
  if (value?.schema !== 1 || !['auto','home','full'].includes(value.view) || typeof value.touchpad !== 'boolean' ||
      Object.keys(value).length !== 3) return undefined;
  return {schema:1, view:value.view, touchpad:value.touchpad};
}

async function readBody(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024) throw new Error('request_too_large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function accountHandler({identity, origin, sessionStore, clock=Date.now}) {
  const logins = new Map();
  const sessions=createSessions(identity,sessionStore,clock);
  const handoffs = new Map();
  const invitations = createInvitations();
  const deviceLogins = createDeviceLogins(identity);
  async function route(request, response) {
    const url = new URL(request.url, origin);
    const method = request.method;
    const now=clock();
    const json = (status, value) => {response.writeHead(status, {'Content-Type':'application/json'}); response.end(JSON.stringify(value));};
    const redirect = location => {response.writeHead(303, {Location:location}); response.end();};
    const body = message => {response.writeHead(200, {'Content-Type':'text/plain; charset=utf-8'}); response.end(message);};
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    sessions.prune(now);
    for (const store of [logins, handoffs]) {
      for (const [key, value] of store) if (value.expiresAt <= now) store.delete(key);
    }

    const device = url.pathname.startsWith('/account/device/');
    const phone = url.pathname.startsWith('/account/phone/');
    if (phone && method === 'POST' && !request.headers.origin &&
        ['/account/phone/start','/account/phone/pickup','/account/phone/cancel'].includes(url.pathname)) {
      let payload;
      try {payload = await readBody(request);} catch {return json(400,{error:'invalid_request'});}
      if (url.pathname.endsWith('/start')) {
        if (!validToken(payload?.challenge)) return json(400,{error:'invalid_challenge'});
        if (handoffs.size >= 64) return json(429,{error:'try_again'});
        const id = token();
        handoffs.set(id,{challenge:payload.challenge, stay:payload.stay===true, expiresAt:now+300000});
        return json(200,{id, browser:origin+'/account/phone/browser?id='+id, expiresIn:300});
      }
      const entry = handoffs.get(payload?.id);
      if (!entry || !validToken(payload?.proof) || !timingSafeEqual(
        Buffer.from(entry.challenge), Buffer.from(createHash('sha256').update(payload.proof).digest('base64url')),
      )) return json(403,{error:'invalid_login'});
      if (url.pathname.endsWith('/cancel')) {
        handoffs.delete(payload.id);
        return json(200,{canceled:true});
      }
      if (!entry.account && !entry.failed) return json(202,{});
      handoffs.delete(payload.id);
      if (entry.failed) return json(403,{error:'invalid_login'});
      const {id,ttl} = sessions.issue(entry.account,'phone');
      return json(200,{session:id, expiresIn:ttl, signedIn:true, name:entry.account.name});
    }
    if (url.pathname === '/account/phone/browser' && method === 'GET') {
      const phoneId = url.searchParams.get('id');
      const handoff = handoffs.get(phoneId);
      if (!handoff || handoff.opened) return body('Return to Aurea and start a new sign-in.');
      handoff.opened = true;
      return beginBrowserLogin(phoneId, handoff.expiresAt, handoff.stay);
    }
    if (device && !request.headers.origin && method === 'POST' && [
      '/account/device/start', '/account/device/pickup', '/account/device/cancel',
    ].includes(url.pathname)) {
      let payload;
      try {payload = await readBody(request);} catch {return json(400, {error:'invalid_request'});}
      if (url.pathname.endsWith('/start')) {
        const {status, ...result} = await deviceLogins.begin(payload?.challenge,payload?.stay===true);
        return json(status,result);
      }
      const {status, account, ...result} = deviceLogins.pickup(payload?.id,payload?.proof,url.pathname.endsWith('/cancel'));
      if (!account) return json(status,result);
      const {id, ttl} = sessions.issue(account,'tv');
      const owner = createHash('sha256').update('aurea-tv-profile-v1\0').update(account.sub).digest('hex');
      return json(200,{session:id, expiresIn:ttl, name:account.name, owner});
    }
    const native = device || phone;
    const kind = device ? 'tv' : phone ? 'phone' : 'web';
    const sessionId = native ? request.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1] : readCookie(request, sessionCookie);
    if (method !== 'GET' && (native ? !!request.headers.origin : request.headers.origin !== origin)) return json(403, {error:'invalid_origin'});
    if (url.pathname === '/account/start' && method === 'POST') {
      return beginBrowserLogin(undefined,now+300000,url.searchParams.get('stay')==='1');
    }
    const currentSession=sessions.read(sessionId,kind);
    const shouldRefresh=[ '/account/session','/account/phone/session','/account/device/session',
      '/account/'+(device?'device/':phone?'phone/':'')+'preferences',
      '/account/'+(device?'device/':phone?'phone/':'')+'invitations',
    ].includes(url.pathname)&&!(method==='DELETE'&&url.pathname.endsWith('/invitations'));
    const session=shouldRefresh?await sessions.use(sessionId,kind):currentSession;
    if(shouldRefresh&&kind==='web'&&session?.refreshToken){
      response.setHeader('Set-Cookie',cookie(sessionCookie,sessionId,Math.ceil((session.expiresAt-clock())/1000)));
    }
    if (['/account/session','/account/phone/session','/account/device/session'].includes(url.pathname) && method === 'GET') return json(200, {
      available:true, signedIn:!!session, name:session?.name,
    });
    async function beginBrowserLogin(phoneId, expiresAt, stay) {
      if (logins.size >= 128) return json(429, {error:'try_again'});
      const handle = token();
      const transaction = {expiresAt, phoneId};
      logins.set(handle, transaction);
      try {
        const {url, ...details} = await identity.begin(stay);
        Object.assign(transaction, details);
        logins.delete(readCookie(request, loginCookie));
        response.setHeader('Set-Cookie', cookie(loginCookie, handle, 300));
        return redirect(String(url));
      } catch (error) {
        logins.delete(handle);
        throw error;
      }
    }
    if (url.pathname === '/account/callback' && method === 'GET') {
      const handle = readCookie(request, loginCookie);
      const transaction = logins.get(handle);
      if (!transaction?.state || url.searchParams.get('state') !== transaction.state) return json(403, {error:'invalid_login'});
      logins.delete(handle);
      response.setHeader('Set-Cookie', cookie(loginCookie, '', 0));
      try {
        const account = await identity.complete(url.search, transaction);
        if (transaction.phoneId) {
          const handoff = handoffs.get(transaction.phoneId);
          if (!handoff || handoff.expiresAt <= Date.now()) return body('Return to Aurea and start a new sign-in.');
          handoff.account = account;
          return body('Signed in to Aurea. You can return to the app.');
        }
        if (session) sessions.delete(sessionId);
        const {id:next,ttl} = sessions.issue(account,'web');
        response.setHeader('Set-Cookie', [cookie(loginCookie, '', 0), cookie(sessionCookie, next, ttl)]);
        return redirect('/?remote=1');
      } catch {
        const handoff = handoffs.get(transaction.phoneId);
        if (handoff) handoff.failed = true;
        return body('Aurea sign-in did not finish. Return to Aurea and try again.');
      }
    }
    if (url.pathname === (device ? '/account/device/logout' : '/account/phone/logout') && method === 'POST') {
      if (session) {
        if (device) invitations(sessionId,session,'DELETE');
        sessions.delete(sessionId);
      }
      return json(200, {signedIn:false});
    }
    if (url.pathname === '/account/logout' && method === 'POST') {
      if (session) sessions.delete(sessionId);
      logins.delete(readCookie(request, loginCookie));
      response.setHeader('Set-Cookie', [cookie(loginCookie, '', 0), cookie(sessionCookie, '', 0)]);
      return json(200, {signedIn:false});
    }
    if (url.pathname === '/account/'+(device ? 'device/' : phone ? 'phone/' : '')+'invitations') {
      if (!session) return json(401,{error:'sign_in_required'});
      if (method !== 'DELETE' && !await identity.validateSession(session)) {
        if (device) invitations(sessionId,session,'DELETE');
        sessions.delete(sessionId);
        return json(401,{error:'sign_in_required'});
      }
      if (!sessions.current(sessionId,session)) return json(401,{error:'sign_in_required'});
      let payload;
      if (method === 'POST') {
        try {payload = await readBody(request);} catch {return json(400,{error:'invalid_request'});}
      }
      const {status, ...result} = invitations(sessionId,session,method,payload);
      return json(status,result);
    }
    if (url.pathname !== (device ? '/account/device/preferences' : phone ? '/account/phone/preferences' : '/account/preferences') || !['GET','PUT','DELETE'].includes(method)) return json(404, {error:'not_found'});
    if (!session) return json(401, {error:'sign_in_required'});
    const profile = device ? 'tv-appearance' : 'remote-layout';
    let revision;
    let preferences;
    if (method !== 'GET') {
      revision = request.headers['if-match']?.match(/^"(0|[1-9]\d{0,14})"$/)?.[1];
      if (!revision) return json(428, {error:'revision_required'});
      if (method === 'PUT') {
        try {preferences = parsePreferences(await readBody(request), profile);} catch {}
        if (!preferences) return json(400, {error:'invalid_preferences'});
      }
    }
    const result = await identity.preferences(session, method, revision, preferences, profile);
    if (result.status === 401 || result.status === 403) {
      sessions.delete(sessionId);
      return json(result.status, {error:'account_access_unavailable'});
    }
    if (result.status === 409 || result.status === 412) return json(409, {error:'settings_changed'});
    if (method === 'GET' && result.status === 404) return json(200, {revision:'0', preferences:null});
    if (result.status < 200 || result.status >= 300) return json(502, {error:'sync_unavailable'});
    if (method !== 'GET') return json(200, {saved:method === 'PUT'});
    const saved = parsePreferences(result.data, profile);
    const version = String(result.revision);
    if (!saved || !/^[1-9]\d{0,14}$/.test(version)) return json(502, {error:'invalid_saved_preferences'});
    return json(200, {revision:version, preferences:saved});
  }
  return (request, response) => {
    void route(request, response).catch(() => {
      if (!response.headersSent) response.writeHead(502, {'Content-Type':'application/json','Cache-Control':'no-store'});
      response.end('{"error":"account_service_unavailable"}');
    });
  };
}
