import * as schema from './schema';

// Chainable no-op stub for environments where SQLite is unavailable (web).
function makeStub(): any {
  const s: any = {
    select:   () => s,
    from:     () => s,
    where:    () => s,
    set:      () => s,
    values:   () => s,
    orderBy:  () => s,
    limit:    () => s,
    offset:   () => s,
    groupBy:  () => s,
    having:   () => s,
    leftJoin: () => s,
    innerJoin:() => s,
    insert:   () => s,
    update:   () => s,
    delete:   () => s,
    run:      () => Promise.resolve(),
    execute:  () => Promise.resolve([]),
    transaction: (fn: any) => fn(s),
    // Thenable — resolves to [] when awaited
    then: (resolve: any) => Promise.resolve([]).then(resolve),
    catch: (fn: any) => Promise.resolve([]).catch(fn),
    finally: (fn: any) => Promise.resolve([]).finally(fn),
  };
  return s;
}

let db: any;

try {
  // These modules only exist on native — dynamic require prevents web bundler
  // from evaluating them at import time.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { drizzle } = require('drizzle-orm/expo-sqlite');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { openDatabaseSync } = require('expo-sqlite');
  const expo = openDatabaseSync('riri.db', { enableChangeListener: true });
  db = drizzle(expo, { schema });
} catch {
  db = makeStub();
}

export { db };
export type DB = any;
