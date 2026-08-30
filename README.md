# Spelling FC

A soccer-themed spelling practice game for Richie and Allison. Hear the word,
spell it, score the goal. Runs in any browser — built for Richie's Android
tablet and Allison's iPad.

**Live:** https://rfecher.github.io/spelling/

---

## The weekly routine (the only thing you normally do)

1. Copy last week's file to a new one, e.g.
   `public/words/richie/2025-W37.json`
2. Replace the `words` list with the new spelling words.
3. Add one line to `public/words/manifest.json` pointing at the new file.
4. Commit and push. GitHub Actions rebuilds and deploys in about a minute.
5. Kids reload the page.

You can do all of this from github.com in a browser — no laptop required.

### Word file format

```json
{
  "kid": "richie",
  "week": "2025-W37",
  "label": "Week 2 — Sep 8",
  "words": [
    {
      "word": "necessary",
      "sentence": "It is necessary to wear shin guards during the game.",
      "hint": "one c, two s's"
    },
    { "word": "athlete" }
  ]
}
```

- `word` — required. Everything else is optional.
- `sentence` — spoken aloud after the word, so homophones are unambiguous.
  Soccer-themed sentences make it more fun. In Practice mode the word is blanked
  out of the sentence so it isn't a giveaway.
- `hint` — shown after a miss and in Practice mode. Good for tricky spellings
  ("silent b", "augh sounds like aw").

### Adding a week to the manifest

```json
{
  "id": "2025-W37",
  "label": "Week 2 — Sep 8",
  "file": "richie/2025-W37.json"
}
```

Append it to that kid's `weeks` array. The **last entry is the default week**;
earlier weeks stay playable from the dropdown on the kid's home screen.

### Adding another kid

Add an entry to `kids` in the manifest with a new `id`, then create
`public/words/<id>/` with their week files. Give them an accent color in
`src/theme/tokens.css` (see below).

---

## Game modes

| Mode | What it does |
| --- | --- |
| **Penalty Shootout** | The test. Hear the word, type it on the custom keyboard, take the kick. Correct spelling scores; a miss is saved by the keeper, shows the correct spelling with the wrong letters marked, and the word comes back for a bonus kick at the end of the round. |
| **Word Scramble** | Tap the shuffled letter tiles into the right order. |
| **Missing Letters** | Fill the blanks from a small bank of letters (correct ones plus a few decoys). |
| **Practice** | Low pressure warm-up. See it, hear it, then type it from memory with a hold-to-peek button. Doesn't affect streaks. |

The keyboard is custom on purpose — the tablet's own keyboard offers autocorrect
and spell-check, which would hand over the answer.

### How words are chosen

Words the kid struggles with come around more often. Each word gets a weight:
new words start high, a word missed last time jumps to the top, low accuracy
raises it, and three correct answers in a row (mastery) halves it. With a
typical 10–28 word school list every word appears in a round — the weighting
decides the order, so the hard ones come first while focus is fresh.

### Progress and trophies

Saved in the browser's local storage, per kid, on that kid's own device
(`spelling.v1.progress.<kid>`). There's no account and nothing syncs between
devices — clearing browser data resets it.

Trophies: First Goal, Hat Trick, On Fire (5 streak), Unstoppable (10 streak),
Clean Sheet (perfect round), League Champion (master every word in the week),
Century Club (100 career goals).

---

## Applying your own theme

Every color lives in `src/theme/tokens.css`. Layer 1 is the raw palette; Layer 2
is the semantic tokens the components actually use. **Change Layer 2 only** — no
other file needs touching.

| Token | Controls |
| --- | --- |
| `--bg` | Page background |
| `--surface`, `--surface-raised` | Cards, keyboard keys, tiles |
| `--border` | All card and key outlines |
| `--text`, `--text-muted` | Body text, secondary text |
| `--pitch`, `--pitch-stripe`, `--pitch-lines`, `--net` | The penalty scene |
| `--kit-primary`, `--kit-trim` | Jersey body and trim |
| `--keeper-kit` | The goalkeeper |
| `--accent-richie`, `--accent-allison` | Each kid's accent color |
| `--goal-flash` | The "GOAL!" flash and correct-answer tiles |
| `--save-neutral` | The "SAVED!" flash |
| `--wrong-mark` | Wrong letters in a reveal |
| `--cta`, `--cta-text` | Primary buttons and the SHOOT key |
| `--font-heading`, `--font-body` | Type stacks |

To use a club's colors, set `--bg`/`--pitch` to the dark base, `--kit-trim` and
`--goal-flash` to the highlight color, and `--cta` to whatever you want the big
buttons to be. Check contrast on the dark background — text colors need to stay
readable.

Fonts load from Google Fonts in `index.html`. `--font-heading` lists TWK Everett
first with Space Grotesk as the fallback that actually renders.

---

## Running it locally

```bash
npm install
```

```bash
npm run dev
```

The dev server binds to your network, so you can open it on a tablet with
`http://<your-computer-ip>:5173/` to test on the real device.

```bash
npm run build
```

## Deploying

Push to `main`. `.github/workflows/deploy.yml` builds and publishes to GitHub
Pages automatically.

One-time setup: in the repo's **Settings → Pages**, set **Source** to
**GitHub Actions**.

Production is served from `/spelling/` (see `base` in `vite.config.ts`). If you
rename the repo, change that value to match.

## Put it on the tablets' home screens

- **iPad (Safari):** open the site, tap Share, then "Add to Home Screen".
- **Android (Chrome):** open the site, tap ⋮, then "Add to Home screen".

It then opens full-screen like an app.

## Notes

- Speech uses the browser's built-in text-to-speech. On iPad it only unlocks
  after the first tap, which is why the kid picker is the first screen — tapping
  a name primes the voice.
- No backend, no accounts, no data leaves the device.
