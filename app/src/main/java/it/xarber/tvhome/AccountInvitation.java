// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.function.LongSupplier;

/** One invitation approved on this TV, redeemable only through its hosted bridge. */
final class AccountInvitation {
    private final LongSupplier elapsedTime;
    private byte[] grant;
    private long expiresAt;

    AccountInvitation(LongSupplier elapsedTime) {
        this.elapsedTime = elapsedTime;
    }

    synchronized void open(String freshGrant) {
        grant = freshGrant.getBytes(StandardCharsets.US_ASCII);
        expiresAt = elapsedTime.getAsLong() + 90_000;
    }

    synchronized void close() {
        grant = null;
        expiresAt = 0;
    }

    synchronized boolean claim(boolean loopback, String origin, String expectedBridge, String bridge, String candidate) {
        if (!loopback || !"https://aurea.xcenter.it".equals(origin) ||
            !expectedBridge.equals(bridge) || grant == null ||
            elapsedTime.getAsLong() >= expiresAt || !candidate.matches("[A-Za-z0-9_-]{43}") ||
            !MessageDigest.isEqual(grant,candidate.getBytes(StandardCharsets.US_ASCII))) return false;
        close();
        return true;
    }
}
