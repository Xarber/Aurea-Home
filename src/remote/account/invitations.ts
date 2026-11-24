// SPDX-License-Identifier: AGPL-3.0-only
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
type Invitation = {peer:string;label:string;automatic?:boolean};
export type AccountRequest = (path:string, init?:RequestInit)=>Promise<unknown>;

export async function getInvitations(request:AccountRequest, signal?:AbortSignal):Promise<Invitation[]> {
  const result=await request('invitations',{signal}) as {televisions?:unknown};
  return Array.isArray(result.televisions) ? result.televisions.filter((tv):tv is Invitation=>
    typeof tv?.peer==='string'&&uuid.test(tv.peer)&&typeof tv.label==='string') : [];
}

export async function acceptInvitation(request:AccountRequest, peer:string, signal?:AbortSignal) {
  const result=await request('invitations',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({peer}),signal,
  }) as {device?:string;peer?:string;grant?:string};
  if(result.peer!==peer||!result.device||!uuid.test(result.device)||
     !result.grant||!/^[A-Za-z0-9_-]{43}$/.test(result.grant))throw new Error('invalid_invitation');
  return {peer,device:result.device,grant:result.grant};
}

export function singleAutomaticInvitation(offers:Invitation[]) {
  const candidates=offers.filter(offer=>offer.automatic===true);
  return candidates.length===1 ? candidates[0] : undefined;
}
