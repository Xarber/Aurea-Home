// SPDX-License-Identifier: AGPL-3.0-only
import type {View} from 'react-native';
export const canCaptureSample = false;
export async function shareSampleScreenshot(_target: React.RefObject<React.ComponentRef<typeof View> | null>) {
  throw new Error('Native screenshot capture is unavailable.');
}
