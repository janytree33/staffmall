import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccessMsg('비밀번호가 성공적으로 변경되었습니다!');
      // 2초 후 마이페이지로 이동
      setTimeout(() => {
        navigate('/mypage');
      }, 2000);
    } catch (err) {
      console.error(err);
      setErrorMsg('비밀번호 변경에 실패했습니다. 다시 시도해주세요.');
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
          <h2 style={{ 
            color: 'var(--jt-color-text)', 
            margin: 0, 
            fontWeight: 800,
            fontSize: '22px',
            letterSpacing: '-0.5px'
          }}>
            🔒 비밀번호 변경
          </h2>
          <p style={{ color: 'var(--jt-color-text-secondary)', fontSize: '14px', marginTop: 'var(--jt-space-3)' }}>
            안전을 위해 자신만의 새로운 비밀번호로 변경해주세요.
          </p>
        </div>

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--jt-space-5)' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--jt-color-text)', fontWeight: 600, marginBottom: 'var(--jt-space-2)', fontSize: '14px' }}>
              새 비밀번호
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

          <div>
            <label style={{ display: 'block', color: 'var(--jt-color-text)', fontWeight: 600, marginBottom: 'var(--jt-space-2)', fontSize: '14px' }}>
              새 비밀번호 확인
            </label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="premium-input"
              style={{ height: 'var(--jt-control-height-lg)' }}
              placeholder="********"
            />
          </div>

          {errorMsg && (
            <div style={{
              color: 'var(--jt-seed-color-error)', fontSize: '13px', textAlign: 'center', backgroundColor: '#FEF2F2', padding: 'var(--jt-space-3)', borderRadius: 'var(--jt-r-sm)', fontWeight: 600
            }}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{
              color: 'var(--jt-seed-color-success)', fontSize: '13px', textAlign: 'center', backgroundColor: '#F0FDF4', padding: 'var(--jt-space-3)', borderRadius: 'var(--jt-r-sm)', fontWeight: 600
            }}>
              {successMsg}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || successMsg !== ''}
            className="premium-btn"
            style={{
              height: 'var(--jt-control-height-lg)',
              marginTop: 'var(--jt-space-3)'
            }}
          >
            {loading ? '변경 중...' : '비밀번호 변경하기'}
          </button>
          
          <button 
            type="button" 
            onClick={() => navigate('/mypage')}
            style={{
              height: 'var(--jt-control-height)',
              backgroundColor: 'transparent',
              color: 'var(--jt-color-text-secondary)',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            취소 및 돌아가기
          </button>
        </form>
      </div>
    </div>
  );
}
