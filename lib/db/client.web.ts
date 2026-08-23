// Web stub — expo-sqlite is native-only.
// Provides a chainable no-op that resolves to [] for all queries.

const resolved: any = {
  from:    () => resolved,
  where:   () => resolved,
  set:     () => resolved,
  values:  () => resolved,
  orderBy: () => resolved,
  limit:   () => resolved,
  offset:  () => resolved,
  groupBy: () => resolved,
  having:  () => resolved,
  leftJoin:() => resolved,
  innerJoin:()=> resolved,
  single:  () => Promise.resolve(null),
  execute: () => Promise.resolve([]),
  run:     () => Promise.resolve(),
  // Make it awaitable — resolves to empty array
  then: (resolve: (v: any) => void, _reject?: any) => Promise.resolve([]).then(resolve),
  catch: (_fn: any) => Promise.resolve([]),
  finally: (fn: any) => { fn?.(); return Promise.resolve([]); },
};

const db: any = {
  select:  () => resolved,
  insert:  () => resolved,
  update:  () => resolved,
  delete:  () => resolved,
  run:     () => Promise.resolve(),
  execute: () => Promise.resolve([]),
  transaction: (fn: any) => fn(db),
};

export { db };
export type DB = any;
