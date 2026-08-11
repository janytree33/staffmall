import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './WelcomeModal.css';

export default function WelcomeModal({ user, onComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0); // 0: 로딩/체크중, 1: 옵션 선택, 2: 기존 연동, 3: 신규 이름
  
  const [inputName, setInputName] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 마운트 혹은 user 변경 시 프로필 체크
  useEffect(() => {
    if (!user) return;
    
    const checkProfile = async () => {
      setStep(0);
      try {
        const { data, error } = await supabase
          .from('employee_profiles')
          .select('name')
          .eq('id', user.id)
          .single();
          
        if (error && error.code === 'PGRST116') {
          // 프로필 없음 (신규 로그인)
          setIsOpen(true);
          setStep(1);
        } else if (data) {
          // 프로필 있음: Auth metadata 이름 동기화 확인 (옵션)
          if (!user.user_metadata?.name) {
            await supabase.auth.updateUser({ data: { name: data.name } });
          }
          if (onComplete) onComplete();
        }
      } catch (err) {
        console.error("Profile check error:", err);
      }
    };
    checkProfile();
  }, [user, onComplete]);

  const handleLinkExisting = async () => {
    if (!inputName.trim() || inputPin.length !== 4) {
      setErrorMsg("이름과 휴대폰 뒷자리 4자리를 정확히 입력해 주세요.");
      return;
    }
    setIsProcessing(true);
    setErrorMsg('');

    try {
      // 1. 기존 멤버 찾기
      const { data: members, error: memErr } = await supabase
        .from('members')
        .select('id, name')
        .eq('name', inputName.trim())
        .eq('phone_last_4_hashed', inputPin.trim());

      if (memErr) throw memErr;

      if (!members || members.length === 0) {
        setErrorMsg("일치하는 기존 직원 정보가 없습니다. 다시 확인해 주세요.");
        setIsProcessing(false);
        return;
      }

      const existingMember = members[0];

      // 2. employee_profiles 생성
      const { error: profileErr } = await supabase
        .from('employee_profiles')
        .insert({
          id: user.id,
          name: existingMember.name
        });

      if (profileErr) {
        // 이미 존재할 경우 무시하고 진행
        if (profileErr.code !== '23505') throw profileErr;
      }

      // 3. 과거 주문 이력 소유권 이전 (UPDATE orders)
      const { error: orderErr } = await supabase
        .from('orders')
        .update({ user_id: user.id })
        .eq('member_id', existingMember.id);

      if (orderErr) throw orderErr;

      // 4. Supabase Auth Display name 업데이트
      await supabase.auth.updateUser({ data: { name: existingMember.name } });

      alert(`성공적으로 연동되었습니다! 환영합니다, ${existingMember.name}님 🎉`);
      setIsOpen(false);
      if (onComplete) onComplete();

    } catch (err) {
      console.error(err);
      setErrorMsg("연동 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewEmployee = async () => {
    if (!inputName.trim()) {
      setErrorMsg("이름을 입력해 주세요.");
      return;
    }
    setIsProcessing(true);
    setErrorMsg('');

    try {
      // 1. employee_profiles 생성
      const { error: profileErr } = await supabase
        .from('employee_profiles')
        .insert({
          id: user.id,
          name: inputName.trim()
        });

      if (profileErr) {
        if (profileErr.code !== '23505') throw profileErr;
      }

      // 2. Auth Display name 업데이트
      await supabase.auth.updateUser({ data: { name: inputName.trim() } });

      alert(`환영합니다, ${inputName.trim()}님 🎉`);
      setIsOpen(false);
      if (onComplete) onComplete();

    } catch (err) {
      console.error(err);
      setErrorMsg("등록 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="welcome-modal-overlay">
      <div className="welcome-modal-content premium-card">
        <h2 className="welcome-title">👋 환영합니다!</h2>
        <p className="welcome-desc">원활한 서비스 이용을 위해 초기 설정이 필요합니다.</p>
        
        {errorMsg && (
          <div className="welcome-error">
            <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>error</span>
            {errorMsg}
          </div>
        )}

        {step === 1 && (
          <div className="welcome-options">
            <button className="welcome-btn-primary" onClick={() => setStep(2)}>
              <span className="material-symbols-rounded">history</span>
              과거 비회원 주문 이력 연동하기
            </button>
            <button className="welcome-btn-secondary" onClick={() => setStep(3)}>
              <span className="material-symbols-rounded">person_add</span>
              신규 직원으로 이름 등록하기
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="welcome-form">
            <p className="welcome-form-desc">과거에 주문하셨던 이름과 휴대폰 뒷자리(4자리)를 입력해 주세요.</p>
            <input 
              type="text" 
              placeholder="이름 (예: 홍길동)" 
              value={inputName} 
              onChange={e => setInputName(e.target.value)}
              className="welcome-input"
            />
            <input 
              type="text" 
              placeholder="휴대폰 뒷자리 4자리 (예: 1234)" 
              value={inputPin} 
              maxLength={4}
              onChange={e => setInputPin(e.target.value)}
              className="welcome-input"
            />
            <div className="welcome-actions">
              <button className="welcome-btn-text" onClick={() => { setStep(1); setErrorMsg(''); setInputName(''); setInputPin(''); }}>뒤로가기</button>
              <button className="welcome-btn-submit" onClick={handleLinkExisting} disabled={isProcessing}>
                {isProcessing ? '처리중...' : '연동 완료하기'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="welcome-form">
            <p className="welcome-form-desc">복지몰에서 사용하실 실명을 정확히 입력해 주세요.</p>
            <input 
              type="text" 
              placeholder="이름 (예: 홍길동)" 
              value={inputName} 
              onChange={e => setInputName(e.target.value)}
              className="welcome-input"
            />
            <div className="welcome-actions">
              <button className="welcome-btn-text" onClick={() => { setStep(1); setErrorMsg(''); setInputName(''); }}>뒤로가기</button>
              <button className="welcome-btn-submit" onClick={handleNewEmployee} disabled={isProcessing}>
                {isProcessing ? '처리중...' : '등록 완료하기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
