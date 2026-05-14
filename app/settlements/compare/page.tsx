import { PageShell, WorkflowCard } from "@/components/page-shell";

export default function ComparePage() {
  return (
    <PageShell badge="Compare" title="청구/지급 비교" description="동일 센터와 정산월의 청구 정산자료와 지급 차량용역료 자료를 비교해 차액과 검토 상태를 관리합니다.">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-4">
            <select className="rounded-xl border border-slate-200 px-4 py-3 text-sm"><option>안산</option><option>평택</option><option>양산</option><option>김해</option></select>
            <input type="month" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <select className="rounded-xl border border-slate-200 px-4 py-3 text-sm"><option>전체 차량</option><option>고정차</option><option>임시차</option></select>
            <button className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">비교 실행</button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[["청구 합계", "0원"], ["지급 합계", "0원"], ["차액", "0원"]].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p></div>
            ))}
          </div>
        </section>
        <WorkflowCard title="비교 결과 저장" description="비교 실행 결과는 comparison_results에 저장해 재검토 및 리포트에 활용합니다." items={["차량번호·기사 기준 매칭", "청구액/지급액 차액 계산", "검토 상태와 메모 저장", "관리자 확정 처리"]} />
      </div>
    </PageShell>
  );
}
