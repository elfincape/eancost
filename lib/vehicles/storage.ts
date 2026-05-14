import type { ParsedExcelWorkbook } from "@/lib/excel/types";
import type { FixedVehicle } from "./types";

export const FIXED_VEHICLES_STORAGE_KEY = "eancost:fixedVehicles";
export const LATEST_WORKBOOK_STORAGE_KEY = "eancost:latestParsedWorkbook";

export function loadFixedVehicles() {
  if (typeof window === "undefined") return [] as FixedVehicle[];

  try {
    const rawValue = window.localStorage.getItem(FIXED_VEHICLES_STORAGE_KEY);
    return rawValue ? (JSON.parse(rawValue) as FixedVehicle[]) : [];
  } catch {
    return [];
  }
}

export function saveFixedVehicles(vehicles: FixedVehicle[]) {
  window.localStorage.setItem(FIXED_VEHICLES_STORAGE_KEY, JSON.stringify(vehicles));
}

export function loadLatestWorkbook() {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.localStorage.getItem(LATEST_WORKBOOK_STORAGE_KEY);
    return rawValue ? (JSON.parse(rawValue) as ParsedExcelWorkbook) : null;
  } catch {
    return null;
  }
}

export function saveLatestWorkbook(workbook: ParsedExcelWorkbook) {
  window.localStorage.setItem(LATEST_WORKBOOK_STORAGE_KEY, JSON.stringify(workbook));
}
