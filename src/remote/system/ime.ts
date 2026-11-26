// SPDX-License-Identifier: AGPL-3.0-only
import {bytes,integer,join,nested,string,type Fields} from './wire.ts';

/** Field and IME counters come from field/show messages, with batch edits as fallback. */
export class RemoteIme {
  private imeCounter=0;
  private fieldCounter=0;
  private explicitIme=false;
  private explicitField=false;
  active=false;
  revision=0;

  reset(){
    this.active=false;
    this.imeCounter=0;
    this.fieldCounter=0;
    this.explicitIme=false;
    this.explicitField=false;
  }

  receive(message:Fields){
    const previous=this.active;
    const field=this.fieldCounter;
    if(message.has(20)){
      const inject=nested(message,20);
      const nextIme=counter(nested(inject,1),1);
      const nextField=counter(nested(inject,2),1);
      if(nextIme!==undefined){
        this.imeCounter=nextIme;
        this.explicitIme=nextIme!==0;
      }
      if(nextField!==undefined){
        this.fieldCounter=nextField;
        this.explicitField=nextField!==0;
      }
      this.active=inject.has(2);
    }else if(message.has(22)){
      const show=nested(message,22);
      if(show.has(2)){
        this.fieldCounter=counter(nested(show,2),1)??0;
        this.explicitField=true;
      }
      this.active=true;
    }else if(message.has(21)){
      const batch=nested(message,21);
      if(!this.explicitIme)this.imeCounter=counter(batch,1)??this.imeCounter;
      if(!this.explicitField)this.fieldCounter=counter(batch,2)??this.fieldCounter;
      this.active=true;
    }else return false;
    const changed=this.active!==previous||this.active&&field!==this.fieldCounter;
    if(changed&&this.active)this.revision++;
    return changed;
  }

  insert(value:string){
    const end=value.length;
    const selection=join(integer(1,end),integer(2,end),string(3,value));
    return bytes(21,join(integer(1,this.imeCounter),integer(2,this.fieldCounter),
      bytes(3,join(integer(1,1),bytes(2,selection)))));
  }
}

function counter(message:Fields,key:number){
  const value=message.get(key);
  return typeof value==='number'&&value>=0&&value<=0x7fffffff?value:undefined;
}
