// SPDX-License-Identifier: AGPL-3.0-only
import React from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TVHomeDemo, { NativeTVHome } from './TVHome';
import {mobileRemoteBuild} from './src/platform/native/tv';
import {WebEntry} from './src/web/Landing';
import PhoneRemoteApp from './src/remote/PhoneRemoteApp';
export default function App() {
  const web = Platform.OS === 'web';
  const params = web ? new URLSearchParams(location.search) : undefined;
  const tvHosted = web && !!document.querySelector('meta[name="aurea-remote"]');
  const phone = !web || tvHosted || (params?.get('remote') === '1' || params?.has('changelog')) || web&&location.hostname==='aurea.xcenter.it'&&params?.get('demo')!=='1';
  const preview = web && !tvHosted && params?.get('preview') === '1';
  const publicEntry = web && !tvHosted && location.pathname === '/' && !location.search &&
    (!location.hash || location.hash === '#welcome') && location.hostname === 'aurea.xcenter.it';
  return (
    <SafeAreaProvider>
      {publicEntry ? <WebEntry><PhoneRemoteApp /></WebEntry> : Platform.isTV&&!mobileRemoteBuild ? (
        <NativeTVHome />
      ) : phone ? (
        <PhoneRemoteApp preview={preview} />
      ) : (
        <TVHomeDemo />
      )}
    </SafeAreaProvider>
  );
}
