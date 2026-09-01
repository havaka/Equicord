/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import {
    MessageObject
} from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

// const settings = definePluginSettings({

// })

type FixUpLink = {
    regex: RegExp;
    replacement: string;
};

const fixUpLinks: Record<string, FixUpLink[]> = {
    "x": [{
        "regex": /https?:\/\/(www\.)?x\.com\/([A-Za-z0-9_]{1,15}\/status\/\d+)/g,
        "replacement": "https://fixupx.com/$2"
    }],
    "tiktok": [{
        "regex": /https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\//g,
        "replacement": "https://tnktok.com/"
    }],
    "reddit": [{
        "regex": /https?:\/\/(www\.)?reddit\.com\//g,
        "replacement": "https://vxreddit.com/"
    },
    {
        "regex": /https?:\/\/(www\.)?redd\.it\//g,
        "replacement": "https://vxreddit.com/"
    }],
    "pinterest": [{
        "regex": /https?:\/\/(www\.)?pinterest\.com\//g,
        "replacement": "https://pinterestez.com/"
    }],
};

function changeLinks(msg: MessageObject) {
    Object.values(fixUpLinks).forEach(service => {
        service.forEach(link => {
            msg.content = msg.content.replace(
                link.regex,
                link.replacement
            );
        });
    });
}

export default definePlugin({
    name: "EmbedFix",
    description: "Fixes or add embeds to social media links",
    authors: [Devs.havaka],

    async start() {
        return;
    },

    stop() {
        return;
    },

    onBeforeMessageSend(_, msg) {
        changeLinks(msg);
    },

    onBeforeMessageEdit(_cid, _mid, msg) {
        changeLinks(msg);
    }
});