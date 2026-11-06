// SPDX-License-Identifier: AGPL-3.0-only
/** Android Remote IME inserts strings; remove the old suffix before inserting its replacement. */
export function keyboardEdits(previous:string,next:string){
 const before=Array.from(previous),after=Array.from(next);let common=0;
 while(common<before.length&&common<after.length&&before[common]===after[common])common++;
 return {remove:before.length-common,insert:after.slice(common).join('')};
}
