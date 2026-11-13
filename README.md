# Campground

![Campground](images/banner.png)

Plugins for Jellyfin by [AHouseOfBards](https://github.com/AHouseOfBards). Add one link to
your server to install and update them.

## Install

Requires Jellyfin 10.11 or later.

1. In the Jellyfin dashboard, open **Plugins → Repositories** and add:

   ```text
   https://ahouseofbards.github.io/Campground-Jellyfin/manifest.json
   ```

2. Open **Plugins → Catalog** and install a plugin.
3. Restart Jellyfin.

## Plugins

| | Plugin | |
| --- | --- | --- |
| <img src="images/bonfire.png" width="56" alt=""> | **[Bonfire](https://github.com/AHouseOfBards/Bonfire-JellyProfiles)**<br>Profiles for Jellyfin. One account holds several people, each with their own watch history, library access and parental controls. Works with Jellyfin 10.11 and 12.0. | Available |
| <img src="images/cleanstream.png" width="56" alt=""> | **[CleanStream](https://github.com/AHouseOfBards/CleanStream)**<br>Playback for Jellyfin. Starts fast, plays the original file when the connection allows it, and changes quality smoothly when it doesn't. | Planned |
| <img src="images/fieldguide.png" width="56" alt=""> | **[FieldGuide](https://github.com/AHouseOfBards/FieldGuide)**<br>Recommendations for Jellyfin. Picks for each person that change as they watch, in every Jellyfin app. | Planned |
| <img src="images/gametent.png" width="56" alt=""> | **[GameTent](https://github.com/AHouseOfBards/GameTent)**<br>Game streaming for Jellyfin. Play the games on your server from Jellyfin apps. | Planned |
| <img src="images/trailhead.png" width="56" alt=""> | **[Trailhead](https://github.com/AHouseOfBards/Trailhead)**<br>Remote access for Jellyfin. One guided setup in the dashboard for a web address, a certificate, the router and Jellyfin's own settings. | Planned |

Planned plugins aren't in the repository yet. Each one appears in the catalog once it has a
stable release.

This repository offers stable versions only. Bonfire betas are
[published separately](https://github.com/AHouseOfBards/Bonfire-JellyProfiles/blob/main/docs/beta-channel.md).

## Support

Report problems in the plugin's own repository.

## License

The scripts in this repository are under the [MIT License](LICENSE). Each plugin has its
own license.
