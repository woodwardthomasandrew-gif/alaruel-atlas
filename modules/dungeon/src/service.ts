import { BaseService } from '../../_framework/src/index';
import type { EmitFn } from '../../_framework/src/index';
import type { Logger } from '../../../core/logger/src/types';
import type { DungeonRepository } from './repository';
import type { Dungeon, GenerateDungeonInput } from './types';
import { generateDungeon } from './generator';

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

    this.requireRange(input.roomCount, 3, 80, 'roomCount');
    this.requireRange(input.width, 20, 220, 'width');
    this.requireRange(input.height, 20, 220, 'height');
    this.requireRange(input.roomSizeRange[0], 4, 30, 'roomSizeRange[0]');
    this.requireRange(input.roomSizeRange[1], input.roomSizeRange[0] + 1, 40, 'roomSizeRange[1]');
    this.requireRange(input.corridorDensity, 0, 1, 'corridorDensity');
    this.requireRange(input.spacing, 1, 3, 'spacing');

    this.requireOneOf(input.theme, ['crypt', 'cave', 'fortress', 'sewer', 'ruins', 'arcane_lab'], 'theme');

    const id = this.generateId();
    const now = this.now();

    const generated = generateDungeon(id, input);
    const dungeon: Dungeon = { ...generated, createdAt: now };

    this.repository.save(dungeon);
    this.emit('dungeon:generated', { dungeonId: dungeon.id });
    this.log.info('Dungeon generated', {
      dungeonId: dungeon.id,
      theme: input.theme,
      rooms: dungeon.roomCount,
      width: dungeon.grid.width,
      height: dungeon.grid.height,
      seed: dungeon.seed,
    });

    return dungeon;
  }

  delete(id: string): void {
    this.assertInitialised();
    if (!this.repository.delete(id)) throw new Error(`Dungeon not found: ${id}`);
    this.log.info('Dungeon deleted', { dungeonId: id });
  }
}
