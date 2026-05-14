"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { classifySettlementRows } from "@/lib/vehicles/classify";
import { loadFixedVehicles, loadLatestWorkbook } from "@/lib/vehicles/storage";
import type { ClassifiedSettlementRow, VehicleType } from "@/lib/vehicles/types";

type FilterTab = "all" | VehicleType;

const tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "fixed", label: "고정차" },
  { key: "temporary", label: "임시차" },
];

function typeLabel(type: VehicleType) {
  return type === "fixed" ? "고정차" : "임시차";
}

function typeClass(type: VehicleType) {
  return type === "fixed" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700";
}

export function SettlementsClient() {
  const [rows, setRows] = useState<ClassifiedSettlementRow[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const workbook = loadLatestWorkbook();
      const fixedVehicles = loadFixedVehicles();

      if (workbook) {
        setRows(classifySettlementRows(workbook.sheets, fixedVehicles));
      }

      setIsLoaded(true);
    });
  }, []);

  const summary = useMemo(() => {
    const fixedCount = rows.filter((row) => row.vehicleType === "fixed").length;
    const temporaryCount = rows.filter((row) => row.vehicleType === "temporary").length;

    return {
      total: rows.length,
      fixed: fixedCount,
      temporary: temporaryCount,
    };
  }, [rows]);

  const filteredRows = useMemo(
    () => (activeTab === "all" ? rows : rows.filter((row) => row.vehicleType === activeTab)),
    [activeTab, rows],
  );

  if (!isLoaded) {
    return <div className="card min-h-80 animate-pulse bg-slate-100" />;
  }

  if (rows.length === 0) {
    return (
      <section className="card flex min-h-[420px] items-center justify-center text-center">
        <div>
          <p className="text-2xl font-bold text-slate-950">정산자료가 아직 없습니다</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            `/upload`에서 .xlsx 파일을 먼저 업로드하면 브라우저에 임시 저장된 파싱 결과를 기준으로 고정차/임시차가 분류됩니다.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/upload" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">
              엑셀 업로드
            </Link>
            <Link href="/settings/vehicles" className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200">
              고정차 등록
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-sm font-medium text-slate-500">전체 행</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">{summary.total}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-slate-500">고정차 행</p>
          <p className="mt-3 text-3xl font-bold text-blue-700">{summary.fixed}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-slate-500">임시차 행</p>
          <p className="mt-3 text-3xl font-bold text-amber-700">{summary.temporary}</p>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="badge">Fixed Vehicle Filter</span>
            <h2 className="mt-3 text-xl font-bold text-slate-950">정산 행 분류 결과</h2>
            <p className="mt-2 text-sm text-slate-600">
              `/settings/vehicles`에 등록된 고정차량 목록과 업로드된 엑셀 차량번호를 매칭합니다.
            </p>
          </div>
          <div className="flex rounded-2xl bg-slate-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  activeTab === tab.key ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="max-h-[620px] overflow-auto">
            <table className="min-w-full whitespace-nowrap text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">구분</th>
                  <th className="px-4 py-3">차량번호</th>
                  <th className="px-4 py-3">기사명</th>
                  <th className="px-4 py-3">센터</th>
                  <th className="px-4 py-3">시트</th>
                  <th className="px-4 py-3">원본 행</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRows.map((row) => (
                  <tr key={row.id} className={row.vehicleType === "fixed" ? "bg-blue-50/20" : undefined}>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${typeClass(row.vehicleType)}`}>
                        {typeLabel(row.vehicleType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{row.vehicleNumber || "차량번호 없음"}</td>
                    <td className="px-4 py-3 text-slate-700">{row.driverName || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{row.centerName || "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{row.sheetName}</td>
                    <td className="px-4 py-3 text-slate-500">{row.rowIndex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            현재 분류는 차량번호 매칭 기반입니다. 등록된 고정차량 목록에 없는 차량은 임시차로 표시됩니다.
          </div>
        </div>
      </section>
    </div>
  );
}
