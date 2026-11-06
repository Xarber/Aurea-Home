// SPDX-License-Identifier: AGPL-3.0-only
/** Lazy: the TV host uses its isolated WebView and deliberately excludes this native dependency. */
export function installPeerRuntime(){if(typeof globalThis.RTCPeerConnection==='undefined'){const {registerGlobals}=require('react-native-webrtc') as {registerGlobals():void};registerGlobals();}}
