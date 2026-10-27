// Introspected legacy tables stay in the schema source so `db push` cannot drop
// tables that the Python API still uses.
export * from "./introspected/schema";