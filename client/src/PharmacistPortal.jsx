import React, { useEffect, useState } from 'react';

async function api(path, options={}) {
  const response = await fetch(path, { credentials:'same-origin', ...options, headers:{'Content-Type':'application/json', ...(options.headers||{})} });
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

const emptyApplication = { name:'', email:'', password:'', phone:'', qualification:'', registrationNumber:'', issuingAuthority:'Nepal Pharmacy Council' };

export default function PharmacistPortal({ onClose }) {
  const [mode,setMode] = useState('login');
  const [user,setUser] = useState(null);
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [application,setApplication] = useState(emptyApplication);
  const [medicines,setMedicines] = useState([]);
  const [selected,setSelected] = useState('');
  const [recommendation,setRecommendation] = useState('approved');
  const [clinicalNotes,setClinicalNotes] = useState('');
  const [sources,setSources] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');

  async function loadQueue() {
    const data = await api('/api/pharmacist/medicines');
    setMedicines(data.medicines || []);
    if (!selected && data.medicines?.length) setSelected(data.medicines[0].id);
  }

  useEffect(() => {
    let active = true;
    api('/api/auth/me').then(async data => {
      if (data.user.role !== 'pharmacist') return;
      if (active) setUser(data.user);
      const queue = await api('/api/pharmacist/medicines');
      if (active) {
        setMedicines(queue.medicines || []);
        if (queue.medicines?.length) setSelected(queue.medicines[0].id);
      }
    }).catch(()=>{}).finally(()=>{});
    return () => { active = false; };
  }, []);

  function updateApplication(field,value) {
    setApplication(current => ({...current,[field]:value}));
  }

  async function submitApplication(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const data = await api('/api/pharmacist/applications',{method:'POST',body:JSON.stringify(application)});
      setMessage(data.message || 'आवेदन प्राप्त भयो।');
      setApplication(emptyApplication);
      setMode('login');
    } catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function login(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const data = await api('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})});
      if (data.user.role !== 'pharmacist') {
        await api('/api/auth/logout',{method:'POST'});
        throw new Error('यो account Pharmacist account होइन।');
      }
      setUser(data.user); setPassword('');
      await loadQueue();
    } catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function submitReview(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const data = await api(`/api/pharmacist/medicines/${encodeURIComponent(selected)}/reviews`,{
        method:'POST',body:JSON.stringify({recommendation,clinicalNotes,sources})
      });
      setMessage(data.message || 'Review सुरक्षित भयो।');
      setClinicalNotes(''); setSources('');
      await loadQueue();
    } catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function logout() {
    try { await api('/api/auth/logout',{method:'POST'}); }
    finally { setUser(null); setMedicines([]); setMode('login'); }
  }

  return <section className="admin panel admin-console pharmacist-portal">
    <div className="section-head">
      <div><span className="admin-tag">WYRMORA PHARMACIST PORTAL</span><h2>{user ? `Welcome, ${user.name}` : 'Pharmacist Access'}</h2><p>{user ? user.email : 'Credential-approved Pharmacist मात्र clinical review गर्न पाउँछन्।'}</p></div>
      <div className="admin-actions">{user && <button onClick={logout}>Logout</button>}<button onClick={onClose}>Close</button></div>
    </div>
    {error && <p className="notice error">{error}</p>}
    {message && <p className="notice success">{message}</p>}
    {!user && <>
      <div className="admin-tabs">
        <button className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('');}}>Pharmacist Login</button>
        <button className={mode==='apply'?'active':''} onClick={()=>{setMode('apply');setError('');}}>Apply for Pharmacist Account</button>
      </div>
      {mode==='login' ? <form onSubmit={login}>
        <p>Approval नभएसम्म आवेदनकर्ताले login गर्न सक्दैनन्।</p>
        <label>Email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
        <button className="primary" disabled={busy}>{busy?'Signing in...':'Secure Pharmacist Login'}</button>
      </form> : <form onSubmit={submitApplication}>
        <p>आवेदनमा दिएको Nepal Pharmacy Council वा सम्बन्धित issuing authority को registration details Super Admin ले आधिकारिक register बाट जाँच गर्नेछ। Credential file upload हाल उपलब्ध छैन; आवश्यक कागजात सुरक्षित माध्यमबाट छुट्टै उपलब्ध गराउनुपर्नेछ।</p>
        <div className="form-grid">
          <label>पूरा नाम<input value={application.name} onChange={e=>updateApplication('name',e.target.value)} minLength="2" maxLength="80" required /></label>
          <label>Email<input type="email" value={application.email} onChange={e=>updateApplication('email',e.target.value)} required /></label>
          <label>Password (10+ characters, uppercase/lowercase/number)<input type="password" value={application.password} onChange={e=>updateApplication('password',e.target.value)} minLength="10" maxLength="72" required autoComplete="new-password" /></label>
          <label>Phone (optional)<input value={application.phone} onChange={e=>updateApplication('phone',e.target.value)} maxLength="30" /></label>
          <label>Qualification<input value={application.qualification} onChange={e=>updateApplication('qualification',e.target.value)} maxLength="160" required /></label>
          <label>Registration Number<input value={application.registrationNumber} onChange={e=>updateApplication('registrationNumber',e.target.value)} maxLength="100" required /></label>
          <label>Issuing Authority<input value={application.issuingAuthority} onChange={e=>updateApplication('issuingAuthority',e.target.value)} maxLength="160" required /></label>
        </div>
        <button className="primary" disabled={busy}>{busy?'Submitting...':'Submit Credential Application'}</button>
      </form>}
    </>}
    {user && <div className="admin-manage">
      <h3>Medicine Clinical Review Queue</h3>
      <p>हरेक review मा clinical reasoning र विश्वसनीय references अनिवार्य छन्। यो review सार्वजनिक हुँदैन जबसम्म Super Admin ले छुट्टै publish गर्दैन।</p>
      <form onSubmit={submitReview}>
        <label>औषधि छान्नुहोस्<select value={selected} onChange={e=>setSelected(e.target.value)} required>
          {medicines.map(m=><option key={m.id} value={m.id}>{m.name} — {m.nepali_name}</option>)}
        </select></label>
        {selected && medicines.filter(m=>m.id===selected).map(m=><div className="notice" key={m.id}><strong>{m.name} — {m.nepali_name}</strong><p>{m.use_description}</p><p><strong>Precautions:</strong> {m.caution}</p><p><strong>Side effects:</strong> {m.side_effects}</p><p><strong>Existing source:</strong> {m.source}</p></div>)}
        <label>Recommendation<select value={recommendation} onChange={e=>setRecommendation(e.target.value)}><option value="approved">Clinical review complete — recommend approval</option><option value="changes_requested">Changes required — do not approve</option></select></label>
        <label>Clinical Review Notes<textarea value={clinicalNotes} onChange={e=>setClinicalNotes(e.target.value)} minLength="30" maxLength="4000" required placeholder="Clinical reasoning, content checked, limitations..." /></label>
        <label>References / Sources<textarea value={sources} onChange={e=>setSources(e.target.value)} minLength="10" maxLength="2000" required placeholder="Official product information, recognised clinical reference, access date..." /></label>
        <button className="primary" disabled={busy || !selected}>{busy?'Submitting...':'Submit Clinical Review'}</button>
      </form>
      {!medicines.length && <p>हाल review गर्न बाँकी औषधि छैन।</p>}
    </div>}
  </section>;
}
