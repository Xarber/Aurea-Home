// SPDX-License-Identifier: AGPL-3.0-only
import {Platform, type View} from 'react-native';
import {captureRef, releaseCapture} from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export const canCaptureSample = Platform.OS === 'ios' || Platform.OS === 'android';
export async function shareSampleScreenshot(target: React.RefObject<React.ComponentRef<typeof View> | null>) {
  if (!target.current) {
    throw new Error('Screenshot sharing is unavailable.');
  }
  const uri = await captureRef({current:target.current}, {format:'png', result:'tmpfile'});
  try {
    if (!await Sharing.isAvailableAsync()) throw new Error('Screenshot sharing is unavailable.');
    await Sharing.shareAsync(uri, {mimeType:'image/png', UTI:'public.png'});
  } finally {
    releaseCapture(uri);
  }
}
