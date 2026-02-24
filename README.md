# Gurbani Words Art Gallery

A vanilla HTML/CSS/JavaScript immersive gallery for Gurbani Words learning.

The experience presents framed Gurbani word artworks in a horizontal spiritual gallery walk, with ambient sound options, transition chimes, fullscreen mode, moving floor parallax, and theme switching.

## Inspired From

- https://liveprojectclub.in/painter/main.php?gal=gurbani1

## Project Structure

- `resources/` — artwork images (`365GurbaniWords_001.jpg` ... `365GurbaniWords_020.jpg`)
- `src/index.html` — app markup
- `src/styles.css` — all styling, themes, and responsive behavior
- `src/app.js` — gallery interactions, audio engine, theme logic

## Run

Because image paths are relative, run from a local static server (recommended) instead of opening directly from disk.

### Option 1: VS Code Live Server / Live Preview
Open `src/index.html` with your preferred VS Code preview extension.

### Option 2: Python static server
From project root:

```bash
python3 -m http.server 5500
```

Then open:

```text
http://localhost:5500/src/
```

## Controls

### Navigation
- Left / Right buttons
- Keyboard: `ArrowLeft`, `ArrowRight`
- Mouse wheel (horizontal/vertical)
- Drag / swipe on the gallery wall
- `Center` button to re-center active artwork

### Experience
- `Sound` button: toggle ambient audio
- `Tone` selector: choose ambient profile (`Mool Drone`, `Tanpura Glow`, `River Shabad`)
- Transition bell chime plays on artwork change when sound is enabled
- `Fullscreen` button
- Keyboard shortcuts:
  - `M` = toggle sound
  - `F` = toggle fullscreen

### Themes
- `Satin Navy` (default)
- `Ochre`
- `Crimson Darbar`

## Local Storage Persistence

The app stores a few preferences in browser localStorage so your experience resumes after reload:

- Theme selection (`Satin Navy` / `Ochre` / `Crimson Darbar`)
- Tone selection (`Mool Drone` / `Tanpura Glow` / `River Shabad`)
- Last centered artwork index

If localStorage is blocked by the browser/privacy mode, the app still works with defaults.

## Notes

- The highlighted artwork is centered in the viewport across resolutions.
- Frame shape is square.
- The highlighted artwork scales larger than surrounding frames while preserving gallery flow.
- Floor parallax shifts during movement to simulate walking.
- Styles include responsive breakpoints for desktop, tablet, and mobile.

## Customization

- Change artwork count/pattern in `src/app.js` (`artworkFiles`).
- Adjust highlight scale in `src/styles.css` (`.art-card.active` and media overrides).
- Tweak floor movement intensity in `src/app.js` (`updateFloorParallax`).
- Adjust theme color variables in `src/styles.css` under:
  - `body.theme-navy`
  - `body.theme-ochre`
  - `body.theme-crimson`

## Troubleshooting

- No sound until first interaction: some browsers block Web Audio autoplay; click `Sound` once after page load.
- Images not loading: run from a local server (`python3 -m http.server 5500`) instead of opening with `file://`.
- Preferences not saved: check browser private mode or storage restrictions; localStorage may be disabled.
- Reset saved preferences: open DevTools Console and run:

```js
localStorage.removeItem("gurbani-gallery.theme");
localStorage.removeItem("gurbani-gallery.tone");
localStorage.removeItem("gurbani-gallery.index");
```

