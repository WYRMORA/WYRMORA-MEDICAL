
import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import AdminConsole from './AdminConsole.jsx';
import MedicineReportForm from './MedicineReportForm.jsx';
import CustomerPortal from './CustomerPortal.jsx';
import PharmacistPortal from './PharmacistPortal.jsx';
import SellerPortal from './SellerPortal.jsx';


const API = '/api/medicines';

const emptyForm = {
  name: '',
  nepali: '',
  category: '',
  forms: '',
  use: '',
  symptoms: '',
  caution: '',
  side: '',
  prescription: '',
  price: '',
  priceNote: '',
  source: ''
};

const emptyVerification = {
  medicineId: '',
  status: 'pending',
  notes: ''
};

const money = value => {
  if (value === null || value === undefined || value === '') {
    return 'मूल्य पुष्टि हुँदैछ';
  }
  return `रु. ${Number(value).toLocaleString('en-IN')}`;
};

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || `Request असफल भयो (${response.status})`
    );
  }

  return data;
}

function verificationBadge(status) {
  const badges = {
    verified: ['✓ Pharmacist reviewed', 'verified'],
    under_review: ['◷ समीक्षामा', 'unverified'],
    pending: ['○ समीक्षा बाँकी', 'unverified']
  };

  const [label, className] = badges[status] || badges.pending;

  return <span className={className}>{label}</span>;
}

export default function App() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('सबै');
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('home');

  const [showAdmin, setShowAdmin] = useState(false);
  const [showCustomer, setShowCustomer] = useState(() => ['/verify-email', '/reset-password', '/payment-result'].includes(window.location.pathname));
  const [showPharmacist, setShowPharmacist] = useState(false);
  const [showSeller, setShowSeller] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('info');

  const [editingId, setEditingId] = useState(null);
  const [savingMedicine, setSavingMedicine] = useState(false);
  const [savingVerification, setSavingVerification] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [form, setForm] = useState({ ...emptyForm });
  const [verificationForm, setVerificationForm] =
    useState({ ...emptyVerification });

  // Load medicines from backend
  useEffect(() => {
    let active = true;

    async function loadMedicines() {
      try {
        const response = await fetch(API);
        const data = await readResponse(response);

        if (active && Array.isArray(data.items)) {
          setItems(data.items);
          setLoadError('');
        }
      } catch (error) {
        console.error('Medicine API:', error);
        if (active) setLoadError('औषधि सूची अहिले लोड हुन सकेन। कृपया केहीबेरपछि पुनः प्रयास गर्नुहोस्।');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMedicines();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const categories = useMemo(
    () => [
      'सबै',
      ...new Set(items.map(item => item.category).filter(Boolean))
    ],
    [items]
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return items.filter(item => {
      const searchable = [
        item.name,
        item.nepali,
        item.category,
        item.use,
        item.symptoms
      ].join(' ').toLowerCase();

      return (
        searchable.includes(search) &&
        (category === 'सबै' || item.category === category)
      );
    });
  }, [items, query, category]);

  function showMessage(message, type = 'info') {
    setNotice(message);
    setNoticeType(type);
  }

  function updateForm(field, value) {
    setForm(previous => ({
      ...previous,
      [field]: value
    }));
  }

  function updateVerificationForm(field, value) {
    setVerificationForm(previous => ({
      ...previous,
      [field]: value
    }));
  }

  function resetMedicineForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function editMedicine(id) {
    const medicine = items.find(item => item.id === id);

    if (!medicine) {
      showMessage('चयन गरिएको औषधि भेटिएन।', 'error');
      return;
    }

    setEditingId(medicine.id);

    setForm({
      name: medicine.name || '',
      nepali: medicine.nepali || '',
      category: medicine.category || '',
      forms: medicine.forms || '',
      use: medicine.use || '',
      symptoms: medicine.symptoms || '',
      caution: medicine.caution || '',
      side: medicine.side || '',
      prescription: medicine.prescription || '',
      price: medicine.price ?? '',
      priceNote: medicine.priceNote || '',
      source: medicine.source || ''
    });

    showMessage(`${medicine.name} Edit गर्न चयन भयो।`);
  }

  async function saveMedicine(event) {
    event.preventDefault();
    setNotice('');

    if (
      !form.name.trim() ||
      !form.nepali.trim() ||
      !form.category.trim() ||
      !form.use.trim() ||
      !form.caution.trim() ||
      !form.source.trim()
    ) {
      showMessage('आवश्यक विवरणहरू पूरा गर्नुहोस्।', 'error');
      return;
    }

    if (
      form.price !== '' &&
      (!Number.isFinite(Number(form.price)) || Number(form.price) < 0)
    ) {
      showMessage('मूल्य शून्य वा सोभन्दा बढी हुनुपर्छ।', 'error');
      return;
    }

    const wasEditing = Boolean(editingId);

    const payload = {
      ...form,
      ...(editingId ? { id: editingId } : {}),
      price: form.price === '' ? null : Number(form.price)
    };

    setSavingMedicine(true);

    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await readResponse(response);

      if (!data.item) {
        throw new Error('Server बाट औषधिको विवरण प्राप्त भएन।');
      }

      setItems(previous => [
        data.item,
        ...previous.filter(item => item.id !== data.item.id)
      ]);

      if (selected?.id === data.item.id) {
        setSelected(data.item);
      }

      resetMedicineForm();

      showMessage(
        wasEditing
          ? 'औषधिको विवरण सफलतापूर्वक Update भयो।'
          : 'नयाँ औषधि सफलतापूर्वक थपियो।',
        'success'
      );
    } catch (error) {
      showMessage(
        `${error.message} API key र Backend जाँच गर्नुहोस्।`,
        'error'
      );
    } finally {
      setSavingMedicine(false);
    }
  }

  async function saveVerification(event) {
    event.preventDefault();
    setNotice('');

    if (!verificationForm.medicineId) {
      showMessage('औषधि छान्नुहोस्।', 'error');
      return;
    }

    setSavingVerification(true);

    try {
      const response = await fetch(
        `${API}/${encodeURIComponent(verificationForm.medicineId)}/verification`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: verificationForm.status,
            notes: verificationForm.notes
          })
        }
      );

      const data = await readResponse(response);

      if (!data.item) {
        throw new Error('Server बाट Verification विवरण प्राप्त भएन।');
      }

      setItems(previous =>
        previous.map(item =>
          item.id === data.item.id ? data.item : item
        )
      );

      if (selected?.id === data.item.id) {
        setSelected(data.item);
      }

      setVerificationForm({ ...emptyVerification });

      showMessage(
        'Verification status सफलतापूर्वक Update भयो।',
        'success'
      );
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setSavingVerification(false);
    }
  }

  function openAdmin() {
    setShowAdmin(value => !value);
    setNotice('');
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <img className="logo" src="/icon.svg" alt="WYRMORA Medical logo" />
          <div>
            <strong>WYRMORA</strong>
            <small>MEDICAL</small>
          </div>
        </div>

        <nav>
          <button
            className={tab === 'home' ? 'active' : ''}
            onClick={() => {
              setTab('home');
              setSelected(null);
            }}
          >
            औषधि खोज्नुहोस्
          </button>

          <button
            className={tab === 'about' ? 'active' : ''}
            onClick={() => {
              setTab('about');
              setSelected(null);
            }}
          >
            हाम्रो बारेमा
          </button>

          <button onClick={() => { setShowCustomer(value => !value); setShowAdmin(false); setShowPharmacist(false); setShowSeller(false); }}>
            {showCustomer ? 'Customer बन्द गर्नुहोस्' : 'Customer Login / Orders'}
          </button>

          <button onClick={() => { setShowSeller(value => !value); setShowAdmin(false); setShowCustomer(false); setShowPharmacist(false); }}>
            {showSeller ? 'Seller बन्द गर्नुहोस्' : 'Become a Seller'}
          </button>

          <button onClick={() => { setShowPharmacist(value => !value); setShowAdmin(false); setShowCustomer(false); setShowSeller(false); }}>
            {showPharmacist ? 'Pharmacist बन्द गर्नुहोस्' : 'Pharmacist'}
          </button>

          <button onClick={openAdmin}>
            {showAdmin ? 'Admin बन्द गर्नुहोस्' : 'Admin'}
          </button>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              NEPAL'S MEDICINE INFORMATION GUIDE
            </span>

            <h1>
              औषधिबारे बुझ्न सजिलो जानकारी,
              <br />
              <i>नेपाली भाषामा।</i>
            </h1>

            <p>
              कुन औषधि केका लागि प्रयोग हुन्छ, के सावधानी अपनाउने
              र मूल्य कहाँ पुष्टि गर्ने—एकै ठाउँमा बुझ्नुहोस्।
            </p>

            <div className="trust">
              <span>✓ सरल नेपाली</span>
              <span>✓ सावधानीसहित</span>
              <span>✓ समीक्षा स्थिति स्पष्ट</span>
            </div>
          </div>

          <div className="hero-art">
            <div className="art-card">
              <div className="cross">✚</div>
              <h3>WYRMORA</h3>
              <p>Medicine Information</p>
            </div>
          </div>
        </section>

        {showCustomer && <CustomerPortal onClose={() => setShowCustomer(false)} />}
        {showPharmacist && <PharmacistPortal onClose={() => setShowPharmacist(false)} />}
        {showSeller && <SellerPortal onClose={() => setShowSeller(false)} />}

        {showAdmin && (
          <AdminConsole onClose={() => setShowAdmin(false)}>
          <section className="admin panel">
            <div className="section-head">
              <div>
                <span className="admin-tag">ADMIN PANEL</span>
                <h2>Medicine Management</h2>
              </div>
            </div>

            <p>Login भएको Super Admin वा Editor ले मात्र औषधि व्यवस्थापन गर्न सक्छ।</p>

            <hr />

            <h3>Add / Edit Medicine</h3>

            <form onSubmit={saveMedicine}>
              <label>
                पहिलेको औषधि Edit गर्नुहोस्
                <select
                  value={editingId || ''}
                  onChange={event => {
                    const id = event.target.value;

                    if (!id) {
                      resetMedicineForm();
                      showMessage('नयाँ औषधि थप्न तयार छ।');
                    } else {
                      editMedicine(id);
                    }
                  }}
                >
                  <option value="">＋ नयाँ औषधि थप्ने</option>
                  {items.map(medicine => (
                    <option key={medicine.id} value={medicine.id}>
                      {medicine.name} — {medicine.nepali}
                    </option>
                  ))}
                </select>
              </label>

              {editingId && (
                <p className="notice">
                  अहिले पुरानो औषधि Edit हुँदैछ। विवरण परिवर्तन गरेर
                  Update गर्नुहोस्।
                </p>
              )}

              <div className="form-grid">
                {[
                  ['name', 'Medicine name'],
                  ['nepali', 'नेपाली नाम'],
                  ['category', 'Category'],
                  ['forms', 'Dosage forms'],
                  ['use', 'के कामका लागि प्रयोग हुन्छ'],
                  ['symptoms', 'कुन अवस्थामा प्रयोग गरिन्छ'],
                  ['caution', 'सावधानी'],
                  ['side', 'सम्भावित side effects'],
                  ['prescription', 'Prescription स्थिति'],
                  ['price', 'मूल्य (रु.)'],
                  ['priceNote', 'मूल्य स्रोत / प्याकेट विवरण'],
                  ['source', 'जानकारीको स्रोत']
                ].map(([field, label]) => (
                  <label key={field}>
                    {label}

                    {[
                      'use',
                      'symptoms',
                      'caution',
                      'side',
                      'source'
                    ].includes(field) ? (
                      <textarea
                        value={form[field]}
                        onChange={event =>
                          updateForm(field, event.target.value)
                        }
                        required={[
                          'use',
                          'caution',
                          'source'
                        ].includes(field)}
                      />
                    ) : (
                      <input
                        type={field === 'price' ? 'number' : 'text'}
                        min={field === 'price' ? '0' : undefined}
                        step={field === 'price' ? '0.01' : undefined}
                        value={form[field]}
                        onChange={event =>
                          updateForm(field, event.target.value)
                        }
                        required={[
                          'name',
                          'nepali',
                          'category'
                        ].includes(field)}
                      />
                    )}
                  </label>
                ))}
              </div>

              <button
                className="primary"
                type="submit"
                disabled={savingMedicine}
              >
                {savingMedicine
                  ? 'सेभ हुँदैछ...'
                  : editingId
                    ? 'औषधि Update गर्नुहोस्'
                    : 'नयाँ औषधि सेभ गर्नुहोस्'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    resetMedicineForm();
                    showMessage('Edit रद्द गरियो।');
                  }}
                >
                  Edit Cancel गर्नुहोस्
                </button>
              )}
            </form>

            <hr />

            <h3>Pharmacist Verification</h3>

            <p>
              हाल Pharmacist को छुट्टै सुरक्षित reviewer account र
              दर्ता-पुष्टि प्रक्रिया तयार नभएकाले “Verified” बन्द छ।
              योग्य Pharmacist को वास्तविक समीक्षा नभएसम्म Pending वा
              Under Review मात्र राख्नुहोस्।
            </p>

            <form onSubmit={saveVerification}>
              <label>
                औषधि छान्नुहोस्
                <select
                  value={verificationForm.medicineId}
                  onChange={event =>
                    updateVerificationForm('medicineId', event.target.value)
                  }
                  required
                >
                  <option value="">औषधि छान्नुहोस्</option>
                  {items.map(medicine => (
                    <option key={medicine.id} value={medicine.id}>
                      {medicine.name} — {medicine.nepali}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Verification Status
                <select
                  value={verificationForm.status}
                  onChange={event => {
                    updateVerificationForm('status', event.target.value);
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                </select>
              </label>

              <label>
                Review Notes
                <textarea
                  value={verificationForm.notes}
                  onChange={event =>
                    updateVerificationForm('notes', event.target.value)
                  }
                />
              </label>

              <button
                className="primary"
                type="submit"
                disabled={savingVerification}
              >
                {savingVerification
                  ? 'Update हुँदैछ...'
                  : 'Update Verification'}
              </button>
            </form>

            {notice && (
              <p className={`notice ${noticeType}`}>
                {notice}
              </p>
            )}
          </section>
          </AdminConsole>
        )}

        {tab === 'about' ? (
          <section className="about panel">
            <h2>हाम्रो बारेमा</h2>
            <p>
              WYRMORA MEDICAL औषधिसम्बन्धी सामान्य जानकारी
              नेपाली भाषामा उपलब्ध गराउने उद्देश्यले बनाइएको
              शैक्षिक प्लेटफर्म हो।
            </p>
            <p>
              हाम्रो उद्देश्य औषधिको उपयोग, सावधानी, सम्भावित
              असर र मूल्यसम्बन्धी जानकारी बुझ्न सजिलो बनाउनु हो।
            </p>
          </section>
        ) : (
          <>
            <section className="panel">
              <div className="section-head">
                <div>
                  <span className="eyebrow">MEDICINE DIRECTORY</span>
                  <h2>औषधि सूची</h2>
                </div>
                <span className="count">
                  {filtered.length} औषधि
                </span>
              </div>

              <div className="search-wrap">
                <span>⌕</span>
                <input
                  className="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="औषधिको नाम खोज्नुहोस्..."
                />
                <kbd>SEARCH</kbd>
              </div>

              <div className="chips">
                {categories.map(itemCategory => (
                  <button
                    key={itemCategory}
                    className={
                      category === itemCategory ? 'chosen' : ''
                    }
                    onClick={() => setCategory(itemCategory)}
                  >
                    {itemCategory}
                  </button>
                ))}
              </div>
            </section>

            {loading && <p>औषधिको विवरण लोड हुँदैछ...</p>}

            {!loading && loadError && (
              <div className="empty" role="alert">
                <h3>औषधि सूची उपलब्ध छैन</h3>
                <p>{loadError}</p>
                <button className="primary" type="button" onClick={() => {
                  setLoading(true);
                  setReloadKey(value => value + 1);
                }}>
                  पुनः प्रयास गर्नुहोस्
                </button>
              </div>
            )}

            <section className="medicine-grid">
              {filtered.map(medicine => (
                <article
                  className="medicine-card"
                  key={medicine.id}
                  onClick={() => setSelected(medicine)}
                >
                  <div className="med-top">
                    <div className="med-icon">✚</div>

                    <div>
                      {verificationBadge(medicine.verificationStatus)}

                      <span
                        className={
                          medicine.priceVerified
                            ? 'verified'
                            : 'unverified'
                        }
                      >
                        {medicine.priceVerified
                          ? '✓ मूल्य स्रोत पुष्टि'
                          : 'मूल्य/जानकारी पुष्टि बाँकी'}
                      </span>
                    </div>
                  </div>

                  <div className="med-category">
                    {medicine.category}
                  </div>

                  <h3>{medicine.name}</h3>
                  <div className="nepali">{medicine.nepali}</div>
                  <p>{medicine.use}</p>

                  <div className="med-bottom">
                    <div>
                      <small>मूल्य</small>
                      <b>{money(medicine.price)}</b>
                    </div>

                    <button
                      onClick={event => {
                        event.stopPropagation();
                        setSelected(medicine);
                      }}
                    >
                      विवरण हेर्नुहोस् ↗
                    </button>
                  </div>
                </article>
              ))}
            </section>

            {!loading && !loadError && filtered.length === 0 && (
              <div className="empty">
                <h3>औषधि भेटिएन</h3>
                <p>अर्को नाम वा Category प्रयोग गरेर खोज्नुहोस्।</p>
              </div>
            )}
          </>
        )}

        <section className="warning">
          <h3>महत्त्वपूर्ण स्वास्थ्य सूचना</h3>
          <p>
            WYRMORA MEDICAL मा दिइएको औषधिसम्बन्धी जानकारी
            शैक्षिक प्रयोजनका लागि मात्र हो। यो चिकित्सकीय
            सल्लाह, निदान वा उपचारको विकल्प होइन। कुनै पनि
            औषधि प्रयोग गर्नुअघि योग्य चिकित्सक वा फार्मासिस्टसँग
            परामर्श गर्नुहोस्। सूचीमा “समीक्षा बाँकी” वा “समीक्षामा”
            देखिएका विवरणहरू Pharmacist बाट clinically verified भएका छैनन्।
          </p>
        </section>
      </main>

      <footer>
        <strong>WYRMORA MEDICAL</strong>
        <p>Medicine information for everyone.</p>
        <small>© {new Date().getFullYear()} WYRMORA. All rights reserved.</small>
      </footer>

      {selected && (
        <div
          className="overlay"
          onClick={() => setSelected(null)}
        >
          <section
            className="detail"
            onClick={event => event.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => setSelected(null)}
            >
              ×
            </button>

            <span className="eyebrow">MEDICINE DETAILS</span>

            <h2 className="detail-title">
              {selected.name}
            </h2>

            <div className="nepali">{selected.nepali}</div>

            {verificationBadge(selected.verificationStatus)}

            <div className="price-panel">
              <small>मूल्य</small>
              <h2>{money(selected.price)}</h2>
              <p>{selected.priceNote || 'मूल्य पुष्टि हुँदैछ।'}</p>
            </div>

            {[
              ['Category', selected.category],
              ['Dosage forms', selected.forms],
              ['के कामका लागि प्रयोग हुन्छ', selected.use],
              ['कुन अवस्थामा प्रयोग गरिन्छ', selected.symptoms],
              ['सम्भावित Side Effects', selected.side],
              ['महत्त्वपूर्ण सावधानी', selected.caution],
              ['Prescription स्थिति', selected.prescription],
              ['जानकारीको स्रोत', selected.source]
            ].map(([heading, value]) => (
              <div className="detail-row" key={heading}>
                <h3>{heading}</h3>
                <p>{value || 'जानकारी थपिँदैछ।'}</p>
              </div>
            ))}

            <div className="warning">
              यो जानकारी व्यक्तिगत उपचार योजना होइन।
              औषधिको मात्रा वा समय आफैं निर्धारण नगर्नुहोस्।
              योग्य चिकित्सक वा फार्मासिस्टको सल्लाह पालना गर्नुहोस्।
            </div>

            <MedicineReportForm medicineId={selected.id} medicineName={selected.name} />
          </section>
        </div>
      )}
    </div>
  );
}
