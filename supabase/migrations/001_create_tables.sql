-- 001_create_tables.sql
-- 제니트리 복지몰을 위한 초기 테이블 생성 스크립트입니다.

-- 1. 직원 명부 테이블 (members)
CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone_last_4_hashed TEXT NOT NULL, -- SHA-256 등으로 암호화된 뒷자리 4자리
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 주문 마스터 테이블 (orders)
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    total_price INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT '입금대기', -- '입금대기', '입금완료', '지급완료' 등
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 주문 상세 품목 테이블 (order_items)
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    target_type TEXT NOT NULL, -- '본인', '가족', '지인' 등
    quantity INTEGER NOT NULL,
    price INTEGER NOT NULL
);

-- RLS (Row Level Security) 설정 - 기본적으로 모두가 읽고 쓸 수 있도록 열어둡니다. (사내용이므로)
-- 만약 더 엄격하게 제한하고 싶다면 아래 정책을 수정할 수 있습니다.
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert members" ON public.members FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update orders" ON public.orders FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous read order_items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert order_items" ON public.order_items FOR INSERT WITH CHECK (true);
