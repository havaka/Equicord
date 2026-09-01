/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { getPickerFavorites, initAuth, refreshMergedGifs, syncNow } from "./api";
import { settings } from "./settings";
import { PickerGif } from "./types";

let syncTimer: ReturnType<typeof setInterval> | undefined;

export default definePlugin({
    name: "GifPolycule",
    description: "Shares Discord favorite GIFs through a Cloudflare Worker and merges them into the GIF picker.",
    authors: [Devs.PolisanTheEasyNick],
    tags: ["Media", "Customisation"],
    settings,

    patches: [
        {
            find: "renderHeaderContent()",
            replacement: {
                match: /(,suggestions:\i,favorites:)([^,]+),/,
                replace: "$1$self.getFavorites($2),"
            }
        }
    ],

    async start() {
        await initAuth();

        if (settings.store.autoSync) {
            void syncNow("startup").catch(() => refreshMergedGifs());
            syncTimer = setInterval(() => void syncNow("interval"), settings.store.syncIntervalMinutes * 60 * 1000);
        } else {
            void refreshMergedGifs();
        }
    },

    stop() {
        if (syncTimer) clearInterval(syncTimer);
        syncTimer = undefined;
    },

    getFavorites(favorites: PickerGif[]) {
        return getPickerFavorites(favorites);
    },
});
