// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import java.nio.charset.StandardCharsets;

final class GuestWifi {
    private GuestWifi() {}

    static String qrText(String ssid, String password, boolean secured, boolean hidden) {
        if (ssid.isEmpty() || ssid.getBytes(StandardCharsets.UTF_8).length > 32
            || ssid.codePoints().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("invalid_ssid");
        }
        if (secured && (!password.matches("[ -~]{8,63}") && !password.matches("[a-fA-F0-9]{64}"))) {
            throw new IllegalArgumentException("invalid_wifi_password");
        }
        return "WIFI:T:" + (secured ? "WPA" : "nopass") + ";S:" + escape(ssid)
            + (secured ? ";P:" + escape(password) : "") + (hidden ? ";H:true" : "") + ";;";
    }

    private static String escape(String value) {
        StringBuilder escaped = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            char character = value.charAt(i);
            if ("\\;,:\"".indexOf(character) >= 0) escaped.append('\\');
            escaped.append(character);
        }
        return escaped.toString();
    }
}
