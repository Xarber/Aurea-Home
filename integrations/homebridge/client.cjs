// SPDX-License-Identifier: AGPL-3.0-only
const {createHmac,randomBytes,timingSafeEqual}=require('node:crypto');
const {isIPv4}=require('node:net');

function endpoint(address) {
  const url=new URL(address);
  const [a,b]=url.hostname.split('.').map(Number);
  if(url.protocol!=='http:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||
    !isIPv4(url.hostname)||!(a===10||a===172&&b>=16&&b<=31||a===192&&b===168)){
    throw new Error('Enter the local IPv4 address shown on Aurea Home.');
  }
  return url.origin+'/api/automation';
}
async function readEnvelope(response,limit){
    if(!response.body)throw new Error('Invalid Aurea response.');
    const reader=response.body.getReader(),parts=[];
    let size=0;
    try {
      for(;;){
        const {done,value}=await reader.read();
        if(done)break;
        size+=value.length;
        if(size>limit)throw new Error('Invalid Aurea response size.');
        parts.push(value);
      }
    } finally {await reader.cancel();}
    return JSON.parse(Buffer.concat(parts));
}

class AureaClient {
  constructor(address,key,fetcher=fetch) {
    this.url=endpoint(address);
    if(typeof key!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(key))throw new Error('Invalid Aurea integration key.');
    this.key=Buffer.from(key,'base64url');
    this.fetch=fetcher;
  }
  sign(message){return createHmac('sha256',this.key).update(message).digest('base64url');}
  async request(action,parameters={}) {
    const challenge=await this.fetch(this.url+'/challenge',{redirect:'error',signal:AbortSignal.timeout(4000)});
    if(!challenge.ok)throw new Error('Aurea connection unavailable.');
    const {epoch}=await readEnvelope(challenge,512);
    if(typeof epoch!=='string'||!/^[a-f0-9-]{36}$/.test(epoch))throw new Error('Invalid Aurea challenge.');
    const platform='homebridge',timestamp=Math.floor(Date.now()/1000),nonce=randomBytes(16).toString('base64url');
    const body=Buffer.from(JSON.stringify({action,...parameters})).toString('base64url');
    const signature=this.sign(['aurea-automation-request-v1',platform,epoch,timestamp,nonce,body].join('\n'));
    const response=await this.fetch(this.url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(4500),
      headers:{'Content-Type':'application/json'},body:JSON.stringify({platform,epoch,timestamp,nonce,body,signature})});
    if(!response.ok)throw new Error('Aurea connection unavailable or unauthorized.');
    const envelope=await readEnvelope(response,200000);
    if(typeof envelope.body!=='string'||envelope.body.length>150000||
        typeof envelope.signature!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(envelope.signature)){
      throw new Error('Invalid Aurea response.');
    }
    const expected=this.sign(['aurea-automation-response-v1',platform,nonce,envelope.body].join('\n'));
    if(!timingSafeEqual(Buffer.from(expected),Buffer.from(envelope.signature)))throw new Error('Aurea response could not be verified.');
    const result=JSON.parse(Buffer.from(envelope.body,'base64url'));
    if(!result||typeof result!=='object'||result.error)throw new Error('The TV could not execute this action.');
    return result;
  }
}
module.exports={AureaClient};
