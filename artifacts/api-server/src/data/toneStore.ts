// Editable tone-of-voice principles. Like the Brand Guardian skill, the tone
// principles are governed brand material a Brand-area admin can refine live.
// Held in memory (no DB, per project constraints): edits survive for the life
// of the server process and reset to the governed default on restart or on an
// explicit reset.

import { TONE_PRINCIPLES, type TonePrinciple } from "./brandRoom";

function clone(principles: TonePrinciple[]): TonePrinciple[] {
  return principles.map((p) => ({
    ...p,
    dos: [...p.dos],
    donts: [...p.donts],
  }));
}

// Captured lazily on first access so this module never touches the imported
// default at load time — avoids a circular-import ordering hazard with brandRoom.
let defaults: TonePrinciple[] | null = null;
function defaultPrinciples(): TonePrinciple[] {
  if (!defaults) defaults = clone(TONE_PRINCIPLES);
  return defaults;
}

export interface ToneState {
  principles: TonePrinciple[];
  version: number;
  updatedAt: string;
  isDefault: boolean;
}

let state: ToneState | null = null;
function ensureState(): ToneState {
  if (!state) {
    state = {
      principles: clone(defaultPrinciples()),
      version: 1,
      updatedAt: new Date().toISOString(),
      isDefault: true,
    };
  }
  return state;
}

function isDefaultSet(principles: TonePrinciple[]): boolean {
  return JSON.stringify(principles) === JSON.stringify(defaultPrinciples());
}

export function getTonePrinciples(): TonePrinciple[] {
  return ensureState().principles;
}

export function getToneState(): ToneState {
  return ensureState();
}

export function updateTonePrinciples(principles: TonePrinciple[]): ToneState {
  const current = ensureState();
  const next = clone(principles);
  state = {
    principles: next,
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
    isDefault: isDefaultSet(next),
  };
  return state;
}

export function resetTonePrinciples(): ToneState {
  const current = ensureState();
  state = {
    principles: clone(defaultPrinciples()),
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
    isDefault: true,
  };
  return state;
}
