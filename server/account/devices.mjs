// SPDX-License-Identifier: AGPL-3.0-only
import {createHash, randomBytes, timingSafeEqual} from 'node:crypto';

const digest = value => createHash('sha256').update(value).digest('base64url');
const encoded = /^[A-Za-z0-9_-]{43}$/;

export function createDeviceLogins(identity) {
  const transactions = new Map();

  function prune() {
    for (const [id, transaction] of transactions) {
      if (transaction.expires <= Date.now()) {
        transaction.abort.abort();
        transactions.delete(id);
      }
    }
  }

  async function begin(challenge) {
    prune();
    if (typeof challenge !== 'string' || !encoded.test(challenge)) return {status:400, error:'invalid_challenge'};
    if (transactions.size >= 24) return {status:429, error:'try_again'};
    const id = randomBytes(32).toString('base64url');
    const abort = new AbortController();
    const transaction = {challenge, abort, expires:Date.now() + 300000};
    transactions.set(id, transaction);
    try {
      const login = await identity.beginDevice();
      const ttl = Math.min(300, Math.floor(Number(login.expiresIn)));
      if (!Number.isFinite(ttl) || ttl < 1 || !/^[A-Z0-9-]{6,10}$/.test(login.code)) throw new Error('Invalid device response');
      transaction.expires = Date.now() + ttl * 1000;
      const timer = setTimeout(() => abort.abort(), ttl * 1000);
      timer.unref();
      void login.complete(abort.signal).then(account => {
        transaction.account = account;
      }).catch(() => {
        transaction.failed = true;
      }).finally(() => clearTimeout(timer));
      return {status:200, id, code:login.code, verification:login.verification, expiresIn:ttl};
    } catch {
      abort.abort();
      transactions.delete(id);
      return {status:502, error:'activation_unavailable'};
    }
  }

  function pickup(id, proof, cancel = false) {
    prune();
    const entry = transactions.get(id);
    if (!entry || typeof proof !== 'string' || !encoded.test(proof) ||
        !timingSafeEqual(Buffer.from(entry.challenge), Buffer.from(digest(proof)))) {
      return {status:403, error:'invalid_device_login'};
    }
    if (!cancel && !entry.failed && !entry.account) return {status:202};
    transactions.delete(id);
    entry.abort.abort();
    if (cancel) return {status:200};
    if (entry.failed) return {status:403, error:'device_login_denied'};
    return {status:200, account:entry.account};
  }

  return {begin, pickup};
}
