import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const getMasked = (val) => val.length === 0 ? '' : val[0] + '●'.repeat(val.length - 1);
  const displayPassword = showPassword ? password : getMasked(password);
  const displayConfirmPassword = showConfirmPassword ? confirmPassword : getMasked(confirmPassword);

  const handlePwdChange = (e, setter, isShow, maskedVal) => {
    if (isShow) {
      setter(e.target.value);
    } else {
      const displayed = e.target.value;
      if (displayed.length > maskedVal.length) {
        const added = displayed.slice(maskedVal.length);
        setter(prev => prev + added);
      } else {
        setter(prev => prev.slice(0, displayed.length));
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const storedUser = localStorage.getItem('custom_user');
      if (!storedUser) {
        navigate('/login');
        return;
      }
      const user = JSON.parse(storedUser);

      const { error } = await supabase
        .from('members')
        .update({ phone_last_4_hashed: password })
        .eq('id', user.id);

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
            letterSpacing: '-0.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '26px' }}>lock</span>
            비밀번호 변경
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
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={displayPassword}
                onChange={(e) => handlePwdChange(e, setPassword, showPassword, displayPassword)}
                required
                className="premium-input"
                style={{ 
                  height: 'var(--jt-control-height-lg)',
                  fontFamily: 'var(--jt-font-num)', 
                  letterSpacing: (!showPassword && displayPassword.length > 0) ? '0.2rem' : 'normal',
                  paddingRight: '40px'
                }}
                placeholder="********"
              />
              <span 
                className="material-symbols-rounded" 
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--jt-color-text-tertiary)', fontSize: '20px', cursor: 'pointer'
                }}
              >
                {showPassword ? 'visibility' : 'visibility_off'}
              </span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--jt-color-text)', fontWeight: 600, marginBottom: 'var(--jt-space-2)', fontSize: '14px' }}>
              새 비밀번호 확인
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={displayConfirmPassword}
                onChange={(e) => handlePwdChange(e, setConfirmPassword, showConfirmPassword, displayConfirmPassword)}
                required
                className="premium-input"
                style={{ 
                  height: 'var(--jt-control-height-lg)',
                  fontFamily: 'var(--jt-font-num)', 
                  letterSpacing: (!showConfirmPassword && displayConfirmPassword.length > 0) ? '0.2rem' : 'normal',
                  paddingRight: '40px'
                }}
                placeholder="********"
              />
              <span 
                className="material-symbols-rounded" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--jt-color-text-tertiary)', fontSize: '20px', cursor: 'pointer'
                }}
              >
                {showConfirmPassword ? 'visibility' : 'visibility_off'}
              </span>
            </div>
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
