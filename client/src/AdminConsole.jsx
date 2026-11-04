import React, { useEffect, useState } from 'react';

async function api(path, options={}) {
  const response=await fetch(path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);
  return data;
}
export default function AdminConsole({children,onClose}) {
  const [user,setUser]=useState(null),[loading,setLoading]=useState(true);
  const [email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [overview,setOverview]=useState(null),[users,setUsers]=useState([]),[logs,setLogs]=useState([]);
  const [products,setProducts]=useState([]),[orders,setOrders]=useState([]),[tickets,setTickets]=useState([]),[medicineReports,setMedicineReports]=useState([]),[sellers,setSellers]=useState([]);
  const [testProductName,setTestProductName]=useState('Sample Demo Item'),[testProductDescription,setTestProductDescription]=useState('TEST ONLY product for internal order workflow checks.'),[testProductBusy,setTestProductBusy]=useState(false);
  const [name,setName]=useState(''),[editorEmail,setEditorEmail]=useState(''),[editorPassword,setEditorPassword]=useState('');
  const [tab,setTab]=useState('overview');
  const [bootstrap,setBootstrap]=useState(false),[token,setToken]=useState('');
  const [bootstrapName,setBootstrapName]=useState(''),[bootstrapEmail,setBootstrapEmail]=useState(''),[bootstrapPassword,setBootstrapPassword]=useState('');
  async function refresh(){
    const [o,u,l]=await Promise.all([api('/api/admin/overview'),api('/api/admin/users'),api('/api/admin/audit-logs?limit=60')]);
    setOverview(o.overview);setUsers(u.users);setLogs(l.logs);
  }
  useEffect(()=>{let live=true;api('/api/auth/me').then(d=>{if(live)setUser(d.user)}).catch(()=>{}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);
  useEffect(()=>{if(user?.role==='super_admin')refresh().catch(e=>setError(e.message))},[user]);
  useEffect(()=>{if(user?.role!=='super_admin')return;let live=true;(async()=>{try{if(tab==='products'){const [d,s]=await Promise.all([api('/api/admin/products/pending'),api('/api/admin/sellers/pending')]);if(live){setProducts(d.products);setSellers(s.sellers)}}if(tab==='orders'){const d=await api('/api/admin/orders');if(live)setOrders(d.orders)}if(tab==='tickets'){const d=await api('/api/admin/tickets');if(live)setTickets(d.tickets)}if(tab==='safety'){const d=await api('/api/admin/medicine-reports');if(live)setMedicineReports(d.reports)}}catch(e){if(live)setError(e.message)}})();return()=>{live=false}},[user,tab]);
  async function login(e){e.preventDefault();setBusy(true);setError('');try{const d=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})});setUser(d.user);setPassword('')}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function bootstrapAdmin(e){e.preventDefault();setBusy(true);setError('');try{const d=await api('/api/auth/bootstrap-super-admin',{method:'POST',headers:{'x-bootstrap-token':token},body:JSON.stringify({name:bootstrapName,email:bootstrapEmail,password:bootstrapPassword})});setUser(d.user);setBootstrapPassword('');setToken('')}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function logout(){try{await api('/api/auth/logout',{method:'POST'})}finally{setUser(null);setOverview(null);setUsers([]);setLogs([])}}
  async function createEditor(e){e.preventDefault();setBusy(true);setError('');try{await api('/api/admin/editors',{method:'POST',body:JSON.stringify({name,email:editorEmail,password:editorPassword})});setName('');setEditorEmail('');setEditorPassword('');await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function toggleEditor(account){setError('');try{await api(`/api/admin/users/${account.id}/status`,{method:'PATCH',body:JSON.stringify({isActive:!account.is_active})});await refresh()}catch(e){setError(e.message)}}
  async function reviewProduct(product,status){setError('');try{await api(`/api/admin/products/${product.id}/approve`,{method:'PATCH',body:JSON.stringify({status})});setProducts(items=>items.filter(x=>x.id!==product.id));await refresh()}catch(e){setError(e.message)}}
  async function reviewSeller(seller,status){setError('');try{await api(`/api/admin/sellers/${seller.id}/verification`,{method:'PATCH',body:JSON.stringify({status})});setSellers(items=>items.filter(x=>x.id!==seller.id));}catch(e){setError(e.message)}}
  async function createTestProduct(e){e.preventDefault();setTestProductBusy(true);setError('');try{await api('/api/admin/test-products',{method:'POST',body:JSON.stringify({name:testProductName,description:testProductDescription})});setTestProductName('Sample Demo Item');setTestProductDescription('TEST ONLY product for internal order workflow checks.');setMessage('TEST ONLY product created. No real payment or fulfillment is possible.');}catch(e){setError(e.message)}finally{setTestProductBusy(false)}}
  async function setOrderStatus(order,status){
    setError('');
    try {
      const d=await api(`/api/admin/orders/${order.id}/status`,{method:'PATCH',body:JSON.stringify({status})});
      setOrders(items=>items.map(x=>x.id===order.id?{...x,...d.order}:x));
      await refresh();
    } catch(e){setError(e.message)}
  }
  async function setTicketStatus(ticket,status){setError('');try{await api(`/api/admin/tickets/${ticket.id}`,{method:'PATCH',body:JSON.stringify({status})});setTickets(items=>items.map(x=>x.id===ticket.id?{...x,status}:x))}catch(e){setError(e.message)}}
  async function setMedicineReportStatus(report,status){setError('');try{const d=await api(`/api/admin/medicine-reports/${report.id}`,{method:'PATCH',body:JSON.stringify({status,adminNote:report.admin_note||''})});setMedicineReports(items=>items.map(x=>x.id===report.id?{...x,...d.report}:x))}catch(e){setError(e.message)}}
  if(loading)return <section className="admin panel"><p>Admin session जाँच हुँदैछ...</p></section>;
  if(!user)return <section className="admin panel admin-auth">
    <div className="section-head"><div><span className="admin-tag">SECURE ADMIN ACCESS</span><h2>{bootstrap?'First Super Admin Setup':'Admin Login'}</h2></div><button type="button" onClick={onClose}>Close</button></div>
    {bootstrap?<form onSubmit={bootstrapAdmin}>
      <p>पहिलो Super Admin बनाउन Render मा ADMIN_BOOTSTRAP_TOKEN सेट गरिएको हुनुपर्छ। Setup एकपटक मात्र चल्छ।</p>
      <label>Bootstrap Token<input type="password" value={token} onChange={e=>setToken(e.target.value)} required autoComplete="off"/></label>
      <label>Full Name<input value={bootstrapName} onChange={e=>setBootstrapName(e.target.value)} required minLength="2"/></label>
      <label>Email<input type="email" value={bootstrapEmail} onChange={e=>setBootstrapEmail(e.target.value)} required/></label>
      <label>Password (12+ characters)<input type="password" value={bootstrapPassword} onChange={e=>setBootstrapPassword(e.target.value)} minLength="12" maxLength="72" required autoComplete="new-password"/></label>
      <button className="primary" disabled={busy}>{busy?'Setting up...':'Create Super Admin'}</button>
      <button type="button" onClick={()=>setBootstrap(false)}>Back to Login</button>
    </form>:<form onSubmit={login}>
      <p>WYRMORA Admin Console मा प्रवेश गर्न आफ्नो account प्रयोग गर्नुहोस्।</p>
      <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username"/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label>
      <button className="primary" disabled={busy}>{busy?'Signing in...':'Secure Login'}</button>
      <button type="button" onClick={()=>setBootstrap(true)}>First-time Super Admin Setup</button>
    </form>}
    {error&&<p className="notice error">{error}</p>}{message&&<p className="notice success">{message}</p>}
  </section>;
  return <section className="admin panel admin-console">
    <div className="section-head"><div><span className="admin-tag">{user.role==='super_admin'?'SUPER ADMIN':'EDITOR'} CONSOLE</span><h2>Welcome, {user.name}</h2><p>{user.email} · {user.role.replace('_',' ').toUpperCase()}</p></div><div className="admin-actions"><button onClick={logout}>Logout</button><button onClick={onClose}>Close</button></div></div>
    {error&&<p className="notice error">{error}</p>}{message&&<p className="notice success">{message}</p>}
    {user.role==='super_admin'&&<>
      <nav className="admin-tabs">
        {['overview','editors','products','orders','tickets','safety','activity'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{({overview:'Overview',editors:'Editor Accounts',products:'Pending Products',orders:'Orders',tickets:'Support Tickets',safety:'Medicine Reports',activity:'Audit Logs'})[t]}</button>)}
      </nav>
      {tab==='overview'&&<div className="admin-stats">
        {Object.entries(overview||{}).map(([key,value])=><div className="admin-stat" key={key}><strong>{Number(value).toLocaleString()}</strong><span>{({totalUsers:'Total Users',activeEditors:'Active Editors',medicines:'Medicines',pendingProducts:'Pending Products',activeOrders:'Active Orders',openTickets:'Open Tickets'})[key]||key}</span></div>)}
        <p>Super Admin ले Editor accounts, medicine records, product approvals, orders, support tickets र audit activity नियन्त्रण गर्न सक्छ।</p>
      </div>}
      {tab==='editors'&&<div className="admin-manage">
        <h3>Create Editor Account</h3><form onSubmit={createEditor} className="editor-create">
          <label>Editor Name<input value={name} onChange={e=>setName(e.target.value)} minLength="2" required/></label>
          <label>Email<input type="email" value={editorEmail} onChange={e=>setEditorEmail(e.target.value)} required/></label>
          <label>Temporary Password (12+ characters)<input type="password" value={editorPassword} onChange={e=>setEditorPassword(e.target.value)} minLength="12" maxLength="72" required autoComplete="new-password"/></label>
          <button className="primary" disabled={busy}>{busy?'Creating...':'Create Editor'}</button>
        </form>
        <h3>Accounts</h3><div className="admin-table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{users.filter(x=>['super_admin','editor'].includes(x.role)).map(x=><tr key={x.id}><td>{x.name}</td><td>{x.email}</td><td>{x.role}</td><td>{x.is_active?'Active':'Disabled'}</td><td>{x.role==='editor'?<button onClick={()=>toggleEditor(x)}>{x.is_active?'Disable':'Enable'}</button>:'Protected'}</td></tr>)}</tbody></table></div>
      </div>}
      {tab==='products'&&<><div className="admin-table-wrap"><h3>Pending Product Approvals</h3><table><thead><tr><th>Product</th><th>Seller</th><th>Category</th><th>Price</th><th>Decision</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td>{p.name}{p.is_test&&<strong> · TEST ONLY</strong>}</td><td>{p.seller_name}<br/><small>Seller: {p.seller_verification}</small></td><td>{p.category}</td><td>रु. {Number(p.price).toLocaleString()}</td><td><button disabled={!p.is_test&&p.seller_verification!=='verified'} onClick={()=>reviewProduct(p,'approved')}>Approve</button> <button onClick={()=>reviewProduct(p,'rejected')}>Reject</button></td></tr>)}</tbody></table>{!products.length&&<p>No pending products.</p>}</div>
      <div className="admin-manage"><h3>Seller Verification</h3><p>व्यवसाय/KYC कागजात वास्तविक रूपमा जाँच गरेपछि मात्र Verified गर्नुहोस्।</p><div className="admin-table-wrap"><table><thead><tr><th>Business</th><th>Owner</th><th>Email</th><th>Decision</th></tr></thead><tbody>{sellers.map(s=><tr key={s.id}><td>{s.business_name}</td><td>{s.owner_name}</td><td>{s.owner_email}</td><td><button onClick={()=>reviewSeller(s,'verified')}>Verify</button> <button onClick={()=>reviewSeller(s,'rejected')}>Reject</button></td></tr>)}</tbody></table>{!sellers.length&&<p>No pending seller profiles.</p>}</div></div>
      <div className="admin-manage"><h3>TEST ONLY Product</h3><p>यो सुविधा server environment मा ENABLE_TEST_ORDER_WORKFLOW=true हुँदा मात्र चल्छ। Product को मूल्य रु. १ र stock ५ हुनेछ। यो वास्तविक बिक्रीका लागि होइन।</p><form onSubmit={createTestProduct}><label>Demo product name<input value={testProductName} onChange={e=>setTestProductName(e.target.value)} minLength="3" maxLength="90" required/></label><label>Description<textarea value={testProductDescription} onChange={e=>setTestProductDescription(e.target.value)} minLength="10" maxLength="300" required/></label><button className="primary" disabled={testProductBusy}>{testProductBusy?'Creating...':'Create TEST ONLY Product'}</button></form></div></>}
      {tab==='orders'&&<div className="admin-table-wrap"><h3>Order Management</h3><p>Order status मात्र यहाँ update हुन्छ। Payment status provider बाट server-side पुष्टि भएपछि मात्र परिवर्तन हुनेछ।</p><table><thead><tr><th>Order</th><th>Buyer</th><th>Total</th><th>Order Status</th><th>Payment</th><th>Update Status</th><th>Date</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>{o.order_number}{o.is_test&&<strong> · TEST ONLY</strong>}</td><td>{o.buyer_name}<br/>{o.buyer_email}</td><td>रु. {Number(o.total_amount).toLocaleString()}</td><td>{o.order_status}</td><td>{o.payment_status}</td><td><select value={o.order_status} onChange={e=>setOrderStatus(o,e.target.value)}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option>{!o.is_test&&<><option value="shipped">Shipped</option><option value="delivered">Delivered</option></>}<option value="cancelled">Cancelled</option></select></td><td>{new Date(o.created_at).toLocaleDateString()}</td></tr>)}</tbody></table>{!orders.length&&<p>अहिलेसम्म कुनै order छैन।</p>}</div>}
      {tab==='tickets'&&<div className="admin-table-wrap"><h3>Support Tickets</h3><table><thead><tr><th>Subject</th><th>Customer</th><th>Message</th><th>Status</th><th>Update</th></tr></thead><tbody>{tickets.map(t=><tr key={t.id}><td>{t.subject}</td><td>{t.customer}<br/>{t.email}</td><td>{t.message}</td><td>{t.status}</td><td><select value={t.status} onChange={e=>setTicketStatus(t,e.target.value)}><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></td></tr>)}</tbody></table></div>}
      {tab==='safety'&&<div className="admin-table-wrap"><h3>Medicine Information Reports</h3><p>प्रयोगकर्ताले औषधिको विवरणमा सम्भावित गल्ती वा पुरानो जानकारी report गरेका छन्। Clinical निर्णय योग्य Pharmacist बाट मात्र गराउनुहोस्।</p><table><thead><tr><th>Medicine</th><th>Reporter</th><th>Report</th><th>Received</th><th>Status</th></tr></thead><tbody>{medicineReports.map(r=><tr key={r.id}><td>{r.medicine_name}<br/>{r.nepali_name}</td><td>{r.reporter_name||'Anonymous'}<br/>{r.reporter_email||'—'}</td><td>{r.message}</td><td>{new Date(r.created_at).toLocaleString()}</td><td><select value={r.status} onChange={e=>setMedicineReportStatus(r,e.target.value)}><option value="new">New</option><option value="in_review">In Review</option><option value="resolved">Resolved</option></select></td></tr>)}</tbody></table>{!medicineReports.length&&<p>अहिलेसम्म कुनै report आएको छैन।</p>}</div>}
      {tab==='activity'&&<div className="admin-table-wrap"><h3>Recent Audit Logs</h3><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead><tbody>{logs.map(x=><tr key={x.id}><td>{new Date(x.created_at).toLocaleString()}</td><td>{x.actor_name||'System'}</td><td>{x.action}</td><td>{x.entity_type} #{x.entity_id||'—'}</td><td>{JSON.stringify(x.metadata||{})}</td></tr>)}</tbody></table>{!logs.length&&<p>No activity recorded yet.</p>}</div>}
    </>}
    {user.role==='editor'&&<p>Editor access: зөв औषधिको विवरण थप्ने/सम्पादन गर्ने र Pharmacist verification व्यवस्थापन गर्ने सुविधा मात्र उपलब्ध छ।</p>}
    {children}
  </section>;
}
