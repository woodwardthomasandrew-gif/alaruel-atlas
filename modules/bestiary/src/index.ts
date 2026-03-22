// modules/bestiary/src/index.ts — public API barrel

export { BestiaryModule }   from './module';
export { BestiaryService }  from './service';
export type {
  CreateMonsterInput,
  UpdateMonsterInput,
  MonsterListQuery,
} from './types';
