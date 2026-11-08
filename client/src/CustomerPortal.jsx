import React, { useEffect, useMemo, useState } from 'react';
import './CustomerPortal.css';

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fieldErrors = data.details?.fieldErrors || {};
    const formErrors = data.details?.formErrors || [];
    const messages = Object.entries(fieldErrors).flatMap(([field, errors]) =>
      (errors || []).map(message => `${field}: ${message}`)
    );
    messages.push(...formErrors);
    throw new Error(messages.length
      ? `${data.error || 'Request failed'} — ${messages.join('; ')}`
      : (data.error || `Request failed (${response.status})`));
  }
  return data;
}

const money = value => `रु. ${Number(value || 0).toLocaleString('en-IN')}`;

export default function CustomerPortal({ onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('login');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState([]);
  const [commerceEnabled, setCommerceEnabled] = useState(false);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [view, setView] = useState('shop');

  async function loadProducts() {
    const data = await request('/api/products');
    setProducts(data.products || []);
    setCommerceEnabled(data.commerceEnabled === true);
  }
  async function loadCustomerData() {
    const [cartData, orderData] = await Promise.all([
      request('/api/cart'),
      request('/api/orders/mine')
    ]);
    setCart(cartData.items || []);
    setOrders(orderData.orders || []);
  }

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) { setResetToken(token); setMode('reset-confirm'); }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([request('/api/auth/me'), request('/api/products')])
      .then(([session, catalog]) => {
        if (!active) return;
        setUser(session.user);
        setProducts(catalog.products || []);
        setCommerceEnabled(catalog.commerceEnabled === true);
      })
      .catch(async () => {
        try {
          const catalog = await request('/api/products');
          if (active) {
            setProducts(catalog.products || []);
            setCommerceEnabled(catalog.commerceEnabled === true);
          }
        } catch (e) { if (active) setError(e.message); }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (user?.role === 'customer') loadCustomerData().catch(e => setError(e.message));
  }, [user]);

  async function authenticate(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const payload = mode === 'register' ? { name, email, password } : { email, password };
      const data = await request(`/api/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST', body: JSON.stringify(payload)
      });
      setUser(data.user); setPassword(''); setMessage('तपाईं सफलतापूर्वक login हुनुभयो।');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function requestAccountAction(action) {
    setBusy(true); setError(''); setMessage('');
    try {
      const payload = action === 'reset'
        ? { email }
        : action === 'verify'
          ? { email: user?.email || email }
          : { token: resetToken, password: newPassword };
      const endpoint = action === 'reset' ? '/api/account/password-reset/request'
        : action === 'verify' ? '/api/account/email-verification/request'
          : '/api/account/password-reset/confirm';
      const data = await request(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      setMessage(data.message || 'Request सफल भयो।');
      if (action === 'confirm') {
        setPassword(''); setNewPassword(''); setResetToken(''); setMode('login');
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function addToCart(product) {
    setError(''); setMessage('');
    try {
      await request('/api/cart/items', {
        method: 'POST', body: JSON.stringify({ productId: product.id, quantity: 1 })
      });
      await loadCustomerData();
      setMessage(`${product.name} cart मा थपियो।`);
      setView('cart');
    } catch (e) { setError(e.message); }
  }

  async function removeFromCart(productId) {
    try {
      await request(`/api/cart/items/${productId}`, { method: 'DELETE' });
      await loadCustomerData();
    } catch (e) { setError(e.message); }
  }

  async function placeOrder(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const data = await request('/api/orders', {
        method: 'POST', body: JSON.stringify({ shippingAddress: address })
      });
      setAddress('');
      await loadCustomerData();
      setView('orders');
      setMessage(`Order ${data.order?.order_number || ''} request सफल भयो। Payment गरिएको छैन।`);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function logout() {
    try { await request('/api/auth/logout', { method: 'POST' }); }
    finally { setUser(null); setCart([]); setOrders([]); setView('shop'); setMessage('Logout भयो।'); }
  }

  const total = useMemo(
    () => cart.filter(item => item.available).reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
    [cart]
  );

  if (loading) return <section className="customer-portal panel"><p>Customer portal लोड हुँदैछ...</p></section>;

  return <section className="customer-portal panel">
    <div className="section-head">
      <div><span className="admin-tag">CUSTOMER PORTAL</span><h2>WYRMORA Customer Account</h2>
        <p>Account, partner product cart र order request व्यवस्थापन</p></div>
      <button type="button" onClick={onClose}>Close ×</button>
    </div>

    {error && <p className="notice error">{error}</p>}
    {message && <p className="notice success">{message}</p>}

    {!user ? <div className="customer-auth">
      <h3>{mode === 'login' ? 'Customer Login' : mode === 'register' ? 'नयाँ Customer Account बनाउनुहोस्' : mode === 'reset-request' ? 'Password Reset' : 'नयाँ Password राख्नुहोस्'}</h3>
      <p>Order request गर्न पहिले customer account मा प्रवेश गर्नुहोस्।</p>
      {mode === 'reset-confirm' ? <form onSubmit={event => { event.preventDefault(); requestAccountAction('confirm'); }}>
        <label>नयाँ Password<input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength="10" maxLength="72" required autoComplete="new-password" /></label>
        <small>Password मा lowercase, uppercase र number हुनुपर्छ।</small>
        <button className="primary" disabled={busy}>{busy ? 'Please wait...' : 'Password Update'}</button>
      </form> : mode === 'reset-request' ? <form onSubmit={event => { event.preventDefault(); requestAccountAction('reset'); }}>
        <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength="254" required /></label>
        <button className="primary" disabled={busy}>{busy ? 'Please wait...' : 'Reset Link पठाउनुहोस्'}</button>
      </form> : <form onSubmit={authenticate}>
        {mode === 'register' && <label>पूरा नाम<input value={name} onChange={e => setName(e.target.value)} minLength="2" maxLength="80" required /></label>}
        <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength="254" required autoComplete="username" /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength="10" maxLength="72" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        {mode === 'register' && <small>Password मा lowercase, uppercase र number हुनुपर्छ।</small>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}</button>
      </form>}
      {mode === 'login' && <button type="button" className="text-button" onClick={() => { setMode('reset-request'); setError(''); }}>Password बिर्सनुभयो?</button>}
      {mode !== 'reset-confirm' && <button type="button" className="text-button" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }}>
        {mode === 'register' ? 'पहिले account छ? Login गर्नुहोस्' : 'नयाँ account बनाउने'}
      </button>}
      {mode === 'reset-request' && <button type="button" className="text-button" onClick={() => setMode('login')}>Login मा फर्कनुहोस्</button>}
    </div> : user.role !== 'customer' ? <div className="customer-auth">
      <p>यो portal customer account का लागि हो। हालको account role: {user.role}</p>
      <button onClick={logout}>Logout</button>
    </div> : <>
      <div className="customer-userbar"><span>Welcome, <strong>{user.name}</strong> · {user.email}</span><div><button onClick={() => requestAccountAction('verify')}>Verify Email</button> <button onClick={logout}>Logout</button></div></div>
      <nav className="customer-tabs">
        {['shop','cart','orders'].map(t => <button key={t} className={view === t ? 'active' : ''} onClick={() => setView(t)}>
          {{shop:'Partner Products',cart:`Cart (${cart.length})`,orders:'My Orders'}[t]}
        </button>)}
      </nav>

      {view === 'shop' && <div className="customer-products">
        <p className="customer-note">यहाँ Super Admin बाट approved भएका partner products मात्र देखिन्छन्। {commerceEnabled ? 'Checkout उपलब्ध छ।' : 'Checkout हाल बन्द छ; आवश्यक legal, pharmacy र payment approvals पूरा भएपछि मात्र खुल्नेछ।'}</p>
        {products.length ? products.map(product => <article className="customer-product" key={product.id}>
          <div><strong>{product.name} {product.is_test&&<span className="admin-tag">TEST ONLY · NO SALE</span>}</strong><p>{product.description}</p><small>{product.category} · Seller: {product.seller_name}</small></div>
          <div className="customer-product-action"><strong>{money(product.price)}</strong><small>{product.stock} उपलब्ध</small>{commerceEnabled && <button disabled={product.stock < 1} onClick={() => addToCart(product)}>Add to cart</button>}</div>
        </article>) : <div className="empty"><h3>अहिले कुनै approved product छैन</h3><p>Partner product approve भएपछि यहाँ देखिनेछ।</p></div>}
      </div>}

      {view === 'cart' && <div className="customer-cart">
        <h3>तपाईंको Cart</h3>
        {cart.map(item => <div className="customer-cart-row" key={item.product_id}>
          <div><strong>{item.name} {item.is_test&&<span className="admin-tag">TEST ONLY</span>} {!item.available&&<span className="admin-tag">UNAVAILABLE · REMOVE</span>}</strong><small>{money(item.price)} × {item.quantity}</small></div>
          <div><strong>{money(Number(item.price) * Number(item.quantity))}</strong><button onClick={() => removeFromCart(item.product_id)}>Remove</button></div>
        </div>)}
        {!cart.length ? <p>Cart खाली छ। Partner Products बाट item थप्नुहोस्।</p> : <>
          {cart.some(item => !item.available) && <p className="customer-note">केही सामान उपलब्ध छैनन्। Checkout अघि ती सामान Remove गर्नुहोस्।</p>}
          <div className="customer-total"><strong>कुल जम्मा</strong><strong>{money(total)}</strong></div>
          {commerceEnabled ? <form onSubmit={placeOrder}>
            <label>Delivery Address<textarea value={address} onChange={e => setAddress(e.target.value)} minLength="10" maxLength="500" rows="3" placeholder="पूरा delivery address लेख्नुहोस्..." required /></label>
            <button className="primary" disabled={busy || cart.some(item => !item.available)}>{busy ? 'Submitting...' : 'Place Order Request'}</button>
          </form> : <p className="customer-note">Checkout हाल बन्द छ। पुरानो cart बाट सामान हटाउन सक्नुहुन्छ; कानुनी तथा payment approval नआएसम्म order गर्न मिल्दैन।</p>}
        </>}
      </div>}

      {view === 'orders' && <div className="customer-orders">
        <h3>My Orders</h3>
        {orders.map(order => <article className="customer-order" key={order.id}>
          <div><strong>{order.order_number} {order.is_test&&<span className="admin-tag">TEST ONLY</span>}</strong><small>{new Date(order.created_at).toLocaleString()}</small></div>
          <div><strong>{money(order.total_amount)}</strong><small>Order: {order.order_status} · Payment: {order.payment_status}</small></div>
        </article>)}
        {!orders.length && <p>अहिलेसम्म कुनै order छैन।</p>}
      </div>}
      <div className="customer-safety"><strong>महत्त्वपूर्ण:</strong> {commerceEnabled ? 'Marketplace checkout enabled by operator configuration. Medicine sales, prescription validation, pharmacy fulfillment and delivery still require their own legal approvals and verified partner workflows.' : 'हाल product catalogue मात्र हेर्न मिल्छ; cart, checkout र order placement बन्द छन्। WYRMORA मा औषधि बिक्री, prescription validation, pharmacy fulfillment र delivery सेवा आवश्यक कानुनी/व्यावसायिक स्वीकृति नआएसम्म सक्रिय हुँदैनन्।'}</div>
    </>}
  </section>;
}
