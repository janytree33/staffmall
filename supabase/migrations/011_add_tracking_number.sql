-- ================================================================
-- 011_add_tracking_number.sql
-- 목적: 배송지별 CJ대한통운 운송장번호(tracking_number) 저장 컬럼 추가
--       및 order_deliveries 수정(UPDATE) RLS 정책 허용
-- ================================================================

-- 1. order_deliveries 테이블에 운송장번호 컬럼 추가
ALTER TABLE public.order_deliveries
ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- 2. 하위 호환성을 위해 orders 테이블에도 운송장번호 컬럼 추가
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- 3. order_deliveries 테이블 수정(UPDATE) 권한 정책 추가 (운송장 등록 및 배송지 수정용)
DROP POLICY IF EXISTS "배송지 수정 허용" ON public.order_deliveries;
CREATE POLICY "배송지 수정 허용" ON public.order_deliveries
  FOR UPDATE USING (true) WITH CHECK (true);
