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
  const [products,setProducts]=useState([]),[orders,setOrders]=useState([]),[tickets,setTickets]=useState([]),[medicineReports,setMedicineReports]=useState([]),[sellers,setSellers]=useState([]),[pharmacistApplications,setPharmacistApplications]=useState([]),[pharmacistAccounts,setPharmacistAccounts]=useState([]),[medicineReviews,setMedicineReviews]=useState([]),[refunds,setRefunds]=useState([]);
  const [testProductName,setTestProductName]=useState('Sample Demo Item'),[testProductDescription,setTestProductDescription]=useState('TEST ONLY product for internal order workflow checks.'),[testProductBusy,setTestProductBusy]=useState(false);
  const [name,setName]=useState(''),[editorEmail,setEditorEmail]=useState(''),[editorPassword,setEditorPassword]=useState('');
  const [tab,setTab]=useState('overview');
  const [catalogueQueue,setCatalogueQueue]=useState([]),[catalogueJson,setCatalogueJson]=useState(JSON.stringify({sourceName:'Official source name',sourceUrl:'https://dams.dda.gov.np/official-record',products:[{brandName:'Exact brand',genericName:'Exact ingredient',strength:'Exact strength',dosageForm:'Exact form',registrationStatus:'unknown',evidenceNotes:'Pending independent source review.'}]},null,2));
  const [bootstrap,setBootstrap]=useState(false),[token,setToken]=useState('');
  const [bootstrapName,setBootstrapName]=useState(''),[bootstrapEmail,setBootstrapEmail]=useState(''),[bootstrapPassword,setBootstrapPassword]=useState('');
  async function refresh(){
    const [o,u,l]=await Promise.all([api('/api/admin/overview'),api('/api/admin/users'),api('/api/admin/audit-logs?limit=60')]);
    setOverview(o.overview);setUsers(u.users);setLogs(l.logs);
  }
  useEffect(()=>{let live=true;api('/api/auth/me').then(d=>{if(live)setUser(d.user)}).catch(()=>{}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);
  useEffect(()=>{if(user?.role==='super_admin')refresh().catch(e=>setError(e.message))},[user]);
  useEffect(()=>{if(user?.role!=='super_admin')return;let live=true;(async()=>{try{if(tab==='products'){const [d,s]=await Promise.all([api('/api/admin/products/pending'),api('/api/admin/sellers/pending')]);if(live){setProducts(d.products);setSellers(s.sellers)}}if(tab==='orders'){const d=await api('/api/admin/orders');if(live)setOrders(d.orders)}if(tab==='refunds'){const d=await api('/api/admin/refunds');if(live)setRefunds(d.refunds)}if(tab==='tickets'){const d=await api('/api/admin/tickets');if(live)setTickets(d.tickets)}if(tab==='safety'){const d=await api('/api/admin/medicine-reports');if(live)setMedicineReports(d.reports)}if(tab==='pharmacists'){const [d,a]=await Promise.all([api('/api/admin/pharmacists/applications'),api('/api/admin/pharmacists/accounts')]);if(live){setPharmacistApplications(d.applications);setPharmacistAccounts(a.pharmacists)}}if(tab==='reviews'){const d=await api('/api/admin/medicine-reviews');if(live)setMedicineReviews(d.reviews)}if(tab==='catalogue'){const d=await api('/api/medicine-catalogue/review-queue?status=pending');if(live)setCatalogueQueue(d.items)}}catch(e){if(live)setError(e.message)}})();return()=>{live=false}},[user,tab]);
  async function importCatalogue(e){e.preventDefault();setError('');setMessage('');let payload;try{payload=JSON.parse(catalogueJson)}catch{setError('JSON format मिलेन।');return;}setBusy(true);try{const d=await api('/api/medicine-catalogue/import',{method:'POST',body:JSON.stringify(payload)});setMessage(`Import batch #${d.batchId}: ${d.recordsInserted} records added, ${d.duplicatesSkipped} duplicates skipped. सबै pending review मा छन्।`);const q=await api('/api/medicine-catalogue/review-queue?status=pending');setCatalogueQueue(q.items)}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function reviewCatalogue(item,status){setError('');setMessage('');try{await api(`/api/medicine-catalogue/${item.id}/review`,{method:'PATCH',body:JSON.stringify({status,notes:''})});const q=await api('/api/medicine-catalogue/review-queue?status=pending');setCatalogueQueue(q.items);setMessage(`Catalogue record #${item.id}: ${status}`)}catch(e){setError(e.message)}}
  async function login(e){e.preventDefault();setBusy(true);setError('');try{const d=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})});setUser(d.user);setPassword('')}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function bootstrapAdmin(e){e.preventDefault();setBusy(true);setError('');try{const d=await api('/api/auth/bootstrap-super-admin',{method:'POST',headers:{'x-bootstrap-token':token},body:JSON.stringify({name:bootstrapName,email:bootstrapEmail,password:bootstrapPassword})});setUser(d.user);setBootstrapPassword('');setToken('')}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function logout(){try{await api('/api/auth/logout',{method:'POST'})}finally{setUser(null);setOverview(null);setUsers([]);setLogs([])}}
  async function createEditor(e){e.preventDefault();setBusy(true);setError('');try{await api('/api/admin/editors',{method:'POST',body:JSON.stringify({name,email:editorEmail,password:editorPassword})});setName('');setEditorEmail('');setEditorPassword('');await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function toggleEditor(account){setError('');try{await api(`/api/admin/users/${account.id}/status`,{method:'PATCH',body:JSON.stringify({isActive:!account.is_active})});await refresh()}catch(e){setError(e.message)}}
  async function reviewProduct(product,status){setError('');try{await api(`/api/admin/products/${product.id}/approve`,{method:'PATCH',body:JSON.stringify({status})});setProducts(items=>items.filter(x=>x.id!==product.id));await refresh()}catch(e){setError(e.message)}}
  async function reviewSeller(seller,status){
    setError('');
    let checkedAgainst='',notes='';
    if(status==='verified'){
      checkedAgainst=window.prompt('कुन सरकारी निकाय/आधिकारिक register बाट business वा pharmacy credential जाँच गर्नुभयो?')||'';
      if(checkedAgainst.trim().length<5)return;
      notes=window.prompt('Verification note लेख्नुहोस्:')||'';
    }
    try{
      await api(`/api/admin/sellers/${seller.id}/verification`,{method:'PATCH',body:JSON.stringify({status,checkedAgainst,notes})});
      setSellers(items=>items.filter(x=>x.id!==seller.id));
      setMessage(status==='verified'?'Seller credential review audit log मा सुरक्षित भयो।':'Seller status update भयो।');
    }catch(e){setError(e.message)}
  }
  async function createTestProduct(e){e.preventDefault();setTestProductBusy(true);setError('');try{await api('/api/admin/test-products',{method:'POST',body:JSON.stringify({name:testProductName,description:testProductDescription})});setTestProductName('Sample Demo Item');setTestProductDescription('TEST ONLY product for internal order workflow checks.');setMessage('TEST ONLY product created. No real payment or fulfillment is possible.');}catch(e){setError(e.message)}finally{setTestProductBusy(false)}}
  async function openCredential(assetId){
    if(!assetId){setError('Credential document uploaded छैन।');return;}
    try{const d=await api(`/api/uploads/${assetId}/download`);window.open(d.downloadUrl,'_blank','noopener,noreferrer');}
    catch(e){setError(e.message);}
  }
  async function confirmRefund(payment){
    const providerTransactionId=window.prompt('Khalti merchant dashboard मा refund सफल भएको पुष्टि गरेपछि provider refund transaction ID राख्नुहोस्:')||'';
    if(providerTransactionId.trim().length<5)return;
    setBusy(true);setError('');
    try{
      await api(`/api/payments/${payment.id}/refund-confirm`,{method:'PATCH',body:JSON.stringify({providerTransactionId:providerTransactionId.trim()})});
      setRefunds(items=>items.filter(x=>x.id!==payment.id));
      setMessage('Refund reconciliation सुरक्षित भयो।');
      await refresh();
    }catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
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
  async function decidePharmacist(app,decision){setError('');const notes=window.prompt(decision==='approved'?'Provisional account approval note (credential verification will happen after private document upload):':'अस्वीकृतिको कारण लेख्नुहोस्:')||'';try{await api(`/api/admin/pharmacists/applications/${app.id}`,{method:'PATCH',body:JSON.stringify({decision,notes})});setPharmacistApplications(items=>items.filter(x=>x.id!==app.id));await refresh()}catch(e){setError(e.message)}}
  async function publishMedicineReview(review){setError('');try{await api(`/api/admin/medicines/${review.medicine_id}/publish-verification`,{method:'PATCH',body:JSON.stringify({})});setMedicineReviews(items=>items.filter(x=>x.medicine_id!==review.medicine_id));setMessage('Pharmacist review प्रकाशित भयो।')}catch(e){setError(e.message)}}
  async function verifyPharmacistCredential(account){
    const checkedAgainst=window.prompt('कुन आधिकारिक Register/स्रोतमा uploaded credential जाँच गर्नुभयो?')||'';
    if(checkedAgainst.trim().length<5)return;
    const notes=window.prompt('Credential review note:')||'';
    setError('');setBusy(true);
    try{
      const d=await api(`/api/admin/pharmacists/accounts/${account.id}/credential`,{method:'PATCH',body:JSON.stringify({checkedAgainst:checkedAgainst.trim(),notes})});
      setPharmacistAccounts(items=>items.map(x=>x.id===account.id?{...x,is_credential_active:true,credential_verified_at:d.pharmacist.credential_verified_at,verified_by_name:user.name}:x));
      setMessage(d.message);
    }catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  async function togglePharmacist(account){const active=!account.is_active;if(!window.confirm(active?'यो Pharmacist account पुनः सक्रिय गर्ने?':'यो Pharmacist account र credential suspend गर्ने?'))return;setError('');try{await api(`/api/admin/pharmacists/accounts/${account.id}/status`,{method:'PATCH',body:JSON.stringify({active})});setPharmacistAccounts(items=>items.map(x=>x.id===account.id?{...x,is_active:active,is_credential_active:active}:x))}catch(e){setError(e.message)}}
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
        {['overview','editors','pharmacists','reviews','catalogue','products','orders','refunds','tickets','safety','activity'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{({overview:'Overview',editors:'Editor Accounts',products:'Pending Products',orders:'Orders',refunds:'Refund Requests',tickets:'Support Tickets',safety:'Medicine Reports',activity:'Audit Logs',pharmacists:'Pharmacist Applications',reviews:'Clinical Reviews',catalogue:'Medicine Catalogue'})[t]}</button>)}
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
      {tab==='pharmacists'&&<div className="admin-manage"><h3>Pharmacist Credential Applications</h3><p>आवेदन स्वीकृत भएपछि Pharmacist ले आफ्नो account बाट credential upload गर्नुपर्छ। Credential file निजी storage मा राखिन्छ; Super Admin ले official issuing authority सँग जाँच गरेर मात्र सक्रिय गर्नुपर्छ।</p><div className="admin-table-wrap"><table><thead><tr><th>Applicant</th><th>Qualification</th><th>Registration</th><th>Authority</th><th>Applied</th><th>Decision</th></tr></thead><tbody>{pharmacistApplications.map(p=><tr key={p.id}><td>{p.full_name}<br/>{p.email}<br/>{p.phone}</td><td>{p.qualification}</td><td>{p.registration_number}</td><td>{p.issuing_authority}</td><td>{new Date(p.created_at).toLocaleDateString()}</td><td><button onClick={()=>decidePharmacist(p,'approved')}>Create provisional account</button> <button onClick={()=>decidePharmacist(p,'rejected')}>Reject</button></td></tr>)}</tbody></table>{!pharmacistApplications.length&&<p>Pending applications छैनन्।</p>}</div><h3>Approved Pharmacist Accounts</h3><div className="admin-table-wrap"><table><thead><tr><th>Name / Email</th><th>Registration</th><th>Credential Document</th><th>Credential Checked</th><th>Status</th><th>Action</th></tr></thead><tbody>{pharmacistAccounts.map(p=><tr key={p.id}><td>{p.name}<br/>{p.email}</td><td>{p.registration_number}<br/><small>{p.qualification}</small></td><td>{p.credential_asset_id?<button onClick={()=>openCredential(p.credential_asset_id)}>View private document</button>:'Not submitted'}</td><td>{p.credential_verified_at?`${p.verified_by_name||'Super Admin'} · ${new Date(p.credential_verified_at).toLocaleDateString()}`:'Pending independent verification'}</td><td>{p.is_active&&p.is_credential_active?'Active':'Suspended'}</td><td>{p.credential_asset_id&&!p.is_credential_active&&<button disabled={busy} onClick={()=>verifyPharmacistCredential(p)}>Verify private credential</button>} <button onClick={()=>togglePharmacist(p)}>{p.is_active?'Suspend':'Reactivate'}</button></td></tr>)}</tbody></table>{!pharmacistAccounts.length&&<p>Approved Pharmacist accounts छैनन्।</p>}</div></div>}
      {tab==='reviews'&&<div className="admin-manage"><h3>Pharmacist Clinical Reviews</h3><p>Super Admin ले pharmacist को credential र clinical sources सहितको review हेरेर मात्र सार्वजनिक Verified status प्रकाशित गर्न सक्छ।</p><div className="admin-table-wrap"><table><thead><tr><th>Medicine</th><th>Recommendation</th><th>Pharmacist</th><th>Registration</th><th>Clinical Notes / Sources</th><th>Action</th></tr></thead><tbody>{medicineReviews.map(r=><tr key={r.review_id}><td>{r.name}<br/>{r.nepali_name}</td><td>{r.recommendation}</td><td>{r.pharmacist_name}</td><td>{r.registration_number}</td><td>{r.clinical_notes}<br/><small>{r.sources}</small></td><td><button disabled={r.recommendation!=='approved'} onClick={()=>publishMedicineReview(r)}>Publish Verified</button></td></tr>)}</tbody></table>{!medicineReviews.length&&<p>कुनै pharmacist review बाँकी छैन।</p>}</div></div>}
      {tab==='catalogue'&&<div className="admin-manage"><h3>Medicine Product Catalogue Import</h3><p>केवल traceable source बाट exact brand, generic ingredient, strength र dosage form राख्नुहोस्। Imported records pending रहन्छन्। DDA registration status अनुमान गरेर नराख्नुहोस्। प्रति batch अधिकतम 200 records।</p><form onSubmit={importCatalogue}><label>Batch JSON<textarea value={catalogueJson} onChange={e=>setCatalogueJson(e.target.value)} rows="16" spellCheck="false" required/></label><button className="primary" disabled={busy}>{busy?'Importing...':'Import Catalogue Batch'}</button></form><h3>Pending Catalogue Review ({catalogueQueue.length})</h3><div className="admin-table-wrap"><table><thead><tr><th>Brand / Generic</th><th>Strength / Form</th><th>Manufacturer</th><th>Registration</th><th>Source Evidence</th><th>Review</th></tr></thead><tbody>{catalogueQueue.map(p=><tr key={p.id}><td>{p.brandName}<br/><small>{p.genericName}</small></td><td>{p.strength}<br/>{p.dosageForm}</td><td>{p.manufacturer||'—'}</td><td>{p.registrationStatus}<br/><small>{p.registrationNumber||'No number'}</small></td><td><a href={p.sourceUrl} target="_blank" rel="noreferrer">{p.sourceName}</a><br/><small>{p.sourceRecordId||'No source record ID'}</small></td><td><button onClick={()=>reviewCatalogue(p,'under_review')}>Under review</button> <button onClick={()=>reviewCatalogue(p,'rejected')}>Reject</button> <button onClick={()=>reviewCatalogue(p,'approved')}>Approve</button></td></tr>)}</tbody></table>{!catalogueQueue.length&&<p>Pending catalogue records छैनन्।</p>}</div><p className="notice">Approve गर्दा official DDA source URL, registration number र source record ID अनिवार्य हुन्छ। यो catalogue review clinical pharmacist approval होइन।</p></div>}
      {tab==='products'&&<><div className="admin-table-wrap"><h3>Pending Product Approvals</h3><table><thead><tr><th>Product</th><th>Seller</th><th>Category</th><th>Price</th><th>Decision</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td>{p.name}{p.is_test&&<strong> · TEST ONLY</strong>}</td><td>{p.seller_name}<br/><small>Seller: {p.seller_verification}</small></td><td>{p.category}</td><td>रु. {Number(p.price).toLocaleString()}</td><td><button disabled={!p.is_test&&p.seller_verification!=='verified'} onClick={()=>reviewProduct(p,'approved')}>Approve</button> <button onClick={()=>reviewProduct(p,'rejected')}>Reject</button></td></tr>)}</tbody></table>{!products.length&&<p>No pending products.</p>}</div>
      <div className="admin-manage"><h3>Seller Verification</h3><p>व्यवसाय/KYC कागजात वास्तविक रूपमा जाँच गरेपछि मात्र Verified गर्नुहोस्।</p><div className="admin-table-wrap"><table><thead><tr><th>Business</th><th>Owner</th><th>Email</th><th>Credential</th><th>Decision</th></tr></thead><tbody>{sellers.map(s=><tr key={s.id}><td>{s.business_name}</td><td>{s.owner_name}</td><td>{s.owner_email}</td><td>{s.credential_asset_id?<button onClick={()=>openCredential(s.credential_asset_id)}>View private document</button>:'Not submitted'}</td><td><button disabled={!s.credential_asset_id} onClick={()=>reviewSeller(s,'verified')}>Verify</button> <button onClick={()=>reviewSeller(s,'rejected')}>Reject</button></td></tr>)}</tbody></table>{!sellers.length&&<p>No pending seller profiles.</p>}</div></div>
      <div className="admin-manage"><h3>TEST ONLY Product</h3><p>यो सुविधा server environment मा ENABLE_TEST_ORDER_WORKFLOW=true हुँदा मात्र चल्छ। Product को मूल्य रु. १ र stock ५ हुनेछ। यो वास्तविक बिक्रीका लागि होइन।</p><form onSubmit={createTestProduct}><label>Demo product name<input value={testProductName} onChange={e=>setTestProductName(e.target.value)} minLength="3" maxLength="90" required/></label><label>Description<textarea value={testProductDescription} onChange={e=>setTestProductDescription(e.target.value)} minLength="10" maxLength="300" required/></label><button className="primary" disabled={testProductBusy}>{testProductBusy?'Creating...':'Create TEST ONLY Product'}</button></form></div></>}
      {tab==='refunds'&&<div className="admin-table-wrap"><h3>Refund Review Queue</h3><p>पहिले Khalti merchant dashboard मा वास्तविक refund गर्नुहोस्। सफल भएको transaction ID पुष्टि भएपछि मात्र यहाँ reconcile गर्नुहोस्।</p><table><thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Provider</th><th>Requested</th><th>Action</th></tr></thead><tbody>{refunds.map(p=><tr key={p.id}><td>{p.order_number}</td><td>{p.buyer_name}<br/>{p.buyer_email}</td><td>रु. {(Number(p.amount_paisa)/100).toLocaleString()}</td><td>{p.provider} · {p.provider_status||'—'}</td><td>{new Date(p.updated_at).toLocaleString()}</td><td><button disabled={busy} onClick={()=>confirmRefund(p)}>Confirm provider refund</button></td></tr>)}</tbody></table>{!refunds.length&&<p>कुनै refund request छैन।</p>}</div>}
      {tab==='orders'&&<div className="admin-table-wrap"><h3>Order Management</h3><p>Order status मात्र यहाँ update हुन्छ। Payment status provider बाट server-side पुष्टि भएपछि मात्र परिवर्तन हुनेछ।</p><table><thead><tr><th>Order</th><th>Buyer</th><th>Total</th><th>Order Status</th><th>Payment</th><th>Update Status</th><th>Date</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>{o.order_number}{o.is_test&&<strong> · TEST ONLY</strong>}</td><td>{o.buyer_name}<br/>{o.buyer_email}</td><td>रु. {Number(o.total_amount).toLocaleString()}</td><td>{o.order_status}</td><td>{o.payment_status}</td><td><select value={o.order_status} onChange={e=>setOrderStatus(o,e.target.value)}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option>{!o.is_test&&<><option value="shipped">Shipped</option><option value="delivered">Delivered</option></>}<option value="cancelled">Cancelled</option></select></td><td>{new Date(o.created_at).toLocaleDateString()}</td></tr>)}</tbody></table>{!orders.length&&<p>अहिलेसम्म कुनै order छैन।</p>}</div>}
      {tab==='tickets'&&<div className="admin-table-wrap"><h3>Support Tickets</h3><table><thead><tr><th>Subject</th><th>Customer</th><th>Message</th><th>Status</th><th>Update</th></tr></thead><tbody>{tickets.map(t=><tr key={t.id}><td>{t.subject}</td><td>{t.customer}<br/>{t.email}</td><td>{t.message}</td><td>{t.status}</td><td><select value={t.status} onChange={e=>setTicketStatus(t,e.target.value)}><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></td></tr>)}</tbody></table></div>}
      {tab==='safety'&&<div className="admin-table-wrap"><h3>Medicine Information Reports</h3><p>प्रयोगकर्ताले औषधिको विवरणमा सम्भावित गल्ती वा पुरानो जानकारी report गरेका छन्। Clinical निर्णय योग्य Pharmacist बाट मात्र गराउनुहोस्।</p><table><thead><tr><th>Medicine</th><th>Reporter</th><th>Report</th><th>Received</th><th>Status</th></tr></thead><tbody>{medicineReports.map(r=><tr key={r.id}><td>{r.medicine_name}<br/>{r.nepali_name}</td><td>{r.reporter_name||'Anonymous'}<br/>{r.reporter_email||'—'}</td><td>{r.message}</td><td>{new Date(r.created_at).toLocaleString()}</td><td><select value={r.status} onChange={e=>setMedicineReportStatus(r,e.target.value)}><option value="new">New</option><option value="in_review">In Review</option><option value="resolved">Resolved</option></select></td></tr>)}</tbody></table>{!medicineReports.length&&<p>अहिलेसम्म कुनै report आएको छैन।</p>}</div>}
      {tab==='activity'&&<div className="admin-table-wrap"><h3>Recent Audit Logs</h3><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead><tbody>{logs.map(x=><tr key={x.id}><td>{new Date(x.created_at).toLocaleString()}</td><td>{x.actor_name||'System'}</td><td>{x.action}</td><td>{x.entity_type} #{x.entity_id||'—'}</td><td>{JSON.stringify(x.metadata||{})}</td></tr>)}</tbody></table>{!logs.length&&<p>No activity recorded yet.</p>}</div>}
    </>}
    {user.role==='editor'&&<p>Editor access: зөв औषधिको विवरण थप्ने/सम्पादन गर्ने र Pharmacist verification व्यवस्थापन गर्ने सुविधा मात्र उपलब्ध छ।</p>}
    {children}
  </section>;
}
