import { BaseService }              from '../../_framework/src/index';
import type { EmitFn }              from '../../_framework/src/index';
import type { Logger }              from '../../../core/logger/src/types';
import type { Session }             from '../../../shared/src/types/session';
import type { SessionsRepository }  from './repository';
import type { CreateSessionInput, UpdateSessionInput } from './types';

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
}
