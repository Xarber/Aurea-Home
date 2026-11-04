// SPDX-License-Identifier: AGPL-3.0-only
import {useRef} from 'react';
import {Platform} from 'react-native';
import type {GestureResponderEvent} from 'react-native';
/** Swipe between three stops without stealing an inner list's remaining scroll. */
export function usePageSwipe(page:number,blocked:boolean,change:(page:number)=>void){
 const start=useRef<{x:number;y:number;at:number;inner?:HTMLElement}|undefined>(undefined);
 return {
  onTouchStart:(event:GestureResponderEvent)=>{if(blocked)return;const point=event.nativeEvent.touches[0];if(!point)return;const target=Platform.OS==='web'?(event.target as unknown as Element)?.closest?.('#inputs-scroll,#apps-scroll') as HTMLElement|undefined:undefined;start.current={x:point.pageX,y:point.pageY,at:Date.now(),inner:target};},
  onTouchEnd:(event:GestureResponderEvent)=>{const initial=start.current;start.current=undefined;if(!initial||blocked||Date.now()-initial.at>1000)return;const point=event.nativeEvent.changedTouches[0];if(!point)return;const dx=point.pageX-initial.x,dy=point.pageY-initial.y;if(Math.abs(dy)<55||Math.abs(dy)<Math.abs(dx)*1.3)return;const inner=initial.inner;if(inner&&inner.scrollHeight>inner.clientHeight+4&&(dy<0?inner.scrollTop+inner.clientHeight<inner.scrollHeight-3:inner.scrollTop>3))return;change(Math.max(0,Math.min(2,page+(dy<0?1:-1))));},
  onTouchCancel:()=>{start.current=undefined;},
 };
}
