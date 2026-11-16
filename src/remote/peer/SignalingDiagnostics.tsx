// SPDX-License-Identifier: AGPL-3.0-only
import React, {useRef, useState} from 'react';
import {Text, TextInput, View} from 'react-native';
import {FocusButton} from '../../components/FocusButton';
import {Icon} from '../../components/Icon';
import {usePeerPresets} from './usePeerPresets';
import {configuredPeerEndpoint, parsePeerEndpoint, probePeerEndpoint} from './config';

export function SignalingDiagnostics({active, change}: {active?: string; change: (endpoint?: string) => void}) {
  const [endpoint, setEndpoint] = useState(active ?? configuredPeerEndpoint);
  const [verified, setVerified] = useState<string>();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const testing = useRef(false);
  const {presets, ready, saving, unavailable, update} = usePeerPresets();
  const [selectedPreset, setSelectedPreset] = useState<string>();
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
  function edit(value: string, preset?: string) {
    setEndpoint(value);
    setSelectedPreset(preset);
    setVerified(undefined);
    setStatus('');
  }
  async function store(next?: string) {
    const stored = await update(previous => {
      const other = previous.filter(value => value !== selectedPreset && value !== next);
      return next ? [next, ...other] : other;
    });
    if (stored) setSelectedPreset(next);
    setStatus(stored ? next ? 'Server preset saved.' : 'Server preset removed.' : 'Couldn’t save this change. Up to eight presets can be saved.');
  }
  return <View style={{gap:12,paddingVertical:12}}>
    <Text style={detail}>{active ? 'Developer server active' : 'Deployment default'}</Text>
    <Text style={detail} selectable>{active ?? configuredPeerEndpoint}</Text>
    <Text style={detail}>Tests leave your active connection and paired TV credentials untouched.</Text>
    {presets.length>0 && <Text style={detail}>Saved servers</Text>}
    {presets.map((preset,index) => <FocusButton key={preset} id={'signaling-preset-'+index} group="phone-modal" label={preset}
      disabled={busy||saving} onPress={()=>edit(preset,preset)} style={{minHeight:44,justifyContent:'center'}}>
      <Text style={detail}>{preset}</Text>
    </FocusButton>)}
    <TextInput accessibilityLabel="Signaling endpoint" value={endpoint} onChangeText={value=>edit(value,selectedPreset)} editable={!busy&&!saving}
      autoCapitalize="none" autoCorrect={false} keyboardType="url" style={{...detail,borderColor:'#66728d',borderWidth:1,borderRadius:12,padding:12}}/>
    <FocusButton id="test-signaling" group="phone-modal" label="Test connection" disabled={busy||saving}
      onPress={()=>void test()} style={{flexDirection:'row',gap:10,alignItems:'center',minHeight:44,paddingHorizontal:12}}>
      <Icon name="wifi" size={20}/><Text style={detail}>Test connection</Text>
    </FocusButton>
    <Text accessibilityLiveRegion="polite" style={detail}>{status}</Text>
    {unavailable && <Text style={detail}>Saved server presets are unavailable.</Text>}
    {verified && ready && !unavailable && verified!==configuredPeerEndpoint && <FocusButton
      id="save-signaling" group="phone-modal" label="Save preset" disabled={saving}
      onPress={()=>void store(verified)} style={{minHeight:44,justifyContent:'center'}}>
      <Text style={detail}>Save preset</Text>
    </FocusButton>}
    {selectedPreset && <FocusButton id="remove-signaling" group="phone-modal" label="Remove preset"
      disabled={busy||saving} onPress={()=>void store()} style={{minHeight:44,justifyContent:'center'}}>
      <Text style={detail}>Remove preset</Text>
    </FocusButton>}
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
