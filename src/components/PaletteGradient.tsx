// SPDX-License-Identifier: AGPL-3.0-only
import React from 'react';
import {StyleSheet,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import {usePaletteTransition} from '../hooks/usePaletteTransition';
export function PaletteGradient({colors,mirror=false,horizontal=false,dominance}:{colors:readonly[string,string];mirror?:boolean;horizontal?:boolean;dominance?:number}){
 const {layers,fade}=usePaletteTransition(dominance===undefined?colors:[...colors,String(dominance)]);
 const points=horizontal?{start:{x:0,y:0},end:{x:1,y:0}}:mirror?{start:{x:0,y:0},end:{x:1,y:1}}:{};
 const locations=(value:string[]):[number,number,number]|undefined=>value[2]===undefined?undefined:[0,Math.max(.5,Math.min(.92,Number(value[2]))),1];
 const stops=(value:string[]):[string,string,...string[]]=>value[2]!==undefined?[value[0]!,value[0]!,value[1]!]:mirror?[value[0]!,value[1]!,value[0]!]:[value[0]!,value[1]!];
 return <View testID="palette-gradient" pointerEvents="none" style={StyleSheet.absoluteFill}><LinearGradient colors={stops(layers.from)} locations={locations(layers.from)} {...points} style={StyleSheet.absoluteFill}/><Animated.View testID="palette-fade" style={[StyleSheet.absoluteFill,fade]}><LinearGradient colors={stops(layers.to)} locations={locations(layers.to)} {...points} style={StyleSheet.absoluteFill}/></Animated.View></View>;
}
