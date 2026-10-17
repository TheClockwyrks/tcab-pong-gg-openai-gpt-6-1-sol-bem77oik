# Carom

A browser paddle duel about angles, moving obstacles, and spin. Slide into a
return to curve the ball, then bank it off the two rotating gold bars. Play the
AI in **Solo**, or share a keyboard in **Versus**. First to 11, ahead by two.

## Run

Requires a current Node.js release supported by Vite.

```sh
npm ci
npm run dev
```

Open the local URL Vite prints. No server-side service, accounts, downloaded
assets, or API keys are needed. All graphics and audio are generated in code.

## Production

```sh
npm run build
```

Serve `dist/` at the root of any static HTTP server. `npm run preview` previews
the production build locally.

## Controls

| Input | Effect |
| --- | --- |
| W / S | Left paddle |
| Up / Down | Right paddle in Versus; also left paddle in Solo |
| W / S or Up / Down | Navigate menus |
| Enter / Space | Confirm |
| P / Escape | Pause / resume |
| Escape | Back from instructions or match results |
| M | Mute / unmute |
| Backtick | Engine diagnostic overlay |

Menu items also accept mouse clicks and touch taps. Touchscreen play uses the
engine's two vertical sliders and menu buttons. Move your paddle during contact
to add spin; edge contacts set steeper return angles.

## Development

`npm run typecheck`, `npm run lint`, `npm run format`, and `npm test` check types,
lint, formatting, and simulation tests with coverage. Tests use the real engine,
a counted clock, and an in-process canvas, without a browser.

`src/game.ts` declares the immutable state and exported game. Simulation, menus,
physics, debug transitions, and drawing live in separate modules. The engine owns
input, the frame clock, canvas fitting, audio, and recording. Automation reaches
the debug operations exclusively through `engine.debug`, applying transitions with
`engine.apply`. `showcase/` contains screenshots and an engine-recorded rally.
