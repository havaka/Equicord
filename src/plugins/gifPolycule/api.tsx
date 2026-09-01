/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Logger } from "@utils/Logger";
import { openModal } from "@utils/modal";
import { OAuth2AuthorizeModal, showToast, Toasts, UserSettingsActionCreators, UserStore } from "@webpack/common";

import { settings } from "./settings";
import { AuthState, FavoriteGifMap, MergedGif, MergedResponse, PickerGif } from "./types";

const DATA_STORE_KEY = "gif-polycule-auth";
const logger = new Logger("GifPolycule");

let auth: AuthState | null = null;
let mergedGifs: MergedGif[] = [];
let lastSyncAt = 0;
let lastStatus = "Not synced yet.";
let cspChecked = false;

export async function initAuth() {
    auth = await getStoredAuth();
}

export function getAuth() {
    return auth;
}

export function getLastStatus() {
    return lastStatus;
}

export function getLastSyncAt() {
    return lastSyncAt;
}

export async function authorize() {
    const config = await request<{ clientId: string; redirectUri: string; scopes?: string[]; }>("/oauth/config", {}, false);

    return new Promise<void>((resolve, reject) => openModal(props =>
        <OAuth2AuthorizeModal
            {...props}
            scopes={config.scopes ?? ["identify"]}
            responseType="code"
            redirectUri={config.redirectUri}
            permissions={0n}
            clientId={config.clientId}
            cancelCompletesFlow={false}
            callback={async (response: any) => {
                try {
                    const result = await fetch(response.location, {
                        headers: { Accept: "application/json" },
                    });

                    if (!result.ok) throw new Error(await errorMessage(result));

                    const newAuth = await result.json() as AuthState;
                    await setStoredAuth(newAuth);
                    auth = newAuth;
                    showToast("Connected Gif Polycule.", Toasts.Type.SUCCESS);
                    resolve();
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    showToast(`Gif Polycule auth failed: ${message}`, Toasts.Type.FAILURE);
                    logger.error("Failed to authorize", error);
                    reject(error);
                }
            }}
        />, {
            onCloseCallback() {
                reject(new Error("Authorization cancelled"));
            },
        }
    ));
}

export async function logout() {
    const userId = UserStore.getCurrentUser()?.id;
    auth = null;

    if (!userId) return;

    await DataStore.update<Record<string, AuthState>>(DATA_STORE_KEY, records => {
        records ??= {};
        delete records[userId];
        return records;
    });
}

export async function syncNow(reason = "manual") {
    if (!auth) await initAuth();
    if (!auth) {
        lastStatus = "Authorize before syncing.";
        showToast(lastStatus, Toasts.Type.FAILURE);
        return;
    }

    const gifs = getLocalFavoriteGifs();
    const response = await request<MergedResponse>("/api/sync", {
        method: "POST",
        body: JSON.stringify({ gifs }),
    });

    mergedGifs = response.gifs;
    lastSyncAt = Date.now();
    lastStatus = `Synced ${Object.keys(gifs).length} local GIFs; received ${mergedGifs.length} shared GIFs (${reason}).`;
    showToast(lastStatus, Toasts.Type.SUCCESS);
}

export async function refreshMergedGifs() {
    if (!auth) await initAuth();
    if (!auth) return;

    const response = await request<MergedResponse>("/api/gifs");
    mergedGifs = response.gifs;
    lastSyncAt = Date.now();
    lastStatus = `Fetched ${mergedGifs.length} shared GIFs.`;
}

export function getLocalFavoriteGifs(): FavoriteGifMap {
    const { FrecencyUserSettingsActionCreators } = UserSettingsActionCreators;
    FrecencyUserSettingsActionCreators?.loadIfNecessary?.();

    return FrecencyUserSettingsActionCreators?.getCurrentValue?.()?.favoriteGifs?.gifs ?? {};
}

export function getPickerFavorites(currentFavorites: PickerGif[]) {
    if (!settings.store.mergeInPicker || !mergedGifs.length) return currentFavorites;

    const currentByUrl = new Map(currentFavorites.map(gif => [gif.url, gif]));
    const currentBySrc = new Map(currentFavorites.map(gif => [gif.src, gif]));

    const maxLocalOrder = currentFavorites.length > 0
        ? Math.max(...currentFavorites.map(g => g.order))
        : 0;

    const seenUrls = new Set<string>();
    const seenSrcs = new Set<string>();
    const result = [] as PickerGif[];

    for (const gif of mergedGifs) {
        const local = (gif.url ? currentByUrl.get(gif.url) : null) ?? currentBySrc.get(gif.src);

        if (gif.url) seenUrls.add(gif.url);
        seenSrcs.add(gif.src);

        result.push({
            ...gif,
            ...local,
            url: gif.url || local?.url,
            // If it's local, keep the local order to avoid moving user's own GIFs.
            // If it's only shared, put it at the top by shifting it above maxLocalOrder.
            order: local ? local.order : maxLocalOrder + gif.order + 1,
            $gifPolyculeFavoritedBy: gif.favoritedBy,
            $gifPolyculeFavoritedByIds: gif.favoritedByIds,
        });
    }

    for (const gif of currentFavorites) {
        const alreadyIn = (gif.url && seenUrls.has(gif.url)) || seenSrcs.has(gif.src);
        if (!alreadyIn) result.push(gif);
    }

    return result;
}

async function getStoredAuth(): Promise<AuthState | null> {
    const userId = UserStore.getCurrentUser()?.id;
    if (!userId) return null;

    const records = await DataStore.get<Record<string, AuthState>>(DATA_STORE_KEY);
    return records?.[userId] ?? null;
}

async function setStoredAuth(newAuth: AuthState) {
    const userId = UserStore.getCurrentUser()?.id;
    if (!userId) return;

    await DataStore.update<Record<string, AuthState>>(DATA_STORE_KEY, records => {
        records ??= {};
        records[userId] = newAuth;
        return records;
    });
}

async function request<T>(path: string, init: RequestInit = {}, needsAuth = true): Promise<T> {
    if (!await checkWorkerCsp()) {
        throw new Error("The Worker host was added to Vencord's CSP allowlist. Restart Discord, then try again.");
    }

    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body) headers.set("Content-Type", "application/json");
    if (needsAuth) {
        if (!auth) throw new Error("Not authorized");
        headers.set("Authorization", `Bearer ${auth.token}`);
    }

    const response = await fetch(apiUrl(path), { ...init, headers });
    if (!response.ok) throw new Error(await errorMessage(response));
    return response.json() as Promise<T>;
}

async function checkWorkerCsp() {
    if (IS_WEB || cspChecked) return true;

    const url = settings.store.apiBaseUrl;

    if (await VencordNative.csp.isDomainAllowed(url, ["connect-src"])) {
        cspChecked = true;
        return true;
    }

    const result = await VencordNative.csp.requestAddOverride(url, ["connect-src"], "Gif Polycule");
    if (result === "ok") {
        showToast("Gif Polycule Worker allowed. Restart Discord for the CSP change to apply.", Toasts.Type.SUCCESS);
        return false;
    }

    showToast("Gif Polycule needs Worker host permission to sync GIFs.", Toasts.Type.FAILURE);
    return false;
}

async function errorMessage(response: Response) {
    try {
        const body = await response.json() as { error?: string; message?: string; };
        return body.error ?? body.message ?? response.statusText;
    } catch {
        return response.statusText;
    }
}

function apiUrl(path: string) {
    return `${settings.store.apiBaseUrl.replace(/\/+$/, "")}${path}`;
}
