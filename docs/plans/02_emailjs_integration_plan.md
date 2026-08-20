# 02. EmailJS 기반 직원 개별 이메일 알림 시스템 구축 계획서

## 1. 개요
현재 텔레그램 봇을 통해 관리자(제니님)에게만 주문 및 취소 알림이 가고 있습니다.
이를 확장하여, 주문을 하거나 취소한 **직원 당사자의 이메일**로도 주문/취소 영수증(내역)이 자동으로 발송되도록 시스템을 구축합니다.
이를 위해 서버 없이 프론트엔드에서 직접 이메일을 발송할 수 있는 **EmailJS** 서비스를 사용합니다.

## 2. 필요 작업 (제니님 역할)
이메일 발송 기능을 활성화하기 위해 EmailJS 회원가입 및 템플릿 설정이 필요합니다.
1. **EmailJS 가입 및 Service 연결**: 사용하는 이메일 계정(Gmail 등)을 연동.
2. **Template 생성**: 주문 완료 / 주문 취소 시 직원에게 날아갈 이메일 양식(디자인) 만들기.
3. **토큰(Key) 제공**: Public Key, Service ID, Template ID 3가지를 확보하여 Vercel 및 로컬 `.env`에 설정.

## 3. 구현 단계 (AI 역할)

### Step 1. 라이브러리 설치
이메일 발송을 위한 공식 패키지를 설치합니다.
- `npm install @emailjs/browser`

### Step 2. 환경변수 세팅
가져온 Key값들을 프로젝트에서 읽을 수 있도록 세팅합니다.
- `VITE_EMAILJS_PUBLIC_KEY`
- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_TEMPLATE_ID`

### Step 3. 이메일 전송 공통 로직 개발
`src/utils/notificationService.js` 파일에 이메일 발송 전용 함수를 추가합니다.
- `sendEmailReceipt(type, memberInfo, orderData)`
- `type`: 'order' (주문) 또는 'cancel' (취소)
- 기존 텔레그램 함수와 충돌하지 않도록 독립적으로 비동기(Async) 처리.

### Step 4. 화면 연동
주문 및 취소가 일어나는 화면에서 이메일 발송 함수를 호출합니다.
- **주문 시**: `src/pages/Home.jsx` 내 `processOrder` 함수 안에서 텔레그램 발송 직후 이메일 발송.
- **취소 시**: `src/pages/MyPage.jsx` 내 `handleCancelOrder` 함수 안에서 이메일 발송.

## 4. 이메일 템플릿 변수 설계 (참고용)
EmailJS 템플릿 안에서 변하는 값들(예: 이름, 금액)은 아래와 같은 변수명(`{{ }}`)으로 치환되도록 구현합니다.
- `{{to_name}}` : 받는 직원 이름
- `{{to_email}}` : 받는 직원 이메일
- `{{order_id}}` : 주문 번호 (또는 취소 번호)
- `{{order_status}}` : "주문 완료" 또는 "주문 취소"
- `{{product_details}}` : 어떤 상품을 몇 개 샀는지 목록
- `{{total_price}}` : 총 금액 (원)

## 5. 검증 계획
1. 제니님 계정으로 임시 로그인을 하여 샘플 주문을 진행.
2. 텔레그램(관리자)과 이메일(직원) 양쪽으로 정상적으로 알림이 분리되어 들어오는지 확인.
3. 주문 취소 테스트도 동일하게 진행.
