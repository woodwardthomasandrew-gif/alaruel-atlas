/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';
import { renderPrintableSessionHtml } from './printResolver';
import type { PrintableSession } from '../types/print';

describe('renderPrintableSessionHtml', () => {
  it('renders scenes and entity counts/notes', () => {
    const session: PrintableSession = {
      id: 'ses_test',
      title: 'Export Test Session',
      description: 'Verification session for export layout.',
      status: 'planned',
      scheduledAt: '2026-03-28T19:00:00Z',
      scenes: [
        {
          id: 'scn_1',
          title: 'Entry',
          encounterType: 'exploration',
          objective: 'Find route',
          setup: 'Falling stones',
          reward: 'Map fragment',
          typeDetails: {},
          played: false,
          order: 0,
          npcs: [{ id: 'npc_1', name: 'Jorek', count: 1, notes: 'Role: ally' }],
          monsters: [{ id: 'mon_1', name: 'Ghoul', count: 3, notes: 'Flank from east' }],
          minis: [{ id: 'mini_1', name: 'Ghoul Mini', count: 3, notes: 'Base: medium' }],
        },
      ],
      prepItems: [{ id: 'prep_1', description: 'Print map', done: true }],
      notes: [{ id: 'note_1', phase: 'planning', content: 'Seed clues early.', createdAt: '2026-03-26T12:00:00Z' }],
      featuredNpcs: [{ id: 'npc_1', name: 'Jorek', count: 1, notes: 'Role: ally' }],
    };

    const html = renderPrintableSessionHtml(session);
    expect(html).toContain('Export Test Session');
    expect(html).toContain('Ghoul');
    expect(html).toContain('Flank from east');
    expect(html).toContain('<td>3</td>');
    expect(html).toContain('Print map');
    expect(html).toContain('Seed clues early.');
  });
});
