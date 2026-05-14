import Link from "next/link";
import { PageShell } from "@/components/page-shell";

const metrics = [
  { label: "운영 센터", value: "4곳", note: "안산 · 평택 · 양산 · 김해" },
  { label: "차량 구분", value: "2종", note: "고정차 / 임시차" },
  { label: "정산 흐름", value: "3단계", note: "업로드 → 검증 → 비교" },
];

const quickLinks = [
  { href: "/upload", label: "엑셀 업로드", description: "청구 및 지급 원천자료를 등록합니다." },
  { href: "/settlements/compare", label: "비교 결과 확인", description: "청구액과 지급 차량용역료 차이를 검토합니다." },
  { href: "/settings/vehicles", label: "차량 마스터", description: "차량번호, 센터, 기사, 고정/임시 구분을 관리합니다." },
];

export default function Home() {
  return (
    <PageShell
      badge="Dashboard"
      title="정산자료 운영 대시보드"
      description="센터별 차량 정산자료를 업로드하고 청구 정산자료와 지급 차량용역료 자료를 비교하기 위한 초기 업무 화면입니다."
    >
      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="card">
            <p className="text-sm font-medium text-slate-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{metric.value}</p>
            <p className="mt-2 text-sm text-slate-600">{metric.note}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} className="card transition hover:-translate-y-1 hover:shadow-md">
            <span className="badge">바로가기</span>
            <h2 className="mt-4 text-xl font-bold text-slate-950">{link.label}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{link.description}</p>
          </Link>
        ))}
      </section>
    </PageShell>
  );
}
