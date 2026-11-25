// SPDX-License-Identifier: AGPL-3.0-only
export function parseHomeLayout(value:Record<string,unknown>) {
  const {dock,wallpaper,revision}=value;
  if(!Array.isArray(dock)||dock.length!==6||typeof wallpaper!=='string'||!/^[a-z0-9_-]{1,40}$/.test(wallpaper)||
    typeof revision!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(revision))throw new Error('invalid_layout');
  const items:{id:string;name:string}[]=[];
  const used=new Set<string>();
  for(let index=0;index<dock.length;index++){
    const item=dock[index];
    if(!item||typeof item.id!=='string'||item.id.length>250||used.has(item.id)||
      item.id==='all'&&index!==5||typeof item.name!=='string'||item.name.length>160)throw new Error('invalid_layout');
    used.add(item.id);
    items.push({id:item.id,name:item.name});
  }
  return {dock:items,wallpaper,revision};
}
