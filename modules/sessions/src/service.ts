import { BaseService }             from '../../_framework/src/index';
import type { EmitFn }             from '../../_framework/src/index';
import type { Logger }             from '../../../core/logger/src/types';
import type { Session, SessionScene } from '../../../shared/src/types/session';
import type { SessionsRepository } from './repository';
import type {
  CreateSessionInput, UpdateSessionInput,
  AddSceneMonsterInput, UpdateSceneMonsterInput,
  AddSceneMiniInput, UpdateSceneMiniInput,
  AddSceneNpcInput,
} from './types';

export class SessionsService extends BaseService<SessionsRepository> {
  constructor(repository: SessionsRepository, log: Logger, emit: EmitFn) {
    super('sessions', repository, log, emit);
  }

  list(): Session[] {
    this.assertInitialised();
    return this.repository.findAll();
  }

  getById(id: string): Session | null {
    this.assertInitialised();
    return this.repository.findById(id);
  }

  create(input: CreateSessionInput): Session {
    this.assertInitialised();
    this.requireString(input.name, 'name');
    const sessionNumber = this.repository.nextSessionNumber();
    const session = this.repository.create({
      ...input, name: input.name.trim(),
      id: this.generateId(), sessionNumber,
      createdAt: this.now(), updatedAt: this.now(),
    });
    this.emit('session:started', { sessionId: session.id });
    this.log.info('Session created', { sessionId: session.id, number: sessionNumber });
    return session;
  }

  update(input: UpdateSessionInput): Session {
    this.assertInitialised();
    if (input.name !== undefined) this.requireString(input.name, 'name');
    if (!this.repository.findById(input.id)) throw new Error(`Session not found: ${input.id}`);
    const updated = this.repository.update({ ...input, updatedAt: this.now() });
    if (!updated) throw new Error(`Session update failed: ${input.id}`);
    if (input.status === 'completed') this.emit('session:ended', { sessionId: updated.id });
    return updated;
  }

  delete(id: string): void {
    this.assertInitialised();
    if (!this.repository.delete(id)) throw new Error(`Session not found: ${id}`);
  }

  addNote(sessionId: string, phase: 'planning'|'live'|'recap', content: string) {
    this.assertInitialised();
    this.requireString(content, 'content');
    return this.repository.addNote(sessionId, phase, content.trim(), this.generateId(), this.now());
  }

  addPrepItem(sessionId: string, description: string) {
    this.assertInitialised();
    this.requireString(description, 'description');
    const count = (this.repository.findById(sessionId)?.prepItems.length ?? 0);
    return this.repository.addPrepItem(sessionId, description.trim(), this.generateId(), count);
  }

  togglePrepItem(sessionId: string, itemId: string, done: boolean): Session {
    this.assertInitialised();
    this.repository.togglePrepItem(itemId, done);
    return this.repository.findById(sessionId) ?? (() => { throw new Error(`Session not found: ${sessionId}`); })();
  }

  // ── Scene encounter methods ───────────────────────────────────────────────

  addNpcToScene(sessionId: string, input: AddSceneNpcInput): SessionScene {
    this.assertInitialised();
    this.repository.addSceneNpc(input, sessionId);
    const scene = this.repository.findSceneById(input.sceneId);
    if (!scene) throw new Error(`Scene not found: ${input.sceneId}`);
    this.emit('session:encounter-updated', { sessionId, sceneId: input.sceneId });
    return scene;
  }

  removeNpcFromScene(sessionId: string, sceneId: string, npcId: string): SessionScene {
    this.assertInitialised();
    this.repository.removeSceneNpc(sceneId, npcId);
    const scene = this.repository.findSceneById(sceneId);
    if (!scene) throw new Error(`Scene not found: ${sceneId}`);
    this.emit('session:encounter-updated', { sessionId, sceneId });
    return scene;
  }

  addMonsterToScene(sessionId: string, input: AddSceneMonsterInput): SessionScene {
    this.assertInitialised();
    this.repository.upsertSceneMonster(input);
    const scene = this.repository.findSceneById(input.sceneId);
    if (!scene) throw new Error(`Scene not found: ${input.sceneId}`);
    this.emit('session:encounter-updated', { sessionId, sceneId: input.sceneId });
    this.log.info('Monster added to scene', { sessionId, sceneId: input.sceneId, monsterId: input.monsterId });
    return scene;
  }

  updateSceneMonster(sessionId: string, input: UpdateSceneMonsterInput): SessionScene {
    this.assertInitialised();
    this.repository.upsertSceneMonster(input);
    const scene = this.repository.findSceneById(input.sceneId);
    if (!scene) throw new Error(`Scene not found: ${input.sceneId}`);
    this.emit('session:encounter-updated', { sessionId, sceneId: input.sceneId });
    return scene;
  }

  removeMonsterFromScene(sessionId: string, sceneId: string, monsterId: string): SessionScene {
    this.assertInitialised();
    this.repository.removeSceneMonster(sceneId, monsterId);
    const scene = this.repository.findSceneById(sceneId);
    if (!scene) throw new Error(`Scene not found: ${sceneId}`);
    this.emit('session:encounter-updated', { sessionId, sceneId });
    this.log.info('Monster removed from scene', { sessionId, sceneId, monsterId });
    return scene;
  }

  addMiniToScene(sessionId: string, input: AddSceneMiniInput): SessionScene {
    this.assertInitialised();
    this.repository.upsertSceneMini(input);
    const scene = this.repository.findSceneById(input.sceneId);
    if (!scene) throw new Error(`Scene not found: ${input.sceneId}`);
    this.emit('session:encounter-updated', { sessionId, sceneId: input.sceneId });
    this.log.info('Mini added to scene', { sessionId, sceneId: input.sceneId, miniId: input.miniId });
    return scene;
  }

  updateSceneMini(sessionId: string, input: UpdateSceneMiniInput): SessionScene {
    this.assertInitialised();
    this.repository.upsertSceneMini(input);
    const scene = this.repository.findSceneById(input.sceneId);
    if (!scene) throw new Error(`Scene not found: ${input.sceneId}`);
    this.emit('session:encounter-updated', { sessionId, sceneId: input.sceneId });
    return scene;
  }

  removeMiniFromScene(sessionId: string, sceneId: string, miniId: string): SessionScene {
    this.assertInitialised();
    this.repository.removeSceneMini(sceneId, miniId);
    const scene = this.repository.findSceneById(sceneId);
    if (!scene) throw new Error(`Scene not found: ${sceneId}`);
    this.emit('session:encounter-updated', { sessionId, sceneId });
    this.log.info('Mini removed from scene', { sessionId, sceneId, miniId });
    return scene;
  }
}
