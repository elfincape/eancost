"use client";

import * as XLSX from "xlsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseExcelWorkbook } from "@/lib/excel/parse-workbook";
import type { ParsedExcelWorkbook, SettlementFileType } from "@/lib/excel/types";
import {
  convertFixedSettlementRows,
  createTsv,
  getWorkbookColumns,
  STANDARD_SETTLEMENT_COLUMNS,
  suggestColumnMapping,
  type ColumnMapping,
} from "@/lib/settlements/convert";
import { loadFixedVehicles, loadLatestWorkbook, saveLatestWorkbook } from "@/lib/vehicles/storage";
import type { FixedVehicle } from "@/lib/vehicles/types";

const ALL_SHEETS = "__all__";

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export function ConvertClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileType, setFileType] = useState<SettlementFileType>("billing");
  const [workbook, setWorkbook] = useState<ParsedExcelWorkbook | null>(null);
  const [fixedVehicles, setFixedVehicles] = useState<FixedVehicle[]>([]);
  const [sheetName, setSheetName] = useState(ALL_SHEETS);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [isParsing, setIsParsing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const latestWorkbook = loadLatestWorkbook();
      setWorkbook(latestWorkbook);
      setFixedVehicles(loadFixedVehicles());

      if (latestWorkbook) {
        setMapping(suggestColumnMapping(getWorkbookColumns(latestWorkbook, ALL_SHEETS)));
      }
    });
  }, []);

  const sourceColumns = useMemo(() => getWorkbookColumns(workbook, sheetName), [sheetName, workbook]);


  function handleSheetChange(nextSheetName: string) {
    setSheetName(nextSheetName);

    if (workbook) {
      setMapping(suggestColumnMapping(getWorkbookColumns(workbook, nextSheetName)));
    }
  }

  const convertedRows = useMemo(() => {
    if (!workbook) return [];
    return convertFixedSettlementRows(workbook, fixedVehicles, mapping, sheetName);
  }, [fixedVehicles, mapping, sheetName, workbook]);

  async function handleFile(file: File | undefined) {
    setMessage(null);
    setErrorMessage(null);

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setErrorMessage(".xlsx 파일만 업로드할 수 있습니다.");
      return;
    }

    setIsParsing(true);

    try {
      const parsedWorkbook = await parseExcelWorkbook(file, fileType);
      saveLatestWorkbook(parsedWorkbook);
      setWorkbook(parsedWorkbook);
      setSheetName(ALL_SHEETS);
      setMapping(suggestColumnMapping(getWorkbookColumns(parsedWorkbook, ALL_SHEETS)));
      setMessage("엑셀 파일을 읽고 변환 준비를 완료했습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "엑셀 파일을 읽는 중 오류가 발생했습니다.");
    } finally {
      setIsParsing(false);
    }
  }

  async function copyToClipboard() {
    setMessage(null);
    setErrorMessage(null);

    if (convertedRows.length === 0) {
      setErrorMessage("복사할 고정차 결과가 없습니다.");
      return;
    }

    try {
      await navigator.clipboard.writeText(createTsv(convertedRows));
      setMessage("결과 테이블을 클립보드에 복사했습니다.");
    } catch {
      setErrorMessage("클립보드 복사에 실패했습니다. 브라우저 권한을 확인하세요.");
    }
  }

  function downloadXlsx() {
    setMessage(null);
    setErrorMessage(null);

    if (convertedRows.length === 0) {
      setErrorMessage("다운로드할 고정차 결과가 없습니다.");
      return;
    }

    const headers = STANDARD_SETTLEMENT_COLUMNS.map((column) => column.label);
    const data = convertedRows.map((row) => STANDARD_SETTLEMENT_COLUMNS.map((column) => row[column.key] ?? ""));
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const outputWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(outputWorkbook, worksheet, "고정차 정산자료");
    XLSX.writeFile(outputWorkbook, `eancost-fixed-settlements-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage("xlsx 파일 다운로드를 시작했습니다.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <section className="space-y-6">
        <div className="card space-y-5">
          <div>
            <span className="badge">Step 4</span>
            <h2 className="mt-3 text-xl font-bold text-slate-950">원본 엑셀 업로드</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              이 화면에서 새 파일을 업로드하거나 `/upload`에서 마지막으로 읽은 파일을 사용할 수 있습니다. 변환 결과는 아직 DB에 저장하지 않습니다.
            </p>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            자료 유형
            <select
              value={fileType}
              onChange={(event) => setFileType(event.target.value as SettlementFileType)}
              className="rounded-xl border border-slate-200 px-4 py-3 font-normal"
            >
              <option value="billing">청구 정산자료</option>
              <option value="payment">지급 차량용역료 자료</option>
            </select>
          </label>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50"
          >
            <span className="block text-base font-bold text-slate-800">.xlsx 파일 선택</span>
            <span className="mt-2 block text-sm text-slate-500">고정차만 추출할 원본 정산자료를 업로드하세요.</span>
          </button>

          {isParsing ? <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">엑셀 파일을 읽는 중입니다...</div> : null}
          {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div> : null}
          {errorMessage ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</div> : null}
        </div>

        <div className="card space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">변환 기준</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">등록된 고정차량 목록과 시트 범위를 확인하세요.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-slate-500">고정차량</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{fixedVehicles.length}대</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-slate-500">변환 결과</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">{convertedRows.length}행</p>
            </div>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            대상 시트
            <select
              value={sheetName}
              onChange={(event) => handleSheetChange(event.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3 font-normal"
              disabled={!workbook}
            >
              <option value={ALL_SHEETS}>전체 시트</option>
              {workbook?.sheets.map((sheet) => (
                <option key={sheet.sheetName} value={sheet.sheetName}>
                  {sheet.sheetName} · {sheet.rowCount}행
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-6">
        <div className="card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">컬럼 매핑</h2>
              <p className="mt-2 text-sm text-slate-600">원본 컬럼명을 표준 정산 컬럼에 직접 연결하세요.</p>
            </div>
            <button
              type="button"
              onClick={() => setMapping(suggestColumnMapping(sourceColumns))}
              className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
              disabled={!workbook}
            >
              자동 매핑 다시 적용
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {STANDARD_SETTLEMENT_COLUMNS.map((column) => (
              <label key={column.key} className="grid gap-2 text-sm font-semibold text-slate-700">
                {column.label} {column.required ? <span className="text-red-500">*</span> : null}
                <select
                  value={mapping[column.key] ?? ""}
                  onChange={(event) => setMapping((current) => ({ ...current, [column.key]: event.target.value || undefined }))}
                  className="rounded-xl border border-slate-200 px-4 py-3 font-normal"
                  disabled={!workbook}
                >
                  <option value="">매핑 안 함</option>
                  {sourceColumns.map((sourceColumn) => (
                    <option key={sourceColumn} value={sourceColumn}>
                      {sourceColumn}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="badge">Fixed Only</span>
              <h2 className="mt-3 text-xl font-bold text-slate-950">붙여넣기용 결과</h2>
              <p className="mt-2 text-sm text-slate-600">고정차로 매칭된 행만 표준 컬럼 순서로 표시합니다.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={copyToClipboard} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">
                클립보드 복사
              </button>
              <button type="button" onClick={downloadXlsx} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">
                xlsx 다운로드
              </button>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            {convertedRows.length === 0 ? (
              <div className="bg-slate-50 p-10 text-center text-sm leading-6 text-slate-500">
                변환 결과가 없습니다. 고정차량 목록을 등록한 뒤 차량번호가 포함된 .xlsx 파일을 업로드하고 컬럼 매핑을 확인하세요.
              </div>
            ) : (
              <div className="max-h-[560px] overflow-auto">
                <table className="min-w-full whitespace-nowrap text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500">
                    <tr>
                      {STANDARD_SETTLEMENT_COLUMNS.map((column) => (
                        <th key={column.key} className="px-4 py-3">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {convertedRows.map((row, rowIndex) => (
                      <tr key={`${row.vehicleNumber}-${rowIndex}`}>
                        {STANDARD_SETTLEMENT_COLUMNS.map((column) => (
                          <td key={column.key} className="px-4 py-3 text-slate-700">
                            {formatCell(row[column.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
