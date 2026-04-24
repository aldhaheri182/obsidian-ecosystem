/**
 * View router state. The user descends through: Orbit -> Nexus -> City
 * -> Building -> Agent -> Memory Node. Some views (Board Meeting,
 * Civilization Timeline, Graveyard) are side-modals that overlay a city.
 */

import { writable, derived, get } from 'svelte/store';

export type ViewId =
  | 'orbit'
  | 'nexus'
  | 'city'
  | 'building'
  | 'agent'
  | 'memoryNode'
  | 'boardMeeting'
  | 'timeline'
  | 'graveyard';

export type ViewContext = {
  view: ViewId;
  /** City that we're focused on (relevant from City onward). */
  cityId?: string;
  /** Building sprite id inside the city. */
  buildingId?: string;
  /** Agent id in focus. */
  agentId?: string;
  /** Memory node id. */
  memoryNodeId?: string;
};

const INITIAL: ViewContext = { view: 'orbit' };

export const viewCtx = writable<ViewContext>(INITIAL);

/** Descent actions. */
export function descend(next: Partial<ViewContext>): void {
  viewCtx.update(cur => ({ ...cur, ...next }));
}

/** Ascend back to parent view. */
export function ascend(): void {
  const { view, cityId, buildingId } = get(viewCtx);
  switch (view) {
    case 'memoryNode':
      viewCtx.update(v => ({ ...v, view: 'agent', memoryNodeId: undefined }));
      return;
    case 'agent':
      viewCtx.update(v => ({
        ...v,
        view: 'building',
        agentId: undefined,
      }));
      return;
    case 'building':
      viewCtx.update(v => ({ ...v, view: 'city', buildingId: undefined }));
      return;
    case 'boardMeeting':
    case 'timeline':
    case 'graveyard':
      viewCtx.update(v => ({ ...v, view: 'city' }));
      return;
    case 'city':
      viewCtx.update(v => ({ ...v, view: 'nexus', cityId: undefined }));
      return;
    case 'nexus':
      viewCtx.update(v => ({ ...v, view: 'orbit' }));
      return;
    default:
      return;
  }
}

/** Breadcrumb labels. */
export const breadcrumb = derived(viewCtx, c => {
  const trail: string[] = ['Orbit'];
  if (['nexus', 'city', 'building', 'agent', 'memoryNode',
       'boardMeeting', 'timeline', 'graveyard'].includes(c.view)) {
    trail.push('Nexus');
  }
  if (c.cityId) trail.push(c.cityId);
  if (c.buildingId) trail.push(c.buildingId);
  if (c.agentId) trail.push(c.agentId);
  if (c.memoryNodeId) trail.push('Node');
  if (c.view === 'boardMeeting') trail.push('Board Meeting');
  if (c.view === 'timeline') trail.push('Civilization Timeline');
  if (c.view === 'graveyard') trail.push('Agent Graveyard');
  return trail;
});
