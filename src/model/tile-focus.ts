// SPDX-License-Identifier: AGPL-3.0-only
export function tileFocusTransform(focused:boolean,pressed:boolean,reduced:boolean,sway:boolean){
  const scale=reduced?1:pressed?.97:focused?1.045:1;
  if(!sway||reduced)return [{scale}];
  return [{perspective:800},{rotateX:focused&&!pressed?'2deg':'0deg'},{scale}];
}
