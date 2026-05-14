import { PageShell, WorkflowCard } from "@/components/page-shell";

const rows = [
  ["안산", "2026-05", "청구", "12건", "검증 대기"],
  ["평택", "2026-05", "지급", "9건", "확정 전"],
  ["양산", "2026-04", "청구", "15건", "완료"],
];

export default function SettlementsPage() {
  return (
    <PageShell badge="Settlements" title="정산자료 관리" description="센터와 정산월 기준으로 업로드된 청구/지급 정산 묶음과 행 데이터를 조회합니다.">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="card overflow-hidden">
          <div className="mb-4 flex flex-wrap gap-3">
            <select className="rounded-xl border border-slate-200 px-4 py-2 text-sm"><option>전체 센터</option></select>
            <input type="month" className="rounded-xl border border-slate-200 px-4 py-2 text-sm" />
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr>{["센터", "정산월", "유형", "행 수", "상태"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={row.join("")} className="border-t border-slate-100">{row.map((cell) => <td key={cell} className="px-4 py-3 text-slate-700">{cell}</td>)}</tr>)}</tbody>
          </table>
        </section>
        <WorkflowCard title="검토 기준" description="행 단위 데이터는 원본 JSON과 정규화된 금액 컬럼을 함께 보관합니다." items={["차량번호로 빠른 검색", "센터/월 기준 조회", "청구·지급 유형 분리", "비교 전 데이터 정합성 확인"]} />
      </div>
    </PageShell>
  );
}
