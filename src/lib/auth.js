// src/lib/auth.js
// 직원몰 정식 로그인 (Supabase Auth) — 보안 정리 계획서 02 · 4-2
//  - 예전: members 표를 화면이 직접 열어 이메일·비밀번호를 비교 (명단이 누구나 읽기 가능했음)
//  - 지금: Supabase 정식 로그인. 비밀번호는 Supabase 가 암호화 보관
//  - 화면들은 예전처럼 localStorage 'custom_user' {id(=members.id), email, name} 를 읽음 → 화면 코드는 거의 그대로
//    단, 정식 로그인 세션이 없으면 custom_user 를 지움 (예전 방식 로그인 흔적 정리)
import { supabase } from '../supabaseClient';

const KEY = 'custom_user';

/** 로그인한 계정과 연결된 직원 명단 줄을 찾아 custom_user 로 저장 (처음이면 이메일로 자동 연결) */
async function loadMember() {
  const { data: mid, error: linkErr } = await supabase.rpc('staffmall_link_me');
  if (linkErr) throw linkErr;
  if (!mid) return null; // 같은 이메일의 직원 명단이 없음
  const { data: m, error } = await supabase.from('members').select('id, email, name').eq('id', mid).single();
  if (error) throw error;
  const user = { id: m.id, email: m.email, name: m.name };
  localStorage.setItem(KEY, JSON.stringify(user));
  return user;
}

/** 이메일 + 비밀번호로 로그인 → 직원 정보 반환 (명단에 없으면 로그아웃하고 오류) */
export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error('이메일 또는 비밀번호가 일치하지 않습니다.');
  const user = await loadMember();
  if (!user) {
    await supabase.auth.signOut();
    throw new Error('직원 명단에 없는 계정이에요. 관리자에게 문의해 주세요.');
  }
  return user;
}

/** 로그아웃 (정식 세션 + 화면용 기록 모두) */
export async function signOut() {
  localStorage.removeItem(KEY);
  await supabase.auth.signOut();
  window.dispatchEvent(new Event('storage')); // 다른 화면에 로그아웃 알림
}

/** 비밀번호 바꾸기 (6자리 이상) */
export async function changePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

/** 앱 시작 때: 정식 세션과 화면용 기록을 맞춤 */
export async function syncSession() {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      localStorage.removeItem(KEY); // 예전 방식 로그인 흔적 → 다시 로그인하게
    } else if (!localStorage.getItem(KEY)) {
      await loadMember();
    }
  } catch (e) {
    console.error('로그인 상태 확인 오류:', e);
  }
  // 세션이 끝나면(로그아웃·만료) 화면용 기록도 지움
  supabase.auth.onAuthStateChange((event, session) => {
    if (!session && localStorage.getItem(KEY)) {
      localStorage.removeItem(KEY);
      window.dispatchEvent(new Event('storage'));
    }
  });
}
