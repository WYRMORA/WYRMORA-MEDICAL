import React, { useState } from 'react';
import './MedicineReportForm.css';

export default function MedicineReportForm({ medicineId, medicineName }) {
  const [open, setOpen] = useState(false);
  const [reporterName, setReporterName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(`/api/medicines/${encodeURIComponent(medicineId)}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reporterName, email, message })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Report पठाउन सकिएन।');
      setMessage('');
      setNotice('तपाईंको report प्राप्त भयो। जानकारी गराउनुभएकोमा धन्यवाद।');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  return <section className="medicine-report">
    <button type="button" className="report-toggle" onClick={() => setOpen(value => !value)}>
      {open ? 'Report बन्द गर्नुहोस्' : 'यो जानकारी गलत वा पुरानो छ? Report गर्नुहोस्'}
    </button>
    {open && <form onSubmit={submit} className="medicine-report-form">
      <h3>{medicineName} सम्बन्धी जानकारी report</h3>
      <p>औषधिको विवरणमा देखिएको गल्ती वा पुरानो जानकारी मात्र लेख्नुहोस्। आफ्नो व्यक्तिगत स्वास्थ्य विवरण वा आपतकालीन समस्या यहाँ नपठाउनुहोस्।</p>
      <label>नाम (वैकल्पिक)<input value={reporterName} maxLength="100" onChange={e => setReporterName(e.target.value)} /></label>
      <label>Email (वैकल्पिक)<input type="email" value={email} maxLength="254" onChange={e => setEmail(e.target.value)} /></label>
      <label>के जानकारी सच्याउनुपर्छ?<textarea value={message} minLength="15" maxLength="2000" required onChange={e => setMessage(e.target.value)} /></label>
      <button className="primary" disabled={busy || message.trim().length < 15}>{busy ? 'पठाउँदैछ...' : 'Report पठाउनुहोस्'}</button>
      {notice && <p role="status" className="report-notice">{notice}</p>}
    </form>}
  </section>;
}
