import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductList from '../components/ProductList';
import Cart from '../components/Cart';
import AdminPanel from '../components/AdminPanel'; // 🚀 새로 만든 관리자 패널

import { PURCHASE_LIMITS, TARGET_TYPES } from '../utils/constants';
import { supabase } from '../supabaseClient'; 

function Home() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState(null);
  
  // 🔥 동적 데이터 상태 (Supabase에서 실시간으로 불러옴)
  const [products, setProducts] = useState([]);
  const [members, setMembers] = useState([]);

  // 인증 모달 관련 상태
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 관리자 패널 관련 상태
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [adminOrders, setAdminOrders] = useState([]);

  // 🔒 커스텀 비밀번호 모달 상태
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdInput, setPwdInput] = useState('');
  const [pwdError, setPwdError] = useState(false);
  const [pwdModalTitle, setPwdModalTitle] = useState(''); // 모달 제목 (상황마다 다르게 표시)
  const [pwdModalCallback, setPwdModalCallback] = useState(null); // 비밀번호 맞을 때 실행할 함수
  const pwdInputRef = useRef(null);

  // 비밀번호 모달을 여는 범용 함수 (제목과 성공시 실행할 함수를 받음)
  const openPwdModal = (title, callback) => {
    setPwdModalTitle(title);
    setPwdModalCallback(() => callback); // ()=>callback 이유: useState가 함수를 직접 넣으면 실행해버림
    setPwdInput('');
    setPwdError(false);
    setShowPwdModal(true);
    setTimeout(() => pwdInputRef.current?.focus(), 100);
  };

  // ⬆️ 맨 위로 버튼: 스크롤이 300px 이상 내려가면 나타남
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // 300px 이상 스크롤되면 버튼 표시
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 맨 위로 부드럽게 스크롤하는 함수
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 첫 글자만 보이고 나머지는 ● 로 마스킹하는 표시값 계산
  const maskedPwdDisplay = pwdInput.length === 0
    ? ''
    : pwdInput[0] + '●'.repeat(pwdInput.length - 1);

  // 비밀번호 입력 핸들러 (실제값 따로 추적)
  const handlePwdChange = (e) => {
    const displayed = e.target.value;
    const current = maskedPwdDisplay;
    if (displayed.length > current.length) {
      // 글자 추가됨: 마지막 입력 글자를 실제 비밀번호에 추가
      const newChar = displayed[displayed.length - 1];
      setPwdInput(prev => prev + newChar);
    } else {
      // 글자 삭제됨: 실제 비밀번호도 같은 길이로 자름
      setPwdInput(prev => prev.slice(0, displayed.length));
    }
    setPwdError(false);
  };

  // 비밀번호 확인 후 콜백 함수 호출 (범용)
  const handlePwdSubmit = () => {
    if (pwdInput === ACCOUNTING_PASSWORD) {
      setShowPwdModal(false);
      setPwdInput('');
      setPwdError(false);
      // 등록된 콜백 함수 실행 (관리설정 열기 or 입금확인 처리 등)
      if (pwdModalCallback) pwdModalCallback();
    } else {
      setPwdError(true);
      setPwdInput('');
      setTimeout(() => pwdInputRef.current?.focus(), 50);
    }
  };

  // 패널 자동 스크롤용 ref (버튼 클릭 시 해당 위치로 부드럽게 이동)
  const adminPanelRef = useRef(null);
  const orderPanelRef = useRef(null);
  
  // 📅 관리자 패널용 월별 필터 상태 (기본값: 현재 년-월 '2026-05')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  });

  // 🔒 회계담당자(관리자) 전용 승인 및 취소 비밀번호 (★여기서 원하시는 암호로 변경하세요!)
  const ACCOUNTING_PASSWORD = "janytree_admin"; 

  // 여러 상품 또는 단일 상품을 장바구니에 추가하는 배치 함수
  const handleBatchAddToCart = (items, isBatch = true) => {
    let newCart = [...cartItems];
    let limitAlertTriggered = false;
    let exceededLimitDetails = [];

    items.forEach(({ product, targetType, quantity }) => {
      if (quantity <= 0) return;
      
      const existingItemIndex = newCart.findIndex(
        item => item.product.id === product.id && item.targetType === targetType
      );
      const existingQuantity = existingItemIndex !== -1 ? newCart[existingItemIndex].quantity : 0;
      const totalRequestedQuantity = existingQuantity + quantity;
      const limit = PURCHASE_LIMITS[targetType];

      // UI 1차 장바구니 제한 체크
      if (totalRequestedQuantity > limit) {
        limitAlertTriggered = true;
        exceededLimitDetails.push(`- ${product.name} (${targetType}구매: 장바구니에 이미 ${existingQuantity}개 담겨있음, 추가하려는 수량 ${quantity}개, 제한 ${limit}개)`);
        return;
      }

      if (existingItemIndex !== -1) {
        newCart[existingItemIndex] = { ...newCart[existingItemIndex], quantity: totalRequestedQuantity };
      } else {
        const cartItemId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        newCart.push({
          cartItemId,
          product,
          targetType,
          quantity,
          price: product.prices[targetType]
        });
      }
    });

    if (limitAlertTriggered) {
      alert(`일부 상품의 장바구니 담기 한도가 초과되었습니다:\n\n${exceededLimitDetails.join('\n')}`);
    } else {
      alert(isBatch ? "선택하신 상품이 장바구니에 일괄 담겼습니다!" : "상품이 장바구니에 담겼습니다!");
    }
    
    setCartItems(newCart);
  };

  const handleAddToCart = (product, targetType, quantity) => {
    handleBatchAddToCart([{ product, targetType, quantity }], false);
  };

  const handleRemoveFromCart = (cartItemId) => {
    setCartItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  // 장바구니에서 '결제/주문하기'를 누르면 확인 모달 띄우기
  const handleCheckoutClick = () => {
    if (cartItems.length === 0) return;
    if (!user) {
      alert("로그인이 필요한 서비스입니다.");
      navigate('/login');
      return;
    }
    setShowAuthModal(true);
  };

  // 🚀 실제 주문을 데이터베이스에 등록하고 한도를 검증하는 핵심 함수
  const processOrder = async () => {
    if (!user) return;
    setIsProcessing(true);

    try {
      // 1. 직원 정보 확인 (프로필에서 이름 가져오기)
      let ordererName = user.email.split('@')[0];
      const { data: profile } = await supabase
        .from('employee_profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      
      if (profile && profile.name) {
        ordererName = profile.name;
      }

      // 3. 당월 누적 구매 수량 조회 ('주문취소' 제외)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: pastOrders, error: ordersErr } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          order_items ( product_id, product_name, target_type, quantity )
        `)
        .eq('user_id', user.id)
        .neq('status', '주문취소')
        .gte('created_at', startOfMonth.toISOString());

      if (ordersErr) throw ordersErr;

      const accumulated = {};
      pastOrders.forEach(order => {
        if (order.order_items) {
          order.order_items.forEach(item => {
            const key = `${item.product_id}_${item.target_type}`;
            accumulated[key] = (accumulated[key] || 0) + item.quantity;
          });
        }
      });

      let isLimitExceeded = false;
      let limitAlertMsg = "🚨 이번 달 구매 한도를 초과한 상품이 있습니다!\n\n";

      cartItems.forEach(item => {
        const targetType = item.targetType;
        if (targetType === TARGET_TYPES.SELF || targetType === TARGET_TYPES.FAMILY) {
          const key = `${item.product.id}_${targetType}`;
          const pastQty = accumulated[key] || 0;
          const currentQty = item.quantity;
          const limit = PURCHASE_LIMITS[targetType];

          if (pastQty + currentQty > limit) {
            isLimitExceeded = true;
            limitAlertMsg += `📍 ${item.product.name} (${targetType})\n - 기존 구매: ${pastQty}개 / 장바구니: ${currentQty}개 (월 한도: ${limit}개)\n\n`;
          }
        }
      });

      if (isLimitExceeded) {
        alert(limitAlertMsg + "장바구니 수량을 조절해 주세요.");
        setIsProcessing(false);
        return;
      }

      // 4. 주문 마스터(orders) 저장
      const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const { data: newOrder, error: insertOrderErr } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_price: totalPrice,
          status: '입금대기'
        })
        .select()
        .single();

      if (insertOrderErr) throw insertOrderErr;

      // 5. 주문 상세(order_items) 저장
      const itemsToInsert = cartItems.map(item => ({
        order_id: newOrder.id,
        product_id: item.product.id,
        product_name: item.product.name,
        target_type: item.targetType,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: insertItemsErr } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (insertItemsErr) throw insertItemsErr;

      // 📋 6. 회계 담당자 전용 견적서 복사
      const dateString = new Date().toLocaleString();
      const itemDetails = cartItems.map((item, index) => 
        `${index + 1}. ${item.product.name} (${item.targetType}) - ${item.quantity}개 / ${item.price.toLocaleString()}원`
      ).join('\n');

      const textToCopy = `[임직원 화장품 구매 견적서]\n주문자: ${ordererName}\n주문일시: ${dateString}\n\n${itemDetails}\n-------------------------\n총 결제 금액: ${totalPrice.toLocaleString()}원\n입금 계좌: 신한은행 100-026-244778 (주)제니트리`;

      try {
        await navigator.clipboard.writeText(textToCopy);
      } catch (err) {
        console.error('클립보드 복사 실패:', err);
      }

      // 7. NTFY 푸시 알림 발송
      const ntfyTopic = import.meta.env.VITE_NTFY_TOPIC || 'janytree_order_alert';
      try {
        await fetch(`https://ntfy.sh/${ntfyTopic}`, {
          method: 'POST',
          body: `주문알림: [${ordererName}]님이 화장품 주문을 신청했습니다. (총액 ${totalPrice.toLocaleString()}원 / 입금대기)`,
          headers: {
            'Title': '제니트리 복지몰 새 주문',
            'Tags': 'shopping_bags,moneybag'
          }
        });
      } catch (e) {
        console.error("푸시 알림 발송 실패:", e);
      }

      // 8. 주문 완료 후 화면 처리
      alert(`🎉 주문 신청이 완료되었습니다!\n\n견적서 내용이 클립보드에 복사되었습니다. 카카오톡이나 메신저로 회계담당자에게 바로 붙여넣기(Ctrl+V) 해주세요.\n\n총 결제 금액: ${totalPrice.toLocaleString()}원\n입금 계좌: 신한은행 100-026-244778 (주)제니트리\n\n입금이 확인되면 상품이 지급됩니다.`);
      setCartItems([]);
      setShowAuthModal(false);
      setAuthName('');
      setAuthPhone('');
      
      // 만약 관리자 패널이 열려있다면 새로고침해 줍니다.
      if (showOrderHistory) fetchAdminOrders();
      
    } catch (error) {
      console.error(error);
      alert("주문 처리 중 오류가 발생했습니다. 관리자에게 문의하세요.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 🛠 관리자 전용 기능: 선택된 월의 주문 목록만 불러오기 (성능 및 스크롤 최적화)
  const fetchAdminOrders = async () => {
    try {
      // 선택된 년-월(YYYY-MM)을 기반으로 시작일과 종료일 계산
      const [year, month] = selectedMonth.split('-');
      const startRange = new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString();
      const endRange = new Date(year, month, 1, 0, 0, 0, 0).toISOString();

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_price,
          status,
          created_at,
          members ( name, phone_last_4_hashed ),
          order_items ( product_name, target_type, quantity )
        `)
        .gte('created_at', startRange)
        .lt('created_at', endRange)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAdminOrders(data);
    } catch (error) {
      console.error(error);
      alert("주문 내역을 불러오지 못했습니다.");
    }
  };

  // 🛠 입금 상태 변경 (회계 담당자용 비밀번호 검증)
  const handleUpdateStatus = (orderId, currentStatus) => {
    const nextStatus = currentStatus === '입금대기' ? '입금완료' : '입금대기';
    const confirmMsg = nextStatus === '입금완료'
      ? "이 주문을 '입금완료' 상태로 변경하시겠습니까?"
      : "⚠️ 이미 완료된 건입니다. 다시 '입금대기' 상태로 되돌리시겠습니까?";

    // prompt() 대신 커스텀 모달 사용 (첫 글자 표시 + 나머지 마스킹)
    openPwdModal(
      `💼 회계 담당자 승인 (${nextStatus} 처리)`,
      async () => {
        if (!window.confirm(confirmMsg)) return;
        try {
          const { error } = await supabase
            .from('orders')
            .update({ status: nextStatus })
            .eq('id', orderId);
          if (error) throw error;
          alert(`👍 주문 상태가 [${nextStatus}]로 변경되었습니다.`);
          fetchAdminOrders();
        } catch (e) {
          console.error(e);
          alert('상태 변경에 실패했습니다.');
        }
      }
    );
  };

  // 🛠 🚫 주문 취소 처리 기능 (누구나 자율 취소 가능)
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("⚠️ 이 주문 내역을 취소 처리하시겠습니까?\n(취소하면 이력이 안전하게 보존되며 이번 달 한도 수량이 복구됩니다)")) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: '주문취소' })
        .eq('id', orderId);
        
      if (error) throw error;
      alert("주문이 정상적으로 취소 처리되었습니다.");
      fetchAdminOrders();
    } catch (e) {
      console.error(e);
      alert("주문 취소 처리에 실패했습니다.");
    }
  };

  // 관리자 패널(주문 내역)이 열려있거나, 필터링 월이 바뀔 때 데이터를 새로 불러옵니다.
  useEffect(() => {
    if (showOrderHistory) fetchAdminOrders();
    // eslint-disable-next-line
  }, [showOrderHistory, selectedMonth]);

  // 🔥 앱 최초 로드 시 Products와 Members를 실시간 동기화 및 Auth 체크
  useEffect(() => {
    // 1. 유저 인증 상태 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // 2. 데이터 가져오기
    const fetchDynamicData = async () => {
      const [{ data: pData }, { data: mData }] = await Promise.all([
        supabase.from('products').select('*').order('id', { ascending: true }),
        supabase.from('members').select('*')
      ]);
      
      if (pData) {
        // 기존 프론트엔드 구조(prices 객체)와 호환되게 매핑
        const mappedProducts = pData.map(p => ({
          ...p,
          prices: {
            [TARGET_TYPES.SELF]: p.price_self,
            [TARGET_TYPES.FAMILY]: p.price_family,
            [TARGET_TYPES.ACQUAINTANCE]: p.price_acquaintance
          }
        }));
        setProducts(mappedProducts);
      }
      if (mData) setMembers(mData);
    };

    fetchDynamicData();

    const subscription = supabase
      .channel('dynamic-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchDynamicData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, fetchDynamicData)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <>


    {/* ⬆️ 맨 위로 플로팅 버튼 - 스크롤이 300px 넘으면 나타남 */}
    <button
      onClick={scrollToTop}
      title="맨 위로 이동"
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        border: 'none',
        background: 'var(--jt-color-primary)',
        color: 'var(--jt-neutral-0)',
        fontSize: '1.4rem',
        cursor: 'pointer',
        boxShadow: 'var(--jt-shadow-lg)',
        zIndex: 9997,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        /* 나타나고 사라지는 부드러운 애니메이션 */
        opacity: showScrollTop ? 1 : 0,
        transform: showScrollTop ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        pointerEvents: showScrollTop ? 'auto' : 'none',
      }}
    >
      ↑
    </button>

    <div className="container" style={{ paddingBottom: '140px' }}>
      <header style={{ marginBottom: '2.5rem', textAlign: 'center', width: '100%' }}>
        {/* 참고 사이트처럼 헤더 전체를 밝고 반투명한 카드형 배너로 */}
        <div className="header-card premium-card" style={{ padding: 'var(--jt-space-6) var(--jt-space-7)' }}>
          {/* 1. 좌측 로고 영역 */}
          <div className="header-logo-container" style={{ flex: '0 0 auto' }}>
            <img 
              src="/logo/logo-h.svg" 
              alt="제니트리 로고" 
              className="header-logo"
            />
          </div>

          {/* 2. 중앙 텍스트 영역 */}
          <div className="header-text-container" style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 className="header-title">
              제니트리 임직원 전용 화장품 복지몰
            </h1>
            <p className="header-subtitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.2rem', color: 'var(--jt-color-success)' }}>spa</span>
              특별한 혜택으로 화장품을 만나보세요. (본인 / 가족 / 지인 할인 적용)
            </p>
          </div>

          {/* 우측 관리 버튼 영역 */}
          <div className="header-buttons">
            {user ? (
              <button 
                className="premium-btn"
                style={{ backgroundColor: 'var(--jt-neutral-100)', color: 'var(--jt-neutral-800)', border: '1px solid var(--jt-color-border)', height: 'var(--jt-control-height)' }}
                onClick={() => navigate('/mypage')}
              >
                👤 마이페이지
              </button>
            ) : (
              <button 
                className="premium-btn"
                style={{ backgroundColor: 'var(--jt-color-primary)', color: 'var(--jt-neutral-0)', height: 'var(--jt-control-height)' }}
                onClick={() => navigate('/login')}
              >
                🔐 직원 로그인
              </button>
            )}
            <button 
              className="premium-btn"
              style={{ backgroundColor: 'transparent', color: 'var(--jt-neutral-600)', border: '1px solid var(--jt-color-border)', height: 'var(--jt-control-height)' }}
              onClick={() => {
                if (showAdminSettings) {
                  setShowAdminSettings(false);
                } else {
                  openPwdModal('⚙️ 관리자 확인', () => {
                    setShowAdminSettings(true);
                    setShowOrderHistory(false);
                    setTimeout(() => {
                      adminPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  });
                }
              }}
            >
              ⚙️ 관리 설정 {showAdminSettings ? '닫기' : '열기'}
            </button>
            
            <button 
              className="premium-btn"
              style={{ backgroundColor: 'var(--jt-color-accent)', color: 'var(--jt-neutral-0)', height: 'var(--jt-control-height)' }}
              onClick={() => {
                const next = !showOrderHistory;
                setShowOrderHistory(next);
                setShowAdminSettings(false);
                if (next) {
                  setTimeout(() => {
                    orderPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }
              }}
            >
              📦 주문 현황 {showOrderHistory ? '닫기' : '열기'}
            </button>
          </div>
        </div>
      </header>

      <main>
        <ProductList products={products} onAddToCart={handleAddToCart} onBatchAddToCart={handleBatchAddToCart} />
        <Cart 
          cartItems={cartItems} 
          onRemoveFromCart={handleRemoveFromCart}
          onCheckout={handleCheckoutClick}
        />
      </main>

      {/* 🔒 커스텀 비밀번호 모달 */}
      {showPwdModal && (
        <div
          onClick={() => { setShowPwdModal(false); setPwdInput(''); }}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 9998
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '1.5rem',
              padding: '2rem',
              width: '90%', maxWidth: '400px',
              boxShadow: '0 20px 60px rgba(6,182,212,0.25)',
              border: '2px solid #6ee7b7',
              animation: 'modalFadeIn 0.25s ease-out'
            }}
          >
            {/* 모달 제목 */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔒</div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0a2e1f', margin: 0 }}>{pwdModalTitle || '관리자 확인'}</h2>
              <p style={{ fontSize: '0.85rem', color: '#2d7a5a', marginTop: '0.3rem' }}>비밀번호를 입력해 주세요</p>
            </div>

            {/* 비밀번호 입력 (첫 글자 표시 + 나머지 ● 마스킹) */}
            <input
              ref={pwdInputRef}
              type="text"
              value={maskedPwdDisplay}
              onChange={handlePwdChange}
              onKeyDown={e => e.key === 'Enter' && handlePwdSubmit()}
              placeholder="비밀번호 입력"
              autoComplete="off"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                fontSize: '1.3rem',
                letterSpacing: '0.25rem',
                border: pwdError ? '2px solid #ef4444' : '2px solid #6ee7b7',
                borderRadius: '0.75rem',
                outline: 'none',
                textAlign: 'center',
                fontFamily: 'monospace',
                background: pwdError ? '#fef2f2' : '#f0fdf4',
                color: '#0a2e1f',
                transition: 'border 0.2s'
              }}
            />

            {/* 오류 메시지 */}
            {pwdError && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem', fontWeight: '600' }}>
                ❌ 비밀번호가 일치하지 않습니다. 다시 입력해 주세요.
              </p>
            )}

            {/* 입력 힌트 */}
            <p style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center', marginTop: '0.5rem' }}>
              💡 첫 글자는 표시되고 나머지는 ● 로 가려집니다
            </p>

            {/* 버튼 영역 */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                onClick={() => { setShowPwdModal(false); setPwdInput(''); }}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '9999px',
                  border: '1.5px solid #d1d5db', background: '#f9fafb',
                  color: '#374151', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                취소
              </button>
              <button
                onClick={handlePwdSubmit}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '9999px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #06b6d4, #059669)',
                  color: '#ffffff', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem',
                  boxShadow: '0 4px 14px rgba(6,182,212,0.4)'
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔐 결제 확인 모달 */}
      {showAuthModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="card animate-fade-in" style={{ width: '90%', maxWidth: '400px', backgroundColor: 'var(--jt-bg-container)', padding: 'var(--jt-space-7)', borderRadius: 'var(--jt-r-lg)' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--jt-color-text)', textAlign: 'center' }}>주문 확인</h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--jt-color-text-secondary)', marginBottom: '1.5rem', textAlign: 'center', lineHeight: '1.5' }}>
              장바구니에 담은 상품들을<br/>최종 주문 접수하시겠습니까?
            </p>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }} 
                onClick={processOrder}
                disabled={isProcessing}
              >
                {isProcessing ? '처리중...' : '주문 접수하기'}
              </button>
              <button 
                className="btn" 
                style={{ flex: 1, backgroundColor: '#e2e8f0' }} 
                onClick={() => setShowAuthModal(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛠 1. 신규 종합 관리자 패널 (직원 및 품목) */}
      {showAdminSettings && (
        <div ref={adminPanelRef} style={{ marginTop: '1rem', marginBottom: '3rem', animation: 'fadeIn 0.3s ease-out' }}>
          <AdminPanel members={members} products={products} />
        </div>
      )}

      {/* 🛠 2. 기존 주문 현황 패널 */}
      {showOrderHistory && (
        <div ref={orderPanelRef} style={{ marginTop: '1rem', marginBottom: '3rem', animation: 'fadeIn 0.3s ease-out' }}>
          <div className="card" style={{ padding: '1.5rem', border: '2px solid #334155' }}>
          
          {/* 상단 컨트롤 영역 (타이틀 및 월 선택 박스) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ margin: 0 }}>🛡️ 주문 현황 및 취소 관리 패널</h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>조회 월 선택:</label>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  color: 'var(--color-primary)',
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>

          {/* 🔥 대량 주문 대비: 최대 높이를 500px로 제한하고 내부 스크롤 바를 생성합니다. */}
          <div style={{ overflowX: 'auto', maxHeight: '530px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'center' }}>
              <thead style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '0.8rem', border: '1px solid #cbd5e1' }}>주문일시</th>
                  <th style={{ padding: '0.8rem', border: '1px solid #cbd5e1', width: '35%' }}>직원 및 상세 주문 품목</th>
                  <th style={{ padding: '0.8rem', border: '1px solid #cbd5e1' }}>총 결제액</th>
                  <th style={{ padding: '0.8rem', border: '1px solid #cbd5e1' }}>현재 상태</th>
                  <th style={{ padding: '0.8rem', border: '1px solid #cbd5e1' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {adminOrders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0', opacity: order.status === '주문취소' ? 0.6 : 1 }}>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid #cbd5e1', verticalAlign: 'middle', textDecoration: order.status === '주문취소' ? 'line-through' : 'none' }}>
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '1rem 1rem', border: '1px solid #cbd5e1', textAlign: 'left', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: order.status === '주문취소' ? '#94a3b8' : 'var(--color-primary)', marginBottom: '0.5rem', textDecoration: order.status === '주문취소' ? 'line-through' : 'none' }}>
                        👤 {order.members?.name} 직원님
                      </div>
                      <div style={{ backgroundColor: order.status === '주문취소' ? '#f1f5f9' : '#f8fafc', padding: '0.6rem', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                        {order.order_items && order.order_items.map((item, idx) => (
                          <div key={idx} style={{ fontSize: '0.85rem', color: order.status === '주문취소' ? '#94a3b8' : '#334155', padding: '0.15rem 0', textDecoration: order.status === '주문취소' ? 'line-through' : 'none' }}>
                            📦 {item.product_name} <span style={{ color: '#64748b' }}>({item.target_type})</span> — <strong>{item.quantity}개</strong>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid #cbd5e1', verticalAlign: 'middle', fontWeight: 'bold', color: order.status === '주문취소' ? '#94a3b8' : '#0f172a', textDecoration: order.status === '주문취소' ? 'line-through' : 'none' }}>
                      {order.total_price.toLocaleString()}원
                    </td>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                      <span style={{ 
                        padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold',
                        backgroundColor: order.status === '입금대기' ? '#fef08a' : order.status === '입금완료' ? '#bbf7d0' : '#fecaca',
                        color: order.status === '입금대기' ? '#854d0e' : order.status === '입금완료' ? '#166534' : '#991b1b'
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                        {order.status !== '주문취소' && (
                          <button 
                            className="btn btn-sm" 
                            style={{ 
                              padding: '0.4rem 0.8rem', fontSize: '0.8rem',
                              backgroundColor: order.status === '입금대기' ? 'var(--color-primary)' : '#64748b', 
                              color: 'white' 
                            }}
                            onClick={() => handleUpdateStatus(order.id, order.status)}
                          >
                            {order.status === '입금대기' ? '입금 확인' : '대기로 되돌리기 🔄'}
                          </button>
                        )}
                        
                        {order.status !== '주문취소' && (
                          <button 
                            className="btn btn-sm" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: '#ef4444', color: 'white' }}
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            주문취소
                          </button>
                        )}
                        {order.status === '주문취소' && (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>한도복구완료</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {adminOrders.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '3rem', color: 'gray' }}> 선택하신 달({selectedMonth})의 주문 내역이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}
    </div>
    </>
  );
}

export default Home;