# 직원 인증 및 마이페이지 구축 구현 계획서 (Plan)

## 1. 개요
현재 이름과 전화번호 뒷자리로만 임시 인증하던 복지몰 시스템을 Supabase Auth 기반의 정식 로그인 시스템으로 개편합니다.
이를 통해 직원 전용 폐쇄몰의 보안을 강화하고, 로그인한 사용자가 마이페이지에서 본인의 주문 내역을 조회할 수 있도록 합니다.

## 2. 작업 목표 및 주요 변경 사항

### A. 라우팅 구조 변경 (react-router-dom 도입)
기존 단일 페이지 구조(SPA)에서 목적에 따라 화면을 분리합니다.
* `/` (Main): 상품 목록 및 장바구니 화면 (메인 몰)
* `/login`: 직원 로그인 화면
* `/update-password`: 비밀번호 변경 화면 (최초 로그인 시 강제 리다이렉트 포함)
* `/mypage`: 내 정보 및 주문 내역 조회 화면 (로그인 필수)

### B. 데이터베이스 스키마 및 마이그레이션
기존 `members` 테이블을 활용했던 방식을 개편하여, 관리자가 생성한 `auth.users` 계정과 연동되는 `employee_profiles` 테이블을 구축합니다.
* **001_setup_auth_and_profiles.sql** (supabase/migrations 폴더에 저장)
  * `employee_profiles` 테이블 생성 (id는 auth.users.id 참조)
  * `orders` 테이블 개편: 기존 `member_id` 대신 `user_id`를 외래키로 추가 및 기존 데이터 마이그레이션 방안.
* 보안 원칙(사용자 8번 규칙) 준수: 연락처, 이메일 등의 개인 식별형 결합 정보에 대해 필요시 단방향 해시 등 최소한의 보안만 적용하고, 법적 고유식별정보가 아니므로 암호화 제외 대상인 경우 평문 저장합니다. (사내 직원의 기본 정보이므로 평문 저장 방식을 기본으로 합니다.)

### C. UI/UX 구현 (JT 디자인 시스템 준수)
`docs/design` 문서의 토큰과 규칙을 완벽히 준수하여 신규 컴포넌트를 개발합니다.
* 색상 및 레이아웃: `--jt-color-primary`, `--jt-color-accent`, `--jt-bg-container` 등의 CSS 변수 활용.
* 폰트 및 아이콘: Pretendard, Figtree 폰트 적용. Google Material Symbols Rounded 적용.
* 확인/알림 창: `window.alert()` 대신 프로젝트 내 모달 시스템을 구축하여 사용.

## 3. 단계별 진행 계획

**1단계: 라우팅 설정 및 로그인/비밀번호 변경 UI 구현**
* `react-router-dom` 패키지 설치
* `App.jsx`를 라우터 구조로 리팩토링
* `Login.jsx`, `UpdatePassword.jsx` 컴포넌트 생성 및 Supabase Auth 연동 (디자인 시스템 적용)

**2단계: 마이페이지 UI 및 회원 정보 연동**
* `MyPage.jsx` 컴포넌트 생성
* 현재 로그인한 사용자의 정보를 `employee_profiles`에서 불러와 표시
* 로그아웃 기능 및 비로그인 접근 차단(Protected Route) 구현

**3단계: 기존 주문 시스템 리팩토링 및 마이페이지 연동**
* `App.jsx` 내의 `processOrder` 로직을 Supabase Auth 기반으로 수정 (user_id 삽입)
* 장바구니 결제 시 비로그인 상태면 `/login`으로 유도
* 마이페이지에 `orders`, `order_items` 테이블 데이터를 불러와 내 주문 내역(월별 구매 한도 등 포함) 표시

## 4. 확인 및 승인 요청
위 계획대로 `docs/plans/01_auth_mypage_plan.md` 파일을 작성하였습니다. 
이 계획대로 진행해도 될지 확인 부탁드립니다. (특히 `employee_profiles` 테이블 생성 및 기존 `members` 대체 부분)
