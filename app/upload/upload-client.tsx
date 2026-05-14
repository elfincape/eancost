"use client";

import { useMemo, useRef, useState } from "react";
import { parseExcelWorkbook } from "@/lib/excel/parse-workbook";
import type { ParsedExcelSheet, ParsedExcelWorkbook, SettlementFileType } from "@/lib/excel/types";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (value instanceof Date) return value.toLocaleDateString("ko-KR");
  return String(value);
}

function SheetPreview({ sheet }: { sheet: ParsedExcelSheet }) {
  const visibleColumns = sheet.columns.slice(0, 12);
  const visibleRows = sheet.rows.slice(0, 30);

  if (sheet.columns.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        이 시트에서 표시할 데이터를 찾지 못했습니다.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="max-h-[520px] overflow-auto">
        <table className="min-w-full whitespace-nowrap text-left text-sm">
          <thead className="sticky top-0 bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-3 py-3">#</th>
              {visibleColumns.map((column) => (
                <th key={column} className="border-b border-slate-200 px-3 py-3">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {visibleRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-blue-50/40">
                <td className="px-3 py-3 text-xs font-semibold text-slate-400">{rowIndex + 1}</td>
                {visibleColumns.map((column) => (
                  <td key={column} className="max-w-52 overflow-hidden text-ellipsis px-3 py-3 text-slate-700">
                    {formatCell(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        미리보기는 최대 30행, 12개 컬럼까지 표시합니다. 전체 파싱 결과는 다음 단계에서 정산 로직에 연결됩니다.
      </div>
    </div>
  );
}

export function UploadClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileType, setFileType] = useState<SettlementFileType>("billing");
  const [workbook, setWorkbook] = useState<ParsedExcelWorkbook | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>("");
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeSheet = useMemo(
    () => workbook?.sheets.find((sheet) => sheet.sheetName === activeSheetName) ?? workbook?.sheets[0],
    [activeSheetName, workbook],
  );

  async function handleFile(file: File | undefined) {
    setErrorMessage(null);

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setWorkbook(null);
      setActiveSheetName("");
      setErrorMessage(".xlsx 파일만 업로드할 수 있습니다.");
      return;
    }

    setIsParsing(true);

    try {
      const parsed = await parseExcelWorkbook(file, fileType);
      setWorkbook(parsed);
      setActiveSheetName(parsed.sheets[0]?.sheetName ?? "");
    } catch (error) {
      setWorkbook(null);
      setActiveSheetName("");
      setErrorMessage(error instanceof Error ? error.message : "엑셀 파일을 읽는 중 오류가 발생했습니다.");
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <section className="card h-fit space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-950">파일 선택</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            이번 단계는 DB 저장 없이 브라우저에서 엑셀을 읽고 시트별 원본 데이터를 확인하는 기능만 제공합니다.
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
          className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50"
        >
          <span className="block text-lg font-bold text-slate-800">.xlsx 파일 업로드</span>
          <span className="mt-2 block text-sm text-slate-500">클릭해서 청구/지급 엑셀 파일을 선택하세요.</span>
        </button>

        {isParsing ? <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">엑셀 파일을 읽는 중입니다...</div> : null}
        {errorMessage ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</div> : null}

        {workbook ? (
          <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between gap-3"><span className="text-slate-500">파일명</span><span className="text-right font-semibold text-slate-800">{workbook.fileName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">파일 크기</span><span className="font-semibold text-slate-800">{formatBytes(workbook.fileSize)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">시트 수</span><span className="font-semibold text-slate-800">{workbook.sheets.length}개</span></div>
            <div className="flex justify-between"><span className="text-slate-500">자료 유형</span><span className="font-semibold text-slate-800">{workbook.fileType === "billing" ? "청구" : "지급"}</span></div>
          </div>
        ) : null}
      </section>

      <section className="space-y-5">
        {!workbook ? (
          <div className="card flex min-h-[520px] items-center justify-center text-center">
            <div>
              <p className="text-2xl font-bold text-slate-900">엑셀 미리보기 대기 중</p>
              <p className="mt-3 text-sm text-slate-500">왼쪽에서 .xlsx 파일을 업로드하면 시트 목록과 원본 데이터가 표시됩니다.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="card">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <span className="badge">Sheet Preview</span>
                  <h2 className="mt-3 text-2xl font-bold text-slate-950">시트 목록</h2>
                  <p className="mt-2 text-sm text-slate-600">시트명을 선택하면 해당 시트의 파싱 결과를 확인할 수 있습니다.</p>
                </div>
                {activeSheet ? (
                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-slate-500">행 수</p><p className="mt-1 font-bold text-slate-900">{activeSheet.rowCount}</p></div>
                    <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-slate-500">컬럼 수</p><p className="mt-1 font-bold text-slate-900">{activeSheet.columnCount}</p></div>
                    <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-slate-500">원본 행</p><p className="mt-1 font-bold text-slate-900">{activeSheet.rawRows.length}</p></div>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {workbook.sheets.map((sheet) => (
                  <button
                    key={sheet.sheetName}
                    type="button"
                    onClick={() => setActiveSheetName(sheet.sheetName)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      sheet.sheetName === activeSheet?.sheetName ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {sheet.sheetName} · {sheet.rowCount}행 · {sheet.columnCount}컬럼
                  </button>
                ))}
              </div>
            </div>

            {activeSheet ? <SheetPreview sheet={activeSheet} /> : null}
          </>
        )}
      </section>
    </div>
  );
}
