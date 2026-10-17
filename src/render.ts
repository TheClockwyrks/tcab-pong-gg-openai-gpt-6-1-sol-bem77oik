import type { RenderApi } from "@clockwyrks/simple-2d";
import type { CaromState } from "./game";
import * as C from "./constants";
import { items, menuItemRect } from "./menus";
const ink = "#eaf2ed",
  soft = "#819493",
  mint = "#a8f0c6",
  coral = "#ff8e78",
  gold = "#e8bf70";
export function render(s: CaromState, api: RenderApi): void {
  const ctx = api.ctx;
  const text = (
    copy: string,
    x: number,
    y: number,
    size = 16,
    color = ink,
    align: CanvasTextAlign = "left",
    weight = 400,
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${size > 50 ? "Arial, sans-serif" : "monospace"}`;
    ctx.textAlign = align;
    ctx.fillText(copy, x, y);
  };
  const line = (
    x: number,
    y: number,
    x2: number,
    y2: number,
    color: string,
  ) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    color: string,
  ) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  };
  ctx.save();
  const bg = ctx.createRadialGradient(
    C.FIELD_CX,
    C.FIELD_CY,
    20,
    C.FIELD_CX,
    C.FIELD_CY,
    760,
  );
  bg.addColorStop(0, "#14242b");
  bg.addColorStop(1, "#0b121c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  // Sparse precision grid and court markings keep the field readable at speed.
  ctx.fillStyle = "#23343c";
  for (let x = 32; x < C.FIELD_W; x += 32)
    for (let y = 32; y < C.FIELD_H; y += 32) ctx.fillRect(x, y, 1, 1);
  const menu = s.screen === "title" || s.screen === "howto";
  ctx.save();
  ctx.globalAlpha = menu ? 0.2 : 1;
  line(24, 16, C.FIELD_W - 24, 16, "#385058");
  line(24, C.FIELD_H - 16, C.FIELD_W - 24, C.FIELD_H - 16, "#385058");
  ctx.setLineDash([5, 13]);
  line(C.NET_X, 20, C.NET_X, C.FIELD_H - 20, "#31434b");
  ctx.setLineDash([]);
  ctx.strokeStyle = "#273d44";
  ctx.beginPath();
  ctx.arc(C.FIELD_CX, C.FIELD_CY, 86, 0, Math.PI * 2);
  ctx.stroke();
  for (const o of s.obstacles) {
    ctx.save();
    ctx.translate(o.cx, o.cy);
    ctx.rotate(o.theta);
    ctx.shadowColor = gold;
    ctx.shadowBlur = 16;
    rect(-C.OBSTACLE_HW, -C.OBSTACLE_HH, C.OBSTACLE_W, C.OBSTACLE_H, 7, gold);
    ctx.shadowBlur = 0;
    rect(-3, -C.OBSTACLE_HH + 12, 6, C.OBSTACLE_H - 24, 3, "#f8d992");
    ctx.restore();
    text(o.index === 0 ? "A" : "B", o.cx + 30, o.cy + 5, 11, gold);
  }
  for (const side of ["left", "right"] as const) {
    const p = s.paddles[side],
      x = side === "left" ? C.P1_X0 : C.P2_X0,
      color = side === "left" ? mint : coral;
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    rect(x, p.cy - C.PADDLE_HALF, C.PADDLE_W, C.PADDLE_H, 8, color);
    ctx.shadowBlur = 0;
    line(x + 6, p.cy - 22, x + 6, p.cy + 22, "#ffffff77");
  }
  if (s.ball) {
    const b = s.ball;
    ctx.lineCap = "round";
    for (let i = 1; i < b.trail.length; i++) {
      const a = b.trail[i - 1],
        z = b.trail[i];
      ctx.globalAlpha = (menu ? 0.2 : 1) * (i / b.trail.length) * 0.45;
      ctx.strokeStyle = mint;
      ctx.lineWidth = (C.BALL_R * 2 * i) / b.trail.length;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(z.x, z.y);
      ctx.stroke();
    }
    ctx.globalAlpha = menu ? 0.2 : 1;
    ctx.shadowColor = ink;
    ctx.shadowBlur = 22;
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(b.x, b.y, C.BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
  text("C /", 40, 51, 20, mint, "left", 700);
  text("CAROM  /  PADDLE DUEL", 81, 49, 11, soft);
  text(s.muted ? "M  SOUND OFF" : "M  SOUND ON", 1240, 49, 11, soft, "right");
  text("SPIN CHANGES EVERYTHING", 40, 681, 11, soft);
  text("11 POINTS  /  WIN BY 2", 1240, 681, 11, soft, "right");
  if (!menu) {
    text(String(s.score.p1).padStart(2, "0"), 550, 104, 64, mint, "right", 700);
    text(String(s.score.p2).padStart(2, "0"), 730, 104, 64, coral, "left", 700);
    text(
      s.mode === "solo" ? "SOLO / YOU vs AI" : "VERSUS / LOCAL DUEL",
      C.FIELD_CX,
      132,
      11,
      soft,
      "center",
    );
    text(
      s.mode === "solo" ? "YOU  /  W S or ↑ ↓" : "01  /  W S",
      100,
      630,
      12,
      mint,
    );
    text(
      s.mode === "solo" ? "AI / 02" : "↑ ↓  /  02",
      1180,
      630,
      12,
      coral,
      "right",
    );
    text("P / ESC  PAUSE", C.FIELD_CX, 681, 11, soft, "center");
  }
  if (s.screen === "countdown") {
    text("GET READY", C.FIELD_CX, 280, 14, mint, "center");
    text(
      s.receiver === "left" ? "SERVING LEFT ←" : "→ SERVING RIGHT",
      C.FIELD_CX,
      454,
      12,
      soft,
      "center",
    );
    const t = s.ball?.holdTimer ?? 0;
    ctx.strokeStyle = mint;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      C.FIELD_CX,
      C.FIELD_CY,
      32,
      -Math.PI / 2,
      -Math.PI / 2 + (Math.PI * 2 * t) / C.HOLD_TIME,
    );
    ctx.stroke();
  }
  if (s.screen === "paused" || s.screen === "matchover") {
    ctx.fillStyle = "#0b121ce8";
    ctx.fillRect(300, 174, 680, 436);
  }
  if (s.screen === "title") {
    text("A GAME OF ANGLES & INSTINCT", C.FIELD_CX, 177, 13, gold, "center");
    text(C.TITLE_TEXT, C.FIELD_CX, 291, 112, ink, "center", 800);
    text(
      "Find your angle. Put a little spin on it.",
      C.FIELD_CX,
      332,
      15,
      soft,
      "center",
    );
    text("01", 432, 399, 12, mint, "right");
    text("02", 432, 463, 12, soft, "right");
    text("?", 432, 527, 12, soft, "right");
    text(
      "W S / ↑ ↓  SELECT     ENTER  PLAY",
      C.FIELD_CX,
      620,
      12,
      soft,
      "center",
    );
    // Bank-shot diagram, an original identity mark.
    ctx.save();
    ctx.translate(1000, 285);
    ctx.rotate(-0.2);
    ctx.setLineDash([4, 8]);
    line(-80, 85, 0, 0, "#62766a");
    line(0, 0, 95, 60, "#62766a");
    ctx.setLineDash([]);
    rect(-6, -45, 12, 90, 6, gold);
    ctx.fillStyle = mint;
    ctx.beginPath();
    ctx.arc(95, 60, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (s.screen === "paused") {
    text("TAKE A BREATHER", C.FIELD_CX, 249, 12, gold, "center");
    text("PAUSED", C.FIELD_CX, 317, 56, ink, "center", 700);
  }
  if (s.screen === "matchover") {
    text("MATCH COMPLETE", C.FIELD_CX, 234, 12, gold, "center");
    text(
      s.winner === "left"
        ? "PLAYER ONE WINS"
        : s.mode === "solo"
          ? "AI WINS"
          : "PLAYER TWO WINS",
      C.FIELD_CX,
      290,
      38,
      s.winner === "left" ? mint : coral,
      "center",
      700,
    );
    text(`${s.score.p1}  —  ${s.score.p2}`, C.FIELD_CX, 334, 24, ink, "center");
  }
  if (s.screen === "howto") {
    ctx.fillStyle = "#0b121cf0";
    ctx.fillRect(240, 100, 800, 560);
    text("THE ART OF THE RETURN", C.FIELD_CX, 167, 12, gold, "center");
    text("HOW TO PLAY", C.FIELD_CX, 225, 48, ink, "center", 700);
    const rows = [
      ["01 / MOVE", "SOLO: W / S or ↑ / ↓.  VERSUS: W / S vs ↑ / ↓."],
      [
        "02 / CURVE",
        "Move as you strike. Paddle motion bends the ball's flight.",
      ],
      [
        "03 / BANK",
        "Use the rotating gold obstacles to find unexpected angles.",
      ],
      ["04 / WIN", "Reach 11, lead by 2. P / Esc pauses. M toggles sound."],
    ];
    rows.forEach(([a, b], i) => {
      text(a, 300, 284 + i * 70, 12, mint);
      text(b, 300, 310 + i * 70, 13, soft);
    });
  }
  items(s).forEach((label, i) => {
    const r = menuItemRect(s, i);
    if (!r) return;
    const selected = i === s.menuIndex;
    rect(r.x, r.y, r.w, r.h, 5, selected ? mint : "#15242c");
    if (!selected) {
      ctx.strokeStyle = "#2b3c43";
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    }
    text(
      label,
      r.x + 24,
      r.y + 33,
      16,
      selected ? "#10221e" : ink,
      "left",
      selected ? 700 : 400,
    );
    if (selected) text("→", r.x + r.w - 23, r.y + 34, 21, "#10221e", "right");
  });
  ctx.restore();
}
