// SPDX-License-Identifier: AGPL-3.0-only
import type {RemoteView} from '../remoteNavigation';

export type Layout = {view:RemoteView; touchpad:boolean};
export function AccountSettings(_props: {layout:Layout; restore:(layout:Layout)=>void}) {
  return null;
}
