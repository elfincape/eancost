import { PageShell, WorkflowCard } from "@/components/page-shell";

export default function VehiclesPage() {
  return (
    <PageShell badge="Settings" title="차량 관리" description="차량번호, 소속 센터, 기사, 고정차/임시차 구분을 관리하는 마스터 화면입니다.">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="card space-y-4">
          <input placeholder="차량번호 검색" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">차량 목록 테이블이 연결될 영역입니다.</div>
        </section>
        <WorkflowCard title="차량 등록 항목" description="정산 행 매칭을 위해 차량 마스터의 정확도가 중요합니다." items={["차량번호 인덱스 기반 검색", "센터 연결", "기사 연결", "fixed / temporary 유형 관리"]} />
      </div>
    </PageShell>
  );
}
