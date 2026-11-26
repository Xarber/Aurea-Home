// SPDX-License-Identifier: AGPL-3.0-only
// Adapted from X-Center ID SDK packages/expo/account-overview.tsx at 0a03c747.
import { useState, type ReactNode } from 'react';
import { Image, Linking, StyleSheet, Text, View, useColorScheme } from 'react-native';
import {FocusButton} from '../../components/FocusButton';

type OverviewProps = {
  profile: {name: string} | null;
  group: 'phone-modal' | 'modal';
  onSignIn?: () => void;
  onSignOut?: () => void;
  settings?: ReactNode;
  busy?: boolean;
  t?: (label: string) => string;
};

const palettes = {
  light:{hero:'#e7efff', panel:'#ffffff', ink:'#142438', muted:'#526078', accent:'#174eaa', line:'#dbe3ef'},
  dark:{hero:'#243657', panel:'#192433', ink:'#f4f7ff', muted:'#bbc9df', accent:'#b9d0ff', line:'#435676'},
};

export function AccountOverview({profile,group,onSignIn,onSignOut,settings,busy=false,t=(label)=>label}:OverviewProps) {
  const palette=useColorScheme()==='dark'?palettes.dark:palettes.light;
  const [details,setDetails]=useState(false);
  const action=(id:string,label:string,press:()=>void,destructive=false)=><FocusButton id={'xid-'+id} group={group}
    label={t(label)} disabled={busy} onPress={press} style={[styles.action,{backgroundColor:palette.panel,borderColor:palette.line}]} >
    <Text style={[styles.actionLabel,{color:destructive?(palette===palettes.dark?'#ffadad':'#a42635'):palette.accent}]}>{t(label)}</Text>
  </FocusButton>;
  const brand=<View style={styles.brand}>
    <Image source={require('./assets/xcenter-id-mark.png')} accessible={false} style={styles.mark}/>
    <Text style={[styles.actionLabel,{color:palette.accent}]}>X-Center ID</Text>
  </View>;
  return <View style={styles.overview}>
    <View style={[styles.hero,{backgroundColor:palette.hero}]}>
      {brand}
      {profile?<View style={styles.identity}>
        <View accessible={false} style={[styles.avatar,styles.avatarFallback,{backgroundColor:palette.panel}]}>
          <Text style={[styles.initial,{color:palette.accent}]}>{Array.from(profile.name.trim())[0]?.toLocaleUpperCase()??'?'}</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.name,styles.identityText,{color:palette.ink}]}>{profile.name}</Text>
      </View>:<Text accessibilityRole="header" style={[styles.name,{color:palette.ink}]}>{t('Sign in or create an account')}</Text>}
      {profile?action('manage',details?'Close account details':'Manage account & data',()=>setDetails(!details)):
        onSignIn&&action('signin',busy?'Opening sign-in…':'Continue with X-Center ID',onSignIn)}
    </View>
    {profile&&details&&<View style={styles.settings}>
      {action('dashboard','Open dashboard',()=>{void Linking.openURL('https://id.xcenter.it/dashboard').catch(()=>{});})}
      {onSignOut&&action('sign-out','Sign out of Aurea',onSignOut,true)}
      {settings}
    </View>}
  </View>;
}

const styles=StyleSheet.create({
  overview:{gap:20},
  sheet:{padding:20,gap:16},
  hero:{borderRadius:22,padding:18,gap:13},
  brand:{flexDirection:'row',alignItems:'center',gap:8},
  mark:{width:28,height:24,resizeMode:'contain'},
  identity:{flexDirection:'row',alignItems:'center',gap:13},
  identityText:{flex:1,minWidth:0,gap:3},
  avatar:{width:58,height:58,borderRadius:29},
  avatarFallback:{alignItems:'center',justifyContent:'center'},
  initial:{fontSize:21,fontWeight:'700'},
  name:{fontSize:23,fontWeight:'800'},
  heading:{fontSize:18,fontWeight:'700'},
  badges:{flexDirection:'row',gap:6,flexWrap:'wrap'},
  badge:{borderRadius:20,overflow:'hidden',paddingHorizontal:9,paddingVertical:4,fontSize:13,fontWeight:'600'},
  action:{alignSelf:'flex-start',minHeight:46,paddingVertical:9,paddingHorizontal:13,borderRadius:11,borderWidth:1,justifyContent:'center'},
  actionLabel:{fontSize:15,fontWeight:'600'},
  settings:{gap:10},
  option:{minHeight:56,padding:12,borderRadius:14,borderWidth:1,flexDirection:'row',alignItems:'center',gap:12},
});
