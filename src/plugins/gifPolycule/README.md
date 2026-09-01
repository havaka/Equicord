# Gif Polycule

Shares each connected user's Discord favorite GIFs with a Cloudflare Worker, stores them in KV, and merges the shared set back into the favorite GIF picker.

The plugin extracts GIFs from `FrecencyUserSettings.getCurrentValue().favoriteGifs.gifs`, matching the backup snippet in `temp/gifs.md.txt`. Merged GIF objects include `$gifPolyculeFavoritedBy` and `$gifPolyculeFavoritedByIds` so a future picker UI can show who favorited each GIF.

Set the Worker URL in the plugin settings, connect with Discord OAuth2, then sync favorites.
