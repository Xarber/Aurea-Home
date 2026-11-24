// SPDX-License-Identifier: AGPL-3.0-only
import React,{useRef} from 'react';
import {Platform,TextInput,View,type TextInputProps} from 'react-native';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';

/** The TV's custom D-pad graph needs a focusable action to enter a native text field. */
export function TVTextInput({id,t,...props}:TextInputProps&{id:string;t:(label:string)=>string}) {
  const input=useRef<React.ComponentRef<typeof TextInput>>(null);
  if(!Platform.isTV)return <TextInput {...props}/>;
  return <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
    <TextInput ref={input} {...props} style={[props.style,{flex:1}]}/>
    <FocusButton id={id} group="modal" label={t('Edit')+' · '+(props.accessibilityLabel??props.placeholder??'')}
      onPress={()=>input.current?.focus()} style={{minHeight:48,minWidth:48}}><Icon name="code" size={22}/></FocusButton>
  </View>;
}
