// SPDX-License-Identifier: AGPL-3.0-only
import {createCipheriv,createDecipheriv,createHash,hkdfSync,randomBytes} from 'node:crypto';
import {closeSync,fsyncSync,openSync,readFileSync,readdirSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const idleSeconds=14*24*60*60;

export function createSessionStore({directory,keyMaterial,clientId,clock=Date.now}={}) {
  const records=new Map();
  const key=directory&&hkdfSync('sha256',keyMaterial,clientId,'aurea-account-sessions-v1',32);
  const digest=id=>createHash('sha256').update(id).digest('hex');
  const path=name=>join(directory,name);
  const flush=file=>{
    const handle=openSync(file,'r');
    try{fsyncSync(handle);}finally{closeSync(handle);}
  };
  const unlink=name=>{
    rmSync(path(name),{force:true});
    if(!name.endsWith('.tmp'))flush(directory);
  };
  const remove=name=>{
    if(directory&&records.get(name)?.refreshToken)unlink(name);
    records.delete(name);
  };
  if(directory)for(const name of readdirSync(directory)) {
    if (/^[a-f0-9]{64}\.tmp$/.test(name)) {rmSync(path(name),{force:true});continue;}
    if (!/^[a-f0-9]{64}$/.test(name))continue;
    try {
      const data=readFileSync(path(name));
      const decipher=createDecipheriv('aes-256-gcm',key,data.subarray(0,12));
      decipher.setAAD(Buffer.from(name));
      decipher.setAuthTag(data.subarray(12,28));
      const session=JSON.parse(Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]));
      if(!session.refreshToken||session.expiresAt<=clock())unlink(name);
      else records.set(name,session);
    } catch {unlink(name);}
  }
  return {
    get size(){return records.size;},
    get(id){return id?records.get(digest(id)):undefined;},
    delete(id){if(id)remove(digest(id));},
    set(id,session){
      const name=digest(id);
      if(directory&&session.refreshToken){
        const iv=randomBytes(12);
        const cipher=createCipheriv('aes-256-gcm',key,iv);
        cipher.setAAD(Buffer.from(name));
        const data=Buffer.concat([cipher.update(JSON.stringify(session)),cipher.final()]);
        writeFileSync(path(name+'.tmp'),Buffer.concat([iv,cipher.getAuthTag(),data]),{mode:0o600});
        flush(path(name+'.tmp'));
        renameSync(path(name+'.tmp'),path(name));
        flush(directory);
      } else if(directory&&records.get(name)?.refreshToken) {
        unlink(name);
      }
      records.set(name,session);
    },
    prune(now){for(const [name,value] of records)if(value.expiresAt<=now)remove(name);},
  };
}

export function createSessions(identity,store=createSessionStore(),clock=Date.now) {
  const refreshing=new Map();
  const accessTtl=value=>Math.min(3600,Math.floor(Number(value)));
  function issue(account,kind) {
    const accessSeconds=accessTtl(account.expiresIn);
    if(!account.sub||!account.accessToken||!Number.isFinite(accessSeconds)||accessSeconds<1||store.size>=1024){
      throw new Error('invalid_session');
    }
    const id=randomBytes(32).toString('base64url');
    const ttl=account.refreshToken?idleSeconds:accessSeconds;
    store.set(id,{...account,kind,expiresAt:clock()+ttl*1000,accessExpiresAt:clock()+accessSeconds*1000});
    return {id,ttl};
  }
  function read(id,kind) {
    const session=store.get(id);
    return session?.kind===kind&&session.expiresAt>clock()?session:undefined;
  }
  async function use(id,kind) {
    const entry=read(id,kind);
    if(!entry)return;
    const existing=refreshing.get(id);
    if(existing)return existing;
    if(!entry.refreshToken||entry.accessExpiresAt-clock()>60000)return entry;
    const pending=(async()=>{
      const reserved={...entry,refreshToken:undefined};
      // An interrupted exchange must never leave a possibly consumed token on disk.
      store.set(id,reserved);
      try {
        const next=await identity.refresh(entry);
        if(store.get(id)!==reserved)return;
        const seconds=accessTtl(next?.expiresIn);
        if(next?.sub!==entry.sub||!next.accessToken||!Number.isFinite(seconds)||seconds<1||
          !next.refreshToken||next.refreshToken===entry.refreshToken)throw new Error('invalid_rotation');
        const replacement={...entry,...next,expiresAt:clock()+idleSeconds*1000,accessExpiresAt:clock()+seconds*1000};
        store.set(id,replacement);
        return replacement;
      } catch {
        if(store.get(id)===reserved)store.delete(id);
      }
    })();
    refreshing.set(id,pending);
    try{return await pending;}finally{refreshing.delete(id);}
  }
  return {issue,read,use,delete:id=>store.delete(id),prune:now=>store.prune(now),idleSeconds,
    current:(id,session)=>store.get(id)===session&&session.expiresAt>clock()};
}
