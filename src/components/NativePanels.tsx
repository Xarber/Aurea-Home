import {SharedChangelog} from './SharedChangelog';
import {releaseFor} from '../releases/history';
import {TVAccountSettings} from '../remote/account/TVAccountSettings';
import {useTVHousehold} from '../remote/account/tvHousehold';
import {ReceiverControls} from './ReceiverControls';
// SPDX-License-Identifier: AGPL-3.0-only
import {IdeasPage} from '../developer/ideas/IdeasPage';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, TextInput, StyleSheet } from 'react-native';
import { AnchoredPanel, type Anchor } from './AnchoredPanel';
import { FocusButton } from './FocusButton';
import { FadedScroll } from './FadedScroll';
import { Icon } from './Icon';
import {HouseholdWidgetSettings} from './HouseholdWidgetSettings';
import {ProfileFolderSettings} from './ProfileFolderSettings';
import {PlexSettings} from './PlexSettings';
import {WatchNextSettings} from './WatchNextSettings';
import {AndroidMediaSettings} from './AndroidMediaSettings';
import {HomeAssistantSettings} from './HomeAssistantSettings';
import {SmartHomeSettings} from './SmartHomeSettings';
import {idleDelays} from '../model/idle-display';
import {WallpaperVideoSettings} from './WallpaperVideoSettings';
import {PhotoWallpaperSettings} from './PhotoWallpaperSettings';
import {WallpaperScheduleSettings} from './WallpaperScheduleSettings';
import {WallpaperWeatherSettings} from './WallpaperWeatherSettings';
import { Wallpaper } from './Wallpaper';
import { wallpapers, type IconName } from '../model/catalog';
import { PhonePlayer } from '../remote/PhonePlayer';
import { NativeWaveform } from './NativeWaveform';
import { NativeReleaseHistory, ReadableDetails } from './NativeReleaseHistory';
import { NativePairing } from './NativePairing';
import type { Launcher } from '../launcher/types';
import { useDeveloperAccess } from '../hooks/useDeveloperAccess';
import {tv} from '../platform/native/tv';
import { nativeFocus } from '../platform/native/focus';
export function NativePanels({
  demo,
  t,
  launch,
  musicAnchor,
  settingsAnchor,
}: {
  demo: Launcher;
  t: (s: string) => string;
  launch: (id: string) => void;
  musicAnchor: Anchor;
  settingsAnchor: Anchor;
}) {
  const {household,setHousehold}=useTVHousehold(demo.ready,process.env.EXPO_PUBLIC_AUREA_ACCOUNTS_ENABLED==='1');
  const [retained, setRetained] = useState<string | null>(null),
    [remote, setRemote] = useState<Record<string, unknown>>({}),
    [details, setDetails] = useState('');
  const previousPanel = React.useRef<string|null>(null);
  useEffect(()=>{
    if(previousPanel.current==='whatsnew' && demo.panel!=='whatsnew') {
      void demo.execute('releaseSeen').catch(()=>{});
    }
    if(previousPanel.current?.startsWith('introduction') && !demo.panel?.startsWith('introduction')) {
      void demo.execute('introductionSeen').catch(()=>{});
    }
    previousPanel.current=demo.panel;
  },[demo.panel,demo.execute]);
  const access = useDeveloperAccess(demo.page),
    developer = access.enabled,
    revealed = access.revealed;
  useEffect(()=>{if(!developer&&(demo.panel==='developer'||demo.panel==='diagnostics'||demo.panel==='ideas'))demo.setPanel('control');},[developer,demo.panel]);
  const panel = demo.panel ?? retained,
    snapshot = demo.snapshot;
  useEffect(() => {
    if (demo.panel) {
      setRetained(demo.panel);
      return;
    }
    const timer = setTimeout(() => setRetained(null), 300);
    return () => clearTimeout(timer);
  }, [demo.panel]);
  useEffect(() => {
    if (demo.panel !== 'remote') {
      setRemote({});
      return;
    }
    let active = true;
    void demo
      .execute('remote')
      .then((value) => {
        if (active) setRemote(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [demo.panel]);
  useEffect(()=>{if(demo.panel!=='remote')return;return tv.subscribe(event=>{if(event.type==='pair-request'&&typeof event.payload.pin==='string'&&/^\d{6}$/.test(event.payload.pin))setRemote(previous=>({...previous,pin:event.payload.pin}));});},[demo.panel]);
  if (!panel || !snapshot) return null;
  const action = (operation: string, payload: Record<string, unknown> = {}) => {
    void demo.execute(operation, payload).catch(() => {});
  };
  const row = (
    label: string,
    icon: IconName,
    click: () => void,
    value?: string,
    identity=label,
  ) => (
    <FocusButton
      key={identity}
      id={'native-' + identity}
      group="modal"
      label={t(label)}
      onPress={click}
      style={[s.row,panel==='control'&&{minHeight:60,padding:15}]}
    >
      <Icon name={icon} size={panel==='control'?24:21} />
      <Text style={[s.label,panel==='control'&&{fontSize:17}]}>{t(label)}</Text>
      {value !== undefined && <Text style={s.value}>{t(value)}</Text>}
    </FocusButton>
  );
  const text = (value: string) => (
    <Text selectable style={s.description}>
      {t(value)}
    </Text>
  );
  const id = panel.includes(':') ? panel.slice(panel.indexOf(':') + 1) : '';
  const app = demo.entry(id);
  const titles: Record<string, string> = {
    control: 'Control Center',
    introduction: 'Welcome to Aurea Home',
    introductionControls: 'Explore Aurea Home',
    whatsnew: 'What’s New',
    wallpapers: 'Wallpapers',
    network: 'Network',
    remote: 'Remote',
    sound: 'Sound',
    airplay: 'AirPlay',
    about: 'About Aurea Home',
    account: 'Household profiles',
    automations: 'Smart home',
    homeAssistant: 'Home Assistant controls',
    watchNext: 'Keep Watching',
    androidMedia: 'Android media',
    plex: 'Plex Continue Watching',
    layout: 'Home layout',
    folders: 'App folders',
    widgets: 'Household widgets',
    changelog: 'Changelog',
    developer: 'Developer settings',ideas:'Ideas',
    profiles: 'Input appearance',
    pair: 'Paired AirPlay device',
    input: 'Choose HDMI input',
    notes: 'Release notes',
  };
  const folder=panel.startsWith('folder:')?demo.prefs.folders?.find(value=>value.id===id):undefined;
  const title = folder?.name??(panel.startsWith('folder-app:')?'Add to folder':panel?.startsWith('release:') ? 'Full changelog' : id
    ? panel.startsWith('pin:')
      ? 'Choose a slot'
      : app.name
    : (titles[panel] ?? panel));
  const updates = snapshot.updates;
  const candidate = updates.candidate as Record<string, unknown> | undefined;
  const music = snapshot.music;
  const versionTap = access.tap;
  const info = (operation: string, next: string) => {
    void demo
      .execute(operation)
      .then((value) => {
        setDetails(
          typeof value.text === 'string'
            ? value.text
            : JSON.stringify(value, null, 2),
        );
        demo.setPanel(next);
      })
      .catch(() => {});
  };
  if (panel === 'introduction' || panel === 'introductionControls') {
    const firstStep = panel==='introduction';
    return <View accessibilityViewIsModal style={[StyleSheet.absoluteFill,{backgroundColor:'#111625',padding:'5%',zIndex:10}]}>
      <FadedScroll>
        <View style={{alignSelf:'center',width:'100%',maxWidth:720,gap:16}}>
          <Image source={require('../../public/branding/icon-180.png')} style={{width:64,height:64,borderRadius:16}}
            accessibilityLabel="Aurea Home"/>
          <Text accessibilityLiveRegion="polite" style={{color:'#c4cede'}}>{t(firstStep?'Step 1 of 2':'Step 2 of 2')}</Text>
          <Text accessibilityRole="header" style={s.title}>{t(firstStep?'Welcome to Aurea Home':'Explore Aurea Home')}</Text>
          <Icon name={firstStep?'apps':'remote'} size={40}/>
          {text(firstStep
            ? 'Use the dock to open your favorite apps. Press down to see inputs, then press down again for the app library.'
            : 'Hold OK for an app’s options. Hold Back to open Control Center and connect your phone remote.')}
          {!firstStep && row('Back','back',demo.back)}
          {firstStep ? row('Continue','apps',()=>demo.setPanel('introductionControls')) : row('Get Started','check',demo.close)}
          {row('Skip introduction','close',demo.close)}
        </View>
      </FadedScroll>
    </View>;
  }
  return (
    <AnchoredPanel
      kind={panel === 'music' ? 'music' : 'settings'}
      anchor={panel === 'music' ? musicAnchor : settingsAnchor}
      visible={!!demo.panel}
      close={demo.close}
      preferredWidth={panel==='control'?470:undefined}
    >
      {panel !== 'music' && (
        <View style={s.header}>
          <Text style={s.title}>{t(title)}</Text>
          <FocusButton
            id="panel-close"
            group="modal"
            label={t(demo.canGoBack?'Back':'Close')}
            onPress={demo.canGoBack?demo.back:demo.close}
          >
            <Icon name={demo.canGoBack?"back":"close"} size={20} />
          </FocusButton>
        </View>
      )}
      <FadedScroll key={panel}>
        {panel === 'music' && (
          <PhonePlayer
            t={t}
            music={music}
            artwork={demo.artwork}
            connected={music.active}
            group="modal"
            prefix="music"
            waveform={
              <NativeWaveform
                playing={!!music.playing}
                source={music.source}
                colors={music.colors}
              />
            }
            action={(key, value) =>
              action('media', {
                source: music.source,
                action: key,
                ...(value === undefined ? {} : { value }),
              })
            }
          />
        )}
        {panel === 'control' && (
          <>
            {row(
              'Network',
              'wifi',
              () => demo.setPanel('network'),
              snapshot.network.title || snapshot.network.transport,
            )}
            {row('Inputs', 'inputs', () => {
              demo.close();
              demo.setPage(1);
              setTimeout(
                () =>
                  nativeFocus.focus(
                    'input:' +
                      demo.catalog.find((a) => a.category === 'inputs')?.id,
                  ),
                320,
              );
            })}
            {row('Display', 'sun', () =>
              action('settings', { screen: 'display' }),
            )}
            {row(
              'Sound',
              'volume',
              () => demo.setPanel('sound'),
              snapshot.volume + '%',
            )}
            {row('AirPlay', 'airplay', () => demo.setPanel('airplay'))}
            {row(
              'Remote',
              'remote',
              () => demo.setPanel('remote'),
              demo.remote ? 'Connected' : undefined,
            )}
            {row('Keep Watching','film',()=>demo.setPanel('watchNext'))}
            {(demo.prefs.householdProfile??'home')==='home'&&row('Android media','music',()=>demo.setPanel('androidMedia'))}
            {row('Household profiles','home',()=>demo.setPanel('account'))}
            {row('Household widgets','sun',()=>demo.setPanel('widgets'))}
            {row('Home layout','apps',()=>demo.setPanel('layout'))}
            {(demo.prefs.householdProfile??'home')==='home'&&row('Smart home','home',()=>demo.setPanel('automations'))}
            {row('Wallpapers', 'wallpaper', () => demo.setPanel('wallpapers'))}
            {row('Disable blur','sun',()=>demo.change({blur:demo.prefs.blur===false}),demo.prefs.blur===false?'On':'Off')}
            {row(
              'Activity background',
              'apps',
              () => demo.change({ glass: !demo.prefs.glass }),
              demo.prefs.glass ? 'Black' : 'Clear',
            )}
            {row(
              'Language',
              'tv',
              () =>
                demo.change({
                  language: demo.prefs.language === 'it' ? 'en' : 'it',
                }),
              demo.prefs.language === 'it' ? 'Italiano' : 'English',
            )}
            {developer &&
              row('Developer settings', 'code', () =>
                demo.setPanel('developer'),
              )}
            {row('About Aurea Home', 'info', () => demo.setPanel('about'))}
            {row('TV settings', 'settings', () =>
              action('settings', { screen: 'system' }),
            )}
          </>
        )}
        {panel === 'network' && (
          <>
            {text(
              snapshot.network.title ||
                t(snapshot.network.connected ? 'Connected' : 'Offline'),
            )}
            {snapshot.network.transport==='wifi'&&!snapshot.network.title&&<>
 {text('Android requires location permission and enabled location services to display the Wi-Fi name.')}
 {!snapshot.network.namePermissionGranted&&row('Show Wi-Fi name','wifi',()=>action('wifiName'))}
 {snapshot.network.namePermissionGranted&&!snapshot.network.locationEnabled&&row('Location settings','settings',()=>action('settings',{screen:'location'}))}
 </>}
 {row('Network settings', 'wifi', () =>
              action('settings', { screen: 'network' }),
            )}
          </>
        )}
        {panel === 'sound' && (
          <>
            {row(
              'Volume −',
              'volume',
              () => demo.setVolume((v) => Math.max(0, v - 5)),
              snapshot.volume + '%',
            )}
            {row(
              'Volume +',
              'volume',
              () => demo.setVolume((v) => Math.min(100, v + 5)),
              snapshot.volume + '%',
            )}
            {row('Sound settings', 'settings', () =>
              action('settings', { screen: 'sound' }),
            )}
          </>
        )}
        {panel === 'remote' && (
          <>
            {row('Connect from aurea.xcenter.it','remote',()=>{void demo.execute('hostedRemote').then(value=>setRemote(previous=>({...previous,url:value.url,qr:value.qr,hostedUrl:value.url,hostedReady:value.ready})));})}
            {typeof remote.hostedUrl==='string'&&text('Open this link on your phone or computer. Enter the TV pairing code when requested. Both devices must allow a direct WebRTC connection.')}

            {row('Background Home & AirPlay', 'apps',()=>action('backgroundAccess'))}
            {remote.backgroundAccess===false&&text('Allow display over other apps to let Home and AirPlay return from the background.')}

            {typeof remote.qr === 'string' && (
              <Image
                source={{ uri: remote.qr }}
                style={{
                  height: 220,
                  width: 220,
                  alignSelf: 'center',
                  borderRadius: 16,
                  marginBottom: 16,
                }}
              />
            )}
            {typeof remote.url === 'string' && text(remote.url)}
            {typeof remote.pin === 'string' &&
              text(t('Pairing code') + ' · ' + remote.pin)}
            {row('Forget paired remotes', 'remote', () =>
              demo.setPanel('confirm-remotes'),
            )}
          </>
        )}
        {panel === 'confirm-remotes' && (
          <>
            {text('All paired remotes will need to pair again.')}
            {row('Forget paired remotes', 'remote', () => {
              action('revokeRemotes');
              demo.close();
            })}
          </>
        )}
        {panel === 'airplay' && (
          <>
            <ReceiverControls demo={demo} t={t} row={row}/>
            {row('Receiver settings', 'airplay', () =>
              action('settings', { screen: 'airplay' }),
            )}
            {row(
              'Paired AirPlay device',
              'remote',
              () => demo.setPanel('pair'),
              snapshot.paired.paired
                ? snapshot.paired.name
                : t('No paired device'),
            )}
          </>
        )}
        {panel === 'pair' && <NativePairing demo={demo} t={t} row={row} />}
        {panel === 'input' &&
          demo.catalog
            .filter((value) => value.kind === 'hdmi')
            .map((value) =>
              row(
                value.name,
                'inputs',
                () => {
                  action('pairedInput', { id: value.id });
                  demo.setPanel('pair');
                },
                snapshot.paired.input === value.id ? '✓' : undefined,
              ),
            )}
        {panel === 'wallpapers' && (
          <>
            <View style={s.gallery}>
              {wallpapers.map((w) => (
                <View key={w.id} style={{ width: '47%' }}>
                  <FocusButton
                    id={'native-wallpaper-' + w.id}
                    group="modal"
                    label={t(w.name)}
                    selected={w.id === demo.prefs.wallpaper}
                    onPress={() => demo.change({ wallpaper: w.id })}
                    style={{
                      height: 104,
                      width: '100%',
                      borderRadius: 15,
                      overflow: 'hidden',
                    }}
                  >
                    <Wallpaper id={w.id} mini />
                    {w.id === demo.prefs.wallpaper && (
                      <Icon name="check" size={22} />
                    )}
                  </FocusButton>
                  <Text style={s.description}>{t(w.name)}</Text>
                </View>
              ))}
            </View>
            {row('Idle display','sun',()=>{
              const next={off:'dim',dim:'clock',clock:'black',black:'off'} as const;
              demo.change({idleDisplay:next[demo.prefs.idleDisplay??'off']});
            },{off:'Off',dim:'Dim',clock:'Idle clock',black:'Black screen'}[demo.prefs.idleDisplay??'off'])}
            {demo.prefs.idleDisplay&&demo.prefs.idleDisplay!=='off'&&row('Idle after','sun',()=>{
              const index=idleDelays.findIndex(value=>value===(demo.prefs.idleDisplayMinutes??5));
              demo.change({idleDisplayMinutes:idleDelays[(index+1)%idleDelays.length]});
            },(demo.prefs.idleDisplayMinutes??5)+' '+t('min'))}
            {row('Wallpaper clock','sun',()=>{
              const next={off:'minimal',minimal:'stacked',stacked:'off'} as const;
              demo.change({wallpaperClock:next[demo.prefs.wallpaperClock??'off']});
            },{off:'Off',minimal:'Minimal',stacked:'Stacked'}[demo.prefs.wallpaperClock??'off'])}
            <PhotoWallpaperSettings key={demo.prefs.householdProfile??'home'} demo={demo} t={t}/>
            <WallpaperVideoSettings key={'video-'+(demo.prefs.householdProfile??'home')} demo={demo} t={t}/>
            <WallpaperScheduleSettings prefs={demo.prefs} change={demo.change} t={t}/>
            {(demo.prefs.wallpaper==='daylight'||demo.prefs.wallpaperScheduleEnabled)&&<WallpaperWeatherSettings city={demo.prefs.weatherCity}
              language={demo.prefs.language} t={t} change={weatherCity=>demo.change({weatherCity})}/>}
            {row('Music wallpaper tint','music',()=>demo.change({musicTint:!demo.prefs.musicTint}),demo.prefs.musicTint?'On':'Off')}
            {row(
              'Animated wallpapers',
              'wallpaper',
              () => demo.change({ motion: !demo.prefs.motion }),
              demo.prefs.motion ? 'On' : 'Off',
            )}
          </>
        )}
        {demo.panel&&(panel==='folders'||panel.startsWith('folder:')||panel.startsWith('folder-app:'))&&
          <ProfileFolderSettings key={panel} demo={demo} t={t} launch={launch} folderId={panel.startsWith('folder:')?id:undefined}
            assignApp={panel.startsWith('folder-app:')?id:undefined}/>}
        {panel==='layout'&&<>
          {row('App folders','apps',()=>demo.setPanel('folders'))}
          {row('Export library layout','apps',()=>action('exportProfileLayout',{profile:demo.prefs.householdProfile??'home'}))}
          {row('Import library layout','apps',()=>action('importProfileLayout',{profile:demo.prefs.householdProfile??'home'}))}
          {demo.prefs.canUndoLayoutImport===true&&row('Restore previous library layout','apps',()=>
            action('undoProfileLayout',{profile:demo.prefs.householdProfile??'home'}))}
          {row('Dock size','apps',()=>{
            const next={compact:'standard',standard:'large',large:'compact'} as const;
            demo.change({dockSize:next[demo.prefs.dockSize??'standard']});
          },{compact:'Compact',standard:'Standard',large:'Large'}[demo.prefs.dockSize??'standard'])}
          {row('Navigation sound','volume',()=>demo.change({navigationSound:!demo.prefs.navigationSound}),
            demo.prefs.navigationSound?'On':'Off')}
          {text('Open Aurea on')}
          {(['dock','inputs','apps'] as const).map((startFocus,index)=>row(
            ['Dock','Inputs','App library'][index]!,'apps',()=>demo.change({startFocus}),
            (demo.prefs.startFocus??'dock')===startFocus?'✓':undefined,
          ))}
          {text('Hidden apps')}
          {!demo.prefs.hiddenApps?.length&&text('No apps are hidden from the library.')}
          {demo.catalog.filter(item=>demo.prefs.hiddenApps?.includes(item.id)).map(item=>row(
            item.name,'apps',()=>action('hideLauncherApp',{id:item.id,hidden:false}),'Show in library','hidden-'+item.id,
          ))}
        </>}
        {panel==='watchNext'&&<>
          {(demo.prefs.householdProfile??'home')==='home'&&demo.panel==='watchNext'&&<WatchNextSettings demo={demo} t={t}/>}
          {row('Plex Continue Watching','film',()=>demo.setPanel('plex'))}
        </>}
        {demo.panel==='widgets'&&<HouseholdWidgetSettings key={demo.prefs.householdProfile??'home'} demo={demo} t={t}/>}
        {demo.panel==='plex'&&<PlexSettings key={demo.prefs.householdProfile??'home'} demo={demo} t={t}/>}
        {demo.panel==='automations'&&<>
          {(demo.prefs.householdProfile??'home')==='home'&&row('Home Assistant controls','home',()=>demo.setPanel('homeAssistant'))}
          <SmartHomeSettings demo={demo} t={t}/>
        </>}
        {demo.panel==='androidMedia'&&<AndroidMediaSettings demo={demo} t={t}/>}
        {demo.panel==='homeAssistant'&&<HomeAssistantSettings demo={demo} t={t}/>}
        {demo.panel==='account'&&(household?<TVAccountSettings key={household.active} demo={demo} household={household}
          setHousehold={setHousehold} t={t} accountsEnabled={process.env.EXPO_PUBLIC_AUREA_ACCOUNTS_ENABLED==='1'}/>:
          text('Household profiles are loading…'))}
        {panel === 'about' && (
          <>
            {row(
              snapshot.build.version + ' · ' + snapshot.build.code,
              'info',
              versionTap,
            )}
            {text(snapshot.build.commit + ' · ' + snapshot.build.channel)}
            {process.env.EXPO_PUBLIC_AUREA_ACCOUNTS_ENABLED==='1'&&row('X-Center ID','settings',()=>demo.setPanel('account'))}
            {row('Replay introduction', 'info', () => demo.setPanel('introduction'))}
            {revealed &&
              row(
                'Developer options',
                'code',
                access.toggle,
                developer ? 'On' : 'Off',
              )}
            {text(String(updates.status ?? ''))}
            {row('Check for Updates', 'info', () => action('checkUpdates'))}
            {row(
              'Automatic update checks',
              'check',
              () => action('updatePreference', { key: 'auto_check' }),
              updates.autoCheck ? 'On' : 'Off',
            )}
            {row(
              'Automatic downloads',
              'apps',
              () => action('updatePreference', { key: 'auto_download' }),
              updates.autoDownload ? 'On' : 'Off',
            )}
            {row(
              'Unmetered downloads only',
              'wifi',
              () => action('updatePreference', { key: 'unmetered' }),
              updates.unmeteredOnly ? 'On' : 'Off',
            )}
            {candidate && (
              <>
                <NativeReleaseHistory
                  releases={[candidate.release]}
                  language={demo.prefs.language}
                  compact
                />
                {row('Release notes', 'info', () => {
                  const version=String(candidate.version??'');
                  if(releaseFor(version)){demo.setPanel('release:'+version);return;}
                  setDetails(typeof candidate.notes==='string'?candidate.notes:'Release notes unavailable.');
                  demo.setPanel('notes');
                })}
                {row(
                  updates.ready ? 'Install update' : 'Update Now',
                  'apps',
                  () =>
                    action(updates.ready ? 'installUpdate' : 'downloadUpdate'),
                )}
              </>
            )}
            {Number(updates.total) > 0 &&
              text(
                Math.round(
                  (Number(updates.downloaded) / Number(updates.total)) * 100,
                ) + '%',
              )}
            {row('Changelog', 'info', () => demo.setPanel('changelog'))}
            {row('Export preferences', 'apps', () =>
              action('backupPreferences'),
            )}
            {row('Import preferences', 'apps', () =>
              action('importPreferences'),
            )}
          </>
        )}
        {(panel === 'notes' || panel === 'diagnostics') && (
          <ReadableDetails text={details} />
        )}
        {panel === 'changelog' && <SharedChangelog group="modal" language={demo.prefs.language}
          onVersion={version=>demo.setPanel('release:'+version)}/>}
        {panel?.startsWith('release:') && <SharedChangelog group="modal" language={demo.prefs.language}
          version={panel.slice(8)}/>}
        {panel === 'whatsnew' && <SharedChangelog group="modal" language={demo.prefs.language}
          announcement={releaseFor(snapshot?.build?.version)} since={snapshot?.lastSeenRelease}
          onVersion={version=>demo.setPanel('release:'+version)}/>}
        {panel === 'ideas' && developer && <IdeasPage onChangelog={version=>demo.setPanel('release:'+version)}/>}
        {panel === 'developer' && (
          <>
            {row('Ideas','apps',()=>demo.setPanel('ideas'))}
            {row('Developer changelog', 'code', () =>
              info('developerChangelog', 'diagnostics'),
            )}
            {row('Diagnostics', 'code', () =>
              info('diagnostics', 'diagnostics'),
            )}
            {row('Recovery Home', 'home', () => action('recovery'))}
          </>
        )}
        {panel.startsWith('menu:') && (
          <>
            {row('Launch', 'play', () => {
              demo.close();
              launch(id);
            })}
            {row('Pin to dock', 'apps', () => demo.setPanel('pin:' + id))}
            {id !== 'all' &&
              demo.prefs.dock.includes(id) &&
              row('Remove from dock', 'close', () => {
                demo.remove(id);
                demo.close();
              })}
            {app.kind === 'hdmi' &&
              row('Input appearance', 'inputs', () =>
                demo.setPanel('profile:' + id),
              )}
            {app.kind === 'app' && (
              <>
                {row('Add to folder','apps',()=>demo.setPanel('folder-app:'+id))}
                {row(demo.prefs.hiddenApps?.includes(id)?'Show in library':'Hide from library','apps',()=>{
                  action('hideLauncherApp',{id,hidden:!demo.prefs.hiddenApps?.includes(id)});
                  demo.close();
                })}
                {row('App info', 'info', () => action('appInfo', { id }))}
                {row('Uninstall', 'close', () => action('uninstall', { id }))}
              </>
            )}
          </>
        )}
        {panel.startsWith('pin:') &&
          demo.prefs.dock.map((key, index) =>
            id === 'all' && index !== 5
              ? null
              : row(`${index + 1} · ${demo.entry(key).name}`, 'apps', () => {
                  demo.pin(id, index);
                  demo.close();
                }),
          )}
        {panel.startsWith('profile:') &&
          [
            'generic',
            'nintendo',
            'gaming',
            'appletv',
            'nintendoswitch',
            'playstation',
            'xbox',
            'wiiu',
          ].map((profile) =>
            row(profile, 'inputs', () => {
              action('inputProfile', { id, profile });
              demo.close();
            }),
          )}
      </FadedScroll>
    </AnchoredPanel>
  );
}
const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  title: { color: '#fff', fontSize: 25, fontWeight: '600', flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 14,
    padding: 13,
    minHeight: 54,
    borderRadius: 15,
    marginBottom: 6,
    backgroundColor: '#ffffff08',
  },
  label: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '500' },
  value: { color: '#b9c3d2', fontSize: 12, flexShrink: 1, maxWidth: '42%' },
  description: {
    color: '#c2cad7',
    fontSize: 14,
    lineHeight: 23,
    marginBottom: 16,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
});
