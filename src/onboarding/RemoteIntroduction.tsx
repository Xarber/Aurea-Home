// SPDX-License-Identifier: AGPL-3.0-only
import React, {useEffect, useState} from 'react';
import {Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeIn, ReduceMotion} from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Icon} from '../components/Icon';
import type {IconName} from '../model/catalog';

import {currentRelease} from '../releases/history';
import {acknowledgeRelease} from '../releases/useReleaseAnnouncement';

export const remoteIntroductionKey = 'aurea.remote.introduction.completed';
const steps = [
  {icon: 'tv', title: 'Pair your television', description: 'Open Remote on your TV. Use the pairing link and code shown there to connect on the same trusted Wi-Fi network.'},
  {icon: 'remote', title: 'Control what’s on', description: 'Use the remote, open apps, and switch inputs. Pair System Controls separately to navigate inside Android TV apps.'},
] as const satisfies readonly {icon: IconName; title: string; description: string}[];

export function useRemoteIntroduction() {
  const [visible, setVisible] = useState(false);
  const supported = Platform.OS === 'ios' || (Platform.OS === 'android' && !Platform.isTV);
  useEffect(() => {
    if (!supported) return;
    let current = true;
    void SecureStore.getItemAsync(remoteIntroductionKey).then(value => {
      if (current && value !== '1') setVisible(true);
    }).catch(() => { /* Settings still offers the introduction when storage is unavailable. */ });
    return () => {current = false;};
  }, [supported]);

  return {
    supported,
    visible,
    replay: () => setVisible(true),
    finish: () => {
      setVisible(false);
      void SecureStore.setItemAsync(remoteIntroductionKey, '1').catch(() => {});
      void acknowledgeRelease(currentRelease.version).catch(() => {});
    },
  };
}

export function RemoteIntroduction({finish}: {finish: () => void}) {
  const [index, setIndex] = useState<0 | 1>(0);
  const step = steps[index];
  const last = index === steps.length - 1;

  return <Modal visible onRequestClose={finish} animationType="none">
    <SafeAreaView style={styles.screen} accessibilityViewIsModal>
      <View style={styles.header}>
        <Image source={require('../../public/branding/icon-180.png')} style={styles.logo} accessibilityLabel="Aurea Remote"/>
        <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel="Skip introduction" style={styles.skip}>
          <Text style={styles.secondaryText}>Skip</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View key={index} entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)} style={styles.content}>
          <View style={styles.symbol} accessible={false}><Icon name={step.icon} size={42}/></View>
          <Text accessibilityLiveRegion="polite" style={styles.progress}>Step {index + 1} of {steps.length}</Text>
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>
        </Animated.View>
      <View style={styles.actions}>
        {index > 0 && <Pressable onPress={() => setIndex(0)} accessibilityRole="button" style={styles.button}>
          <Text style={styles.secondaryText}>Back</Text>
        </Pressable>}
        <Pressable onPress={last ? finish : () => setIndex(1)} accessibilityRole="button" style={[styles.button, styles.primary]}>
          <Text style={styles.primaryText}>{last ? 'Get Started' : 'Continue'}</Text>
        </Pressable>
      </View>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:'#111625',paddingHorizontal:24},
  header:{alignSelf:'center',width:'100%',maxWidth:560,minHeight:64,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  logo:{width:46,height:46,borderRadius:12},
  skip:{minWidth:64,minHeight:44,paddingHorizontal:10,borderRadius:22,backgroundColor:'#252d42',alignItems:'center',justifyContent:'center'},
  scroll:{flexGrow:1,justifyContent:'center',alignItems:'center',paddingVertical:20},
  content:{width:'100%',maxWidth:480,alignItems:'center',gap:14},
  symbol:{width:80,height:80,borderRadius:26,backgroundColor:'#28334f',alignItems:'center',justifyContent:'center'},
  progress:{fontSize:14,color:'#b9c8e2',fontWeight:'600'},
  title:{fontSize:34,fontWeight:'700',color:'#f5f7ff',textAlign:'center'},
  description:{fontSize:17,lineHeight:26,color:'#dce4f7',textAlign:'center'},
  actions:{alignSelf:'center',width:'100%',maxWidth:480,gap:8,paddingVertical:12,flexDirection:'row'},
  button:{flex:1,minHeight:48,padding:12,alignItems:'center',justifyContent:'center',borderRadius:16,backgroundColor:'#252d42'},
  primary:{backgroundColor:'#dce4ff'},
  secondaryText:{fontSize:16,fontWeight:'600',color:'#f5f7ff',textAlign:'center'},
  primaryText:{fontSize:16,fontWeight:'700',color:'#151b31',textAlign:'center'},
});
