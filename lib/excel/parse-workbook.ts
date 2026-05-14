import * as XLSX from "xlsx";
import type { ExcelCellValue, ExcelPreviewRow, ParsedExcelSheet, ParsedExcelWorkbook, SettlementFileType } from "./types";

const MAX_PREVIEW_ROWS = 200;

function isEmptyCell(value: unknown) {
  return value === undefined || value === null || String(value).trim() === "";
}

function isEmptyRow(row: unknown[]) {
  return row.every(isEmptyCell);
}

function columnName(index: number) {
  let name = "";
  let n = index + 1;

  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }

  return name;
}

function normalizeHeader(row: ExcelCellValue[]) {
  const used = new Map<string, number>();

  return row.map((cell, index) => {
    const baseName = isEmptyCell(cell) ? `컬럼 ${columnName(index)}` : String(cell).trim();
    const count = used.get(baseName) ?? 0;
    used.set(baseName, count + 1);

    return count === 0 ? baseName : `${baseName}_${count + 1}`;
  });
}

function normalizeRows(matrix: ExcelCellValue[][]) {
  const firstDataRowIndex = matrix.findIndex((row) => !isEmptyRow(row));

  if (firstDataRowIndex === -1) {
    return { columns: [], rows: [] };
  }

  const headerRow = matrix[firstDataRowIndex];
  const maxColumnCount = Math.max(...matrix.slice(firstDataRowIndex).map((row) => row.length));
  const paddedHeader = Array.from({ length: maxColumnCount }, (_, index) => headerRow[index] ?? null);
  const columns = normalizeHeader(paddedHeader);

  const rows = matrix
    .slice(firstDataRowIndex + 1)
    .filter((row) => !isEmptyRow(row))
    .slice(0, MAX_PREVIEW_ROWS)
    .map((row) =>
      columns.reduce<ExcelPreviewRow>((acc, column, index) => {
        acc[column] = (row[index] ?? null) as ExcelCellValue;
        return acc;
      }, {}),
    );

  return { columns, rows };
}

export async function parseExcelWorkbook(file: File, fileType: SettlementFileType): Promise<ParsedExcelWorkbook> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!extension || extension !== "xlsx") {
    throw new Error(".xlsx 파일만 업로드할 수 있습니다.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    dense: false,
  });

  const sheets: ParsedExcelSheet[] = workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<ExcelCellValue[]>(worksheet, {
      header: 1,
      blankrows: false,
      defval: null,
      raw: false,
    });
    const { columns, rows } = normalizeRows(rawRows);

    return {
      sheetName,
      columns,
      rows,
      rawRows: rawRows.slice(0, MAX_PREVIEW_ROWS),
      rowCount: rows.length,
      columnCount: columns.length,
    };
  });

  return {
    fileName: file.name,
    fileSize: file.size,
    fileType,
    sheets,
  };
}
