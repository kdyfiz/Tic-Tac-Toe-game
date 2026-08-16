# Tic Tac Toe Arcade

A fast, interactive tic-tac-toe you can play in the browser: Friends (two names) or Solo against Echo, plus blitz timer, streaks, and sound.

## Play

Open `index.html` in a browser, or from this folder:

```bash
python3 -m http.server 5173
```

Then visit [http://localhost:5173](http://localhost:5173).

**Modes**
- Friends: two players on the same device, each with their own name
- Solo: one player vs Echo (Chill, Sharp, or Unbeatable)
- Classic or Blitz (10 seconds per turn)

**Keys:** `1–9` place a mark · `U` undo · `R` rematch · `M` mute

Names, theme, and mute stay in this browser only. Each visitor gets their own game — lots of people can play at once without sharing scores.

## Publish on GitHub Pages

This game is static (HTML, CSS, JS). After the files are in [kdyfiz/Tic-Tac-Toe-game](https://github.com/kdyfiz/Tic-Tac-Toe-game):

1. Repo **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Save. The live URL will be `https://kdyfiz.github.io/Tic-Tac-Toe-game/`
