import { createDb } from '../src/db/client.js';
import { seedCatalog } from '../src/db/seed.js';
import { loadEnv } from '../src/env.js';

const { db, close } = createDb(loadEnv().DATABASE_URL);
const counts = await seedCatalog(db);
await close();
console.log(`Seeded ${counts.muscleGroups} muscle groups and ${counts.exercises} exercises`);
