import { migrate, type MigratableDb } from './migrations';

function fakeDb(userVersion: number) {
  const executed: string[] = [];
  const db: MigratableDb = {
    getFirstSync: <T>() => ({ user_version: userVersion }) as T,
    execSync: (sql) => {
      executed.push(sql);
      const match = /PRAGMA user_version = (\d+)/.exec(sql);
      if (match) userVersion = Number(match[1]);
    },
    withTransactionSync: (task) => task(),
  };
  return { db, executed, version: () => userVersion };
}

describe('migrate', () => {
  const list = ['CREATE TABLE a (x)', 'CREATE TABLE b (y)'];

  it('applies all migrations to a fresh database', () => {
    const { db, executed, version } = fakeDb(0);
    migrate(db, list);
    expect(executed).toEqual([
      'CREATE TABLE a (x)',
      'PRAGMA user_version = 1',
      'CREATE TABLE b (y)',
      'PRAGMA user_version = 2',
    ]);
    expect(version()).toBe(2);
  });

  it('applies only the missing ones', () => {
    const { db, executed } = fakeDb(1);
    migrate(db, list);
    expect(executed).toEqual(['CREATE TABLE b (y)', 'PRAGMA user_version = 2']);
  });

  it('does nothing when up to date', () => {
    const { db, executed } = fakeDb(2);
    migrate(db, list);
    expect(executed).toEqual([]);
  });
});
