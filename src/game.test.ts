import { describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import { game, BACKGROUND } from "./game";
import * as C from "./constants";
async function setup(ms = 8) {
  const target = new EventTarget();
  const canvas = createCanvas(
    C.FIELD_W,
    C.FIELD_H,
  ) as unknown as HTMLCanvasElement;
  const engine = createEngine({
    canvas,
    width: C.FIELD_W,
    height: C.FIELD_H,
    game,
    background: BACKGROUND,
    clock: new ConstantClock(ms),
    layout: C.LAYOUT,
    surface: {
      cssWidth: () => C.FIELD_W,
      cssHeight: () => C.FIELD_H,
      dpr: () => 1,
      events: () => target,
    },
  });
  await engine.initialize();
  const key = (code: string, type = "keydown") =>
    target.dispatchEvent(
      Object.assign(new Event(type), { code, repeat: false }),
    );
  const press = async (code: string) => {
    key(code);
    await engine.advance(1);
    key(code, "keyup");
  };
  const pointer = (type: string, x: number, y: number, id = 1) =>
    target.dispatchEvent(
      Object.assign(new Event(type), {
        clientX: x,
        clientY: y,
        pointerId: id,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
      }),
    );
  const d = engine.debug;
  const pose = (f: (s: typeof engine.state) => typeof engine.state) =>
    engine.apply(f);
  return { engine, d, pose, key, press, pointer };
}
async function emptyFlight(ms = 8) {
  const h = await setup(ms);
  h.pose((s) => h.d.clearWorld(s));
  h.pose((s) => h.d.spawnBall(s));
  h.pose((s) => h.d.setScreen(s, "playing"));
  h.pose((s) => h.d.setMode(s, "versus"));
  h.pose((s) => h.d.setBallHeld(s, false));
  return h;
}
describe("Carom through the real engine", () => {
  it("initializes all state, bindings, diagnostics and renders", async () => {
    const { engine, d } = await setup();
    expect(d.snapshot(engine.state)).toMatchObject({
      version: 1,
      screen: "title",
      ball: { held: true, speed: 0 },
      score: { p1: 0, p2: 0 },
    });
    await engine.advance(2);
    expect(engine.diagnostics().every((r) => r.error === undefined)).toBe(true);
    expect(engine.state.simTime).toBeCloseTo(0.016);
    engine.destroy();
  });
  it("serves on expiry without advancing flight on that frame", async () => {
    const { engine, press, d, pose } = await setup(10);
    await press("Enter");
    pose((s) => d.setBallHoldTimer(s, 0.01));
    pose((s) => d.setBallServeSign(s, -1));
    await engine.advance(1);
    expect(engine.state.screen).toBe("playing");
    expect(engine.state.ball?.x).toBe(C.FIELD_CX);
    expect(engine.state.ball?.vy).toBeLessThan(0);
    expect(d.snapshot(engine.state).ball?.speed).toBeCloseTo(C.SERVE_SPEED);
    engine.destroy();
  });
  it("pauses and resumes exactly once on Escape, freezes world", async () => {
    const { engine, press } = await setup();
    await press("Enter");
    await press("Escape");
    const b = engine.state.ball,
      t = engine.state.obstacleClock;
    await engine.advance(4);
    expect(engine.state.screen).toBe("paused");
    expect(engine.state.ball).toEqual(b);
    expect(engine.state.obstacleClock).toBe(t);
    await press("Escape");
    expect(engine.state.screen).toBe("countdown");
    engine.destroy();
  });
  it("wraps menus, prioritizes up, remembers title selection", async () => {
    const { engine, key, press } = await setup();
    key("KeyW");
    key("KeyS");
    key("Enter");
    await engine.advance(1);
    for (const k of ["KeyW", "KeyS", "Enter"]) key(k, "keyup");
    expect(engine.state.menuIndex).toBe(2);
    await press("Enter");
    expect(engine.state.screen).toBe("howto");
    await press("Escape");
    expect(engine.state.menuIndex).toBe(2);
    expect(engine.state.titleIndex).toBe(2);
    engine.destroy();
  });
  it("requires pointer edges on the same item, including same-frame edges", async () => {
    const { engine, d, pointer } = await setup();
    const r = d.menuItemRect(engine.state, 1)!;
    pointer("pointerdown", r.x + 5, r.y + 5);
    pointer("pointerup", 0, 0);
    await engine.advance(1);
    expect(engine.state.screen).toBe("title");
    pointer("pointerdown", r.x + 5, r.y + 5);
    pointer("pointerup", r.x + 5, r.y + 5);
    await engine.advance(1);
    expect(engine.state.mode).toBe("versus");
    expect(engine.state.titleIndex).toBe(1);
    engine.destroy();
  });
  it("integrates driven velocity and clamps actual vy", async () => {
    const { engine, d, pose } = await emptyFlight();
    pose((s) => d.setPaddleCy(s, "left", C.PADDLE_MAX_CY - 1));
    pose((s) => d.setPaddleVy(s, "left", C.PADDLE_SPEED));
    pose((s) => d.setPaddleDriven(s, "left", true));
    await engine.advance(1);
    expect(engine.state.paddles.left.cy).toBe(C.PADDLE_MAX_CY);
    expect(engine.state.paddles.left.vy).toBeCloseTo(125);
    await engine.advance(1);
    expect(engine.state.paddles.left.vy).toBe(0);
    expect(engine.state.paddles.left.drivenVy).toBe(C.PADDLE_SPEED);
    engine.destroy();
  });
  it("adds paddle spin and speed, deduplicates collision cues", async () => {
    const { engine, d, pose } = await emptyFlight();
    const cues: string[] = [];
    engine.events.on("cue:played", (e) => cues.push(e.cue));
    pose((s) => d.setPaddleDriven(s, "left", true));
    pose((s) => d.setPaddleVy(s, "left", 200));
    pose((s) => d.setBallPosition(s, C.P1_X1 + C.BALL_R + 1, C.FIELD_CY));
    pose((s) => d.setBallVelocity(s, -600, 0));
    await engine.advance(1);
    expect(engine.state.ball?.vx).toBeGreaterThan(0);
    expect(d.snapshot(engine.state).ball?.speed).toBeCloseTo(624);
    expect(engine.state.ball?.spin).toBeGreaterThan(160);
    expect(cues).toEqual([C.CUES.paddleHit]);
    engine.destroy();
  });
  it("reflects walls without changing speed", async () => {
    const { engine, d, pose } = await emptyFlight();
    pose((s) => d.setBallPosition(s, 300, 12));
    pose((s) => d.setBallVelocity(s, 0, -900));
    await engine.advance(1);
    expect(engine.state.ball?.vy).toBe(900);
    expect(engine.state.ball?.y).toBeGreaterThanOrEqual(C.BALL_R);
    engine.destroy();
  });
  it("reflects oriented obstacles and keeps poses symmetric", async () => {
    const { engine, d, pose } = await emptyFlight();
    pose((s) => d.spawnObstacle(s, 0));
    pose((s) => d.spawnObstacle(s, 1));
    pose((s) => d.setObstacleClock(s, 0));
    pose((s) => d.setObstacleClockRunning(s, false));
    pose((s) => d.setBallPosition(s, 466, 220));
    pose((s) => d.setBallVelocity(s, 700, 0));
    await engine.advance(1);
    expect(engine.state.ball?.vx).toBe(-700);
    pose((s) => d.setObstacleClock(s, 1.1));
    expect(
      engine.state.obstacles[0].cy + engine.state.obstacles[1].cy,
    ).toBeCloseTo(C.FIELD_H);
    expect(engine.state.obstacles[0].theta).toBeCloseTo(
      C.OBSTACLE_SPIN_RATE * 1.1,
    );
    engine.destroy();
  });
  it("scores strict full-ball crossings and enforces win by two", async () => {
    const { engine, d, pose } = await emptyFlight();
    pose((s) => d.setScore(s, 10, 10));
    pose((s) => d.setBallPosition(s, C.FIELD_W + C.BALL_R + 1, 300));
    await engine.advance(1);
    expect(engine.state.screen).toBe("countdown");
    expect(engine.state.score.p1).toBe(11);
    expect(engine.state.receiver).toBe("right");
    pose((s) => d.setScreen(s, "playing"));
    pose((s) => d.setBallHeld(s, false));
    pose((s) => d.setBallPosition(s, C.FIELD_W + C.BALL_R + 1, 300));
    await engine.advance(1);
    expect(engine.state.screen).toBe("matchover");
    expect(engine.state.winner).toBe("left");
    engine.destroy();
  });
  it("gates AI and merges both human key sets in solo", async () => {
    const { engine, d, pose, key, press } = await setup();
    await press("Enter");
    pose((s) => d.setPaddleCy(s, "right", 100));
    pose((s) => d.setAiMovement(s, false));
    key("ArrowDown");
    await engine.advance(1);
    expect(engine.state.paddles.left.vy).toBe(C.PADDLE_SPEED);
    expect(engine.state.paddles.right.cy).toBe(100);
    key("ArrowDown", "keyup");
    pose((s) => d.setAiMovement(s, true));
    pose((s) => d.setAiTracking(s, false));
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(C.AI_SPEED);
    engine.destroy();
  });
  it("debug poses are immutable, absent entities fail loudly, reconcile is inert", async () => {
    const { engine, d, pose } = await setup();
    const before = engine.state;
    pose((s) => d.clearWorld(s));
    expect(before.ball).not.toBeNull();
    expect(() => d.setBallSpin(engine.state, 10)).toThrow();
    expect(() => d.spawnObstacle(engine.state, 9)).toThrow();
    pose((s) => d.spawnBall(s));
    pose((s) => d.setBallVelocity(s, 3, 4));
    pose((s) => d.setBallPosition(s, 50, 300));
    const now = d.snapshot(engine.state);
    pose((s) => d.reconcile(s));
    expect(d.snapshot(engine.state)).toEqual(now);
    pose((s) => d.setMuted(s, true));
    await engine.advance(1);
    expect(engine.state.muted).toBe(true);
    pose((s) => d.reset(s));
    expect(engine.state.simTime).toBe(0);
    expect(engine.state.muted).toBe(true);
    engine.destroy();
  });
  it("agrees across 2ms and 16ms flight with spin decay and wall bounces", async () => {
    const outcomes = [];
    for (const ms of [2, 16]) {
      const { engine, d, pose } = await emptyFlight(ms);
      pose((s) => d.setBallPosition(s, 300, 40));
      pose((s) => d.setBallVelocity(s, 200, -500));
      pose((s) => d.setBallSpin(s, 100));
      await engine.advance(800 / ms);
      outcomes.push(d.snapshot(engine.state).ball!);
      engine.destroy();
    }
    expect(outcomes[0].speed).toBeCloseTo(outcomes[1].speed);
    expect(Math.sign(outcomes[0].vx)).toBe(Math.sign(outcomes[1].vx));
    expect(Math.sign(outcomes[0].vy)).toBe(Math.sign(outcomes[1].vy));
    expect(outcomes[0].spin).toBeCloseTo(50);
  });
});
