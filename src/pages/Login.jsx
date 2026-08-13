import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveEmail, setSaveEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // 최초 렌더링 시 저장된 이메일 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('saved_email');
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmail(saved);
      setSaveEmail(true);
    }
  }, []);

  const maskedPwdDisplay = password.length === 0
    ? ''
    : password[0] + '●'.repeat(password.length - 1);

  const displayPassword = showPassword ? password : maskedPwdDisplay;

  const handlePwdChange = (e) => {
    if (showPassword) {
      setPassword(e.target.value);
    } else {
      const displayed = e.target.value;
      const current = maskedPwdDisplay;
      if (displayed.length > current.length) {
        // 복붙으로 여러 글자가 한 번에 들어올 경우 처리
        const added = displayed.slice(current.length);
        setPassword(prev => prev + added);
      } else {
        setPassword(prev => prev.slice(0, displayed.length));
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('email', email)
        .eq('phone_last_4_hashed', password)
        .single();

      if (error || !data) {
        throw new Error('이메일 또는 비밀번호가 일치하지 않습니다.');
      }

      // 이메일 저장 처리
      if (saveEmail) {
        localStorage.setItem('saved_email', email);
      } else {
        localStorage.removeItem('saved_email');
      }

      // 커스텀 로그인 성공: 로컬 스토리지에 유저 정보 저장
      localStorage.setItem('custom_user', JSON.stringify({
        id: data.id,
        email: data.email,
        name: data.name,
      }));

      // 로그인 성공 시 메인 화면으로 이동
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
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-rounded" style={{
                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--jt-color-text-tertiary)', fontSize: '20px'
              }}>mail</span>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="premium-input"
                style={{ height: 'var(--jt-control-height-lg)', paddingLeft: '40px' }}
                placeholder="회사 이메일을 입력하세요"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--jt-color-text)', fontWeight: 600, marginBottom: 'var(--jt-space-2)', fontSize: '14px' }}>
              비밀번호
            </label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-rounded" style={{
                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--jt-color-text-tertiary)', fontSize: '20px'
              }}>lock</span>
              <input 
                type="text" 
                value={displayPassword}
                onChange={handlePwdChange}
                required
                className="premium-input"
                style={{ 
                  height: 'var(--jt-control-height-lg)', 
                  fontFamily: 'var(--jt-font-num)', 
                  letterSpacing: (!showPassword && displayPassword.length > 0) ? '0.2rem' : 'normal',
                  paddingLeft: '40px',
                  paddingRight: '40px'
                }}
                placeholder="비밀번호를 입력하세요"
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '-8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: 'var(--jt-color-text-secondary)' }}>
              <input 
                type="checkbox" 
                checked={saveEmail} 
                onChange={(e) => setSaveEmail(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--jt-color-text)' }}
              />
              이메일 저장
            </label>
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
