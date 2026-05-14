import { PageShell, WorkflowCard } from "@/components/page-shell";

export default function UploadPage() {
  return (
    <PageShell
      badge="Upload"
      title="엑셀 업로드"
      description="센터, 정산월, 자료 유형을 선택한 뒤 청구 정산자료 또는 지급 차량용역료 엑셀 파일을 업로드하는 화면입니다."
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="card space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              센터
              <select className="rounded-xl border border-slate-200 px-4 py-3 font-normal">
                <option>안산</option><option>평택</option><option>양산</option><option>김해</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              정산월
              <input type="month" className="rounded-xl border border-slate-200 px-4 py-3 font-normal" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              자료 유형
              <select className="rounded-xl border border-slate-200 px-4 py-3 font-normal">
                <option>청구 정산자료</option><option>지급 차량용역료</option>
              </select>
            </label>
          </div>
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <p className="text-lg font-bold text-slate-800">엑셀 파일을 선택하거나 드래그하세요</p>
            <p className="mt-2 text-sm text-slate-500">업로드 이력과 원본 행 JSON은 Supabase에 저장될 예정입니다.</p>
          </div>
        </section>
        <WorkflowCard
          title="업로드 처리 흐름"
          description="초기 화면에서는 처리 기준을 명확히 보여주고, 이후 파서와 검증 로직을 연결합니다."
          items={["파일 메타데이터를 uploaded_files에 저장", "정산 묶음을 settlement_batches에 생성", "원본 행을 settlement_rows.raw_data로 보존", "검증 실패 행은 사용자에게 재확인 요청"]}
        />
      </div>
    </PageShell>
  );
}
