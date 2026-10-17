import type {
  BallState,
  CaromState,
  Mode,
  Screen,
  Side,
  PaddleState,
} from "./game";
import { CAROM_DEBUG_VERSION } from "./constants";
import { initial, park, obstacle, drawSign } from "./world";
import { menuItemRect } from "./menus";
function ball(s: CaromState, patch: Partial<BallState>): CaromState {
  if (!s.ball) throw new Error("No ball on the field");
  return { ...s, ball: { ...s.ball, ...patch } };
}
function paddle(
  s: CaromState,
  side: Side,
  patch: Partial<PaddleState>,
): CaromState {
  return {
    ...s,
    paddles: { ...s.paddles, [side]: { ...s.paddles[side], ...patch } },
  };
}
export function createDebug() {
  return {
    version: CAROM_DEBUG_VERSION,
    clearWorld: (s: CaromState): CaromState => ({
      ...s,
      ball: null,
      obstacles: [],
    }),
    spawnBall: (s: CaromState): CaromState => ({ ...s, ball: park() }),
    spawnObstacle: (s: CaromState, index: number): CaromState => ({
      ...s,
      obstacles: [
        ...s.obstacles.filter((o) => o.index !== index),
        obstacle(index, s.obstacleClock),
      ].sort((a, b) => a.index - b.index),
    }),
    reset: (s: CaromState) => initial(s.muted),
    reconcile: (s: CaromState): CaromState => ({
      ...s,
      obstacles: s.obstacles.map((o) => obstacle(o.index, s.obstacleClock)),
    }),
    setScreen: (s: CaromState, screen: Screen): CaromState => ({
      ...s,
      screen,
    }),
    setMode: (s: CaromState, mode: Mode): CaromState => ({ ...s, mode }),
    setMenuIndex: (s: CaromState, menuIndex: number): CaromState => ({
      ...s,
      menuIndex,
    }),
    setTitleIndex: (s: CaromState, titleIndex: number): CaromState => ({
      ...s,
      titleIndex,
    }),
    setResumeScreen: (
      s: CaromState,
      resumeScreen: "countdown" | "playing",
    ): CaromState => ({ ...s, resumeScreen }),
    setScore: (s: CaromState, p1: number, p2: number): CaromState => ({
      ...s,
      score: { p1, p2 },
    }),
    setWinner: (s: CaromState, winner: Side | null): CaromState => ({
      ...s,
      winner,
    }),
    setReceiver: (s: CaromState, receiver: Side): CaromState => ({
      ...s,
      receiver,
    }),
    setPaddleCy: (s: CaromState, side: Side, cy: number) =>
      paddle(s, side, { cy }),
    setPaddleVy: (s: CaromState, side: Side, drivenVy: number) =>
      paddle(s, side, { drivenVy }),
    setPaddleDriven: (s: CaromState, side: Side, driven: boolean) =>
      paddle(s, side, { driven }),
    setBallPosition: (s: CaromState, x: number, y: number) => ball(s, { x, y }),
    setBallVelocity: (s: CaromState, vx: number, vy: number) =>
      ball(s, { vx, vy }),
    setBallSpin: (s: CaromState, spin: number) => ball(s, { spin }),
    setBallHeld: (s: CaromState, held: boolean) => ball(s, { held }),
    setBallHoldTimer: (s: CaromState, holdTimer: number) =>
      ball(s, { holdTimer }),
    setBallServeSign: (s: CaromState, serveSign: 1 | -1) =>
      ball(s, { serveSign }),
    drawBallServeSign: (s: CaromState) => ball(s, { serveSign: drawSign() }),
    setAiTracking: (s: CaromState, tracking: boolean): CaromState => ({
      ...s,
      ai: { ...s.ai, tracking },
    }),
    setAiMovement: (s: CaromState, movement: boolean): CaromState => ({
      ...s,
      ai: { ...s.ai, movement },
    }),
    setMuted: (s: CaromState, muted: boolean): CaromState => ({ ...s, muted }),
    setObstacleClock: (s: CaromState, obstacleClock: number): CaromState => ({
      ...s,
      obstacleClock,
      obstacles: s.obstacles.map((o) => obstacle(o.index, obstacleClock)),
    }),
    setObstacleClockRunning: (
      s: CaromState,
      obstacleClockRunning: boolean,
    ): CaromState => ({ ...s, obstacleClockRunning }),
    snapshot: (s: CaromState) => {
      const { menuPresses: _menuPresses, ...state } = s;
      return {
        ...state,
        version: CAROM_DEBUG_VERSION,
        ball: s.ball
          ? {
              ...s.ball,
              speed: Math.hypot(s.ball.vx, s.ball.vy),
              trail: s.ball.trail.map((t) => ({ ...t })),
            }
          : null,
      };
    },
    menuItemRect,
  };
}
