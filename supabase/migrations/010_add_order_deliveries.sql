-- ================================================================
-- 010_add_order_deliveries.sql
-- 목적: 다중 배송지 지원을 위한 order_deliveries 테이블 신규 생성
--       배송지 1건 = 택배비 3,000원
-- ================================================================

-- 1. orders 테이블에 택배비 합계 컬럼 추가
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_fee_total INTEGER DEFAULT 0;

-- 2. 다중 배송지 테이블 생성
CREATE TABLE IF NOT EXISTS public.order_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  seq_no INTEGER NOT NULL DEFAULT 1,
  recipient_name TEXT,
  phone TEXT,
  zipcode TEXT,
  address TEXT,
  address_detail TEXT,
  memo TEXT,
  delivery_fee INTEGER NOT NULL DEFAULT 3000,
  assigned_items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_deliveries_order_id
  ON public.order_deliveries(order_id);

ALTER TABLE public.order_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "관리자 전체 조회" ON public.order_deliveries
  FOR SELECT USING (true);

CREATE POLICY "사용자 배송지 삽입" ON public.order_deliveries
  FOR INSERT WITH CHECK (true);
