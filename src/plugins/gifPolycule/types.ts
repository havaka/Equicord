/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface FavoriteGif {
    format: number;
    src: string;
    width: number;
    height: number;
    order: number;
}

export type FavoriteGifMap = Record<string, FavoriteGif>;

export interface PublicUser {
    id: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
}

export interface MergedGif extends FavoriteGif {
    url: string;
    favoritedBy: PublicUser[];
    favoritedByIds: string[];
    originalOrders: Record<string, number>;
}

export interface MergedResponse {
    users: PublicUser[];
    gifs: MergedGif[];
    updatedAt: string;
}

export type PickerGif = FavoriteGif & {
    url?: string;
    $gifPolyculeFavoritedBy?: PublicUser[];
    $gifPolyculeFavoritedByIds?: string[];
};

export interface AuthState {
    token: string;
    user: PublicUser;
}
