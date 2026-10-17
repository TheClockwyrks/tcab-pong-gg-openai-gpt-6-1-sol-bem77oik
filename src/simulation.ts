import type { InitApi, UpdateApi } from "@clockwyrks/simple-2d";
import type { CaromState, CaromDebugApi, Side } from "./game";
import * as C from "./constants";
import { initial, integrate, obstacle, park } from "./world";
import { createDebug } from "./debug";
import { input } from "./menus";
import { flight } from "./physics";
export function initialize(
  api: InitApi<CaromState>,
): [CaromState, CaromDebugApi] {
  for (const a of C.ACTIONS)
    api.input.register(a, { keys: [...C.BINDINGS[a]] });
  const frequencies = [660, 240, 390, 880];
  Object.values(C.CUES).forEach((cue, i) =>
    api.audio.define(cue, {
      wave: i === 2 ? "triangle" : "sine",
      freq: frequencies[i],
      freqTo: frequencies[i] * (i === 3 ? 1.5 : 0.6),
      durationMs: i === 3 ? 180 : 65,
      gain: 0.16,
    }),
  );
  api.diagnostics.register("screen", (s) => s.screen);
  api.diagnostics.register("mode", (s) => s.mode);
  api.diagnostics.register("score", (s) => `${s.score.p1} : ${s.score.p2}`);
  for (const field of ["x", "y", "vx", "vy", "spin"] as const)
    api.diagnostics.register(`ball.${field}`, (s) => s.ball?.[field] ?? "none");
  api.diagnostics.register("ball.speed", (s) =>
    s.ball ? Math.hypot(s.ball.vx, s.ball.vy) : "none",
  );
  for (const side of ["left", "right"] as const)
    for (const f of ["cy", "vy"] as const)
      api.diagnostics.register(`${side}.${f}`, (s) => s.paddles[side][f]);
  return [initial(), createDebug()];
}
export function update(
  state: CaromState,
  api: UpdateApi,
  dt: number,
): CaromState {
  // A debug mute pose is state, applied to the bus before reading this frame's toggle.
  api.audio.setMuted(state.muted);
  let s = input({ ...state, simTime: state.simTime + dt }, api);
  if (s.screen !== "playing" && s.screen !== "countdown") return s;
  const value = (a: C.ActionName) => api.input.value(a) > 0;
  const leftUp = value("p1-up") || (s.mode === "solo" && value("p2-up"));
  const leftDown = value("p1-down") || (s.mode === "solo" && value("p2-down"));
  let rightVy =
    (Number(value("p2-down")) - Number(value("p2-up"))) * C.PADDLE_SPEED;
  if (s.mode === "solo") {
    const defending =
      s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0;
    const target =
      defending && s.ball ? s.ball.y - s.ball.vy * C.AI_REACT : C.AI_HOME_Y;
    const diff = target - s.paddles.right.cy;
    rightVy =
      !s.ai.movement ||
      Math.abs(diff) <= (defending ? C.AI_DEADZONE : C.AI_HOME_DEADZONE)
        ? 0
        : Math.sign(diff) *
          Math.min(C.AI_SPEED, dt > 0 ? Math.abs(diff) / dt : 0);
  }
  s = {
    ...s,
    paddles: {
      left: integrate(
        s.paddles.left,
        s.paddles.left.driven
          ? s.paddles.left.drivenVy
          : (Number(leftDown) - Number(leftUp)) * C.PADDLE_SPEED,
        dt,
      ),
      right: integrate(
        s.paddles.right,
        s.paddles.right.driven ? s.paddles.right.drivenVy : rightVy,
        dt,
      ),
    },
  };
  const cues = new Set<C.CueName>();
  if (s.ball) {
    let b = s.ball;
    if (s.screen === "countdown") {
      const holdTimer = Math.max(0, b.holdTimer - dt);
      b = { ...b, holdTimer };
      if (holdTimer <= 0) {
        b = {
          ...b,
          held: false,
          trail: [],
          vx:
            (s.receiver === "left" ? -1 : 1) *
            C.SERVE_SPEED *
            Math.cos(C.SERVE_ANGLE),
          vy: b.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
        };
        s = { ...s, screen: "playing" };
      }
    } else if (!b.held) b = flight(b, s, dt, cues);
    b = {
      ...b,
      trail: [...b.trail, { x: b.x, y: b.y, t: s.simTime }].filter(
        (t) => s.simTime - t.t <= C.TRAIL_TIME,
      ),
    };
    s = { ...s, ball: b };
    let scorer: Side | null = null;
    if (!b.held && b.x - C.BALL_R > C.FIELD_W) scorer = "left";
    else if (!b.held && b.x + C.BALL_R < 0) scorer = "right";
    if (scorer) {
      cues.add(C.CUES.score);
      const score = {
        ...s.score,
        [scorer === "left" ? "p1" : "p2"]:
          s.score[scorer === "left" ? "p1" : "p2"] + 1,
      };
      const won =
        (score.p1 >= C.WIN_SCORE && score.p1 - score.p2 >= C.WIN_LEAD) ||
        (score.p2 >= C.WIN_SCORE && score.p2 - score.p1 >= C.WIN_LEAD);
      s = {
        ...s,
        score,
        ...(won
          ? { screen: "matchover" as const, winner: scorer, menuIndex: 0 }
          : {
              screen: "countdown" as const,
              receiver:
                scorer === "left" ? ("right" as const) : ("left" as const),
              ball: park(),
            }),
      };
    }
  }
  const obstacleClock = s.obstacleClock + (s.obstacleClockRunning ? dt : 0);
  s = {
    ...s,
    obstacleClock,
    obstacles: s.obstacles.map((o) => obstacle(o.index, obstacleClock)),
  };
  for (const cue of cues) api.audio.play(cue);
  return s;
}
