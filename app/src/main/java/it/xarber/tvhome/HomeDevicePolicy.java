// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

final class HomeDevicePolicy {
    private HomeDevicePolicy() {}

    static boolean power(String action){
        return action.equals("turn_on")||action.equals("turn_off");
    }

    static boolean coverAction(String type,long features,String action){
        if(!type.equals("blind")&&!type.equals("shade")&&!type.equals("curtain")&&!type.equals("shutter"))return false;
        long required;
        switch(action){
            case "open_cover":required=1;break;
            case "close_cover":required=2;break;
            case "set_cover_position":required=4;break;
            case "stop_cover":required=8;break;
            default:return false;
        }
        return (features&required)!=0;
    }

    static int percentage(Object value,int minimum){
        if(!(value instanceof Integer)||(Integer)value<minimum||(Integer)value>100)
            throw new IllegalArgumentException("invalid_device_percentage");
        return (Integer)value;
    }
}
