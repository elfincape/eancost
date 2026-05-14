import { PageShell, WorkflowCard } from "@/components/page-shell";

export default function ReportsPage() {
  return (
    <PageShell badge="Reports" title="정산 리포트" description="센터별, 월별, 차량 유형별 정산 현황과 차액 추이를 확인하고 Vercel 배포 환경에서 공유할 리포트 화면입니다.">
      <div className="grid gap-6 md:grid-cols-2">
        <WorkflowCard title="센터별 요약" description="센터별 청구/지급/차액 합계와 업로드 상태를 제공합니다." items={["안산 센터 월별 합계", "평택 센터 지급 누락 확인", "양산·김해 차액 추이"]} />
        <WorkflowCard title="다운로드 예정" description="검증 완료 데이터를 엑셀 또는 CSV로 내보내는 기능을 후속 단계에서 연결합니다." items={["비교 결과 다운로드", "차량별 상세 내역", "관리자 검토 이력 포함"]} />
      </div>
    </PageShell>
  );
}
