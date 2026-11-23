// SPDX-License-Identifier: AGPL-3.0-only
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const capability = /^[A-Za-z0-9_-]{43}$/;
const ttlMs = 90000;

export function createInvitations(clock = Date.now) {
  const invitations = new Map();

  return (sessionId, session, method, payload) => {
    const now = clock();
    for (const [id, invite] of invitations) if (invite.expiresAt <= now) invitations.delete(id);
    if (session.kind === 'tv') {
      if (method === 'DELETE') {
        invitations.delete(sessionId);
        return {status:200};
      }
      if (method !== 'POST') return {status:405};
      const {peer, device, label, grant} = payload ?? {};
      if (!uuid.test(peer) || !uuid.test(device) || typeof grant !== 'string' || !capability.test(grant) ||
          typeof label !== 'string' || !label.trim() || label.length > 80 || /[\p{Cc}\p{Cf}]/u.test(label)) {
        return {status:400, error:'invalid_invitation'};
      }
      if (!invitations.has(sessionId) && invitations.size >= 128) return {status:429, error:'try_again'};
      invitations.set(sessionId,{peer, device, label, grant, sub:session.sub, expiresAt:Math.min(now+ttlMs,session.expiresAt)});
      return {status:200, expiresIn:ttlMs/1000};
    }
    if (method === 'GET') return {status:200, televisions:[...invitations.values()]
      .filter(invite=>invite.sub === session.sub).map(({peer,label})=>({peer,label}))};
    if (method !== 'POST') return {status:405};
    if (!uuid.test(payload?.peer)) return {status:400,error:'invalid_invitation'};
    for (const [id, invite] of invitations) {
      if (invite.sub !== session.sub || invite.peer !== payload.peer) continue;
      invitations.delete(id);
      return {status:200, peer:invite.peer, device:invite.device, grant:invite.grant};
    }
    return {status:404,error:'invitation_unavailable'};
  };
}
