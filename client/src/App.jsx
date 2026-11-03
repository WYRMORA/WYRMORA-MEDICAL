
import React, { useEffect, useMemo, useState } from 'react';

const starter = [
  {
    id: 'paracetamol',
    name: 'Paracetamol',
    nepali: 'प्यारासिटामोल',
    category: 'दुखाइ तथा ज्वरो',
    forms: 'ट्याब्लेट, सिरप, ड्रप',
    use: 'ज्वरो घटाउन र हल्का देखि मध्यम दुखाइ कम गर्न प्रयोग गरिन्छ।',
    symptoms: 'टाउको दुखाइ, दाँत दुखाइ, शरीर दुखाइ र ज्वरो',
    caution: 'कलेजोसम्बन्धी समस्या वा अन्य paracetamol भएको औषधि प्रयोग गरिरहनुभएको छ भने स्वास्थ्यकर्मीसँग सल्लाह लिनुहोस्।',
    side: 'वाकवाकी, एलर्जी वा दुर्लभ अवस्थामा कलेजोमा गम्भीर असर हुन सक्छ।',
    prescription: 'उत्पादन र formulation अनुसार फरक पर्न सक्छ।',
    price: null,
    priceNote: 'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source: 'सामान्य औषधि जानकारी; उत्पादनअनुसार पुष्टि गर्नुपर्ने।',
    priceVerified: false
  },
  {
    id: 'azithromycin',
    name: 'Azithromycin',
    nepali: 'एजिथ्रोमाइसिन',
    category: 'एन्टिबायोटिक',
    forms: 'ट्याब्लेट, सस्पेन्सन',
    use: 'संवेदनशील ब्याक्टेरियाबाट हुने केही संक्रमणमा चिकित्सकले प्रयोग गराउने macrolide समूहको एन्टिबायोटिक हो।',
    symptoms: 'संक्रमणको प्रकारअनुसार चिकित्सकले प्रयोगको निर्णय गर्छन्।',
    caution: 'चिकित्सकको सल्लाहबिना प्रयोग नगर्नुहोस्। एन्टिबायोटिकको पूरा उपचार योजना पालना गर्नुहोस्।',
    side: 'पखाला, वाकवाकी, पेट दुख्ने वा एलर्जी हुन सक्छ।',
    prescription: 'प्रिस्क्रिप्सन आवश्यक।',
    price: null,
    priceNote: 'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source: 'सामान्य औषधि जानकारी; उत्पादनअनुसार पुष्टि गर्नुपर्ने।',
    priceVerified: false
  },
  {
    id: 'amoxicillin',
    name: 'Amoxicillin',
    nepali: 'एमोक्सिसिलिन',
    category: 'एन्टिबायोटिक',
    forms: 'क्याप्सुल, ट्याब्लेट, सस्पेन्सन',
    use: 'केही ब्याक्टेरियाबाट हुने संक्रमणको उपचारमा चिकित्सकले प्रयोग गराउने penicillin समूहको एन्टिबायोटिक हो।',
    symptoms: 'कान, छाती, घाँटी वा अन्य ब्याक्टेरियल संक्रमण।',
    caution: 'भाइरसका कारण हुने रुघाखोकी वा फ्लुमा काम गर्दैन। Penicillin allergy भए स्वास्थ्यकर्मीलाई जानकारी दिनुहोस्।',
    side: 'पखाला, वाकवाकी, छालामा डाबर; गम्भीर एलर्जी भए तुरुन्त उपचार लिनुहोस्।',
    prescription: 'प्रिस्क्रिप्सन आवश्यक।',
    price: null,
    priceNote: 'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source: 'सामान्य औषधि जानकारी; एन्टिबायोटिकको प्रयोग चिकित्सकको निर्णयमा।',
    priceVerified: false
  },
  {
    id: 'cetirizine',
    name: 'Cetirizine',
    nepali: 'सेटिरिजिन',
    category: 'एलर्जी',
    forms: 'ट्याब्लेट, सिरप',
    use: 'एलर्जीका लक्षण कम गर्न प्रयोग हुने antihistamine औषधि हो।',
    symptoms: 'छिँक आउने, नाक वा आँखा चिलाउने, पानी बग्ने र छालामा चिलाउने डाबर।',
    caution: 'निद्रा लाग्न सक्छ। गाडी चलाउँदा सावधानी अपनाउनुहोस्। गर्भावस्था, स्तनपान वा मिर्गौलाको समस्या भए सल्लाह लिनुहोस्।',
    side: 'निद्रा लाग्ने, मुख सुक्ने, थकान वा टाउको दुख्ने।',
    prescription: 'स्थानीय उत्पादनको लेबल वा फार्मासिस्टबाट पुष्टि गर्नुहोस्।',
    price: null,
    priceNote: 'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source: 'सामान्य औषधि जानकारी; उत्पादनअनुसार पुष्टि गर्नुपर्ने।',
    priceVerified: false
  },
  {
    id: 'ibuprofen',
    name: 'Ibuprofen',
    nepali: 'आइबुप्रोफेन',
    category: 'दुखाइ तथा सुन्निने समस्या',
    forms: 'ट्याब्लेट, सस्पेन्सन',
    use: 'दुखाइ, ज्वरो र सूजन कम गर्न प्रयोग हुने NSAID औषधि हो।',
    symptoms: 'मांसपेशी वा जोर्नी दुखाइ, महिनावारी दुखाइ र केही प्रकारका सूजन।',
    caution: 'पेटको अल्सर, रक्तस्राव, मिर्गौला वा मुटुको समस्या तथा गर्भावस्थामा जोखिम हुन सक्छ। स्वास्थ्यकर्मीसँग सल्लाह लिनुहोस्।',
    side: 'पेट दुख्ने, अपच, वाकवाकी; गम्भीर अवस्थामा पेटबाट रक्तस्राव वा मिर्गौलामा असर।',
    prescription: 'उत्पादन र शक्तिअनुसार फरक पर्न सक्छ।',
    price: null,
    priceNote: 'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source: 'सामान्य औषधि जानकारी; उत्पादनअनुसार पुष्टि गर्नुपर्ने।',
    priceVerified: false
  },
  {
    id: 'metformin',
    name: 'Metformin',
    nepali: 'मेटफर्मिन',
    category: 'मधुमेह तथा हर्मोनसम्बन्धी समस्या',
    forms: 'ट्याब्लेट',
    use: 'टाइप २ मधुमेहमा रगतमा चिनीको मात्रा नियन्त्रण गर्न प्रयोग गरिने औषधि हो।',
    symptoms: 'टाइप २ मधुमेहमा चिकित्सकले आवश्यक ठानेमा प्रयोग गरिन्छ।',
    caution: 'मिर्गौलाको समस्या वा गम्भीर बिरामी अवस्था भए चिकित्सकलाई जानकारी दिनुहोस्। आफैं औषधि सुरु वा बन्द नगर्नुहोस्।',
    side: 'पखाला, वाकवाकी, पेट असहज हुने; दुर्लभ रूपमा गम्भीर समस्या हुन सक्छ।',
    prescription: 'चिकित्सकको सल्लाह आवश्यक।',
    price: null,
    priceNote: 'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source: 'सामान्य औषधि जानकारी; चिकित्सकको सल्लाह आवश्यक।',
    priceVerified: false
  },
  {
    id: 'omeprazole',
    name: 'Omeprazole',
    nepali: 'ओमेप्राजोल',
    category: 'पेटको अम्ल',
    forms: 'क्याप्सुल, ट्याब्लेट',
    use: 'पेटमा बन्ने अम्ल घटाउने proton pump inhibitor औषधि हो।',
    symptoms: 'अम्लपित्त, GERD तथा पेट वा आन्द्राका केही अल्सरमा चिकित्सकले सिफारिस गर्न सक्छन्।',
    caution: 'लामो समय आफैं प्रयोग नगर्नुहोस्। रगत बान्ता, कालो दिसा वा निल्न गाह्रो भए जाँच गराउनुहोस्।',
    side: 'टाउको दुख्ने, पेट दुख्ने, वाकवाकी, पखाला वा कब्जियत।',
    prescription: 'निदान र उत्पादनअनुसार स्वास्थ्यकर्मीको सल्लाह आवश्यक हुन सक्छ।',
    price: null,
    priceNote: 'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source: 'सामान्य औषधि जानकारी; उत्पादनअनुसार पुष्टि गर्नुपर्ने।',
    priceVerified: false
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
    priceVerified: false
  }
];

const emptyForm = {
  name: '',
  nepali: '',
  category: '',
  use: '',
  symptoms: '',
  caution: '',
  side: '',
  forms: '',
  price: '',
  priceNote: '',
  prescription: '',
  source: ''
};

const money = value => {
  if (value === null || value === undefined || value === '') {
    return 'मूल्य पुष्टि हुँदैछ';
  }
  return `रु. ${Number(value).toLocaleString('en-IN')}`;
};

const verificationBadge = status => {
  const badges = {
    verified: {
      label: '✓ Verified',
      background: '#dcfce7',
      color: '#166534',
      border: '#86efac'
    },
    under_review: {
      label: '◷ Under Review',
      background: '#fef3c7',
      color: '#92400e',
      border: '#fcd34d'
    },
    pending: {
      label: '○ Pending',
      background: '#f1f5f9',
      color: '#475569',
      border: '#cbd5e1'
    }
  };

  const badge = badges[status] || badges.pending;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 10px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 700,
        background: badge.background,
        color: badge.color,
        border: `1px solid ${badge.border}`
      }}
    >
      {badge.label}
    </span>
  );
};

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request असफल भयो (${response.status})`);
  }

  return data;
}

function App() {
  const [items, setItems] = useState(starter);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('सबै');
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('home');

  const [showAdmin, setShowAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [savingMedicine, setSavingMedicine] = useState(false);
  const [savingVerification, setSavingVerification] = useState(false);

  const [form, setForm] = useState({ ...emptyForm });

  const [verificationForm, setVerificationForm] = useState({
    medicineId: '',
    status: 'pending',
    pharmacistName: '',
    registration: '',
    notes: '',
    reviewConfirmed: false
  });

  useEffect(() => {
    let active = true;

    fetch('/api/medicines')
      .then(readResponse)
      .then(data => {
        if (active && Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items);
        }
      })
      .catch(error => {
        console.error('Medicine API:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => ['सबै', ...new Set(items.map(item => item.category).filter(Boolean))],
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

      const matchesSearch = searchable.includes(search);
      const matchesCategory =
        category === 'सबै' || item.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [items, query, category]);

  function resetMedicineForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function editMedicine(medicineId) {
    const medicine = items.find(item => item.id === medicineId);

    if (!medicine) {
      setNotice('चयन गरिएको औषधि भेटिएन।');
      resetMedicineForm();
      return;
    }

    setEditingId(medicine.id);

    setForm({
      name: medicine.name || '',
      nepali: medicine.nepali || '',
      category: medicine.category || '',
      use: medicine.use || '',
      symptoms: medicine.symptoms || '',
      caution: medicine.caution || '',
      side: medicine.side || '',
      forms: medicine.forms || '',
      price: medicine.price ?? '',
      priceNote: medicine.priceNote || '',
      prescription: medicine.prescription || '',
      source: medicine.source || ''
    });

    setNotice(`${medicine.name} Edit गर्न चयन भयो।`);
  }

  async function saveMedicine(event) {
    event.preventDefault();
    setNotice('');

    if (!adminKey.trim()) {
      setNotice('Admin API key राख्नुहोस्।');
      return;
    }

    if (!form.name.trim() || !form.nepali.trim() || !form.category.trim()) {
      setNotice('औषधिको नाम, नेपाली नाम र Category अनिवार्य छन्।');
      return;
    }

    if (form.price !== '' && (!Number.isFinite(Number(form.price)) || Number(form.price) < 0)) {
      setNotice('मूल्य शून्य वा सोभन्दा बढी हुनुपर्छ।');
      return;
    }

    setSavingMedicine(true);

    try {
      const wasEditing = Boolean(editingId);

      const payload = {
        ...form,
        ...(editingId ? { id: editingId } : {}),
        price: form.price === '' ? null : Number(form.price)
      };

      const response = await fetch('/api/medicines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify(payload)
      });

      const data = await readResponse(response);

      if (!data.item) {
        throw new Error('Server बाट औषधिको विवरण प्राप्त भएन।');
      }

      setItems(oldItems => [
        data.item,
        ...oldItems.filter(item => item.id !== data.item.id)
      ]);

      if (selected?.id === data.item.id) {
        setSelected(data.item);
      }

      resetMedicineForm();

      setNotice(
        wasEditing
          ? 'औषधिको विवरण सफलतापूर्वक Update भयो।'
          : 'नयाँ औषधि सफलतापूर्वक थपियो।'
      );
    } catch (error) {
      setNotice(`${error.message} कृपया API key र Backend जाँच गर्नुहोस्।`);
    } finally {
      setSavingMedicine(false);
    }
  }

  async function saveVerification(event) {
    event.preventDefault();
    setNotice('');

    if (!adminKey.trim()) {
      setNotice('Admin API key राख्नुहोस्।');
      return;
    }

    if (!verificationForm.medicineId) {
      setNotice('औषधि छान्नुहोस्।');
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
      setNotice('Verified गर्न वास्तविक Pharmacist को नाम, दर्ता नम्बर र समीक्षा पुष्टि आवश्यक छ।');
      return;
    }

    setSavingVerification(true);

    try {
      const response = await fetch(
        `/api/medicines/${encodeURIComponent(verificationForm.medicineId)}/verification`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey
          },
          body: JSON.stringify({
            status: verificationForm.status,
            notes: verificationForm.notes,
            ...(verificationForm.status === 'verified'
              ? {
                  pharmacistName: verificationForm.pharmacistName,
                  registration: verificationForm.registration,
                  reviewConfirmed: verificationForm.reviewConfirmed
                }
              : {})
          })
        }
      );

      const data = await readResponse(response);

      if (!data.item) {
        throw new Error('Server बाट Verification विवरण प्राप्त भएन।');
      }

      setItems(oldItems =>
        oldItems.map(item =>
          item.id === data.item.id ? data.item : item
        )
      );

      if (selected?.id === data.item.id) {
        setSelected(data.item);
      }

      setNotice('Verification status सफलतापूर्वक Update भयो।');

      setVerificationForm({
        medicineId: '',
        status: 'pending',
        pharmacistName: '',
        registration: '',
        notes: '',
        reviewConfirmed: false
      });
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSavingVerification(false);
    }
  }

  function updateForm(field, value) {
    setForm(oldForm => ({
      ...oldForm,
      [field]: value
    }));
  }

  function updateVerificationForm(field, value) {
    setVerificationForm(oldForm => ({
      ...oldForm,
      [field]: value
    }));
  }

  return (
    <div className="app">
      <header className="top">
        <div
          className="brand"
          onClick={() => {
            setTab('home');
            setSelected(null);
          }}
        >
          <div className="logo">W<span>+</span></div>
          <div>
            <b>WYRMORA <em>MEDICAL</em></b>
            <small>औषधि बुझौँ, स्वास्थ्य सचेत बनौँ</small>
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

          <button onClick={() => setShowAdmin(value => !value)}>
            Admin
          </button>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">NEPAL'S MEDICINE INFORMATION GUIDE</span>
            <h1>
              औषधिबारे सही जानकारी,
              <br />
              <i>नेपाली भाषामा।</i>
            </h1>
            <p>
              कुन औषधि केका लागि प्रयोग हुन्छ, के सावधानी अपनाउने र
              मूल्य कहाँ पुष्टि गर्ने—एकै ठाउँमा बुझ्नुहोस्।
            </p>
            <div className="trust">
              <span>✓ सरल नेपाली</span>
              <span>✓ सावधानीसहित</span>
              <span>✓ मूल्य पारदर्शिता</span>
            </div>
          </div>

          <div className="hero-art">
            <div className="cross">✚</div>
            <div className="pill pill-a"></div>
            <div className="pill pill-b"></div>
            <div className="art-card">
              <b>Medicine guide</b>
              <strong>स्वास्थ्य जानकारी</strong>
              <small>
                पहिले बुझ्नुहोस्, त्यसपछि स्वास्थ्यकर्मीसँग सल्लाह लिनुहोस्।
              </small>
            </div>
          </div>
        </section>

        {tab === 'about' ? (
          <section className="about panel">
            <h2>WYRMORA MEDICAL बारेमा</h2>
            <p>
              WYRMORA MEDICAL औषधिको सामान्य जानकारी नेपाली भाषामा
              बुझ्न सहयोग गर्ने सूचना प्लेटफर्म हो। यसले चिकित्सकको
              जाँच, निदान वा प्रिस्क्रिप्सनको स्थान लिँदैन।
            </p>

            <h3>हाम्रो प्रतिबद्धता</h3>
            <ul>
              <li>औषधिको उपयोग, सावधानी र सम्भावित असर स्पष्ट भाषामा प्रस्तुत गर्ने।</li>
              <li>मूल्य स्रोत र अद्यावधिक मिति बिना मूल्यलाई प्रमाणित भनेर नदेखाउने।</li>
              <li>प्रिस्क्रिप्सन औषधि अनधिकृत रूपमा बिक्री नगर्ने।</li>
            </ul>

            <p className="warning">
              आपतकालीन लक्षण, सास फेर्न गाह्रो, बेहोस हुने, छाती दुख्ने
              वा गम्भीर एलर्जी भए तुरुन्त नजिकको स्वास्थ्य संस्था जानुहोस्।
            </p>
          </section>
        ) : (
          <>
            <section className="search-wrap">
              <div className="search">
                <span>⌕</span>
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="औषधिको नाम खोज्नुहोस् — जस्तै Paracetamol, ज्वरो, एलर्जी..."
                />
                <kbd>SEARCH</kbd>
              </div>

              <div className="chips">
                {categories.map(itemCategory => (
                  <button
                    key={itemCategory}
                    className={category === itemCategory ? 'chosen' : ''}
                    onClick={() => setCategory(itemCategory)}
                  >
                    {itemCategory}
                  </button>
                ))}
              </div>
            </section>

            <section className="section-head">
              <div>
                <span className="eyebrow">MEDICINE DIRECTORY</span>
                <h2>औषधिको जानकारी</h2>
              </div>
              <span className="count">{filtered.length} औषधि</span>
            </section>

            <section className="medicine-grid">
              {filtered.map(medicine => (
                <article
                  className="medicine-card"
                  key={medicine.id}
                  onClick={() => setSelected(medicine)}
                >
                  <div className="med-top">
                    <div className="med-icon">
                      {medicine.category === 'एन्टिबायोटिक'
                        ? 'Rx'
                        : medicine.category === 'एलर्जी'
                          ? '✿'
                          : '✚'}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '7px'
                      }}
                    >
                      {verificationBadge(medicine.verificationStatus)}
                      <span className={medicine.priceVerified ? 'verified' : 'unverified'}>
                        {medicine.priceVerified
                          ? '✓ मूल्य स्रोत पुष्टि'
                          : 'मूल्य/जानकारी पुष्टि बाँकी'}
                      </span>
                    </div>
                  </div>

                  <div className="med-category">{medicine.category}</div>
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

            {filtered.length === 0 && (
              <div className="empty">
                यो खोजीमा औषधि भेटिएन। अर्को नाम वा category प्रयोग गर्नुहोस्।
              </div>
            )}
          </>
        )}

        {showAdmin && (
          <section className="admin panel">
            <div className="section-head">
              <div>
                <span className="eyebrow">CONTENT MANAGEMENT</span>
                <h2>औषधि व्यवस्थापन</h2>
              </div>
              <span className="admin-tag">ADMIN</span>
            </div>

            <p>
              Admin API key राखेर औषधिको विवरण थप्नुहोस् वा पुरानो
              विवरण Update गर्नुहोस्।
            </p>

            <form onSubmit={saveMedicine}>
              <label>
                Admin API key
                <input
                  type="password"
                  value={adminKey}
                  onChange={event => setAdminKey(event.target.value)}
                  required
                />
              </label>

              <label>
                पहिलेको औषधि Edit गर्नुहोस्
                <select
                  value={editingId || ''}
                  onChange={event => {
                    const medicineId = event.target.value;

                    if (!medicineId) {
                      resetMedicineForm();
                      setNotice('नयाँ औषधि थप्न तयार छ।');
                      return;
                    }

                    editMedicine(medicineId);
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
                  अहिले पुरानो औषधि Edit हुँदैछ। विवरण परिवर्तन गरेर Update गर्नुहोस्।
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
                  ['priceNote', 'मूल्य स्रोत/प्याकेट विवरण'],
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
                        onChange={event => updateForm(field, event.target.value)}
                        required={[
                          'name',
                          'nepali',
                          'category',
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
                        onChange={event => updateForm(field, event.target.value)}
                        required={['name', 'nepali', 'category'].includes(field)}
                      />
                    )}
                  </label>
                ))}
              </div>

              <button className="primary" type="submit" disabled={savingMedicine}>
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
                    setNotice('Edit रद्द गरियो। नयाँ औषधि थप्न सक्नुहुन्छ।');
                  }}
                >
                  Edit Cancel गर्नुहोस्
                </button>
              )}

              {notice && <p className="notice">{notice}</p>}
            </form>

            <hr />

            <h3>Pharmacist Verification</h3>
            <p>
              Verified स्थिति वास्तविक योग्य Pharmacist ले समीक्षा गरेपछि मात्र चयन गर्नुहोस्।
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
                        updateVerificationForm('pharmacistName', event.target.value)
                      }
                      required
                    />
                  </label>

                  <label>
                    Registration Number
                    <input
                      value={verificationForm.registration}
                      onChange={event =>
                        updateVerificationForm('registration', event.target.value)
                      }
                      required
                    />
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={verificationForm.reviewConfirmed}
                      onChange={event =>
                        updateVerificationForm('reviewConfirmed', event.target.checked)
                      }
                      required
                    />
                    मैले Pharmacist को योग्यता जाँच गरी वास्तविक समीक्षा भएको पुष्टि गर्छु।
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

              <button className="primary" type="submit" disabled={savingVerification}>
                {savingVerification ? 'Update हुँदैछ...' : 'Update Verification'}
              </button>

              {notice && <p className="notice">{notice}</p>}
            </form>
          </section>
        )}

        <section className="warning">
          <h3>महत्त्वपूर्ण स्वास्थ्य सूचना</h3>
          <p>
            WYRMORA MEDICAL मा दिइएको औषधिसम्बन्धी जानकारी शैक्षिक
            प्रयोजनका लागि मात्र हो। यो चिकित्सकीय सल्लाह, निदान वा
            उपचारको विकल्प होइन। कुनै पनि औषधि प्रयोग गर्नुअघि योग्य
            चिकित्सक वा फार्मासिस्टसँग परामर्श गर्नुहोस्।
          </p>
        </section>

        <footer>
          <div className="brand">
            <div className="logo">W<span>+</span></div>
            <div>
              <b>WYRMORA <em>MEDICAL</em></b>
              <small>Health knowledge, made understandable.</small>
            </div>
          </div>

          <p>
            यो एप सामान्य जानकारीका लागि हो, चिकित्सकीय सल्लाह होइन।
            कुनै औषधि सुरु, बन्द वा मात्रा परिवर्तन गर्नुअघि योग्य
            स्वास्थ्यकर्मीसँग सल्लाह लिनुहोस्।
          </p>

          <small>
            © {new Date().getFullYear()} WYRMORA Medical. All rights reserved.
          </small>
        </footer>
      </main>

      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <section className="detail" onClick={event => event.stopPropagation()}>
            <button className="close" onClick={() => setSelected(null)}>
              ×
            </button>

            <span className="eyebrow">MEDICINE DETAILS</span>

            <div className="detail-title">
              <div className="med-icon big">✚</div>
              <div>
                <h2>{selected.name}</h2>
                <div className="nepali">{selected.nepali}</div>
                {verificationBadge(selected.verificationStatus)}
              </div>
            </div>

            <div className="price-panel">
              <small>नेपालमा देखाइएको मूल्य</small>
              <strong>{money(selected.price)}</strong>
              <span>
                {selected.priceNote || 'मूल्य उपलब्ध छैन'}
                {selected.priceUpdatedAt
                  ? ` · अपडेट: ${new Date(selected.priceUpdatedAt).toLocaleDateString('ne-NP')}`
                  : ''}
              </span>
            </div>

            {[
              ['के कामका लागि प्रयोग हुन्छ?', selected.use],
              ['कुन अवस्थामा प्रयोग गरिन्छ?', selected.symptoms],
              ['उपलब्ध औषधिको रूप', selected.forms],
              ['सम्भावित side effects', selected.side],
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
              यो जानकारी व्यक्तिगत उपचार योजना होइन। औषधिको मात्रा वा
              समय आफैं निर्धारण नगर्नुहोस्। औषधिको प्याकेट र योग्य
              चिकित्सक वा फार्मासिस्टको सल्लाह पालना गर्नुहोस्।
            </div>

            <button
              className="primary full"
              onClick={() => setSelected(null)}
            >
              बुझें
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
