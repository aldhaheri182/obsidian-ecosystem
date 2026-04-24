/**
 * Obsidian Ecosystem — Motion Language
 * Authorized by: Cinematic UI spec Part I.4, Part 9.
 * "Nothing moves without cause."
 */

import type { gsap } from 'gsap';

/** Easing curves — mirror the spec cubic-bezier values. */
export const EASE = {
  // Agent movement: deliberate, slightly weighted at step end.
  agent: 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
  // Message packets: accelerate quickly, decelerate smoothly.
  packet: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
  // UI panels: smooth, no bounce.
  panel: 'cubic-bezier(0.33, 0.0, 0.67, 1.0)',
  // View transitions: descent feeling.
  descent: 'cubic-bezier(0.55, 0, 1, 0.45)',
  // Zoom in to a city: expand smoothly.
  zoomIn: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/** Spring parameters for alerts / override spikes. */
export const SPRING_ALERT = { mass: 1, stiffness: 300, damping: 20 };

/** View transition durations (ms). */
export const TRANSITION_MS = {
  orbitToNexus: 800,
  nexusToCity: 600,
  cityToBuilding: 400,
  buildingToAgent: 500,
  agentToNode: 300,
} as const;

/** Advancement orb travel duration by tier (ms). */
export const ORB_DURATION_MS: Record<string, number> = {
  Tiny: 1500,
  Small: 2500,
  Medium: 4000,
  Big: 7000,
  Mega: 12000,
};

/** Packet speed multipliers by priority. */
export const PACKET_PRIORITY_SPEED: Record<string, number> = {
  PRIORITY_LOW: 0.5,
  PRIORITY_NORMAL: 1.0,
  PRIORITY_HIGH: 2.0,
  PRIORITY_CRITICAL: 3.0,
};
