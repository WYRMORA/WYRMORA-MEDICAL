
import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

const API = '/api/medicines';

const starter = [
  {
    id: 'amoxicillin',
    name: 'Amoxicillin',
    nepali: 'एमोक्सिसिलिन',
    category: 'एन्टिबायोटिक',
    forms: 'क्याप्सुल, ट्याब्लेट, सस्पेन्सन',
    use: 'केही ब्याक्टेरियाबाट हुने संक्रमणको उपचारमा चिकित्सकले प्रयोग गराउने एन्टिबायोटिक हो।',
    symptoms: 'संक्रमणको प्रकारअनुसार चिकित्सकले प्रयोगको निर्णय गर्छन्।',
    caution: 'Penicillin allergy भए स्वास्थ्यकर्मीलाई जानकारी दिनुहोस्। चिकित्सकको सल्लाहबिना प्रयोग नगर्नुहोस्।',
    side: 'पखाला, वाकवाकी, छालामा डाबर वा एलर्जी हुन सक्छ।',
    prescription: 'प्रिस्क्रिप्सन आवश्यक',
    price: null,
    priceNote: 'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source: 'सामान्य औषधि जानकारी; उत्पादनअनुसार पुष्टि गर्नुपर्ने।',
    priceVerified: false,
    verificationStatus: 'pending'
  },
  {
    id: 'azithromycin',
    name: 'Azithromycin',
    nepali: 'एजिथ्रोमाइसिन',
    category: 'एन्टिबायोटिक',
    forms: 'ट्याब्लेट, सस्पेन्सन',
    use: 'संवेदनशील ब्याक्टेरियाबाट हुने केही संक्रमणमा चिकित्सकले प्रयोग गराउने एन्टिबायोटिक हो।',
    symptoms: 'संक्रमणको प्रकारअनुसार चिकित्सकले प्रयोगको निर्णय गर्छन्।',
    caution: 'चिकित्सकको सल्लाहबिना प्रयोग नगर्नुहोस्।',
    side: 'पखाला, वाकवाकी, पेट दुख्ने वा एलर्जी हुन सक्छ।',
    prescription: 'प्रिस्क्रिप्सन आवश्यक',
    price: null,
    priceNote: 'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source: 'सामान्य औषधि जानकारी; उत्पादनअनुसार पुष्टि गर्नुपर्ने।',
    priceVerified: false,
    verificationStatus: 'pending'
  },
  {
    id: 'cetirizine',
    name: 'Cetirizine',
    nepali: 'सेटिरिजिन',
    category: 'एलर्जी',
    forms: 'ट्याब्लेट, सिरप',
    use: 'एलर्जीका लक्षण कम गर्न प्रयोग हुने antihistamine औषधि हो।',
    symptoms: 'छिँक आउने, नाक वा आँखा चिलाउने र छालामा चिलाउने डाबर।',
    caution: 'निद्रा लाग्न सक्छ। गाडी चलाउँदा सावधानी अपनाउनुहोस्।',
    side: 'निद्रा लाग्ने, मुख सुक्ने वा थकान हुन सक्छ।',
    prescription: 'उत्पादनअनुसार पुष्टि गर्नुहोस्।',
    price: null,
    priceNote: 'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source: 'सामान्य औषधि जानकारी; उत्पादनअनुसार पुष्टि गर्नुपर्ने।',
    priceVerified: false,
    verificationStatus: 'pending'
  },
  {
    id: 'ibuprofen',
    name: 'Ibuprofen',
    nepali: 'आइबुप्रोफेन',
    category: 'दुखाइ तथा सुन्निने समस्या',
    forms: 'ट्याब्लेट, सस्पेन्सन',
    use: 'दुखाइ, ज्वरो र सूजन कम गर्न प्रयोग हुने NSAID औषधि हो।',
    symptoms: 'मांसपेशी वा जोर्नी दुखाइ र महिनावारी दुखाइ।',
    caution: 'पेटको अल्सर, रक्तस्राव, मिर्गौला वा मुटुको समस्या भए स्वास्थ्यकर्मीसँग सल्लाह लिनुहोस्।',
    side: 'पेट दुख्ने, अपच, वाकवाकी वा गम्भीर अवस्थामा रक्तस्राव हुन सक्छ।',
    prescription: 'उत्पादन र शक्तिअनुसार फरक पर्न सक्छ।',
    price: null,
    priceNote: 'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source: 'सामान्य औषधि जानकारी; उत्पादनअनुसार पुष्टि गर्नुपर्ने।',
    priceVerified: false,
    verificationStatus: 'pending'
  },
  {
    id: 'metformin',
    name: 'Metformin',
    nepali: 'मेटफर्मिन',
    category: 'मधुमेह',
    forms: 'ट्याब्लेट',
    use: 'टाइप २ मधुमेहमा रगतमा चिनीको मात्रा नियन्त्रण गर्न प्रयोग गरिने औषधि हो।',
    symptoms: 'टाइप २ मधुमेहमा चिकित्सकले आवश्यक ठानेमा प्रयोग गरिन्छ।',
    caution: 'मिर्गौलाको समस्या भए चिकित्सकलाई जानकारी दिनुहोस्। आफैं औषधि सुरु वा बन्द नगर्नुहोस्।',
    side: 'पखाला, वाकवाकी वा पेट असहज हुन सक्छ।',
    prescription: 'चिकित्सकको सल्लाह आवश्यक।',
    price: null,
    priceNote: 'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source: 'सामान्य औषधि जानकारी; चिकित्सकको सल्लाह आवश्यक।',
    priceVerified: false,
    verificationStatus: 'pending'
  },
  {
    id: 'omeprazole',
    name: 'Omeprazole',
    nepali: 'ओमेप्राजोल',
    category: 'पेटको अम्ल',
    forms: 'क्याप्सुल, ट्याब्लेट',
    use: 'पेटमा बन्ने अम्ल घटाउने proton pump inhibitor औषधि हो।',
    symptoms: 'अम्लपित्त, GERD तथा केही प्रकारका अल्सरमा चिकित्सकले सिफारिस गर्न सक्छन्।',
    caution: 'लामो समय आफैं प्रयोग नगर्नुहोस्। रगत बान्ता वा कालो दिसा भए तुरुन्त जाँच गराउनुहोस्।',
    side: 'टाउको दुख्ने, पेट दुख्ने, वाकवाकी वा पखाला हुन सक्छ।',
    prescription: 'स्वास्थ्यकर्मीसँग पुष्टि गर्नुहोस्।',
    price: null,
    priceNote: 'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source: 'सामान्य औषधि जानकारी; उत्पादनअनुसार पुष्टि गर्नुपर्ने।',
    priceVerified: false,
    verificationStatus: 'pending'
  },
  {
    id: 'ors',
    name: 'Oral Rehydration Salts (ORS)',
    nepali: 'जीवनजल (ओआरएस)',
    category: 'पानी तथा लवणको कमी',
    forms: 'पाउडर स्याचेट',
    use: 'पखाला वा बान्ताका कारण शरीरबाट गएको पानी र लवण पूर्ति गर्न मद्दत गर्छ।',
    symptoms: 'पखाला वा बान्तापछि हुने निर्जलीकरण रोकथाम तथा उपचारमा सहयोग।',
    caution: 'स्याचेटमा लेखिएको पानीको ठ्याक्कै मात्रामा घोल्नुहोस्। गम्भीर निर्जलीकरण भए तुरुन्त स्वास्थ्य संस्था जानुहोस्।',
    side: 'सही अनुपातमा तयार गर्दा सामान्यतया सुरक्षित हुन्छ।',
    prescription: 'सामान्यतया prescription नचाहिने; प्याकेटको निर्देशन पालना गर्नुहोस्।',
    price: null,
    priceNote: 'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source: 'सामान्य स्वास्थ्य जानकारी; प्याकेटको निर्देशन प्राथमिक।',
    priceVerified: false,
    verificationStatus: 'pending'
  },
  {
    id: 'paracetamol',
    name: 'Paracetamol',
    nepali: 'प्यारासिटामोल',
    category: 'दुखाइ तथा ज्वरो',
    forms: 'ट्याब्लेट, सिरप, ड्रप',
    use: 'ज्वरो घटाउन र हल्का देखि मध्यम दुखाइ कम गर्न प्रयोग गरिन्छ।',
    symptoms: 'टाउको दुखाइ, दाँत दुखाइ, शरीर दुखाइ र ज्वरो।',
    caution: 'कलेजोसम्बन्धी समस्या वा अन्य paracetamol भएको औषधि प्रयोग गरिरहनुभएको छ भने स्वास्थ्यकर्मीसँग सल्लाह लिनुहोस्।',
    side: 'एलर्जी वा दुर्लभ अवस्थामा कलेजोमा गम्भीर असर हुन सक्छ।',
    prescription: 'उत्पादन र formulation अनुसार फरक पर्न सक्छ।',
    price: null,
    priceNote: 'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source: 'सामान्य औषधि जानकारी; उत्पादनअनुसार पुष्टि गर्नुपर्ने।',
    priceVerified: false,
    verificationStatus: 'pending'
  }
];

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
  pharmacistName: '',
  registration: '',
  notes: '',
  reviewConfirmed: false
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
    verified: ['✓ Verified', 'verified'],
    under_review: ['◷ Under Review', 'unverified'],
    pending: ['○ Pending', 'unverified']
  };

  const [label, className] = badges[status] || badges.pending;

  return <span className={className}>{label}</span>;
}

export default function App() {
  const [items, setItems] = useState(starter);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('सबै');
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('home');

  const [showAdmin, setShowAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('info');

  const [editingId, setEditingId] = useState(null);
  const [savingMedicine, setSavingMedicine] = useState(false);
  const [savingVerification, setSavingVerification] = useState(false);
  const [loading, setLoading] = useState(true);

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
        }
      } catch (error) {
        console.error('Medicine API:', error);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMedicines();

    return () => {
      active = false;
    };
  }, []);

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

    if (!adminKey.trim()) {
      showMessage('Admin API key राख्नुहोस्।', 'error');
      return;
    }

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
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.trim()
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

    if (!adminKey.trim()) {
      showMessage('Admin API key राख्नुहोस्।', 'error');
      return;
    }

    if (!verificationForm.medicineId) {
      showMessage('औषधि छान्नुहोस्।', 'error');
      return;
    }

    if (
      verificationForm.status === 'verified' &&
      (
        !verificationForm.pharmacistName.trim() ||
        !verificationForm.registration.trim() ||
        !verificationForm.reviewConfirmed
      )
    ) {
      showMessage(
        'Verified गर्न वास्तविक Pharmacist को नाम, दर्ता नम्बर र समीक्षा पुष्टि आवश्यक छ।',
        'error'
      );
      return;
    }

    setSavingVerification(true);

    try {
      const response = await fetch(
        `${API}/${encodeURIComponent(verificationForm.medicineId)}/verification`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey.trim()
          },
          body: JSON.stringify({
            status: verificationForm.status,
            pharmacistName: verificationForm.pharmacistName,
            registration: verificationForm.registration,
            notes: verificationForm.notes,
            reviewConfirmed: verificationForm.reviewConfirmed
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
          <div className="logo">W</div>
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
              औषधिबारे सही जानकारी,
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
              <span>✓ जानकारीमूलक</span>
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

        {showAdmin && (
          <section className="admin panel">
            <div className="section-head">
              <div>
                <span className="admin-tag">ADMIN PANEL</span>
                <h2>Medicine Management</h2>
              </div>
            </div>

            <p>
              Admin API key राखेर नयाँ औषधि थप्नुहोस्, पुरानो
              विवरण Update गर्नुहोस् वा Pharmacist Verification गर्नुहोस्।
            </p>

            <label>
              Admin API Key
              <input
                type="password"
                value={adminKey}
                onChange={event => setAdminKey(event.target.value)}
                placeholder="Enter admin API key"
                autoComplete="off"
              />
            </label>

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
              Verified स्थिति वास्तविक योग्य Pharmacist ले समीक्षा
              गरेपछि मात्र चयन गर्नुहोस्।
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
                    updateVerificationForm('reviewConfirmed', false);
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="verified">Verified</option>
                </select>
              </label>

              {verificationForm.status === 'verified' && (
                <>
                  <label>
                    Pharmacist Name
                    <input
                      value={verificationForm.pharmacistName}
                      onChange={event =>
                        updateVerificationForm(
                          'pharmacistName',
                          event.target.value
                        )
                      }
                      required
                    />
                  </label>

                  <label>
                    Registration Number
                    <input
                      value={verificationForm.registration}
                      onChange={event =>
                        updateVerificationForm(
                          'registration',
                          event.target.value
                        )
                      }
                      required
                    />
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={verificationForm.reviewConfirmed}
                      onChange={event =>
                        updateVerificationForm(
                          'reviewConfirmed',
                          event.target.checked
                        )
                      }
                      required
                    />
                    मैले Pharmacist को योग्यता जाँच गरी वास्तविक
                    समीक्षा भएको पुष्टि गर्छु।
                  </label>
                </>
              )}

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

            {!loading && filtered.length === 0 && (
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
            परामर्श गर्नुहोस्।
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
          </section>
        </div>
      )}
    </div>
  );
}
