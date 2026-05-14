export const STORAGE_TABLES = [
  "profiles",
  "centers",
  "drivers",
  "vehicles",
  "uploaded_files",
  "settlement_batches",
  "settlement_rows",
  "converted_settlement_rows",
  "comparison_results",
] as const;

export type StorageTable = (typeof STORAGE_TABLES)[number];

export function isStorageTable(value: string): value is StorageTable {
  return STORAGE_TABLES.includes(value as StorageTable);
}
