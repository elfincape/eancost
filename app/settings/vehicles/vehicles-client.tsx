"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { loadFixedVehicles, saveFixedVehicles } from "@/lib/vehicles/storage";
import type { FixedVehicle } from "@/lib/vehicles/types";

const centers = ["안산", "평택", "양산", "김해"];

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
}

export function VehiclesClient() {
  const [vehicles, setVehicles] = useState<FixedVehicle[]>([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [centerName, setCenterName] = useState(centers[0]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    queueMicrotask(() => setVehicles(loadFixedVehicles()));
  }, []);

  const filteredVehicles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return vehicles;

    return vehicles.filter((vehicle) =>
      [vehicle.vehicleNumber, vehicle.driverName, vehicle.centerName].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [query, vehicles]);

  function persist(nextVehicles: FixedVehicle[]) {
    setVehicles(nextVehicles);
    saveFixedVehicles(nextVehicles);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedVehicleNumber = vehicleNumber.trim();
    if (!trimmedVehicleNumber) return;

    const nextVehicle: FixedVehicle = {
      id: createId(),
      vehicleNumber: trimmedVehicleNumber,
      driverName: driverName.trim(),
      centerName,
      createdAt: new Date().toISOString(),
    };

    const withoutDuplicate = vehicles.filter(
      (vehicle) => vehicle.vehicleNumber.replace(/\s/g, "") !== trimmedVehicleNumber.replace(/\s/g, ""),
    );

    persist([nextVehicle, ...withoutDuplicate]);
    setVehicleNumber("");
    setDriverName("");
    setCenterName(centers[0]);
  }

  function deleteVehicle(id: string) {
    persist(vehicles.filter((vehicle) => vehicle.id !== id));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <section className="card h-fit space-y-5">
        <div>
          <span className="badge">Local Master</span>
          <h2 className="mt-3 text-xl font-bold text-slate-950">고정차량 등록</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            현재 단계에서는 서버 DB 저장 없이 브라우저 localStorage에 고정차량 목록을 저장합니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            차량번호
            <input
              value={vehicleNumber}
              onChange={(event) => setVehicleNumber(event.target.value)}
              placeholder="예: 12가 3456"
              className="rounded-xl border border-slate-200 px-4 py-3 font-normal"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            기사명
            <input
              value={driverName}
              onChange={(event) => setDriverName(event.target.value)}
              placeholder="예: 홍길동"
              className="rounded-xl border border-slate-200 px-4 py-3 font-normal"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            센터명
            <select
              value={centerName}
              onChange={(event) => setCenterName(event.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3 font-normal"
            >
              {centers.map((center) => (
                <option key={center}>{center}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">
            고정차량 등록
          </button>
        </form>
      </section>

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">등록된 고정차량</h2>
            <p className="mt-2 text-sm text-slate-600">총 {vehicles.length}대가 등록되어 있습니다.</p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="차량번호, 기사명, 센터 검색"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm lg:w-80"
          />
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          {filteredVehicles.length === 0 ? (
            <div className="bg-slate-50 p-10 text-center text-sm text-slate-500">
              등록된 고정차량이 없습니다. 왼쪽 폼에서 차량번호를 등록하세요.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">차량번호</th>
                  <th className="px-4 py-3">기사명</th>
                  <th className="px-4 py-3">센터</th>
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td className="px-4 py-3 font-bold text-slate-900">{vehicle.vehicleNumber}</td>
                    <td className="px-4 py-3 text-slate-700">{vehicle.driverName || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{vehicle.centerName}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteVehicle(vehicle.id)}
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
