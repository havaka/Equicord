/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { OptionType } from "@utils/types";
import { Forms, useState } from "@webpack/common";

import { authorize, getAuth, getLastStatus, getLastSyncAt, logout, syncNow } from "./api";

function Controls() {
    const [, forceUpdate] = useState({});
    const auth = getAuth();
    const lastSyncAt = getLastSyncAt();

    async function run(action: () => Promise<void>) {
        await action().catch(() => void 0);
        forceUpdate({});
    }

    return (
        <div>
            <div className={classes(Margins.bottom8)} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button onClick={() => run(authorize)}>
                    {auth ? "Reconnect Discord" : "Connect Discord"}
                </Button>
                <Button variant="secondary" onClick={() => run(() => syncNow("settings"))} disabled={!auth}>
                    Sync Favorites
                </Button>
                <Button variant="dangerSecondary" onClick={() => run(logout)} disabled={!auth}>
                    Forget Session
                </Button>
            </div>
            <Forms.FormText>
                {auth ? `Connected as ${auth.user.globalName ?? auth.user.username}.` : "Not connected."}
                {" "}
                {getLastStatus()}
                {lastSyncAt ? ` Last sync: ${new Date(lastSyncAt).toLocaleString()}.` : ""}
            </Forms.FormText>
        </div>
    );
}

export const settings = definePluginSettings({
    controls: {
        type: OptionType.COMPONENT,
        component: Controls,
    },
    apiBaseUrl: {
        type: OptionType.STRING,
        description: "Gif Polycule Worker URL",
        default: "https://gif-polycule.example.workers.dev",
        isValid: value => {
            if (typeof value !== "string") return "Enter a valid Worker URL.";

            try {
                const url = new URL(value);
                return url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1";
            } catch {
                return "Enter a valid Worker URL.";
            }
        },
    },
    autoSync: {
        type: OptionType.BOOLEAN,
        description: "Automatically sync favorite GIFs after startup and on an interval",
        default: true,
    },
    syncIntervalMinutes: {
        type: OptionType.NUMBER,
        description: "Minutes between automatic syncs",
        default: 10,
        isValid: value => typeof value === "number" && value >= 1 || "Use at least 1 minute.",
    },
    mergeInPicker: {
        type: OptionType.BOOLEAN,
        description: "Show merged shared GIFs in the Discord favorite GIF picker",
        default: true,
    },
});
