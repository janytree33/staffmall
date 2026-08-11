-- 1. employee_profiles 테이블 생성
-- 관리자가 auth.users에 직원을 등록하면, 여기에 추가 정보를 입력하여 매핑합니다.
-- 규칙 8(선별적 보안)에 따라 단순 이름, 부서 등의 단독 정보는 평문으로 저장합니다.
CREATE TABLE public.employee_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) 설정
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인의 프로필만 조회 가능" ON public.employee_profiles
    FOR SELECT
    USING (auth.uid() = id);

-- 2. orders 테이블 수정
-- 기존 비회원용 member_id 대신, 로그인 유저의 UUID를 담는 user_id 컬럼 추가
ALTER TABLE public.orders 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 주문 테이블 RLS 정책 (관리자 조회는 별도 정책이 필요할 수 있으나 기본적으로 본인 조회 허용)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인의 주문 내역만 조회 가능" ON public.orders
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "본인 이름으로 주문 생성 가능" ON public.orders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
