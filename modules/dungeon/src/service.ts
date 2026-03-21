// modules/dungeon/src/service.ts
import { BaseService }           from '../../_framework/src/index';
import type { EmitFn }           from '../../_framework/src/index';
import type { Logger }           from '../../../core/logger/src/types';
import type { DungeonRepository } from './repository';
import type { Dungeon, GenerateDungeonInput } from './types';
import { generateDungeon }       from './generator';

export class DungeonService extends BaseService<DungeonRepository> {
  constructor(repository: DungeonRepository, log: Logger, emit: EmitFn) {
    super('dungeon', repository, log, emit);
  }

  list(): Dungeon[] {
    this.assertInitialised();
    return this.repository.findAll();
  }

  getById(id: string): Dungeon | null {
    this.assertInitialised();
    return this.repository.findById(id);
  }

  generate(input: GenerateDungeonInput): Dungeon {
    this.assertInitialised();
    this.requireRange(input.roomCount, 3, 30, 'roomCount');
    this.requireOneOf(input.theme,
      ['undead','goblin','arcane','cult','nature','aberration'],
      'theme',
    );

    const id  = this.generateId();
    const now = this.now();

    const generated = generateDungeon(id, input);
    const dungeon: Dungeon = { ...generated, createdAt: now };

    this.repository.save(dungeon);
    this.emit('dungeon:generated', { dungeonId: dungeon.id });
    this.log.info('Dungeon generated', { dungeonId: dungeon.id, theme: input.theme, rooms: input.roomCount });

    return dungeon;
  }

  delete(id: string): void {
    this.assertInitialised();
    if (!this.repository.delete(id)) throw new Error(`Dungeon not found: ${id}`);
    this.log.info('Dungeon deleted', { dungeonId: id });
  }
}
