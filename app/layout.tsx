import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eancost 정산자료",
  description: "센터별 차량 정산자료 업로드, 비교, 리포트 웹앱",
};

const navigation = [
  { href: "/", label: "대시보드" },
  { href: "/upload", label: "엑셀 업로드" },
  { href: "/settlements", label: "정산자료" },
  { href: "/settlements/convert", label: "정산 변환" },
  { href: "/settlements/compare", label: "청구/지급 비교" },
  { href: "/reports", label: "리포트" },
  { href: "/settings/vehicles", label: "차량 관리" },
  { href: "/settings/centers", label: "센터 관리" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <Link href="/" className="text-2xl font-bold tracking-tight text-slate-950">
                Eancost
              </Link>
              <nav className="flex flex-wrap gap-2 text-sm font-medium text-slate-600">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
