import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductList from '../components/ProductList';
import Cart from '../components/Cart';
import AdminPanel from '../components/AdminPanel'; // 🚀 새로 만든 관리자 패널
import { sendTelegramOrderAlert, sendEmailReceipt } from '../utils/notificationService';

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
  const [orderSuccessData, setOrderSuccessData] = useState(null);

  // 배송 및 결제 폼 상태
  const [deliveryType, setDeliveryType] = useState('방문수령');
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryZipcode, setDeliveryZipcode] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryAddressDetail, setDeliveryAddressDetail] = useState('');
  const [deliveryMemo, setDeliveryMemo] = useState('');
  const [cashReceiptPhone, setCashReceiptPhone] = useState('');
  const [cashReceiptType, setCashReceiptType] = useState('소득공제'); // '소득공제' or '지출증빙'

  // 📞 전화번호 및 사업자번호 자동 하이픈(-) 포맷팅 함수
  const formatPhoneNumber = (value, type = 'phone') => {
    if (!value) return '';
    const cleaned = value.replace(/\D/g, ''); // 숫자 이외의 문자 제거
    
    if (type === 'business') {
      // 사업자등록번호 포맷 (000-00-00000)
      const match = cleaned.match(/^(\d{0,3})(\d{0,2})(\d{0,5})$/);
      if (!match) return cleaned;
      if (match[3]) return `${match[1]}-${match[2]}-${match[3]}`;
      if (match[2]) return `${match[1]}-${match[2]}`;
      return match[1];
    } else {
      // 휴대폰 번호 포맷 (010-0000-0000)
      const match = cleaned.match(/^(\d{0,3})(\d{0,4})(\d{0,4})$/);
      if (!match) return cleaned;
      if (match[3]) return `${match[1]}-${match[2]}-${match[3]}`;
      if (match[2]) return `${match[1]}-${match[2]}`;
      return match[1];
    }
  };

  const handlePhoneChange = (e, setter, type = 'phone') => {
    setter(formatPhoneNumber(e.target.value, type));
  };

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
    // 모달 초기화
    setDeliveryType('방문수령');
    setDeliveryName(user.name || '');
    setDeliveryPhone('');
    setDeliveryZipcode('');
    setDeliveryAddress('');
    setDeliveryAddressDetail('');
    setDeliveryMemo('');
    setCashReceiptPhone('');
    setCashReceiptType('소득공제');
    
    setShowAuthModal(true);
  };

  // 다음 우편번호 검색 API 호출
  const handlePostcodeSearch = () => {
    if (window.daum && window.daum.Postcode) {
      new window.daum.Postcode({
        oncomplete: function(data) {
          let addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
          setDeliveryZipcode(data.zonecode);
          setDeliveryAddress(addr);
        }
      }).open();
    } else {
      alert('우편번호 서비스를 불러올 수 없습니다.');
    }
  };

  // 🚀 실제 주문을 데이터베이스에 등록하고 한도를 검증하는 핵심 함수
  const processOrder = async () => {
    if (!user) return;
    setIsProcessing(true);

    try {
      // 1. 직원 정보 확인 (프로필에서 이름 가져오기)
      const ordererName = user.name;
      
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
        .eq('member_id', user.id)
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
          member_id: user.id,
          total_price: totalPrice,
          status: '입금대기',
          delivery_type: deliveryType,
          delivery_name: deliveryType === '택배배송' ? deliveryName : null,
          delivery_phone: deliveryType === '택배배송' ? deliveryPhone : null,
          delivery_zipcode: deliveryType === '택배배송' ? deliveryZipcode : null,
          delivery_address: deliveryType === '택배배송' ? deliveryAddress : null,
          delivery_address_detail: deliveryType === '택배배송' ? deliveryAddressDetail : null,
          delivery_memo: deliveryType === '택배배송' ? deliveryMemo : null,
          cash_receipt_phone: cashReceiptPhone
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

      // NTFY 알림은 오류 발생 및 불필요하므로 삭제 (텔레그램 및 이메일 알림으로 대체)

      // 🚀 7. 텔레그램 알림 발송 추가
      try {
        await sendTelegramOrderAlert({
          memberName: ordererName,
          items: itemsToInsert,
          totalPrice: totalPrice,
          status: '입금대기'
        });

        // 📧 8. 이메일 영수증 발송 (직원 본인에게)
        const orderId = newOrder ? newOrder.id : '알수없음';
        await sendEmailReceipt('order', user, {
          orderId: orderId,
          items: itemsToInsert,
          totalPrice: totalPrice
        });
      } catch (e) {
        console.error('텔레그램 알림 발송 중 오류:', e);
      }

      // 8. 주문 완료 후 화면 처리 (내부 모달 호출)
      setOrderSuccessData({ totalPrice });
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
          order_items ( product_name, target_type, quantity, price )
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
      : "이미 완료된 건입니다. 다시 '입금대기' 상태로 되돌리시겠습니까?";

    // prompt() 대신 커스텀 모달 사용 (첫 글자 표시 + 나머지 마스킹)
    openPwdModal(
      `회계 담당자 승인 (${nextStatus} 처리)`,
      async () => {
        if (!window.confirm(confirmMsg)) return;
        try {
          const { error } = await supabase
            .from('orders')
            .update({ status: nextStatus })
            .eq('id', orderId);
          if (error) throw error;
          alert(`주문 상태가 [${nextStatus}]로 변경되었습니다.`);
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
    // 1. 커스텀 유저 인증 상태 확인
    const checkCustomUser = () => {
      const storedUser = localStorage.getItem('custom_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };
    checkCustomUser();

    // 혹시 다른 탭에서 로그인/로그아웃했을 때 감지하기 위해 storage 이벤트 추가
    const handleStorageChange = () => checkCustomUser();
    window.addEventListener('storage', handleStorageChange);

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
      window.removeEventListener('storage', handleStorageChange);
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
          <div className="header-logo-container" style={{ display: 'flex', alignItems: 'center' }}>
            <img 
              src="/logo/logo-h.svg" 
              alt="제니트리 로고" 
              className="header-logo"
            />
          </div>

          {/* 2. 중앙 텍스트 영역 */}
          <div className="header-text-container">
            <h1 className="header-title">
              제니트리 임직원 전용 화장품 복지몰
            </h1>
            <p className="header-subtitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.2rem', color: 'var(--jt-color-success)' }}>spa</span>
              특별한 혜택으로 화장품을 만나보세요. (본인 / 가족 / 지인 할인 적용)
            </p>
          </div>

          {/* 우측 관리 버튼 영역 */}
          <div className="header-buttons" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {user ? (
              <button 
                className="premium-btn"
                style={{ backgroundColor: 'var(--jt-neutral-100)', color: 'var(--jt-neutral-800)', border: '1px solid var(--jt-color-border)', height: 'var(--jt-control-height)', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => navigate('/mypage')}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 0, 'wght' 400" }}>eco</span>
                마이페이지
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
            {/* 관리자 전용 메뉴: 특정 이메일로 로그인했을 때만 노출 */}
            {user?.email === 'info@janytree.com' && (
              <button 
                className="premium-btn"
                style={{ backgroundColor: 'transparent', color: 'var(--jt-neutral-600)', border: '1px solid var(--jt-color-border)', height: 'var(--jt-control-height)' }}
                onClick={() => {
                  if (showAdminSettings) {
                    setShowAdminSettings(false);
                  } else {
                    // 이미 로그인된 관리자 계정이므로 비밀번호 재입력 없이 즉시 오픈
                    setShowAdminSettings(true);
                    setShowOrderHistory(true); // 관리 설정 열 때 주문 현황도 같이 엶
                    setTimeout(() => {
                      adminPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px', marginRight: '4px', verticalAlign: 'middle' }}>settings</span>
                관리 설정 {showAdminSettings ? '닫기' : '열기'}
              </button>
            )}
            
            {/* 주문 현황 버튼 삭제: 일반 직원은 마이페이지에서 본인 기록만 보고, 전체 현황은 관리 설정 안에 통합됨 */}
          </div>
        </div>
      </header>
      <main className="home-main-layout">
        <div className="product-list-section">
          <ProductList products={products} onAddToCart={handleAddToCart} onBatchAddToCart={handleBatchAddToCart} />
        </div>
        <div className="cart-section">
          <Cart 
            cartItems={cartItems} 
            onRemoveFromCart={handleRemoveFromCart}
            onCheckout={handleCheckoutClick}
          />
        </div>
      </main>

      {/* 🔒 커스텀 비밀번호 모달 */}
      {showPwdModal && (
        <div
          onClick={() => { setShowPwdModal(false); setPwdInput(''); }}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'var(--jt-dim-50)',
            backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 9998
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--jt-neutral-0)',
              borderRadius: 'var(--jt-r-xl)',
              padding: 'var(--jt-space-6) var(--jt-space-7)',
              width: '90%', maxWidth: '400px',
              boxShadow: 'var(--jt-shadow-2xl)',
              animation: 'modalFadeIn 0.25s ease-out'
            }}
          >
            {/* 모달 제목 */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--jt-neutral-600)' }}>lock</span>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--jt-color-text)', margin: 0 }}>
                {pwdModalTitle || '관리자 확인'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--jt-color-text-secondary)', marginTop: '0.3rem' }}>비밀번호를 입력해 주세요</p>
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
                border: pwdError ? '1px solid var(--jt-color-danger)' : '1px solid var(--jt-color-border)',
                borderRadius: 'var(--jt-r-md)',
                outline: 'none',
                textAlign: 'center',
                fontFamily: 'var(--jt-font-num)',
                background: pwdError ? 'var(--jt-danger-50)' : 'var(--jt-neutral-50)',
                color: 'var(--jt-color-text)',
                transition: 'border 0.2s'
              }}
            />

            {/* 오류 메시지 */}
            {pwdError && (
              <p style={{ color: 'var(--jt-color-danger)', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>error</span>
                비밀번호가 일치하지 않습니다. 다시 입력해 주세요.
              </p>
            )}

            {/* 입력 힌트 */}
            <p style={{ fontSize: '0.75rem', color: 'var(--jt-color-text-secondary)', textAlign: 'center', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>lightbulb</span>
              첫 글자는 표시되고 나머지는 ● 로 가려집니다
            </p>

            {/* 버튼 영역 */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                onClick={() => { setShowPwdModal(false); setPwdInput(''); }}
                style={{
                  flex: 1, padding: 'var(--jt-space-4)', borderRadius: 'var(--jt-r-md)',
                  border: '1px solid var(--jt-color-border)', background: 'var(--jt-neutral-0)',
                  color: 'var(--jt-neutral-700)', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                취소
              </button>
              <button
                onClick={handlePwdSubmit}
                style={{
                  flex: 1, padding: 'var(--jt-space-4)', borderRadius: 'var(--jt-r-md)',
                  border: 'none',
                  background: 'var(--jt-color-primary)',
                  color: 'var(--jt-neutral-0)', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔐 결제 확인 및 배송지 입력 모달 */}
      {showAuthModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'var(--jt-dim-50)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="card animate-fade-in" style={{ 
            width: '90%', maxWidth: '450px', backgroundColor: 'var(--jt-neutral-0)', 
            padding: 'var(--jt-space-7)', borderRadius: 'var(--jt-r-xl)', boxShadow: 'var(--jt-shadow-2xl)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--jt-color-primary)' }}>shopping_cart_checkout</span>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--jt-color-text)', margin: 0 }}>주문 정보 입력</h2>
            </div>

            {/* 수령 방법 선택 */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>수령 방법</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input type="radio" name="deliveryType" value="방문수령" checked={deliveryType === '방문수령'} onChange={(e) => setDeliveryType(e.target.value)} />
                  방문 수령
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input type="radio" name="deliveryType" value="택배배송" checked={deliveryType === '택배배송'} onChange={(e) => setDeliveryType(e.target.value)} />
                  택배 배송
                </label>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--jt-color-primary)', marginTop: '0.6rem', marginBottom: '0', display: 'flex', alignItems: 'center' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px', marginRight: '4px' }}>lightbulb</span>
                가급적이면 방문 수령을 권장합니다.
              </p>
            </div>

            {/* 택배 배송일 때만 노출되는 폼 */}
            {deliveryType === '택배배송' && (
              <div style={{ border: '1px solid var(--jt-neutral-200)', padding: '1rem', borderRadius: 'var(--jt-r-md)', marginBottom: '1rem', backgroundColor: 'var(--jt-neutral-50)' }}>
                <div style={{ marginBottom: '0.8rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>수령인</label>
                  <input type="text" value={deliveryName} onChange={(e) => setDeliveryName(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--jt-color-border)' }} />
                </div>
                <div style={{ marginBottom: '0.8rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                    연락처 <span style={{ color: 'var(--jt-color-text-tertiary)', fontSize: '0.75rem', fontWeight: 'normal' }}>(숫자만 입력)</span>
                  </label>
                  <input type="text" value={deliveryPhone} onChange={(e) => handlePhoneChange(e, setDeliveryPhone)} placeholder="숫자만 입력하세요" maxLength="13" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--jt-color-border)' }} />
                </div>
                <div style={{ marginBottom: '0.8rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>주소</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input type="text" value={deliveryZipcode} readOnly placeholder="우편번호" style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--jt-color-border)', backgroundColor: '#f9f9f9' }} />
                    <button type="button" onClick={handlePostcodeSearch} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--jt-color-primary)', backgroundColor: 'var(--jt-neutral-0)', color: 'var(--jt-color-primary)', cursor: 'pointer' }}>주소 찾기</button>
                  </div>
                  <input type="text" value={deliveryAddress} readOnly placeholder="기본 주소" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--jt-color-border)', marginBottom: '0.5rem', backgroundColor: '#f9f9f9' }} />
                  <input type="text" value={deliveryAddressDetail} onChange={(e) => setDeliveryAddressDetail(e.target.value)} placeholder="상세 주소를 입력해주세요" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--jt-color-border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>배송 요청사항</label>
                  <input type="text" value={deliveryMemo} onChange={(e) => setDeliveryMemo(e.target.value)} placeholder="문 앞에 놓아주세요" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--jt-color-border)' }} />
                </div>
              </div>
            )}

            {/* 현금영수증 공통 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                현금영수증 발급 정보 <span style={{ color: 'var(--jt-color-text-tertiary)', fontSize: '0.75rem', fontWeight: 'normal' }}>(숫자만 입력)</span>
              </label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.6rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="radio" name="cashReceiptType" value="소득공제" checked={cashReceiptType === '소득공제'} onChange={(e) => { setCashReceiptType(e.target.value); setCashReceiptPhone(''); }} />
                  개인소득공제 (휴대폰)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="radio" name="cashReceiptType" value="지출증빙" checked={cashReceiptType === '지출증빙'} onChange={(e) => { setCashReceiptType(e.target.value); setCashReceiptPhone(''); }} />
                  지출증빙용 (사업자)
                </label>
              </div>
              <input 
                type="text" 
                value={cashReceiptPhone} 
                onChange={(e) => handlePhoneChange(e, setCashReceiptPhone, cashReceiptType === '지출증빙' ? 'business' : 'phone')} 
                placeholder={cashReceiptType === '지출증빙' ? "사업자번호 입력 (예: 1234567890)" : "숫자만 입력 (미입력 시 자진발급: 010-000-1234)"} 
                maxLength={cashReceiptType === '지출증빙' ? 12 : 13} 
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--jt-color-border)' }} 
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => setShowAuthModal(false)}
                style={{
                  flex: 1, padding: 'var(--jt-space-4)', borderRadius: 'var(--jt-r-md)',
                  border: '1px solid var(--jt-color-border)', background: 'var(--jt-neutral-0)',
                  color: 'var(--jt-neutral-700)', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                취소
              </button>
              <button 
                onClick={processOrder}
                disabled={isProcessing}
                style={{
                  flex: 1, padding: 'var(--jt-space-4)', borderRadius: 'var(--jt-r-md)',
                  border: 'none',
                  background: 'var(--jt-color-primary)',
                  color: 'var(--jt-neutral-0)', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem',
                  opacity: isProcessing ? 0.7 : 1
                }}
              >
                {isProcessing ? '처리중...' : '주문 접수하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛠 1. 신규 종합 관리자 패널 (직원 및 품목) */}
      {showAdminSettings && (
        <div ref={adminPanelRef} style={{ marginTop: '1rem', marginBottom: '1rem', animation: 'fadeIn 0.3s ease-out' }}>
          <AdminPanel members={members} products={products} />
        </div>
      )}

      {/* 🛠 2. 기존 주문 현황 패널 (이제 showAdminSettings 와 묶임) */}
      {showAdminSettings && (
        <div ref={orderPanelRef} style={{ marginBottom: '3rem', animation: 'fadeIn 0.3s ease-out' }}>
          <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--jt-color-border)' }}>
          
          {/* 상단 컨트롤 영역 (타이틀 및 월 선택 박스) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ margin: 0 }}>🛡️ 주문 현황 및 취소 관리 패널</h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--jt-color-text-secondary)' }}>조회 월 선택:</label>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: 'var(--jt-r-md)',
                  border: '1px solid var(--jt-color-border)',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  color: 'var(--jt-color-primary)',
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>

          {/* 🔥 대량 주문 대비: 최대 높이를 500px로 제한하고 내부 스크롤 바를 생성합니다. */}
          <div style={{ overflowX: 'auto', maxHeight: '530px', overflowY: 'auto', border: '1px solid var(--jt-color-border)', borderRadius: 'var(--jt-r-md)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'center' }}>
              <thead style={{ backgroundColor: 'var(--jt-neutral-50)', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '0.8rem', border: '1px solid var(--jt-color-border)' }}>주문일시</th>
                  <th style={{ padding: '0.8rem', border: '1px solid var(--jt-color-border)', width: '35%' }}>직원 및 상세 주문 품목</th>
                  <th style={{ padding: '0.8rem', border: '1px solid var(--jt-color-border)' }}>총 결제액</th>
                  <th style={{ padding: '0.8rem', border: '1px solid var(--jt-color-border)' }}>현재 상태</th>
                  <th style={{ padding: '0.8rem', border: '1px solid var(--jt-color-border)' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {adminOrders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--jt-color-border)', opacity: order.status === '주문취소' ? 0.6 : 1 }}>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid var(--jt-color-border)', verticalAlign: 'middle', textDecoration: order.status === '주문취소' ? 'line-through' : 'none' }}>
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '1rem 1rem', border: '1px solid var(--jt-color-border)', textAlign: 'left', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: order.status === '주문취소' ? 'var(--jt-neutral-400)' : 'var(--jt-color-primary)', marginBottom: '0.5rem', textDecoration: order.status === '주문취소' ? 'line-through' : 'none' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px', verticalAlign: 'text-bottom' }}>person</span> 
                        {order.members?.name} 직원님
                      </div>
                      <div style={{ backgroundColor: order.status === '주문취소' ? 'var(--jt-neutral-50)' : 'var(--jt-neutral-0)', padding: '0.6rem', borderRadius: 'var(--jt-r-md)', border: '1px dashed var(--jt-color-border)' }}>
                        {order.order_items && order.order_items.map((item, idx) => (
                          <div key={idx} style={{ fontSize: '0.85rem', color: order.status === '주문취소' ? 'var(--jt-neutral-400)' : 'var(--jt-color-text-secondary)', padding: '0.15rem 0', textDecoration: order.status === '주문취소' ? 'line-through' : 'none' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '16px', marginRight: '6px', verticalAlign: 'text-bottom' }}>inventory_2</span> 
                            {item.product_name} <span style={{ color: 'var(--jt-neutral-500)' }}>({item.target_type})</span> — <strong>{item.quantity}개</strong> <span style={{ color: 'var(--jt-neutral-400)', fontSize: '0.8rem', marginLeft: '4px' }}>{(item.price || 0).toLocaleString()}원</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid var(--jt-color-border)', verticalAlign: 'middle', fontWeight: 'bold', color: order.status === '주문취소' ? 'var(--jt-neutral-400)' : 'var(--jt-color-text)', textDecoration: order.status === '주문취소' ? 'line-through' : 'none' }}>
                      {order.total_price.toLocaleString()}원
                    </td>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid var(--jt-color-border)', verticalAlign: 'middle' }}>
                      <span style={{ 
                        padding: '0.3rem 0.6rem', borderRadius: 'var(--jt-r-md)', fontSize: '0.8rem', fontWeight: 'bold',
                        backgroundColor: order.status === '입금대기' ? 'var(--jt-neutral-100)' : order.status === '입금완료' ? '#ecfdf5' : 'var(--jt-danger-50)',
                        color: order.status === '입금대기' ? 'var(--jt-neutral-700)' : order.status === '입금완료' ? '#047857' : 'var(--jt-color-danger)'
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid var(--jt-color-border)', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                        {order.status !== '주문취소' && (
                          <button 
                            style={{ 
                              padding: '0.4rem 0.8rem', fontSize: '0.8rem',
                              backgroundColor: order.status === '입금대기' ? 'var(--jt-color-primary)' : 'var(--jt-neutral-500)', 
                              color: 'var(--jt-neutral-0)',
                              border: 'none',
                              borderRadius: 'var(--jt-r-md)',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                            onClick={() => handleUpdateStatus(order.id, order.status)}
                          >
                            {order.status === '입금대기' ? '입금 확인' : '대기로 되돌리기 🔄'}
                          </button>
                        )}
                        
                        {order.status !== '주문취소' && (
                          <button 
                            style={{ 
                              padding: '0.4rem 0.8rem', fontSize: '0.8rem', 
                              backgroundColor: 'var(--jt-seed-color-error)', 
                              color: 'var(--jt-neutral-0)', 
                              border: 'none',
                              borderRadius: 'var(--jt-r-md)',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            주문취소
                          </button>
                        )}
                        {order.status === '주문취소' && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--jt-neutral-400)', fontStyle: 'italic' }}>한도복구완료</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {adminOrders.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '3rem', color: 'var(--jt-color-text-tertiary)' }}> 선택하신 달({selectedMonth})의 주문 내역이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* 🎉 주문 성공 모달 */}
      {orderSuccessData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'var(--jt-dim-50)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000
        }}>
          <div className="card animate-fade-in" style={{ width: '90%', maxWidth: '400px', backgroundColor: 'var(--jt-neutral-0)', padding: 'var(--jt-space-7)', borderRadius: 'var(--jt-r-xl)', boxShadow: 'var(--jt-shadow-2xl)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '3rem', marginBottom: '0.5rem', color: 'var(--jt-seed-color-success)' }}>check_circle</span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--jt-color-text)', margin: 0 }}>주문 완료</h2>
            </div>
            
            <div style={{ 
              backgroundColor: 'var(--jt-neutral-50)', 
              padding: 'var(--jt-space-5)', 
              borderRadius: 'var(--jt-r-md)', 
              marginBottom: '1.5rem' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--jt-space-3)' }}>
                <span style={{ color: 'var(--jt-color-text-secondary)', fontSize: '0.9rem' }}>총 결제 금액</span>
                <span style={{ fontWeight: '700', color: 'var(--jt-color-text)', fontSize: '1.1rem' }}>{orderSuccessData.totalPrice.toLocaleString()}원</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--jt-space-1)' }}>
                <span style={{ color: 'var(--jt-color-text-secondary)', fontSize: '0.9rem' }}>입금 계좌</span>
                <span style={{ fontWeight: '700', color: 'var(--jt-color-text)' }}>신한은행 100-026-244778</span>
                <span style={{ color: 'var(--jt-color-text)', fontSize: '0.9rem' }}>(주)제니트리</span>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--jt-color-text-secondary)', marginBottom: '1.5rem', textAlign: 'center', lineHeight: '1.5' }}>
              입금이 확인되면 상품이 지급됩니다.<br/>주문 내역은 마이페이지에서 확인 가능합니다.
            </p>

            <button 
              onClick={() => setOrderSuccessData(null)}
              style={{
                width: '100%', padding: 'var(--jt-space-4)', borderRadius: 'var(--jt-r-md)',
                border: 'none', background: 'var(--jt-color-primary)',
                color: 'var(--jt-neutral-0)', fontWeight: '700', cursor: 'pointer', fontSize: '1rem'
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default Home;