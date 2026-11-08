import React, { useEffect, useState } from 'react';
import './SellerPortal.css';

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

const emptyListing = { name: '', description: '', categoryId: '', price: '', stock: '1' };
const money = value => `रु. ${Number(value || 0).toLocaleString('en-IN')}`;

export default function SellerPortal({ onClose }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [listing, setListing] = useState(emptyListing);
  const [imageFile, setImageFile] = useState(null);
  const [credentialFile, setCredentialFile] = useState(null);
  const [tab, setTab] = useState('products');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadSellerData() {
    const [p, c, l, o] = await Promise.all([
      request('/api/seller/profile'),
      request('/api/products/categories'),
      request('/api/seller/products'),
      request('/api/seller/orders')
    ]);
    setProfile(p.profile);
    setCategories(c.categories || []);
    setProducts(l.products || []);
    setOrders(o.orders || []);
    if (p.profile) {
      setBusinessName(p.profile.business_name || '');
      setDescription(p.profile.description || '');
    }
  }

  useEffect(() => {
    let active = true;
    request('/api/auth/me')
      .then(async data => {
        if (!active) return;
        setUser(data.user);
        if (data.user.role === 'seller') await loadSellerData();
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function authenticate(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const path = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = mode === 'register' ? { name, email, password } : { email, password };
      const data = await request(path, { method: 'POST', body: JSON.stringify(payload) });
      setUser(data.user);
      setPassword('');
      if (data.user.role === 'seller') await loadSellerData();
      else setMessage('Account तयार भयो। अब Seller Profile दर्ता गर्नुहोस्।');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      await request('/api/seller/profile', {
        method: 'POST', body: JSON.stringify({ businessName, description })
      });
      const session = await request('/api/auth/me');
      setUser(session.user);
      await loadSellerData();
      setMessage('Seller profile सुरक्षित भयो। Admin verification पछि मात्र product listing खुल्नेछ।');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function uploadPrivateFile(file,purpose,extra={}) {
    const presigned = await request('/api/uploads/presign', {
      method:'POST',
      body:JSON.stringify({purpose,fileName:file.name,contentType:file.type,sizeBytes:file.size})
    });
    const uploaded = await fetch(presigned.uploadUrl,{
      method:'PUT',
      headers:{'Content-Type':file.type},
      body:file
    });
    if(!uploaded.ok)throw new Error('Private file upload failed. Check storage bucket CORS and credentials.');
    await request(`/api/uploads/${presigned.asset.id}/complete`,{method:'POST',body:JSON.stringify({})});
    return request(`/api/uploads/${presigned.asset.id}/attach`,{method:'POST',body:JSON.stringify(extra)});
  }

  async function submitCredential(event) {
    event.preventDefault();
    if(!credentialFile)return;
    setBusy(true);setError('');setMessage('');
    try{
      const result=await uploadPrivateFile(credentialFile,'seller_credential');
      setCredentialFile(null);
      await loadSellerData();
      setMessage(result.message);
    }catch(e){setError(e.message);}
    finally{setBusy(false);}
  }

  async function submitListing(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const data = await request('/api/seller/products', {
        method: 'POST',
        body: JSON.stringify({
          ...listing,
          categoryId: Number(listing.categoryId),
          price: Number(listing.price),
          stock: Number(listing.stock)
        })
      });
      setProducts(items => [data.product, ...items]);
      if(imageFile) {
        await uploadPrivateFile(imageFile,'product_image',{productId:data.product.id});
        setImageFile(null);
      }
      setListing(emptyListing);
      setMessage('Product listing Admin approval का लागि पठाइयो।');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function logout() {
    try { await request('/api/auth/logout', { method: 'POST' }); }
    finally {
      setUser(null); setProfile(null); setProducts([]); setOrders([]); setImageFile(null); setCredentialFile(null);
      setMode('login'); setMessage('Logout भयो।');
    }
  }

  if (loading) return <section className="seller-portal panel"><p>Seller portal जाँच हुँदैछ...</p></section>;

  return <section className="seller-portal panel">
    <div className="section-head">
      <div><span className="admin-tag">WYRMORA SELLER PORTAL</span><h2>{user ? 'Seller Workspace' : 'Seller Access'}</h2><p>Business profile, product listings र order overview</p></div>
      <div className="seller-actions">{user && <button onClick={logout}>Logout</button>}<button onClick={onClose}>Close ×</button></div>
    </div>
    {error && <p className="notice error">{error}</p>}
    {message && <p className="notice success">{message}</p>}

    {!user && <div className="seller-auth">
      <div className="admin-tabs">
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
        <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create Account</button>
      </div>
      <form onSubmit={authenticate}>
        {mode === 'register' && <label>पूरा नाम<input value={name} onChange={e => setName(e.target.value)} minLength="2" maxLength="80" required /></label>}
        <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength="254" autoComplete="username" required /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength="10" maxLength="72" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
        {mode === 'register' && <small>Password मा uppercase, lowercase र number हुनुपर्छ।</small>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}</button>
      </form>
    </div>}

    {user && user.role === 'customer' && <div className="seller-auth">
      <h3>Seller Business Registration</h3>
      <p>पहिले Customer account बाट login गर्नुभयो। Seller बन्न business profile दर्ता गर्नुहोस्। Admin ले business विवरण र आवश्यक प्रमाण जाँच गरेपछि मात्र listing स्वीकृत हुनेछ।</p>
      <form onSubmit={saveProfile}>
        <label>Business / Pharmacy Name<input value={businessName} onChange={e => setBusinessName(e.target.value)} minLength="2" maxLength="120" required /></label>
        <label>Business Description<textarea value={description} onChange={e => setDescription(e.target.value)} maxLength="2000" rows="4" placeholder="Business, registration details and contact information..." /></label>
        <button className="primary" disabled={busy}>{busy ? 'Saving...' : 'Submit Seller Profile'}</button>
      </form>
      <p className="seller-note">अहिले document upload वा automatic legal verification छैन। आवश्यक business/pharmacy प्रमाण Admin ले सुरक्षित माध्यमबाट छुट्टै जाँच गर्नुपर्छ।</p>
    </div>}

    {user && !['customer','seller'].includes(user.role) && <div className="seller-auth"><p>यो portal customer वा seller account का लागि हो। हालको role: {user.role}</p></div>}

    {user?.role === 'seller' && <div className="seller-workspace">
      <div className="seller-profile">
        <div><small>BUSINESS</small><strong>{profile?.business_name || user.name}</strong><span>{profile?.description || 'Business description थपिएको छैन।'}</span></div>
        <div className="seller-status"><small>VERIFICATION</small><strong className={profile?.verification_status === 'verified' ? 'is-verified' : ''}>{profile?.verification_status || 'pending'}</strong></div>
      </div>
      {profile?.verification_status !== 'verified' && <p className="seller-note">तपाईंको business profile Admin verification पर्खिरहेको छ। Verification नभएसम्म product listing गर्न मिल्दैन। विवरण परिवर्तन गर्दा पुनः verification आवश्यक हुन्छ।</p>}
      <nav className="admin-tabs">
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>My Products ({products.length})</button>
        <button className={tab === 'new' ? 'active' : ''} onClick={() => setTab('new')}>Add Product</button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Orders ({orders.length})</button>
        <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>Business Profile</button>
      </nav>
      {tab === 'products' && <div className="seller-list">
        {products.length ? products.map(p => <article className="seller-row" key={p.id}><div><strong>{p.name}</strong><small>{money(p.price)} · Stock {p.stock}</small></div><span className={p.status === 'approved' ? 'is-verified' : ''}>{p.status}</span></article>) : <p>अहिलेसम्म product listing छैन।</p>}
      </div>}
      {tab === 'new' && <div className="seller-auth">
        <h3>Submit Product for Approval</h3>
        {profile?.verification_status === 'verified' ? <form onSubmit={submitListing}>
          <label>Product Name<input value={listing.name} onChange={e => setListing(v => ({ ...v, name: e.target.value }))} minLength="2" maxLength="120" required /></label>
          <label>Description<textarea value={listing.description} onChange={e => setListing(v => ({ ...v, description: e.target.value }))} minLength="10" maxLength="4000" rows="4" required /></label>
          <label>Category<select value={listing.categoryId} onChange={e => setListing(v => ({ ...v, categoryId: e.target.value }))} required><option value="">Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <div className="seller-fields"><label>Price (NPR)<input type="number" min="0.01" step="0.01" value={listing.price} onChange={e => setListing(v => ({ ...v, price: e.target.value }))} required /></label><label>Stock<input type="number" min="0" max="100000" step="1" value={listing.stock} onChange={e => setListing(v => ({ ...v, stock: e.target.value }))} required /></label></div>
          <label>Product Image (JPG, PNG or WebP · max 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImageFile(e.target.files?.[0] || null)} /></label>
          <button className="primary" disabled={busy || !categories.length}>{busy ? 'Submitting...' : 'Submit for Admin Approval'}</button>
        </form> : <p>Business verification पूरा भएपछि मात्र product listing खुल्छ।</p>}
      </div>}
      {tab === 'orders' && <div className="seller-list">
        {orders.length ? orders.map((o,i) => <article className="seller-row" key={o.id + '-' + i}><div><strong>{o.order_number} · {o.product_name}</strong><small>{o.buyer_name} · Qty {o.quantity} · {money(Number(o.unit_price) * Number(o.quantity))}</small></div><span>{o.order_status} / {o.payment_status}</span></article>) : <p>अहिलेसम्म order छैन।</p>}
        <p className="seller-note">Order status र payment नियन्त्रण Admin workflow बाट हुन्छ। Payment provider जडान नभएसम्म वास्तविक payment वा fulfillment हुँदैन।</p>
      </div>}
      {tab === 'profile' && <div className="seller-auth"><form onSubmit={saveProfile}>
        <label>Business / Pharmacy Name<input value={businessName} onChange={e => setBusinessName(e.target.value)} minLength="2" maxLength="120" required /></label>
        <label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} maxLength="2000" rows="4" /></label>
        <button className="primary" disabled={busy}>Update Business Profile</button>
      </form>
      <form onSubmit={submitCredential}>
        <label>Business / Pharmacy Credential (PDF, JPG or PNG · max 10 MB)<input type="file" accept="application/pdf,image/jpeg,image/png" onChange={e => setCredentialFile(e.target.files?.[0] || null)} required /></label>
        <button className="primary" disabled={busy || !credentialFile}>{busy ? 'Uploading...' : 'Upload Credential for Review'}</button>
      </form>
      <p className="seller-note">Credential document निजी storage मा राखिन्छ। Upload गरेपछि Admin verification फेरि pending हुन्छ।</p>
      </div>}
    </div>}
  </section>;
}
