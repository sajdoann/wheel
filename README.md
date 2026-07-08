# Wheel Picker

A lightweight, ad-free random picker wheel for names, raffles, classrooms, team games, and quick decisions.

## Features

- Add one name or paste many names separated by commas, semicolons, or new lines.
- Spin the wheel with a secure random winner selection.
- Optionally remove the winner after each selection.
- Shuffle, clear, or restore a sample list.
- Share the current wheel by copying the URL. Entries and options are stored in the address hash.
- Celebration effects and generated browser audio after each winner.
- Responsive layout with reduced-motion support.

## Run Locally

No build step or package install is required. Open `index.html` in a browser.

For a local web server, run one of these from the project directory:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Project Files

- `index.html` - App markup and controls.
- `styles.css` - Layout, responsive styles, and visual treatment.
- `script.js` - Wheel drawing, spinning logic, URL sharing, audio, and celebration effects.
- `pwlpl-applause-sound-effect-521104.mp3` - Audio asset in the repository.

## Notes

Wheel state is saved in the URL hash, so it stays client-side and can be shared by copying the page URL. The app does not require a backend or external services.
