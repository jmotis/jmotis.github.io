# Darest Thou Hunt with Henry VIII?

A browser game in which you play Henry VIII, shooting deer with a crossbow from a hunting stand while your servants and hounds drive the deer past. With education mode switched on, every deer you take shows a fact about Henry's life and reign.

This document has three parts:

1. [For players](#1-for-players): how to play.
2. [For educators](#2-for-educators): using the game in a classroom, and changing the facts.
3. [For developers](#3-for-developers): how the game is built, and how to maintain or adapt it.

The in-game About page (press A) covers the game's historical sources and its deliberate inaccuracies. This file covers how to use and maintain it.

---

## 1. For players

### Starting the game

- **Simplest:** open `index.html` in a web browser. Everything works except that education mode only has nine facts.
- **With all 180 facts (Mac):** double-click `Play Game.command`. It opens the game in your browser. Close the Terminal window it opens when you are finished.
- **On a phone or tablet:** the game has to be on a website. Hold the device sideways.

### The hunt

Ten deer are driven across the field each round, one at a time. You have three crossbow bolts for each deer.

| Deer | How to recognise it | What happens if you shoot it |
|---|---|---|
| A deer | No antlers, no collar | 100 points |
| A great stag | Antlers. A hunting horn sounds just before it appears. | 500 points |
| Her ladyship's pet | A jewelled collar, which glints now and then | You lose **all** your points, and must pay her ladyship 7 shillings 6 pence before the hunt goes on |

Every round has seven ordinary deer, two stags and one pet, in a random order.

- **To finish a round** you need 1000 points scored within that round, for example both stags, or one stag and five deer.
- **If you fall short,** the hunt is over.
- **Shooting the pet** wipes your total score and your progress in that round, so you must earn 1000 points from the deer still to come.
- **A perfect round** (all nine other deer taken and the pet left alone) earns a 1000-point bonus.
- **The game ends** after 20 rounds, which is 200 deer. Deer run faster in later rounds.

### Controls

| | Mouse | Keyboard | Touch |
|---|---|---|---|
| Aim | Move the mouse | Arrow keys (hold Shift for finer aim) | Tap where you want to shoot |
| Shoot | Click | Space or Enter | Tap |
| Begin, continue, pay | Click | Space or Enter | Tap |
| About page | | A (Escape closes it) | About button |
| Read the history | | H (Escape closes it) | History button |
| Education mode | | E | Facts button |
| Music on or off | | M | Music button |
| Pause | | P | Pause button |
| Original artwork | | O | |

On a computer, pressing Tab also reveals the on-screen buttons.

### Accessibility options

Open the About page (A) and scroll to the end. There are two options, which the browser remembers:

- **Larger text in the game.**
- **Turn off the single-letter shortcuts** and show on-screen buttons instead. Useful if you use speech input.

The game is drawn entirely as moving pictures and cannot be played with a screen reader. Instead, every fact it teaches can be read as text on the **Read the history** page. A link to it is the first thing on the page for keyboard and screen-reader users, and it also opens with H, the History button, or a button at the end of the About page.

---

## 2. For educators

### What the game offers

- **Education mode** (press E, or the Facts button on a tablet). Each time a player takes a deer or a stag, the hunt stops and shows one fact about Henry VIII. The player continues when they have read it. Shooting the pet deer shows no fact.
- **180 facts in chronological order,** from Henry's birth in 1491 to the aftermath of his death in 1547.
- **A scrolling About page** on the history of Tudor deer hunting and on how the game departs from it.
- **A Read the history page** (press H) listing every fact as plain text under period headings. It gives screen-reader users the same content, and lets anyone read, search or review all the facts without playing.

### Which facts appear when

Each round has its own block of nine facts: round 1 shows facts 1 to 9, round 2 shows facts 10 to 18, and so on. This is fixed, whether or not education mode was on earlier, so a class can play the early rounds with it off and switch it on for the period you are teaching.

| Rounds | Period |
|---|---|
| 1–2 | Childhood and the young king, 1491–1511 |
| 3–5 | War with France and Scotland, 1511–1515 |
| 5–7 | Wolsey's England, 1514–1525 |
| 8 | The succession problem, 1525–1527 |
| 9–11 | The King's Great Matter, 1527–1533 |
| 11–13 | Supreme Head of the Church, 1533–1535 |
| 13–14 | Three queens in one year, 1536 |
| 14–16 | Rebellion and an heir, 1536–1537 |
| 16–17 | The end of the monasteries, 1538–1540 |
| 17–18 | Anne of Cleves and Catherine Howard, 1540–1542 |
| 18–20 | The last years and after, 1542–1547 |

Two things follow from this design:

- **A missed deer is a missed fact.** A player who takes six deer in a round sees that round's first six facts; the next round starts on its own block.
- **Later periods need skill.** There is no way to jump to a round, so reaching the Reformation facts through play means surviving eight rounds. For a lesson on a later period, either use the Read the history page, or reorder the facts file (below) so the facts you want come first.

### Changing or adding facts

The facts live in `facts.md`, a plain text file you can open in any text editor.

- Each fact is one line beginning with `- `, under the heading `## Facts`.
- Facts are used in the order they appear. Nine go to each round.
- Lines beginning with `>` and blank lines are ignored, so you can leave yourself notes.
- Headings beginning with `###` are ignored by the game itself but become the period headings on the Read the history page.
- Save the file and reload the game to see the change.
- A full game shows at most 180 facts. If the file is shorter, the facts repeat from the top.

**Important:** the game can only read `facts.md` when it is served as a web page (through `Play Game.command` or a website). Opened directly from a disk, the browser blocks the file and the game falls back to nine built-in facts.

To make a version on a different subject, replace the contents of `facts.md`. Nothing else needs to change for the facts themselves.

### Running it in a classroom

- **One computer or a projector:** double-click `Play Game.command` on a Mac.
- **Many devices:** put the `TudorDeerHunt` folder on any web host (a school web server, GitHub Pages, Netlify). It needs no accounts, database or internet services, and collects no data. Scores and settings are stored only in each browser.
- **Sound:** the game plays Greensleeves and sound effects. M mutes it.
- **Time:** a round takes roughly two to three minutes, longer with education mode on.

### Things to know before using it

- **Subject matter.** The player shoots deer, which fall down. There is no blood. The pet deer scene shows a weeping noblewoman. The facts cover executions, religious persecution, miscarriage and death in childbirth, in plain language.
- **Check the facts against your own teaching.** They were drafted with AI assistance from lecture notes and a generated list, then edited. Review them before relying on them.
- **The game is deliberately inaccurate in places.** Henry would have shot from a grand enclosed stand, not an open platform, and the turkey leg is a joke. The in-game About page explains these choices, which makes a useful discussion of how games represent the past.
- **Accessibility.** The game can be played by mouse, keyboard or touch, and has a larger-text option. It cannot be played with a screen reader; those students can read the same facts on the Read the history page. Keyboard aiming is slower than a mouse, which matters in the later, faster rounds.

---

## 3. For developers

### What it is made of

The game has no dependencies: no libraries, no framework, no build step, and it loads nothing from the internet. It is plain HTML, CSS and JavaScript drawing on a canvas, with sound synthesised through the Web Audio API.

```
TudorDeerHunt/              the game; this folder is all that needs hosting
  index.html                page shell, styles, About page text, on-screen buttons
  game.js                   all game logic and drawing (about 1,200 lines)
  original-art.js           the first, code-drawn sprites, shown by the O key
  facts.md                  education-mode facts
  sprites/                  61 PNG sprites used by the game
  Play Game.command         Mac launcher: serves this folder locally and opens it
  about.md                  this file
Assets/                     source images the sprites were cut from, plus research images
scripts/                    Python scripts that turn Assets into sprites
```

`Assets` and `scripts` are not needed to run the game, only to change its artwork. Keep them with the project.

### Running and testing

Serve the game folder and open it:

```bash
cd TudorDeerHunt && python3 -m http.server 8766
```

There are no automated tests. For testing by hand or by script, the game exposes its state in the browser console as `window.__game`:

- `__game.step(seconds)` advances the game by that much time.
- `__game.draw()` redraws the screen.
- `__game.queue` is the order of deer for the current round, and can be overwritten.
- `__game.paused = true` stops the clock so you can step manually.
- `__game.factsInfo()` reports how many facts loaded and whether they came from the file.

### How the code is organised

`game.js` is one file, in this order: setup and image loading, the code-drawn background and platform, sound, game state and rules, shooting, the update loop, drawing, panels, and input.

- **Coordinates.** The game is designed on a 960×540 grid and drawn at twice that. The background and particles are drawn on a 480×270 buffer and scaled up to give a pixel-art look. Positions of things on the field (deer, hounds, servants) are in that 480×270 space; panel and sprite drawing use the 960×540 space.
- **Depth.** `laneScale(y)` makes things smaller the further up the field they are. `drawFieldHi()` collects everything standing on the field and draws it back to front by the position of its feet. Anything new placed on the field should be added to that list, or it will overlap wrongly.
- **States.** `G.state` moves through `title`, `roundIntro`, `wait`, `deer`, `resolve`, `fact`, `compensate`, `roundEnd` and `gameOver`. The transitions are at the end of `update()`.
- **Sprites.** Each sprite set has a table giving every frame's width, height and anchor point (`HENRY_META`, `DEER_META`, `HOUND_META`, `SERV_META`, `LADY_META`). The scripts print these numbers.
- **Panels.** Parchment panels size themselves to their text with `fitWidth()`, so wording can be edited without resizing anything.
- **Sound.** Everything is in the `Sound` object. Greensleeves is stored as a list of notes and lengths.

### Settings you are likely to change

| What | Where in `game.js` |
|---|---|
| Rounds in a game | `MAX_ROUNDS` |
| Points needed per round | `ROUND_GOAL` |
| Points per deer | `POINTS` |
| Mix of deer in a round | the list in `startRound()` |
| Deer speed and how it rises | `spawnDeer()` |
| Bolts per deer | `G.bolts = 3` in `nextDeer()` |
| The compensation amount | `DEER_PRICE` (in pence) and the wording in `drawPayPanel()` |
| Facts per round | `FACTS_PER_ROUND` |
| Which servant stands where | `CAST` and `SERV_POS` |
| Bush size and position | `BUSHES` |
| Sizes of figures | `LADY_H`, `SERV_H`, `DEER_SC` |
| The music | `TUNE` inside `Sound` |

The text of the About page is in `index.html`, in a block marked `ABOUT PAGE`, with instructions for adding headings and images. The Read the history page is the block marked `READ THE HISTORY`; its facts are filled in from `facts.md` by `renderHistory()` in `game.js`, and both pages are opened and closed by `showPage()`.

### Changing the artwork

The sprites were generated as sheets with an image model, on white or checkerboard backgrounds, and saved in `Assets`. The scripts in `scripts/` cut the figures out, make the backgrounds transparent, and resize them.

To rebuild every sprite (needs Python 3 and the Pillow library):

```bash
cd scripts && ./build_all.sh
```

For a trial run that does not touch the game, send the output elsewhere:

```bash
cd scripts && SPRITES_OUT=/tmp/sprites-test ./build_all.sh
```

When this file was written, the scripts reproduced all 61 sprites in the game exactly.

| Script | Makes |
|---|---|
| `prep.py` | Shared helpers: background removal and frame splitting. Not run directly. |
| `henry.py` | Henry feasting, shooting, cheering, sulking |
| `noblewoman.py` | The weeping noblewoman |
| `servant1.py`, `servant1_handsup_and_treeline.py`, `servants234.py` | The four servants, and the tree line |
| `servant_fixes.py` | Touch-ups to the servants; run after the three above |
| `deer.py`, `hounds.py` | Deer and hounds |
| `platform.py` | The stand, with its table and barrel resized |
| `standard.py`, `bush.py`, `castle.py`, `sky.py` | The flag, bush, castle and sky |

To replace a sprite:

1. Put the new sheet in `Assets` under the same file name, with figures clearly separated and a plain white background if possible.
2. Run the matching script. It prints each frame's size and anchor.
3. Copy those numbers into the matching table in `game.js`.
4. Look at the contact sheet in `scripts/_check` to confirm the cut-out is clean.

Problems met while making the originals, which a new sheet may repeat: figures that touch or overlap, figures cut off by the sheet edge, white background trapped between an arm and a body, and a checkerboard "transparency" pattern baked into the image. Several scripts contain fixes for these that are specific to the current sheets (fixed crop positions, for example) and will need adjusting for new ones.

### Making a variant

- **A different subject with the same hunt:** replace `facts.md` and the About text.
- **A different monarch or setting:** replace the sprite sheets and rerun the scripts, then change the title and wording in `drawTitle()` and the panel functions.
- **A different pet-deer penalty or scoring:** see `fire()`, where hits are scored, and `payLady()`.
- **A relaxed mode:** deer speed is one line in `spawnDeer()`. A slower mode would help keyboard players in particular.

### Known limitations

- **One large file, no tests.** Read `game.js` before changing it; it is commented throughout.
- **Text cannot be enlarged to 200%.** In-game text is drawn on the canvas. The larger-text option adds about 25%, and gets tight in the score bar.
- **Fonts vary by device.** Headings ask for Luminari, a Mac font, and fall back to other serifs elsewhere.
- **Screen shapes near 16:9 on phones** leave no margin, so the on-screen buttons sit over the right edge of the field.
- **The original artwork (O key)** has no on-screen button.
- **The built-in backup facts** in `game.js` (`BUILTIN_FACTS`) are a separate copy of the first nine facts. If you change the start of `facts.md`, update them too.
- **Saved data** (best score, education mode, accessibility options) is kept in the browser's local storage under keys beginning `kingsDeerHunt`.

### Keeping it working

The game should keep running for many years because it depends on nothing but a web browser. The likelier ways for it to be lost are the hosting lapsing or the files being mislaid. To guard against that:

- Keep `TudorDeerHunt`, `Assets` and `scripts` together, and deposit a copy somewhere durable.
- `Play Game.command` relies on macOS including Python. If it stops working, any static web server does the same job.

### Credits and sources

- Inspired by Simon Thurley, *Houses of Power: the Places that Shaped the Tudor World* (2017).
- Made in November 2026 by human-in-the-loop agentic coding: Claude Fable 5.2 for the code, GPT 5.4 for sprite generation, and Claude Sonnet 4.6 for the initial plan.
- Sprites were generated from historical images: Henry's portrait, *The Field of the Cloth of Gold* (Royal Collection), Jacopo Bassano's *Two Hounds* (Louvre), and a portrait of Catherine Parr. The royal standard is a 16-bit rendering of Henry's standard.
- The music is Greensleeves, a traditional tune, synthesised in code.

### Licence

This game is dedicated to the public domain under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). You may copy, modify, distribute and use it, including commercially, without asking permission. Credit is appreciated but not required.
