// SPDX-License-Identifier: AGPL-3.0-only
import {useLayoutEffect,useRef,useState} from 'react';
import {Easing,interpolateColor,useAnimatedStyle,useReducedMotion,useSharedValue,withTiming} from 'react-native-reanimated';
/** Interruptible static color layers, with optional numeric gradient positions. */
export function usePaletteTransition(colors:readonly string[],immediate=false,values:readonly number[]=[]){
 const reduced=useReducedMotion(),progress=useSharedValue(1),key=colors.join(',')+'|'+values.join(',');
 const [layers,setLayers]=useState({from:[...colors],to:[...colors],fromValues:[...values],toValues:[...values],revision:0}),current=useRef(layers);
 useLayoutEffect(()=>{const previous=current.current;if(previous.to.join(',')+'|'+previous.toValues.join(',')===key)return;const amount=progress.get(),next={from:previous.from.map((color,index)=>interpolateColor(amount,[0,1],[color,previous.to[index]!],'RGB',{gamma:1})),to:[...colors],fromValues:values.map((value,index)=>{const from=previous.fromValues[index]??value,to=previous.toValues[index]??value;return from+(to-from)*amount;}),toValues:[...values],revision:previous.revision+1};current.current=next;setLayers(next);},[key]);
 useLayoutEffect(()=>{if(layers.from.join(',')===layers.to.join(',')&&layers.fromValues.join(',')===layers.toValues.join(',')){progress.set(1);return;}progress.set(0);progress.set(withTiming(1,{duration:reduced||immediate?0:1800,easing:Easing.linear}));},[layers.revision,reduced,immediate]);
 const fade=useAnimatedStyle(()=>({opacity:progress.get()}));return {layers,fade};
}
