# Eancost

Eancost는 센터별 차량 정산자료를 업로드하고, 청구 정산자료와 지급 차량용역료 자료를 비교하기 위한 Next.js 기반 웹앱입니다.

## 기술 스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth / Database / RLS
- Vercel 배포 기준
- GitHub 저장소 기준 운영

## 주요 업무 흐름

1. 센터(안산, 평택, 양산, 김해)와 차량/기사 마스터를 관리합니다.
2. 청구 정산자료 또는 지급 차량용역료 엑셀 파일을 업로드합니다.
3. 업로드 이력, 정산 배치, 원본 행 JSON 데이터를 Supabase에 저장합니다.
4. 센터/월/차량번호 기준으로 청구와 지급 자료를 비교합니다.
5. 비교 결과를 리포트와 검토 이력으로 관리합니다.

## 로컬 실행 방법

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

> `.env.local`은 로컬 개발자만 생성해야 하며 절대 커밋하지 않습니다.

## 환경변수 설정 방법

`.env.example`을 참고해 로컬에는 `.env.local`, Vercel에는 Project Settings의 Environment Variables에 값을 등록합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://xiwggyahiwdixsywyanm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ulqaTH_D01j2HR7-zYYvqg_wX6Q203S
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```

### Vercel에 등록해야 할 환경변수

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (서버 전용 기능이 필요할 때만 등록)
- `NEXT_PUBLIC_APP_URL` (예: `https://your-domain.vercel.app`)

## Supabase SQL 적용 방법

1. Supabase 프로젝트 대시보드에 접속합니다.
2. **SQL Editor**를 엽니다.
3. `supabase/migrations/001_initial_schema.sql` 내용을 실행합니다.
4. 테이블, 인덱스, updated_at 트리거, RLS 정책이 생성되었는지 확인합니다.

Supabase CLI를 사용하는 경우에는 프로젝트 연결 후 아래처럼 적용할 수 있습니다.

```bash
supabase db push
```

## Supabase seed 적용 방법

초기 센터 데이터는 `supabase/seed.sql`에 있습니다.

1. Supabase SQL Editor를 엽니다.
2. `supabase/seed.sql` 내용을 실행합니다.
3. `centers` 테이블에 안산, 평택, 양산, 김해가 생성되었는지 확인합니다.

> `auth.users`에는 직접 insert하지 마세요. 사용자는 Supabase Auth 가입 흐름으로 생성해야 합니다.

## 최초 admin 계정 설정 방법

1. 앱 또는 Supabase Auth에서 최초 사용자를 가입시킵니다.
2. Supabase Dashboard의 Table Editor 또는 SQL Editor에서 해당 사용자의 `profiles.role`을 `admin`으로 변경합니다.
3. 예시 SQL:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

최초 admin 지정은 운영자가 Supabase Dashboard에서 수동으로 수행합니다. 이후 admin 사용자는 앱 내 관리 기능을 통해 사용자 권한을 관리할 수 있습니다.

## Vercel 배포 방법

1. GitHub 저장소를 Vercel에 Import합니다.
2. Framework Preset은 Next.js로 선택합니다.
3. Environment Variables에 위 환경변수를 등록합니다.
4. Build Command는 기본값 `next build`를 사용합니다.
5. 배포 후 `NEXT_PUBLIC_APP_URL`을 실제 Vercel 도메인으로 갱신합니다.

## 보안 주의사항

- GitHub 토큰은 절대 코드, README, 이슈, PR, 환경변수 예시 파일에 저장하지 마세요.
- `.env.local`은 커밋하지 마세요.
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용입니다. 브라우저 코드, Client Component, `NEXT_PUBLIC_` 접두사 환경변수에 넣지 마세요.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`는 클라이언트에서 사용할 수 있지만, 민감 데이터 보호는 반드시 RLS 정책으로 보장해야 합니다.
- 민감 테이블은 RLS 정책 없이 공개하지 마세요.
- `lib/supabase/admin.ts`는 서버 전용 작업에서만 사용하세요.

## 프로젝트 구조

```text
app/                         Next.js App Router 페이지
components/                  공통 UI 컴포넌트
lib/supabase/client.ts       브라우저용 Supabase 클라이언트
lib/supabase/server.ts       서버/Route Handler용 Supabase 클라이언트
lib/supabase/admin.ts        service role 기반 서버 전용 클라이언트
supabase/migrations/         데이터베이스 스키마 SQL
supabase/seed.sql            초기 센터 seed SQL
```

## 다음 개발 단계 제안

- Supabase Auth 로그인/로그아웃 화면 추가
- 엑셀 파서 및 업로드 API Route 구현
- 차량/기사/센터 CRUD 화면 연결
- 정산 행 검증 및 청구/지급 매칭 알고리즘 구현
- 비교 결과 확정 및 리포트 다운로드 기능 구현
