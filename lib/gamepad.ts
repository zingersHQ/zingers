"use client";
// Gamepad support via a single shared poll, so any part of the game (the physics
// Handler, the camera rig, the HUD) can read controller state without threading
// refs. Standard-mapping layout (Xbox/DualShock):
//   left stick  → move        right stick → camera
//   A (0)       → jump / hold-to-fly
//   B (1)       → land / cancel-fly
//   X (2)       → interact (E)
//   RB (5)/LT(6)→ sprint (held)
//   Start (9)   → pause / settings
// Discrete actions expose a monotonic counter so consumers can detect a rising
// edge the same way the touch buttons do (compare against a remembered value).

export interface PadState {
  connected: boolean;
  lx: number; // -1..1, deadzoned (left stick X)
  ly: number; // -1..1, deadzoned (left stick Y, up = negative)
  rx: number; // -1..1, deadzoned (right stick X)
  ry: number; // -1..1, deadzoned (right stick Y)
  jumpHeld: boolean;
  sprintHeld: boolean;
  jump: number; // rising-edge counter (A)
  land: number; // rising-edge counter (B)
  interact: number; // rising-edge counter (X)
  pause: number; // rising-edge counter (Start)
}

const pad: PadState = {
  connected: false,
  lx: 0,
  ly: 0,
  rx: 0,
  ry: 0,
  jumpHeld: false,
  sprintHeld: false,
  jump: 0,
  land: 0,
  interact: 0,
  pause: 0,
};

const DEAD = 0.2;
function dz(v: number): number {
  if (Math.abs(v) < DEAD) return 0;
  // rescale so motion starts smoothly past the deadzone, preserving sign
  const s = (Math.abs(v) - DEAD) / (1 - DEAD);
  return Math.sign(v) * Math.min(1, s);
}

let started = false;
let raf = 0;
const prev: boolean[] = [];
let onChange: ((connected: boolean) => void) | null = null;

function pressed(buttons: readonly GamepadButton[], i: number): boolean {
  const b = buttons[i];
  return !!b && (b.pressed || b.value > 0.5);
}

function poll() {
  const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
  let gp: Gamepad | null = null;
  for (const p of pads) if (p && p.connected) { gp = p; break; }

  const wasConnected = pad.connected;
  if (!gp) {
    pad.connected = false;
    pad.lx = pad.ly = pad.rx = pad.ry = 0;
    pad.jumpHeld = pad.sprintHeld = false;
    if (wasConnected && onChange) onChange(false);
    raf = requestAnimationFrame(poll);
    return;
  }

  pad.connected = true;
  if (!wasConnected && onChange) onChange(true);

  const a = gp.axes;
  pad.lx = dz(a[0] ?? 0);
  pad.ly = dz(a[1] ?? 0);
  pad.rx = dz(a[2] ?? 0);
  pad.ry = dz(a[3] ?? 0);

  const b = gp.buttons;
  pad.jumpHeld = pressed(b, 0);
  pad.sprintHeld = pressed(b, 5) || pressed(b, 6); // RB or LT
  const edges: [number, "jump" | "land" | "interact" | "pause"][] = [
    [0, "jump"],
    [1, "land"],
    [2, "interact"],
    [9, "pause"],
  ];
  for (const [i, key] of edges) {
    const now = pressed(b, i);
    if (now && !prev[i]) pad[key]++;
    prev[i] = now;
  }

  raf = requestAnimationFrame(poll);
}

/** Start the shared poll loop (idempotent). Safe to call on mount. */
export function startGamepad(onConnChange?: (connected: boolean) => void) {
  if (onConnChange) onChange = onConnChange;
  if (started || typeof window === "undefined") return;
  started = true;
  raf = requestAnimationFrame(poll);
}

export function stopGamepad() {
  if (raf) cancelAnimationFrame(raf);
  started = false;
  raf = 0;
}

export function getPad(): PadState {
  return pad;
}
