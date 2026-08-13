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
  
  // 선택된 주문 관리 상태
  const [selectedOrders, setSelectedOrders] = useState([]);

  async function checkUserAndFetchData() {
    const sessionUser = JSON.parse(localStorage.getItem('custom_user') || 'null');
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
    // 월 변경 시 선택된 주문 초기화
    setSelectedOrders([]);
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
          cash_receipt_phone,
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

  const downloadDeliveryCSV = () => {
    const headers = ["판매채널","주문번호","주문상태","총 품목합계금액","총 합계 할인금액","총 합계 배송비","총 합계 포인트 사용액","최종주문금액","주문자 이름","주문자 이메일","주문자 번호","배송방식","배송비결제방식","배송송장번호","주문섹션번호","주문섹션번호","알파벳","주문섹션품목번호","박스수량","상품명","품목명","판매가","품목등급할인금액","품목포인트사용금액","품목쿠폰할인금액","품목실결제가","수령자명","수령자 전화번호","배송지 국가코드","배송지 우편번호","주소","상세주소","배송메모","택배사명","취소사유","반품사유","취소상세사유","반품 상세사유","주문일","상품고유번호"];
    
    if (selectedOrders.length === 0) {
      alert("다운로드할 주문을 먼저 체크박스로 선택해주세요.");
      return;
    }

    const targetOrders = adminOrders.filter(o => o.delivery_type === '택배배송' && o.status !== '주문취소' && selectedOrders.includes(o.id));
    if (targetOrders.length === 0) {
      alert("선택하신 주문 중 다운로드 가능한 택배 배송 주문(취소 제외)이 없습니다.");
      return;
    }

    let csvContent = headers.join(",") + "\n";

    targetOrders.forEach(order => {
      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach(item => {
          const row = Array(40).fill("");
          row[1] = order.id;
          row[2] = order.status;
          row[18] = item.quantity || 1;
          row[19] = "제니트리 발송품";
          row[20] = `${item.product_name} (${item.target_type})`;
          row[21] = item.price || 0;
          row[26] = order.delivery_name || order.members?.name || "";
          row[27] = order.delivery_phone || "";
          row[30] = order.delivery_address || "";
          row[31] = order.delivery_address_detail || "";
          row[32] = order.delivery_memo || "";
          row[38] = new Date(order.created_at).toLocaleDateString();

          const escapedRow = row.map(cell => {
            let str = String(cell !== undefined && cell !== null ? cell : '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              str = '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
          });
          csvContent += escapedRow.join(",") + "\n";
        });
      }
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `택배배송_목록_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user) return null; // 권한 확인 전 빈 화면

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // 택배배송이면서 취소가 아닌 건만 전체선택
      const downloadableIds = adminOrders
        .filter(o => o.delivery_type === '택배배송' && o.status !== '주문취소')
        .map(o => o.id);
      setSelectedOrders(downloadableIds);
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const downloadableCount = adminOrders.filter(o => o.delivery_type === '택배배송' && o.status !== '주문취소').length;
  const isAllSelected = downloadableCount > 0 && selectedOrders.length === downloadableCount;

  return (
    <div className="container" style={{ paddingBottom: '140px' }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <img src="/logo/logo-h.svg" alt="제니트리 로고" className="header-logo" />
        </Link>
        <Link to="/" className="premium-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', textDecoration: 'none', background: 'var(--jt-neutral-100)', color: 'var(--jt-color-text)', border: '1px solid var(--jt-color-border)' }}>
          ← 쇼핑몰 돌아가기
        </Link>
      </header>

      <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--jt-color-primary)', fontSize: '1.5rem' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '1.8rem', color: 'var(--jt-color-text)' }}>admin_panel_settings</span>
        관리자 대시보드
      </h2>

      <div style={{ marginBottom: '3rem', animation: 'fadeIn 0.3s ease-out' }}>
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--jt-color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--jt-color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <span className="material-symbols-rounded" style={{ fontSize: '24px', color: 'var(--jt-color-text)' }}>monitoring</span>
              주문 현황 및 취소 관리
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                onClick={downloadDeliveryCSV}
                className="premium-btn outline"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>download</span>
                택배발송 CSV 다운로드
              </button>
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--jt-color-text-secondary)', marginLeft: '1rem' }}>조회 월 선택:</span>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--jt-r-md)', border: '1px solid var(--jt-color-border)', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--jt-color-primary)', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '85vh', overflowY: 'auto', border: '1px solid var(--jt-color-border)', borderRadius: 'var(--jt-r-md)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'center', backgroundColor: '#ffffff' }}>
              <thead style={{ backgroundColor: '#ffffff', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '0.8rem', border: '1px solid var(--jt-color-border)', width: '130px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      <input type="checkbox" onChange={handleSelectAll} checked={isAllSelected} style={{ cursor: 'pointer' }} />
                      주문일시
                    </div>
                  </th>
                  <th style={{ padding: '0.8rem', border: '1px solid var(--jt-color-border)', width: '35%' }}>직원 및 상세 주문 품목</th>
                  <th style={{ padding: '0.8rem', border: '1px solid var(--jt-color-border)' }}>총 결제액</th>
                  <th style={{ padding: '0.8rem', border: '1px solid var(--jt-color-border)' }}>현재 상태</th>
                  <th style={{ padding: '0.8rem', border: '1px solid var(--jt-color-border)' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {adminOrders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--jt-color-border)', transition: 'background-color 0.2s', backgroundColor: selectedOrders.includes(order.id) ? 'var(--jt-neutral-50)' : 'transparent' }}>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid var(--jt-color-border)', fontSize: '0.85rem', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        {order.delivery_type === '택배배송' && order.status !== '주문취소' && (
                          <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleSelectOrder(order.id)} style={{ cursor: 'pointer' }} />
                        )}
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1rem', border: '1px solid var(--jt-color-border)', textAlign: 'left', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: order.status === '주문취소' ? 'var(--jt-neutral-500)' : 'var(--jt-color-primary)', marginBottom: '0.5rem', textDecoration: order.status === '주문취소' ? 'line-through' : 'none' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px', verticalAlign: 'text-bottom', color: 'var(--jt-color-primary)' }}>person</span> 
                        {order.members?.name} 직원님
                      </div>
                      <div style={{ backgroundColor: order.status === '주문취소' ? 'var(--jt-neutral-50)' : 'var(--jt-neutral-0)', padding: '0.6rem', borderRadius: 'var(--jt-r-md)', border: '1px dashed var(--jt-color-border)' }}>
                        {order.order_items && order.order_items.map((item, idx) => (
                          <div key={idx} style={{ fontSize: '0.85rem', color: order.status === '주문취소' ? 'var(--jt-neutral-500)' : 'var(--jt-color-text-secondary)', padding: '0.15rem 0', textDecoration: order.status === '주문취소' ? 'line-through' : 'none' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '16px', marginRight: '6px', verticalAlign: 'text-bottom' }}>inventory_2</span> 
                            {item.product_name} <span style={{ color: 'var(--jt-neutral-500)' }}>({item.target_type})</span> — <strong>{item.quantity}개</strong> <span style={{ color: order.status === '주문취소' ? 'var(--jt-neutral-500)' : 'var(--jt-neutral-400)', fontSize: '0.8rem', marginLeft: '4px' }}>{(item.price || 0).toLocaleString()}원</span>
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
                        <div style={{ marginTop: order.delivery_type === '택배배송' ? '0.5rem' : '0.2rem', paddingTop: order.delivery_type === '택배배송' ? '0.5rem' : '0', borderTop: order.delivery_type === '택배배송' ? '1px dashed var(--jt-color-border)' : 'none' }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '16px', marginRight: '4px', verticalAlign: 'text-bottom', color: 'var(--jt-color-primary)' }}>receipt_long</span>
                          <strong style={{ color: 'var(--jt-color-primary)' }}>현금영수증:</strong> {order.cash_receipt_phone || '010-000-1234'}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid var(--jt-color-border)', verticalAlign: 'middle', fontWeight: 'bold', color: order.status === '주문취소' ? 'var(--jt-neutral-500)' : 'var(--jt-color-text)', textDecoration: order.status === '주문취소' ? 'line-through' : 'none' }}>
                      {order.total_price.toLocaleString()}원
                    </td>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid var(--jt-color-border)', verticalAlign: 'middle' }}>
                      <span style={{ 
                        display: 'inline-block', minWidth: '70px', textAlign: 'center', padding: '0.2rem 0.5rem', borderRadius: 'var(--jt-r-md)', fontSize: '0.75rem', fontWeight: 'bold', lineHeight: '1.4',
                        backgroundColor: order.status === '입금완료' ? '#10b981' : order.status === '배송/수령 완료' ? 'var(--jt-color-primary)' : order.status === '입금대기' ? '#fef08a' : order.status === '주문취소' ? 'var(--jt-neutral-200)' : 'var(--jt-neutral-100)',
                        color: (order.status === '입금완료' || order.status === '배송/수령 완료') ? 'white' : order.status === '입금대기' ? '#854d0e' : order.status === '주문취소' ? 'var(--jt-neutral-500)' : 'var(--jt-color-text)'
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.8rem', border: '1px solid var(--jt-color-border)', verticalAlign: 'middle' }}>
                      {order.status === '주문취소' ? (
                        <span style={{ color: 'var(--jt-neutral-500)', fontSize: '0.85rem', fontStyle: 'italic' }}>한도복구완료</span>
                      ) : order.status === '배송/수령 완료' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                          <span style={{ color: 'var(--jt-color-primary)', fontSize: '0.85rem', fontWeight: 'bold' }}>종결됨</span>
                          <button 
                            onClick={() => handleOrderStatusChange(order.id, order.status, '입금완료')}
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: 'none', border: 'none', color: 'var(--jt-color-text-tertiary)', textDecoration: 'underline', cursor: 'pointer' }}
                          >
                            입금완료로 되돌리기
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                          {order.status === '입금대기' ? (
                            <button 
                              onClick={() => handleOrderStatusChange(order.id, order.status, '입금완료')}
                              className="premium-btn"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', lineHeight: '1.4' }}
                            >
                              입금 확인
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleOrderStatusChange(order.id, order.status, '배송/수령 완료')}
                                className="premium-btn"
                                style={{ backgroundColor: 'var(--jt-color-primary)', border: 'none', padding: '0.2rem 0.5rem', fontSize: '0.75rem', lineHeight: '1.4', color: 'white' }}
                              >
                                배송/수령 완료
                              </button>
                              <button 
                                onClick={() => handleOrderStatusChange(order.id, order.status, '입금대기')}
                                className="premium-btn"
                                style={{ backgroundColor: 'var(--jt-neutral-100)', color: 'var(--jt-neutral-600)', border: '1px solid var(--jt-color-border)', padding: '0.2rem 0.5rem', fontSize: '0.75rem', lineHeight: '1.4' }}
                              >
                                대기로 되돌리기 ↺
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => handleCancelOrder(order.id, order.members?.name, order.total_price)}
                            className="premium-btn"
                            style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '0.2rem 0.5rem', fontSize: '0.75rem', lineHeight: '1.4' }}
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

      {/* AdminPanel을 하단으로 이동 */}
      <div style={{ marginBottom: '3rem', animation: 'fadeIn 0.3s ease-out' }}>
        <AdminPanel members={members} products={products} />
      </div>

    </div>
  );
}
