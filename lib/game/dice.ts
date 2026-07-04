export const DICE_RESULT_HOLD_MS = 900;
export const DICE_RADIUS = 28;
export const DICE_FRICTION = 0.988;
export const DICE_BOUNCE = 0.62;
export const DICE_STOP_SPEED = 10;
export const DICE_MIN_LAUNCH_SPEED = 220;
export const DICE_MAX_LAUNCH_SPEED = 1200;
export const DICE_VELOCITY_SCALE = 2.4;
export const DICE_SAMPLE_WINDOW_MS = 140;

export const DICE_COUNT = 2;
export const DICE_PAIR_SPAWN_OFFSET = 22;

export function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollDicePair(): [number, number] {
  return [rollDie(), rollDie()];
}

export function createPairedThrowVelocities(
  baseVx: number,
  baseVy: number,
): [{ vx: number; vy: number }, { vx: number; vy: number }] {
  const base = normalizeThrowVelocity(baseVx, baseVy);
  const baseAngle = Math.atan2(base.vy, base.vx);
  const baseSpeed = Math.hypot(base.vx, base.vy);

  const spread = 0.45 + Math.random() * 0.35;
  const speedScaleA = 0.8 + Math.random() * 0.35;
  const speedScaleB = 0.8 + Math.random() * 0.35;

  const angleA = baseAngle + spread;
  const angleB = baseAngle - spread;
  const speedA = baseSpeed * speedScaleA;
  const speedB = baseSpeed * speedScaleB;

  return [
    { vx: Math.cos(angleA) * speedA, vy: Math.sin(angleA) * speedA },
    { vx: Math.cos(angleB) * speedB, vy: Math.sin(angleB) * speedB },
  ];
}

export function createPairedSpawnPoints(
  x: number,
  y: number,
): [{ x: number; y: number }, { x: number; y: number }] {
  const offset = DICE_PAIR_SPAWN_OFFSET;
  return [
    { x: x - offset, y: y - offset * 0.45 },
    { x: x + offset, y: y + offset * 0.45 },
  ];
}

export interface VelocitySample {
  x: number;
  y: number;
  t: number;
}

export interface DicePhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  angularVelocity: number;
}

export function computeThrowVelocity(samples: VelocitySample[]): {
  vx: number;
  vy: number;
} {
  if (samples.length < 2) {
    return { vx: 0, vy: 0 };
  }

  const last = samples[samples.length - 1];
  const recent = samples.filter((sample) => last.t - sample.t <= DICE_SAMPLE_WINDOW_MS);
  const first = recent[0] ?? samples[0];
  const dt = (last.t - first.t) / 1000;

  if (dt < 0.02) {
    return { vx: 0, vy: 0 };
  }

  return {
    vx: ((last.x - first.x) / dt) * DICE_VELOCITY_SCALE,
    vy: ((last.y - first.y) / dt) * DICE_VELOCITY_SCALE,
  };
}

export function normalizeThrowVelocity(vx: number, vy: number): {
  vx: number;
  vy: number;
} {
  let speed = Math.hypot(vx, vy);

  if (speed < 1) {
    const angle = Math.random() * Math.PI * 2;
    return {
      vx: Math.cos(angle) * DICE_MIN_LAUNCH_SPEED,
      vy: Math.sin(angle) * DICE_MIN_LAUNCH_SPEED,
    };
  }

  speed = Math.min(
    DICE_MAX_LAUNCH_SPEED,
    Math.max(DICE_MIN_LAUNCH_SPEED, speed),
  );

  return {
    vx: (vx / Math.hypot(vx, vy)) * speed,
    vy: (vy / Math.hypot(vx, vy)) * speed,
  };
}

export function createDicePhysics(
  x: number,
  y: number,
  vx: number,
  vy: number,
): DicePhysicsState {
  const speed = Math.hypot(vx, vy);
  return {
    x,
    y,
    vx,
    vy,
    rotation: 0,
    angularVelocity: (speed / 40) * (Math.random() > 0.5 ? 1 : -1),
  };
}

export function stepDicePhysics(
  state: DicePhysicsState,
  bounds: { width: number; height: number },
  dt: number,
): DicePhysicsState {
  let { x, y, vx, vy, rotation, angularVelocity } = state;
  const frameFriction = Math.pow(DICE_FRICTION, dt * 60);

  x += vx * dt;
  y += vy * dt;
  rotation += angularVelocity * dt;
  vx *= frameFriction;
  vy *= frameFriction;
  angularVelocity *= frameFriction;

  const radius = DICE_RADIUS;

  if (x < radius) {
    x = radius;
    vx = Math.abs(vx) * DICE_BOUNCE;
    angularVelocity += vy * 0.04;
  } else if (x > bounds.width - radius) {
    x = bounds.width - radius;
    vx = -Math.abs(vx) * DICE_BOUNCE;
    angularVelocity -= vy * 0.04;
  }

  if (y < radius) {
    y = radius;
    vy = Math.abs(vy) * DICE_BOUNCE;
    angularVelocity -= vx * 0.04;
  } else if (y > bounds.height - radius) {
    y = bounds.height - radius;
    vy = -Math.abs(vy) * DICE_BOUNCE;
    angularVelocity += vx * 0.04;
  }

  return { x, y, vx, vy, rotation, angularVelocity };
}

export function isDiceSettled(state: DicePhysicsState): boolean {
  return (
    Math.hypot(state.vx, state.vy) < DICE_STOP_SPEED &&
    Math.abs(state.angularVelocity) < 30
  );
}
