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
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [overview,setOverview]=useState(null),[users,setUsers]=useState([]),[logs,setLogs]=useState([]);
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
  async function login(e){e.preventDefault();setBusy(true);setError('');try{const d=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})});setUser(d.user);setPassword('')}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function bootstrapAdmin(e){e.preventDefault();setBusy(true);setError('');try{const d=await api('/api/auth/bootstrap-super-admin',{method:'POST',headers:{'x-bootstrap-token':token},body:JSON.stringify({name:bootstrapName,email:bootstrapEmail,password:bootstrapPassword})});setUser(d.user);setBootstrapPassword('');setToken('')}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function logout(){try{await api('/api/auth/logout',{method:'POST'})}finally{setUser(null);setOverview(null);setUsers([]);setLogs([])}}
  async function createEditor(e){e.preventDefault();setBusy(true);setError('');try{await api('/api/admin/editors',{method:'POST',body:JSON.stringify({name,email:editorEmail,password:editorPassword})});setName('');setEditorEmail('');setEditorPassword('');await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function toggleEditor(account){setError('');try{await api(`/api/admin/users/${account.id}/status`,{method:'PATCH',body:JSON.stringify({isActive:!account.is_active})});await refresh()}catch(e){setError(e.message)}}
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
    {error&&<p className="notice error">{error}</p>}
  </section>;
  return <section className="admin panel admin-console">
    <div className="section-head"><div><span className="admin-tag">{user.role==='super_admin'?'SUPER ADMIN':'EDITOR'} CONSOLE</span><h2>Welcome, {user.name}</h2><p>{user.email} · {user.role.replace('_',' ').toUpperCase()}</p></div><div className="admin-actions"><button onClick={logout}>Logout</button><button onClick={onClose}>Close</button></div></div>
    {error&&<p className="notice error">{error}</p>}
    {user.role==='super_admin'&&<>
      <nav className="admin-tabs">
        {['overview','editors','activity'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t==='overview'?'Overview':t==='editors'?'Editor Accounts':'Audit Logs'}</button>)}
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
      {tab==='activity'&&<div className="admin-table-wrap"><h3>Recent Audit Logs</h3><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead><tbody>{logs.map(x=><tr key={x.id}><td>{new Date(x.created_at).toLocaleString()}</td><td>{x.actor_name||'System'}</td><td>{x.action}</td><td>{x.entity_type} #{x.entity_id||'—'}</td><td>{JSON.stringify(x.metadata||{})}</td></tr>)}</tbody></table>{!logs.length&&<p>No activity recorded yet.</p>}</div>}
    </>}
    {user.role==='editor'&&<p>Editor access: зөв औषधिको विवरण थप्ने/सम्पादन गर्ने र Pharmacist verification व्यवस्थापन गर्ने सुविधा मात्र उपलब्ध छ।</p>}
    {children}
  </section>;
}
