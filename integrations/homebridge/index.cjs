// SPDX-License-Identifier: AGPL-3.0-only
const {AureaClient}=require('./client.cjs');
const plugin='homebridge-aurea-home';
const platform='AureaHome';

class AureaPlatform {
  constructor(log,config,api) {
    this.devices=config?.televisions??[];
    api.on('didFinishLaunching',()=>{
      for(const device of this.devices){
        this.addTV(api,device).catch(()=>log.warn('An Aurea television is unavailable. Check its local address and key.'));
      }
    });
  }

  async addTV(api,device) {
    const client=new AureaClient(device.address,device.key);
    const {Service,Characteristic,Categories,uuid}=api.hap;
    let state;
    try {state=await client.request('state');}catch{state={sources:[]};}
    const name=device.name||state.name||'Aurea Home';
    const accessory=new api.platformAccessory(name,uuid.generate(platform+':'+device.address),Categories.TELEVISION);
    const tv=accessory.addService(Service.Television,name,'aurea-tv');
    tv.setCharacteristic(Characteristic.ConfiguredName,name)
      .setCharacteristic(Characteristic.SleepDiscoveryMode,Characteristic.SleepDiscoveryMode.NOT_DISCOVERABLE);
    tv.getCharacteristic(Characteristic.Active)
      .onGet(async()=>(await client.request('state')).interactive?Characteristic.Active.ACTIVE:Characteristic.Active.INACTIVE);
    // Power depends on vendor-specific system controls. Home is a separate selectable input.
    const sources=[{id:'' ,name:'Current input'},{id:'home',name:'Aurea Home'},...(state.sources??[])];
    const identifiers=new Map();
    for(const [index,source] of sources.entries()){
      const id=index+1;
      identifiers.set(id,source.id);
      const input=accessory.addService(Service.InputSource,source.name,'source-'+id);
      input.setCharacteristic(Characteristic.Identifier,id).setCharacteristic(Characteristic.ConfiguredName,source.name)
        .setCharacteristic(Characteristic.IsConfigured,Characteristic.IsConfigured.CONFIGURED)
        .setCharacteristic(Characteristic.InputSourceType,source.id.startsWith('input:')?Characteristic.InputSourceType.HDMI:Characteristic.InputSourceType.OTHER)
        .setCharacteristic(Characteristic.CurrentVisibilityState,Characteristic.CurrentVisibilityState.SHOWN);
      tv.addLinkedService(input);
    }
    tv.getCharacteristic(Characteristic.ActiveIdentifier).onGet(async()=>{
      const current=await client.request('state');
      return current.homeActive?2:1;
    }).onSet(async value=>{
      const id=identifiers.get(value);
      if(!id)return;
      if(id==='home')await client.request('open_home');
      else await client.request('input',{id});
    });
    const speaker=accessory.addService(Service.TelevisionSpeaker,name+' speakers','aurea-speaker');
    speaker.setCharacteristic(Characteristic.Active,Characteristic.Active.ACTIVE)
      .setCharacteristic(Characteristic.VolumeControlType,Characteristic.VolumeControlType.ABSOLUTE);
    speaker.getCharacteristic(Characteristic.Mute).onGet(async()=>(await client.request('state')).muted)
      .onSet(value=>client.request('mute',{value:!!value}));
    speaker.getCharacteristic(Characteristic.Volume).onGet(async()=>(await client.request('state')).volume)
      .onSet(value=>client.request('volume',{value}));
    tv.addLinkedService(speaker);
    api.publishExternalAccessories(plugin,[accessory]);
  }
}
module.exports=api=>api.registerPlatform(plugin,platform,AureaPlatform);
