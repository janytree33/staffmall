import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductList from '../components/ProductList';
import Cart from '../components/Cart';
import { sendTelegramOrderAlert, sendEmailReceipt } from '../utils/notificationService';

import { PURCHASE_LIMITS, TARGET_TYPES } from '../utils/constants';
import { supabase } from '../supabaseClient'; 

function Home() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState(null);
  
  // 🔥 동적 데이터 상태 (Supabase에서 실시간으로 불러옴)
  const [products, setProducts] = useState([]);

  // 인증 모달 관련 상태
  const [showAuthModal, setShowAuthModal] = useState(false);
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

  // 관리자 관련 상태는 Admin.jsx로 이동됨

  // 📱 전자라벨 모달 관련 상태
  const [showElabelModal, setShowElabelModal] = useState(false);
  const [currentElabelUrl, setCurrentElabelUrl] = useState('');


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
      if (deliveryType === '택배배송') {
        if (!deliveryName.trim() || !deliveryPhone.trim() || !deliveryZipcode.trim() || !deliveryAddress.trim()) {
          alert("택배 배송을 위한 수령인 이름, 연락처, 기본 주소를 모두 입력해주세요.");
          setIsProcessing(false);
          return;
        }
      }

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

    } catch (error) {
      console.error(error);
      alert("주문 처리 중 오류가 발생했습니다. 관리자에게 문의하세요.");
    } finally {
      setIsProcessing(false);
    }
  };





  // 🔥 앱 최초 로드 시 Products와 Members를 실시간 동기화 및 Auth 체크
  useEffect(() => {
    // 1. 커스텀 유저 인증 상태 확인
    const checkCustomUser = () => {
      const storedUser = localStorage.getItem('custom_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error('User parsing error:', error);
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
      const { data: pData } = await supabase.from('products').select('*').order('id', { ascending: true });
      
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
    };

    fetchDynamicData();

    const subscription = supabase
      .channel('dynamic-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchDynamicData)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <>




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
            {/* 관리자 전용 메뉴: info 계정일 때만 노출 */}
            {user?.email === 'info@janytree.com' && (
              <button 
                className="premium-btn"
                style={{ backgroundColor: 'transparent', color: 'var(--jt-color-primary)', border: '1px solid var(--jt-color-primary)', height: 'var(--jt-control-height)' }}
                onClick={() => navigate('/admin')}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '4px', verticalAlign: 'middle' }}>admin_panel_settings</span>
                관리자 패널
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="home-main-layout">
        <div className="product-list-section">
          <ProductList 
            products={products} 
            onAddToCart={handleAddToCart} 
            onBatchAddToCart={handleBatchAddToCart} 
            user={user} 
            openElabelModal={(url) => {
              setCurrentElabelUrl(url || 'https://e-label-lyart.vercel.app/');
              setShowElabelModal(true);
            }} 
          />
        </div>
        <div className="cart-section">
          <Cart 
            cartItems={cartItems} 
            onRemoveFromCart={handleRemoveFromCart}
            onCheckout={handleCheckoutClick}
            user={user}
          />
        </div>
      </main>



      {/* 📱 전자라벨 팝업(모바일 뷰 비율) 모달 */}
      {showElabelModal && (
        <div
          onClick={() => setShowElabelModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'var(--jt-dim-50)',
            backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 9999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--jt-neutral-0)',
              width: '90%', maxWidth: '400px', // 스마트폰 폭 제한
              height: '80vh', maxHeight: '750px',
              borderRadius: '16px', // 스마트폰처럼 둥글게
              boxShadow: 'var(--jt-shadow-lg)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--jt-color-border)', backgroundColor: '#f8f9fa' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--jt-color-primary)', fontSize: '1.2rem' }}>smartphone</span>
                전자라벨 뷰어
              </h3>
              <button 
                onClick={() => setShowElabelModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
              >
                <span className="material-symbols-rounded" style={{ color: 'var(--jt-neutral-500)' }}>close</span>
              </button>
            </div>
            <div style={{ flex: 1, backgroundColor: '#fff' }}>
              <iframe 
                src={currentElabelUrl} 
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="E-label Viewer"
              />
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