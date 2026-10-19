/** Dedicated database, dropped and recreated on every test run. Never point this at dev data. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://gsc:gsc@localhost:5433/gsc_test';
