import type { UpdateApi } from "@clockwyrks/simple-2d";
import type { CaromState, Mode } from "./game";
import * as C from "./constants";
import { initial, park } from "./world";
export function items(s: CaromState): readonly string[] {
  switch (s.screen) {
    case "title":
      return C.TITLE_ITEMS;
    case "paused":
      return C.PAUSE_ITEMS;
    case "matchover":
      return C.MATCHOVER_ITEMS;
    case "howto":
      return ["BACK TO MENU"];
    default:
      return [];
  }
}
export function menuItemRect(s: CaromState, index: number) {
  if (index < 0 || index >= items(s).length || !Number.isInteger(index))
    return null;
  return {
    x: 460,
    y: (s.screen === "howto" ? 594 : 370) + index * 64,
    w: 360,
    h: 52,
  };
}
export function start(s: CaromState, mode: Mode): CaromState {
  const base = initial(s.muted);
  return {
    ...base,
    screen: "countdown",
    mode,
    titleIndex: s.titleIndex,
    simTime: s.simTime,
    paddles: {
      left: { ...s.paddles.left, cy: C.FIELD_CY, vy: 0 },
      right: { ...s.paddles.right, cy: C.FIELD_CY, vy: 0 },
    },
    ai: s.ai,
    ball: park(),
  };
}
export function title(s: CaromState): CaromState {
  return {
    ...initial(s.muted),
    titleIndex: s.titleIndex,
    menuIndex: s.titleIndex,
    simTime: s.simTime,
  };
}
function confirm(s: CaromState): CaromState {
  switch (s.screen) {
    case "title": {
      s = { ...s, titleIndex: s.menuIndex };
      return s.menuIndex === 2
        ? { ...s, screen: "howto", menuIndex: 0 }
        : start(s, s.menuIndex === 0 ? "solo" : "versus");
    }
    case "howto":
      return title(s);
    case "paused":
      return s.menuIndex === 0
        ? { ...s, screen: s.resumeScreen }
        : s.menuIndex === 1
          ? start(s, s.mode)
          : title(s);
    case "matchover":
      return s.menuIndex === 0 ? start(s, s.mode) : title(s);
    default:
      return s;
  }
}
// Pointer-down ownership is transient UI data, never a second simulation store.
export function input(s: CaromState, api: UpdateApi): CaromState {
  const edges = Object.fromEntries(
    C.ACTIONS.map((a) => [a, api.input.pressed(a)]),
  );
  const samples = api.input.pointerSamples();
  api.input.pointer();
  api.input.pointerContacts();
  if (edges.mute) api.audio.setMuted(!api.audio.muted());
  s = { ...s, muted: api.audio.muted() };
  const screen = s.screen;
  if (screen === "playing" || screen === "countdown")
    return edges.pause
      ? {
          ...s,
          screen: "paused",
          resumeScreen: screen,
          menuIndex: 0,
          menuPresses: {},
        }
      : s;
  if (screen === "paused" && (edges.pause || edges.back))
    return { ...s, screen: s.resumeScreen, menuPresses: {} };
  if ((screen === "howto" || screen === "matchover") && edges.back)
    return title(s);
  let keyboardConfirm = false;
  const count = items(s).length;
  if (edges["p1-up"] || edges["p2-up"])
    s = { ...s, menuIndex: (s.menuIndex + count - 1) % count };
  else if (edges["p1-down"] || edges["p2-down"])
    s = { ...s, menuIndex: (s.menuIndex + 1) % count };
  else if (edges.confirm) keyboardConfirm = true;
  const keyboardItem = s.menuIndex;
  const presses = { ...s.menuPresses };
  let pointerConfirm = false;
  for (const sample of samples) {
    let hit = -1;
    for (let i = 0; i < count; i++) {
      const r = menuItemRect(s, i);
      if (
        r &&
        sample.x >= r.x &&
        sample.x <= r.x + r.w &&
        sample.y >= r.y &&
        sample.y <= r.y + r.h
      )
        hit = i;
    }
    if (hit >= 0) s = { ...s, menuIndex: hit };
    if (sample.type === "down") presses[sample.id] = hit;
    if (sample.type === "up") {
      if (hit >= 0 && presses[sample.id] === hit) pointerConfirm = true;
      delete presses[sample.id];
    }
  }
  s = { ...s, menuPresses: presses };
  if (keyboardConfirm)
    return confirm({ ...s, menuIndex: keyboardItem, menuPresses: {} });
  return pointerConfirm ? confirm({ ...s, menuPresses: {} }) : s;
}
