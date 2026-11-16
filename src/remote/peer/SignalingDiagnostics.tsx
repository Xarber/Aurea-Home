// SPDX-License-Identifier: AGPL-3.0-only
import React, {useRef, useState} from 'react';
import {Text, TextInput, View} from 'react-native';
import {FocusButton} from '../../components/FocusButton';
import {Icon} from '../../components/Icon';
import {configuredPeerEndpoint, parsePeerEndpoint, probePeerEndpoint} from './config';

export function SignalingDiagnostics({active, change}: {active?: string; change: (endpoint?: string) => void}) {
  const [endpoint, setEndpoint] = useState(active ?? configuredPeerEndpoint);
  const [verified, setVerified] = useState<string>();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const testing = useRef(false);
  const test = async () => {
    if (testing.current) return;
    let candidate: string;
    try {
      candidate = parsePeerEndpoint(endpoint).endpoint;
    } catch {
      setStatus('Enter an HTTPS address with a server path and no credentials.');
      return;
    }
    testing.current = true;
    setBusy(true);
    setVerified(undefined);
    setStatus('Contacting the signaling server…');
    try {
      await probePeerEndpoint(candidate);
      setVerified(candidate);
      setStatus('The signaling server responded.');
    } catch {
      setStatus('Couldn’t verify this signaling server.');
    } finally {
      testing.current = false;
      setBusy(false);
    }
  };
  const detail = {color:'#dce4f7',fontSize:15};
  return <View style={{gap:12,paddingVertical:12}}>
    <Text style={detail}>{active ? 'Developer server active' : 'Deployment default'}</Text>
    <Text style={detail} selectable>{active ?? configuredPeerEndpoint}</Text>
    <Text style={detail}>Tests leave your active connection and paired TV credentials untouched.</Text>
    <TextInput accessibilityLabel="Signaling endpoint" value={endpoint} onChangeText={value=>{setEndpoint(value);setVerified(undefined);setStatus('');}} editable={!busy}
      autoCapitalize="none" autoCorrect={false} keyboardType="url" style={{...detail,borderColor:'#66728d',borderWidth:1,borderRadius:12,padding:12}}/>
    <FocusButton id="test-signaling" group="phone-modal" label="Test connection" disabled={busy}
      onPress={()=>void test()} style={{flexDirection:'row',gap:10,alignItems:'center',minHeight:44,paddingHorizontal:12}}>
      <Icon name="wifi" size={20}/><Text style={detail}>Test connection</Text>
    </FocusButton>
    <Text accessibilityLiveRegion="polite" style={detail}>{status}</Text>
    {verified && verified!==active && verified!==configuredPeerEndpoint && <>
      <Text style={detail}>Switching ends this connection. You’ll need to pair again in a temporary developer session.</Text>
      <FocusButton id="switch-signaling" group="phone-modal" label="Switch server"
        onPress={()=>change(verified)} style={{minHeight:44,justifyContent:'center'}}>
        <Text style={detail}>Switch server</Text>
      </FocusButton>
    </>}
    {active && <FocusButton id="reset-signaling" group="phone-modal" label="Restore default server"
      onPress={()=>change()} style={{minHeight:44,justifyContent:'center'}}>
      <Text style={detail}>Restore default server</Text>
    </FocusButton>}
  </View>;
}
