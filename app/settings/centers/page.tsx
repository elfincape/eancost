import { PageShell, WorkflowCard } from "@/components/page-shell";

const centers = ["안산", "평택", "양산", "김해"];

export default function CentersPage() {
  return (
    <PageShell badge="Settings" title="센터 관리" description="정산 기준이 되는 운영 센터를 관리합니다. 초기 seed로 네 개 센터를 생성합니다.">
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="text-xl font-bold text-slate-950">초기 센터</h2>
          <div className="mt-5 grid gap-3">
            {centers.map((center) => <div key={center} className="rounded-xl bg-slate-50 px-4 py-3 font-semibold text-slate-700">{center}</div>)}
          </div>
        </section>
        <WorkflowCard title="센터 기준 조회" description="정산 묶음과 행 데이터는 센터/월 기준 인덱스로 조회 성능을 확보합니다." items={["센터별 업로드 이력", "센터별 청구/지급 비교", "센터별 리포트 생성"]} />
      </div>
    </PageShell>
  );
}
