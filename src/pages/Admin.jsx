import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AdminPanel from '../components/AdminPanel';
import { sendEmailReceipt } from '../utils/notificationService';

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // 데이터 상태
  const [members, setMembers] = useState([]);
  const [products, setProducts] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);

  // 선택된 년-월 상태
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  async function checkUserAndFetchData() {
    const sessionUser = JSON.parse(localStorage.getItem('staff_user') || 'null');
    // info 계정만 접근 가능
    if (!sessionUser || sessionUser.email !== 'info@janytree.com') {
      alert("관리자 전용 페이지입니다.");
      navigate('/');
      return;
    }
    setUser(sessionUser);

    // 멤버 및 제품 데이터 가져오기 (AdminPanel용)
    const { data: memberData } = await supabase.from('members').select('*');
    if (memberData) setMembers(memberData);

    const { data: productData } = await supabase.from('products').select('*');
    if (productData) setProducts(productData);

    // 주문 현황 가져오기
    fetchAdminOrders();
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkUserAndFetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  async function fetchAdminOrders() {
    try {
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
          delivery_type,
          delivery_name,
          delivery_phone,
          delivery_address,
          delivery_address_detail,
          delivery_memo,
          cash_receipt_requested,
          cash_receipt_type,
          cash_receipt_number,
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

  const handleOrderStatusChange = async (orderId, currentStatus, newStatus) => {
    if (!window.confirm(`주문 상태를 '${newStatus}'(으)로 변경하시겠습니까?`)) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      
      if (error) throw error;
      alert(`주문 상태가 [${newStatus}]로 변경되었습니다.`);
      fetchAdminOrders();
    } catch (error) {
      console.error(error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleCancelOrder = async (orderId, ordererName, totalPrice) => {
    if (!window.confirm(`[${ordererName}]님의 주문(${totalPrice.toLocaleString()}원)을 취소 처리하시겠습니까?\n취소 시 직원의 구매 한도(수량)가 즉시 복구됩니다.`)) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: '주문취소' })
        .eq('id', orderId);

      if (error) throw error;

      sendEmailReceipt({
        actionType: '취소',
        ordererName,
        totalPrice,
        orderId,
        orderItems: [], 
        deliveryInfo: null
      });

      alert("주문이 정상적으로 취소 처리되었습니다.");
      fetchAdminOrders();
    } catch (error) {
      console.error(error);
      alert("주문 취소 처리에 실패했습니다.");
    }
  };

  if (!user) return null; // 권한 확인 전 빈 화면

  return (
    <div className="container" style={{ paddingBottom: '140px' }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <img src="/logo/logo-h.svg" alt="제니트리 로고" className="header-logo" style={{ height: '32px' }} />
        </Link>
        <Link to="/" className="premium-btn" style={{ padding: '0.5rem 1rem', textDecoration: 'none', background: 'var(--jt-neutral-100)', color: 'var(--jt-color-text)', border: '1px solid var(--jt-color-border)' }}>
          ← 쇼핑몰 돌아가기
        </Link>
      </header>

      <h1 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--jt-color-primary)' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '2rem' }}>admin_panel_settings</span>
        관리자 대시보드
      </h1>

      <div style={{ marginBottom: '3rem', animation: 'fadeIn 0.3s ease-out' }}>
        <AdminPanel members={members} products={products} />
      </div>

      <div style={{ marginBottom: '3rem', animation: 'fadeIn 0.3s ease-out' }}>
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--jt-color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--jt-color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <span className="material-symbols-rounded" style={{ fontSize: '24px', color: 'var(--jt-color-accent)' }}>monitoring</span>
              주문 현황 및 취소 관리
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--jt-color-text-secondary)' }}>조회 월 선택:</span>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--jt-r-md)', border: '1px solid var(--jt-color-border)', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--jt-color-primary)', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto', border: '1px solid var(--jt-color-border)', borderRadius: 'var(--jt-r-md)' }}>
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
                      
                      {/* 배송 및 현금영수증 정보 요약 */}
                      <div style={{ marginTop: '0.5rem', backgroundColor: 'var(--jt-neutral-50)', padding: '0.6rem', borderRadius: 'var(--jt-r-md)', border: '1px solid var(--jt-color-border)', fontSize: '0.85rem', color: 'var(--jt-color-text-secondary)', textAlign: 'left' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--jt-color-primary)', marginBottom: '0.2rem' }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '16px', marginRight: '4px', verticalAlign: 'text-bottom' }}>
                            {order.delivery_type === '방문수령' ? 'storefront' : 'local_shipping'}
                          </span>
                          {order.delivery_type || '방문수령'}
                        </div>
                        {order.delivery_type === '택배배송' && (
                          <div style={{ lineHeight: '1.4' }}>
                            <div><strong>수령인:</strong> {order.delivery_name}</div>
                            <div><strong>연락처:</strong> {order.delivery_phone}</div>
                            <div><strong>주소:</strong> {order.delivery_address} {order.delivery_address_detail}</div>
                            {order.delivery_memo && <div><strong>메모:</strong> {order.delivery_memo}</div>}
                          </div>
                        )}
                        {order.cash_receipt_requested && (
                          <div style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px dashed var(--jt-color-border)', lineHeight: '1.4' }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--jt-color-primary)', marginBottom: '0.2rem' }}>
                              <span className="material-symbols-rounded" style={{ fontSize: '16px', marginRight: '4px', verticalAlign: 'text-bottom' }}>receipt_long</span>
                              현금영수증 신청
                            </div>
                            <div><strong>용도:</strong> {order.cash_receipt_type}</div>
                            <div><strong>발급번호:</strong> {order.cash_receipt_number}</div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid var(--jt-color-border)', verticalAlign: 'middle', fontWeight: 'bold', color: order.status === '주문취소' ? 'var(--jt-neutral-400)' : 'var(--jt-color-text)', textDecoration: order.status === '주문취소' ? 'line-through' : 'none' }}>
                      {order.total_price.toLocaleString()}원
                    </td>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid var(--jt-color-border)', verticalAlign: 'middle' }}>
                      <span style={{ 
                        padding: '0.3rem 0.6rem', borderRadius: 'var(--jt-r-md)', fontSize: '0.8rem', fontWeight: 'bold',
                        backgroundColor: order.status === '입금완료' ? 'var(--jt-color-success)' : order.status === '주문취소' ? 'var(--jt-neutral-200)' : 'var(--jt-neutral-100)',
                        color: order.status === '입금완료' ? 'white' : order.status === '주문취소' ? 'var(--jt-neutral-500)' : 'var(--jt-color-text)'
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid var(--jt-color-border)', verticalAlign: 'middle' }}>
                      {order.status === '주문취소' ? (
                        <span style={{ color: 'var(--jt-neutral-400)', fontSize: '0.85rem', fontStyle: 'italic' }}>한도복구완료</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                          {order.status === '입금대기' ? (
                            <button 
                              onClick={() => handleOrderStatusChange(order.id, order.status, '입금완료')}
                              className="premium-btn"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            >
                              입금 확인
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleOrderStatusChange(order.id, order.status, '입금대기')}
                              className="premium-btn outline"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            >
                              대기로 되돌리기 ↺
                            </button>
                          )}
                          <button 
                            onClick={() => handleCancelOrder(order.id, order.members?.name, order.total_price)}
                            className="premium-btn"
                            style={{ backgroundColor: 'var(--jt-color-danger)', border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                          >
                            주문취소
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {adminOrders.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '3rem', color: 'var(--jt-neutral-400)' }}>선택하신 달({selectedMonth})의 주문 내역이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
