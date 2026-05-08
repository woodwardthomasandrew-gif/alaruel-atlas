// modules/timeline/src/module.ts
//
// TimelineModule — wires the timeline backend into the Atlas plugin system.
//
// Auto-generates timeline entries from other module events:
//   • quest:completed, quest:failed
//   • session:ended
//   • (extensible — add more ctx.subscribe calls below)
//
// The timeline is a PROJECTION layer. It does not own authoritative data.

import { BaseModule }                        from '../../_framework/src/index';
import type { ModuleManifest, ModuleContext } from '../../_framework/src/index';
import type { IDatabaseManager }              from '../../../core/database/src/types';
import { TimelineRepository }                from './repository';
import { TimelineService }                   from './service';
import { TIMELINE_SCHEMA }                   from './schema';

export class TimelineModule extends BaseModule<TimelineRepository, TimelineService> {
  readonly manifest: ModuleManifest = Object.freeze({
    id:          'timeline',
    displayName: 'Timeline',
    version:     '2.0.0',
    dependsOn:   ['npcs', 'quests', 'sessions', 'factions'],
    required:    false,
    description: 'Campaign chronology — a living chronicle of the campaign world',
  });

  protected createRepository(db: IDatabaseManager): TimelineRepository {
    return new TimelineRepository(db, this.log.child('repo'));
  }

  protected createService(repo: TimelineRepository): TimelineService {
    return new TimelineService(repo, this.log.child('service'), this._emit.bind(this));
  }

  protected async onInit(ctx: ModuleContext): Promise<void> {
    ctx.registerSchema(TIMELINE_SCHEMA);

    // ── Quest events ─────────────────────────────────────────────────────────

    ctx.subscribe('quest:completed', ({ questId }: { questId: string }) => {
      this._safeCreate({
        name:          'Quest Completed',
        description:   `Quest ${questId} was completed by the party.`,
        eventType:     'quest',
        significance:  'moderate',
        questId,
        isPlayerFacing: true,
      });
    });

    ctx.subscribe('quest:failed', ({ questId }: { questId: string }) => {
      this._safeCreate({
        name:          'Quest Failed',
        description:   `Quest ${questId} ended in failure.`,
        eventType:     'quest',
        significance:  'minor',
        questId,
        isPlayerFacing: true,
      });
    });

    ctx.subscribe('quest:created', ({ questId }: { questId: string }) => {
      this._safeCreate({
        name:          'New Quest Accepted',
        description:   `The party took on quest ${questId}.`,
        eventType:     'quest',
        significance:  'trivial',
        questId,
        isPlayerFacing: true,
      });
    });

    // ── Session events ────────────────────────────────────────────────────────

    ctx.subscribe('session:ended', ({ sessionId }: { sessionId: string }) => {
      this._safeCreate({
        name:          'Session Ended',
        description:   `Session ${sessionId} concluded.`,
        eventType:     'other',
        significance:  'trivial',
        sessionId,
        isPlayerFacing: false,
      });
    });

    // ── Faction events ────────────────────────────────────────────────────────
    // Placeholder subscriptions — emit-side integration is future work.
    // The architecture is in place; add ctx.subscribe calls here as faction
    // events are added to the event bus.

    // ctx.subscribe('faction:war-declared', ...) — future
    // ctx.subscribe('faction:alliance-formed', ...) — future
    // ctx.subscribe('npc:died', ...) — future

    this.log.info('Timeline module ready (v2 — Chronicle Mode)');
  }

  /** Attempt to create a timeline entry. Failures are non-fatal. */
  private _safeCreate(input: Parameters<TimelineService['create']>[0]): void {
    try {
      this.service.create(input);
    } catch (err) {
      this.log.warn('Timeline auto-entry failed', { err });
    }
  }

  getService(): TimelineService { return this.service; }
}
