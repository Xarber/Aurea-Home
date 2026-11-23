// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import java.util.concurrent.atomic.AtomicLong;

public final class AccountInvitationChecks {
    private static void check(boolean result, String condition) {
        if (!result) throw new AssertionError(condition);
    }

    public static void main(String[] args) {
        AtomicLong clock = new AtomicLong();
        AccountInvitation invite = new AccountInvitation(clock::get);
        String code = "A".repeat(43);
        String origin = "https://aurea.xcenter.it";
        invite.open(code);
        check(!invite.claim(false, origin, "relay", "relay", code), "LAN access");
        check(!invite.claim(true, "https://other.example", "relay", "relay", code), "incorrect origin");
        check(!invite.claim(true, origin, "relay", "fake", code), "incorrect bridge proof");
        check(!invite.claim(true, origin, "relay", "relay", "B".repeat(43)), "incorrect grant");
        check(invite.claim(true, origin, "relay", "relay", code), "approved grant");
        check(!invite.claim(true, origin, "relay", "relay", code), "replayed grant");
        invite.open(code);
        clock.addAndGet(90_000);
        check(!invite.claim(true, origin, "relay", "relay", code), "expired grant");
        invite.open(code);
        invite.close();
        check(!invite.claim(true, origin, "relay", "relay", code), "revoked grant");
    }
}
