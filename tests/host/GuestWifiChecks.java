// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

final class GuestWifiChecks {
    public static void main(String[] args) {
        equal("WIFI:T:nopass;S:Guest;;", GuestWifi.qrText("Guest", "ignored", false, false));
        equal("WIFI:T:WPA;S:Casa\\; \\\"ospiti\\\";P:abc\\,123\\:d;H:true;;",
            GuestWifi.qrText("Casa; \"ospiti\"", "abc,123:d", true, true));
        equal("WIFI:T:nopass;S:Caffè;;", GuestWifi.qrText("Caffè", "", false, false));
        invalid("invalid_ssid", () -> GuestWifi.qrText("é".repeat(17), "", false, false));
        invalid("invalid_ssid", () -> GuestWifi.qrText("guest\n", "", false, false));
        invalid("invalid_wifi_password", () -> GuestWifi.qrText("Guest", "short", true, false));
    }

    private static void equal(String expected, String actual) {
        if (!expected.equals(actual)) throw new AssertionError("Unexpected Wi-Fi schema");
    }

    private static void invalid(String code, Runnable action) {
        try {
            action.run();
            throw new AssertionError("Invalid data was accepted");
        } catch (IllegalArgumentException rejected) {
            equal(code, rejected.getMessage());
        }
    }
}
