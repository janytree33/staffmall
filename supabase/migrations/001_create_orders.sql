-- 암호화 확장 모듈 활성화 (사용자 개인정보 보호를 위해 필수)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. 주문(결제) 기본 정보를 담는 테이블 생성
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 보안 규칙 적용: 직원 이름 등 민감한 개인정보는 반드시 암호화하여 저장합니다.
  -- pgp_sym_encrypt 함수를 사용하여 앱 수준의 비밀키로 암호화/복호화 할 수 있습니다.
  encrypted_employee_name BYTEA NOT NULL,
  
  total_amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 장바구니에 담긴 각 상품별 주문 내역을 담는 테이블 생성
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES public.products(id),
  
  -- 구매 대상 유형 (본인, 가족, 지인)
  target_type VARCHAR(50) NOT NULL,
  
  -- 구매 수량 및 당시 적용 단가
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- [참고] 조회 시 복호화 방법 예시:
-- SELECT pgp_sym_decrypt(encrypted_employee_name, 'YOUR_SECRET_KEY') AS employee_name FROM orders;
