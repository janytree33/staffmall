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
      <div style={{
        backgroundColor: 'var(--jt-bg-container)',
        padding: 'var(--jt-space-7)',
        borderRadius: 'var(--jt-r-lg)',
        boxShadow: 'var(--jt-shadow-md)',
        width: '100%',
        maxWidth: '400px',
        borderTop: '4px solid var(--jt-color-primary)',
        overflow: 'hidden'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--jt-space-6)' }}>
          <img src="/logo/logo-h.svg" alt="제니트리 로고" style={{ height: '32px', marginBottom: 'var(--jt-space-4)' }} />
          <h2 style={{ 
            color: 'var(--jt-color-text)', 
            margin: 0, 
            fontSize: 'var(--jt-seed-font-size)',
            fontWeight: 700 
          }}>임직원 복지몰 로그인</h2>
          <p style={{ 
            color: 'var(--jt-color-text-secondary)', 
            fontSize: '13px', 
            marginTop: 'var(--jt-space-2)' 
          }}>
            관리자가 부여한 계정으로 로그인해주세요.
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--jt-space-4)' }}>
          <div>
            <label style={{ 
              display: 'block', 
              color: 'var(--jt-color-text)', 
              fontWeight: 600, 
              marginBottom: 'var(--jt-space-2)',
              fontSize: '13px'
            }}>이메일</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                height: 'var(--jt-control-height)',
                padding: '0 var(--jt-space-3)',
                border: '1px solid var(--jt-color-border)',
                borderRadius: 'var(--jt-r-md)',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--jt-color-focus-ring)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--jt-color-border)'}
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              color: 'var(--jt-color-text)', 
              fontWeight: 600, 
              marginBottom: 'var(--jt-space-2)',
              fontSize: '13px'
            }}>비밀번호</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                height: 'var(--jt-control-height)',
                padding: '0 var(--jt-space-3)',
                border: '1px solid var(--jt-color-border)',
                borderRadius: 'var(--jt-r-md)',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--jt-color-focus-ring)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--jt-color-border)'}
            />
          </div>

          {errorMsg && (
            <div style={{
              color: 'var(--jt-seed-color-error)',
              fontSize: '13px',
              textAlign: 'center',
              backgroundColor: '#FEF2F2',
              padding: 'var(--jt-space-2)',
              borderRadius: 'var(--jt-r-sm)'
            }}>
              {errorMsg}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{
              height: 'var(--jt-control-height-lg)',
              backgroundColor: 'var(--jt-color-primary)',
              color: 'var(--jt-neutral-0)',
              border: 'none',
              borderRadius: 'var(--jt-r-md)',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 'var(--jt-space-2)',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = 'var(--jt-color-primary-hover)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'var(--jt-color-primary)'}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
