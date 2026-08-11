import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // 로그인 성공 시 메인 화면으로 이동
      // 추후 최초 로그인인 경우 비밀번호 변경 화면으로 리다이렉트하는 로직 추가 가능
      navigate('/');
    } catch (err) {
      console.error(err);
      setErrorMsg('이메일 또는 비밀번호가 일치하지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--jt-bg-layout)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 'var(--jt-space-4)',
      fontFamily: 'var(--jt-seed-font-base)'
    }}>
      <div className="premium-card" style={{
        padding: 'var(--jt-space-8) var(--jt-space-6)',
        width: '100%',
        maxWidth: '420px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--jt-space-7)' }}>
          <img src="/logo/logo-h.svg" alt="제니트리 로고" style={{ height: '36px', marginBottom: 'var(--jt-space-5)' }} />
          <h2 style={{ 
            color: 'var(--jt-color-text)', 
            margin: 0, 
            fontWeight: 800,
            fontSize: '22px',
            letterSpacing: '-0.5px'
          }}>
            임직원 복지몰 로그인
          </h2>
          <p style={{ color: 'var(--jt-color-text-secondary)', fontSize: '14px', marginTop: 'var(--jt-space-3)' }}>
            관리자가 부여한 계정으로 로그인해주세요.
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--jt-space-5)' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--jt-color-text)', fontWeight: 600, marginBottom: 'var(--jt-space-2)', fontSize: '14px' }}>
              이메일
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="premium-input"
              style={{ height: 'var(--jt-control-height-lg)' }}
              placeholder="email@address.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--jt-color-text)', fontWeight: 600, marginBottom: 'var(--jt-space-2)', fontSize: '14px' }}>
              비밀번호
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="premium-input"
              style={{ height: 'var(--jt-control-height-lg)' }}
              placeholder="********"
            />
          </div>

          {errorMsg && (
            <div style={{
              color: 'var(--jt-seed-color-error)', fontSize: '13px', textAlign: 'center', 
              backgroundColor: '#FEF2F2', padding: 'var(--jt-space-3)', borderRadius: 'var(--jt-r-sm)',
              fontWeight: 600
            }}>
              {errorMsg}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="premium-btn"
            style={{
              height: 'var(--jt-control-height-lg)',
              marginTop: 'var(--jt-space-3)'
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
