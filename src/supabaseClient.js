import { createClient } from '@supabase/supabase-js';

// .env 파일에 설정된 환경변수를 가져옵니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 만약 환경변수가 아직 설정되지 않았다면 경고를 띄웁니다 (개발 편의를 위해)
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ 환경변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)가 설정되지 않았습니다.");
}

// 클라이언트를 생성하여 내보냅니다.
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
