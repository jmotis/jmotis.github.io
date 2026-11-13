# The Queens' Gallop

A horse race round Tudor London. You ride as one of Henry VIII's six wives, two laps, on the "Agas" map of London (c. 1560). It is a kart-racing-style game with its own name, characters and items.

Plain HTML, JavaScript and images. No build step for the code, no libraries, no internet needed once the assets are built.

## Running it

Double-click `Play Game.command`. It serves this folder on your own computer (port 8767) and opens the game in your browser.

The game must be served, not opened as a file: the map is loaded into the graphics card as a texture, and browsers refuse to do that from a `file://` page. Any static server works, for example:

```bash
python3 -m http.server 8767 --bind 127.0.0.1
```

It needs a browser with WebGL2 (any current Chrome, Safari, Firefox or Edge).

If `python3` complains about the Xcode licence on a Mac, run `sudo xcodebuild -license` once in Terminal and accept it.

## What is in the folder

| Path | What it is |
|---|---|
| `index.html` | The page: menu, heads-up display, results panel, and all the CSS. |
| `game.js` | The whole game: queens, art, physics, rivals, items, drawing, sound. |
| `track.js` | **Generated.** The circuit as a list of points, plus street names, zones and landmarks. Do not edit by hand. |
| `img/` | **Generated** (except `henry0.png`, `henry1.png`). Ground textures, minimap, menu background, portrait crops. |
| `tools/track.py` | The route: which streets, in what order. Edit this to change the circuit. |
| `tools/build_assets.py` | Builds `track.js` and everything in `img/` from `Assets/`. |
| `Assets/` | Source material: the six portraits, the maps, and MoEML's location data. |
| `Play Game.command` | Double-click launcher. |

## Changing the difficulty levels

All three levels live in one table near the middle of `game.js`. Search for `const LEVELS`:

```js
const LEVELS = {
  easy:   { skill: [.78, .86], behind: 1,    ahead: .88, aheadGap: 120, jump: .6 },
  normal: { skill: [.85, .92], behind: 1,    ahead: .92, aheadGap: 180, jump: .8 },
  hard:   { skill: [.90, .97], behind: 1.05, ahead: .93, aheadGap: 220, jump: .95 },
};
```

Edit the numbers, save, reload the page. Nothing needs rebuilding.

| Setting | What it does | To make the level easier |
|---|---|---|
| `skill: [low, high]` | Each rival gets a random number in this range at the start of a race. It multiplies her horse's top speed. The player always rides at 1.0. | Lower both numbers. This is the strongest lever. |
| `behind` | Speed multiplier for a rival who is trailing the player by more than 60 game units. Above 1 means rivals behind you catch up. | Keep at 1, or go below 1. |
| `ahead` | Speed multiplier for a rival who is leading the player by more than `aheadGap`. Below 1 means leaders wait for you. | Lower it. |
| `aheadGap` | How far ahead (in game units; the road is 60 wide) a rival must be before `ahead` applies. | Lower it, so leaders ease off sooner. |
| `jump` | Chance, from 0 to 1, that a rival clears each row of hay bales. A miss costs her about a second. | Lower it. |

How the numbers combine: a rival's top speed is her horse's speed × `skill` × (`behind` or `ahead` or 1). A rival with `skill` 0.97 and `behind` 1.05 rides at 1.02 of her horse's speed, which is faster than a player on the same horse can ever go. That is why Hard is hard. Keep `skill × behind` under 1 if you want a level a clean lap can always win.

Rivals also brake for corners and take a near-ideal line, so a `skill` of 0.9 is harder to beat than it sounds. A human usually loses 5 to 10 per cent to walls and bales.

Related settings outside the table:

- **Default level:** `let level = 'normal';` just below the table. The player's last choice is remembered in the browser under the key in `LEVEL_KEY`; change that key's name to reset everyone to the default.
- **Adding a level:** add a row to `LEVELS`, then a matching `<button data-level="yourname">` inside `<div id="levels">` in `index.html`.
- **Laps:** `const LAPS = 2;` just above the table. A lap takes about 90 seconds.
- **Start grid:** not a difficulty setting. The queens always line up in the order Henry married them, Aragon at the front and Parr at the back. That order is simply the order of the `QUEENS` list.

To test a level without riding it yourself, open the browser console during a race and type `GALLOP.auto = true`. The computer rides your horse. `GALLOP.player.skill = 0.92` sets how well it rides.

## Changing the queens

The `QUEENS` list is at the top of `game.js`, in marriage order. Each entry has:

- `gown`, `trim`, `hood`, `coat`, `mane`: colours of the drawn rider and horse. Gown colours follow the colour-coding in *Six: the Musical*. `gable: true` draws an English gable hood; `false` draws a rounded French hood.
- `spd`, `acc`, `han`: 1 to 5, shown as the bars on the menu card. The lines just under the list turn them into real numbers: top speed is `178 + spd × 6`, acceleration `62 + acc × 9`, turning rate `1.95 + han × 0.12`.
- `name`, `dates`, `motto`, `note`: text on the menu card.

Portrait crops (the round face above each rider and the menu picture) are cut by `tools/build_assets.py`. The face centre and radius for each portrait are in its `QUEENS` list.

## Changing items

Search `game.js` for `function giveItem`. The `w` object holds the odds. `back` runs from 0 (leading) to 1 (last), so riders at the back get more Papal Bulls and Royal Favour.

What each item does is in `function useItem` and `function updateRacer`: Marchpane multiplies top speed by 1.4 for 2.2 seconds; Royal Favour lasts 6 seconds; a tumble lasts 1.25 seconds followed by 1.6 seconds in which nothing can knock you down again.

Tudor roses (item pick-ups) and hay bales are placed by the two lists of fractions just above the "sound" section. Each number is a position round the lap from 0 to 1.

## Changing the route or the map

The circuit is not drawn by hand. `tools/track.py` chains together street centrelines from the Map of Early Modern London's gazetteer (`Assets/moeml-agasLocations.json`). Each row of `ROUTE` is a street name to show in the game, a zone (`URBAN` gets houses, `RURAL` gets trees), and a MoEML street ID. Two short stretches have no MoEML line and are hand-placed points: round the south of St Paul's, and out past the postern gate to the Minories.

To change it, edit `ROUTE` (or `LANDMARKS`, or `START_NEAR`), then rebuild from this folder:

```bash
python3 tools/build_assets.py
```

This needs Python 3 with Pillow (`pip3 install pillow`) and takes about a minute. It writes `track.js` and all of `img/`.

The ground is `Assets/agas-moeml-12588x4808.jpg`, stitched from MoEML's zoom tiles at half their full size. Its colour is borrowed from the small coloured facsimile (`agas-edg_1531x573-1.jpg`), lined up by the `CONTROL` point pairs in `build_assets.py`. Two ground textures are written: `ground-hi.jpg` (12,588 wide) and `ground.jpg` (8,192 wide) for graphics cards that cannot take the large one. Add `?small` to the page address to force the small one.

## How the game works, briefly

- **Units.** Track points are pixels of the 12,588-wide map. The game multiplies them by `K = 0.75` into "game units"; every speed, size and distance in `game.js` is in game units. The road is 60 units wide.
- **Ground.** A WebGL fragment shader draws the map as a flat plane in perspective, one calculation per screen pixel. There is no 3D model.
- **Everything else** (riders, houses, landmarks, items) is a flat picture drawn on a second canvas on top, scaled by distance and sorted far to near. All of it except Henry and the portrait faces is drawn in code at start-up; see the "procedural art" section.
- **Staying on the road.** Each rider remembers the nearest track point (`idx`) and her sideways offset from the centreline (`lat`). Beyond the road edge she slows; a little further is a wall, where the house fronts stand.
- **Rivals** steer at a point a short way ahead on the track, brake for the tightest corner coming up, and drift between lanes. See `function aiControl`.

Console helpers during a race: `GALLOP.player`, `GALLOP.racers`, `GALLOP.state`, `GALLOP.setLevel('hard')`, `GALLOP.start(0)` (0 to 5 picks the queen), `GALLOP.auto = true`.

## Credits and caveats

- Map image and street lines: the Agas Map edition of *The Map of Early Modern London* (MoEML), University of Victoria, <https://mapoflondon.uvic.ca/agas.htm>. Check MoEML's terms of use before distributing the game.
- The map shows London around 1560, a little after Henry's death in 1547.
- The Catherine Howard portrait is a "Portrait of a Lady" from Holbein's workshop; the sitter's identity is uncertain.
- The four gates and Temple Bar share one generic gatehouse drawing. Houses and trees along the road are decorative, not taken from the map.
- Henry at the start line is reused from the Tudor Deer Hunt game in the folder above.
