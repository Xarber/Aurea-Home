// SPDX-License-Identifier: AGPL-3.0-only
import React from 'react';
import {Text, View} from 'react-native';
import {releases, releaseChanges, releaseFor, type Release} from '../releases/history';
import type {IconName} from '../model/catalog';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';

const icons: Record<string, IconName> = {
  remote:'remote', inputs:'inputs', apps:'apps', controls:'settings', airplay:'airplay',
  sound:'volume', code:'code', history:'info', transfer:'apps', shield:'check',
};

export function SharedChangelog({group='phone-modal', version, announcement, since, language='en', onVersion}: {
  group?:string;
  version?:string;
  announcement?:Release;
  since?:string;
  language?:'en'|'it';
  onVersion?:(version:string)=>void;
}) {
  const selected = releaseFor(version);
  const entries = announcement ? [announcement] : selected ? [selected] : version ? [] : releases;
  const archive = !version && !announcement;
  return <View style={{gap:22,paddingBottom:12}}>
    {version && !selected && <Text style={{color:'#c4cede'}}>Release notes unavailable.</Text>}
    {archive && <Text accessibilityRole="header" style={{color:'#fff',fontSize:20,fontWeight:'700'}}>
      {language==='it'?'Cronologia delle versioni':'Release history'}
    </Text>}
    {entries.map(release=>{
      const publication = release.publications?.[0];
      const status = publication
        ? publication.channel === 'stable' ? (language==='it'?'Stabile':'Stable') : 'Beta'
        : release.record === 'development' ? (language==='it'?'Sviluppo':'Development')
          : (language==='it'?'Cronologia ricostruita':'Reconstructed history');
      return <View key={release.version} style={{gap:10,padding:12,borderRadius:14,backgroundColor:'#ffffff09'}}>
        <Text accessibilityRole="header" style={{color:'#fff',fontSize:19,fontWeight:'700'}}>
          {release.version} · {publication?.date ?? release.date} · {status}
        </Text>
        {releaseChanges(release,!!selected,since).map((row,index)=>
          <View key={index} style={{flexDirection:'row',gap:10}}>
            <Icon name={icons[row.icon] ?? 'info'} size={20}/>
            <View style={{flex:1,gap:2}}>
              <Text style={{color:'#fff',fontWeight:'600'}}>{row.label[language]}</Text>
              <Text style={{color:'#c4cede',lineHeight:20}}>{row.detail[language]}</Text>
            </View>
          </View>
        )}
        {selected && <Text style={{color:'#c4cede'}}>{release.compatibility[language]}</Text>}
        {(archive || !!announcement) && onVersion && <FocusButton id={'release-'+release.version}
          group={group} label={(language==='it'?'Registro completo':'Full changelog')+' '+release.version}
          style={{alignItems:'flex-start',justifyContent:'center',minHeight:44}}
          onPress={()=>onVersion(release.version)}>
          <Text style={{color:'#dce4ff',fontWeight:'600'}}>{language==='it'?'Registro completo':'Full changelog'}</Text>
        </FocusButton>}
      </View>;
    })}
  </View>;
}
