// SPDX-License-Identifier: AGPL-3.0-only
import {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated,{cancelAnimation,useAnimatedStyle,useReducedMotion,useSharedValue,withRepeat,withTiming} from 'react-native-reanimated';
import {FocusButton} from './FocusButton';

export function LauncherSkeleton({error,retry,t}:{error?:string;retry:()=>void;t:(label:string)=>string}){
  const reduced=useReducedMotion();
  const opacity=useSharedValue(.65);
  useEffect(()=>{
    if(!reduced&&!error)opacity.set(withRepeat(withTiming(1,{duration:1000}),-1,true));
    return ()=>cancelAnimation(opacity);
  },[reduced,error,opacity]);
  const fade=useAnimatedStyle(()=>({opacity:opacity.get()}));
  return <View style={styles.root}>
    <Animated.View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.layout,fade]}>
      <View style={styles.statusPlaceholder}/>
      <View style={styles.dock}>{Array.from({length:6},(_,index)=><View key={index} style={styles.tile}/>)}</View>
    </Animated.View>
    <View style={styles.message}>
      <Text style={styles.title}>Aurea Home</Text>
      <Text accessibilityLiveRegion="polite" style={styles.status}>{t(error??'Getting Home ready…')}</Text>
      {error&&<FocusButton id="loading-retry" group="header" label={t('Retry')} onPress={retry} style={styles.retry}>
        <Text style={styles.status}>{t('Retry')}</Text>
      </FocusButton>}
    </View>
  </View>;
}
const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#111522',justifyContent:'center',alignItems:'center'},
  layout:{...StyleSheet.absoluteFill},
  statusPlaceholder:{position:'absolute',top:'6%',right:'5%',width:'17%',height:34,borderRadius:20,backgroundColor:'#ffffff15'},
  dock:{position:'absolute',bottom:'7%',left:'5%',right:'5%',height:'17%',flexDirection:'row',gap:12},
  tile:{flex:1,borderRadius:16,backgroundColor:'#ffffff18'},
  message:{alignItems:'center',gap:12,padding:22},
  title:{color:'#fff',fontSize:34,fontWeight:'600'},
  status:{color:'#cbd3e2',fontSize:16,textAlign:'center'},
  retry:{minWidth:100,minHeight:48,borderRadius:14,backgroundColor:'#ffffff18'},
});
