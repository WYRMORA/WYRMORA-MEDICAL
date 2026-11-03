
import React, { useEffect, useMemo, useState } from 'react';

const starter = [
  {
    id:'paracetamol',
    name:'Paracetamol',
    nepali:'प्यारासिटामोल',
    category:'दुखाइ तथा ज्वरो',
    forms:'ट्याब्लेट, सिरप, ड्रप',
    use:'ज्वरो घटाउन र हल्का देखि मध्यम दुखाइ कम गर्न प्रयोग गरिन्छ।',
    symptoms:'टाउको दुखाइ, दाँत दुखाइ, शरीर दुखाइ र ज्वरो',
    caution:'कलेजोसम्बन्धी समस्या, नियमित मदिरा सेवन वा अन्य paracetamol भएको औषधि प्रयोग गरिरहनुभएको छ भने चिकित्सक/फार्मासिस्टसँग सल्लाह लिनुहोस्। मात्रा आफैं नबढाउनुहोस्।',
    side:'निर्देशनअनुसार प्रयोग गर्दा धेरैलाई समस्या हुँदैन; दुर्लभ रूपमा एलर्जी वा कलेजोमा गम्भीर असर हुन सक्छ।',
    prescription:'उत्पादन र formulation अनुसार फरक पर्न सक्छ',
    price:null,
    priceNote:'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source:'सामान्य औषधि जानकारी; नेपालमा बिक्री हुने ब्रान्ड/प्याकेटअनुसार विवरण पुष्टि गर्नुपर्ने',
    priceVerified:false
  },
  {
    id:'cetirizine',
    name:'Cetirizine',
    nepali:'सेटिरिजिन',
    category:'एलर्जी',
    forms:'ट्याब्लेट, सिरप',
    use:'एलर्जीका लक्षण कम गर्न प्रयोग हुने antihistamine औषधि हो।',
    symptoms:'छिँक आउने, नाक/आँखा चिलाउने, पानी बग्ने र छालामा चिलाउने डाबर',
    caution:'निद्रा लाग्न सक्छ। गाडी चलाउँदा सावधानी अपनाउनुहोस्। गर्भावस्था, स्तनपान, मिर्गौलाको समस्या वा बालबालिकामा प्रयोगअघि स्वास्थ्यकर्मीसँग सल्लाह लिनुहोस्।',
    side:'निद्रा लाग्ने, मुख सुक्ने, थकान वा टाउको दुख्ने',
    prescription:'स्थानीय उत्पादनको लेबल/फार्मासिस्टबाट पुष्टि गर्नुहोस्',
    price:null,
    priceNote:'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source:'सामान्य औषधि जानकारी; उत्पादन-विशेष विवरण पुष्टि गर्नुपर्ने',
    priceVerified:false
  },
  {
    id:'ibuprofen',
    name:'Ibuprofen',
    nepali:'आइबुप्रोफेन',
    category:'दुखाइ तथा सुन्निने समस्या',
    forms:'ट्याब्लेट, सस्पेन्सन',
    use:'दुखाइ, ज्वरो र सूजन कम गर्न प्रयोग हुने NSAID औषधि हो।',
    symptoms:'मांसपेशी/जोर्नी दुखाइ, महिनावारी दुखाइ र केही प्रकारका सूजन',
    caution:'पेटको अल्सर/रक्तस्राव, मिर्गौला वा मुटुको समस्या, गर्भावस्थाको विशेष अवस्था, रगत पातलो बनाउने औषधि प्रयोगमा जोखिम हुन सक्छ। चिकित्सकको सल्लाहबिना नलिनुहोस्।',
    side:'पेट दुख्ने, अपच, वाकवाकी; गम्भीर अवस्थामा पेटबाट रक्तस्राव वा मिर्गौलामा असर',
    prescription:'उत्पादन र शक्तिअनुसार फरक पर्न सक्छ',
    price:null,
    priceNote:'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source:'सामान्य औषधि जानकारी; उत्पादन-विशेष विवरण पुष्टि गर्नुपर्ने',
    priceVerified:false
  },
  {
    id:'ors',
    name:'Oral Rehydration Salts (ORS)',
    nepali:'जीवनजल (ओआरएस)',
    category:'पानी तथा लवणको कमी',
    forms:'पाउडर स्याचेट',
    use:'पखाला वा बान्ताका कारण शरीरबाट गएको पानी र लवण पूर्ति गर्न मद्दत गर्छ।',
    symptoms:'पखाला/बान्तापछि हुने निर्जलीकरण रोकथाम तथा उपचारमा सहयोग',
    caution:'स्याचेटमा लेखिएको पानीको ठ्याक्कै मात्रामा मात्र घोल्नुहोस्। थप चिनी/नुन नमिसाउनुहोस्। गम्भीर निर्जलीकरण, रगत मिसिएको दिसा, अत्यधिक सुस्ती वा पिउन नसक्ने अवस्था भए तुरुन्त स्वास्थ्य संस्था जानुहोस्।',
    side:'सही अनुपातमा तयार गर्दा सामान्यतया सुरक्षित; गलत अनुपातले समस्या बढाउन सक्छ।',
    prescription:'सामान्यतया prescription नचाहिने; प्याकेटको निर्देशन पालना गर्नुहोस्',
    price:null,
    priceNote:'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source:'सामान्य स्वास्थ्य जानकारी; प्याकेटको निर्देशन प्राथमिक',
    priceVerified:false
  },
  {
    id:'omeprazole',
    name:'Omeprazole',
    nepali:'ओमेप्राजोल',
    category:'पेटको अम्ल',
    forms:'क्याप्सुल, ट्याब्लेट',
    use:'पेटमा बन्ने अम्ल घटाउने औषधि (proton pump inhibitor) हो।',
    symptoms:'अम्लपित्त/GERD, पेट वा आन्द्राको केही अल्सरमा चिकित्सकले सिफारिस गर्न सक्छन्।',
    caution:'लामो समय आफैं प्रयोग नगर्नुहोस्। निल्न गाह्रो, रगत बान्ता, कालो दिसा वा अनायास तौल घटेमा तुरुन्त जाँच गराउनुहोस्।',
    side:'टाउको दुख्ने, पेट दुख्ने, वाकवाकी, पखाला वा कब्जियत',
    prescription:'निदान र उत्पादनअनुसार स्वास्थ्यकर्मीको सल्लाह आवश्यक हुन सक्छ',
    price:null,
    priceNote:'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source:'सामान्य औषधि जानकारी; उत्पादन-विशेष विवरण पुष्टि गर्नुपर्ने',
    priceVerified:false
  },
  {
    id:'amoxicillin',
    name:'Amoxicillin',
    nepali:'एमोक्सिसिलिन',
    category:'एन्टिबायोटिक',
    forms:'क्याप्सुल, ट्याब्लेट, सस्पेन्सन',
    use:'केही ब्याक्टेरियाबाट हुने संक्रमणको उपचारमा चिकित्सकले प्रयोग गराउने penicillin समूहको एन्टिबायोटिक हो।',
    symptoms:'कान, छाती, घाँटी वा अन्य ब्याक्टेरियल संक्रमण—संक्रमणको प्रकारअनुसार चिकित्सकले निर्णय गर्छन्।',
    caution:'भाइरसका कारण हुने रुघाखोकी/फ्लुमा काम गर्दैन। बाँकी औषधि आफैं नखानुहोस्, अरूलाई नदिनुहोस्। Penicillin allergy भए प्रयोग नगर्नुहोस् र स्वास्थ्यकर्मीलाई जानकारी दिनुहोस्।',
    side:'पखाला, वाकवाकी, छालामा डाबर; सास फेर्न गाह्रो/अनुहार सुन्निएमा आपतकालीन उपचार लिनुहोस्।',
    prescription:'प्रिस्क्रिप्सन आवश्यक',
    price:null,
    priceNote:'फार्मेसीबाट मूल्य पुष्टि हुन बाँकी',
    source:'सामान्य औषधि जानकारी; एन्टिबायोटिकको प्रयोग चिकित्सकको निर्णयमा',
    priceVerified:false
  }
];

const money = v =>
  v == null
    ? 'मूल्य पुष्टि हुँदैछ'
    : `रु. ${Number(v).toLocaleString('en-IN')}`;

const verificationBadge = status => {
  const badges = {
    verified: {
      label:'✓ Verified',
      background:'#dcfce7',
      color:'#166534',
      border:'#86efac'
    },
    under_review: {
      label:'◷ Under Review',
      background:'#fef3c7',
      color:'#92400e',
      border:'#fcd34d'
    },
    pending: {
      label:'○ Pending',
      background:'#f1f5f9',
      color:'#475569',
      border:'#cbd5e1'
    }
  };

  const badge = badges[status] || badges.pending;

  return (
    <span style={{
      display:'inline-flex',
      alignItems:'center',
      padding:'5px 10px',
      borderRadius:'20px',
      fontSize:'11px',
      fontWeight:700,
      background:badge.background,
      color:badge.color,
      border:`1px solid ${badge.border}`
    }}>
      {badge.label}
    </span>
  );
};

function App() {
  const [items, setItems] = useState(starter);

  const [verificationForm, setVerificationForm] = useState({
    medicineId:'',
    status:'pending',
    pharmacistName:'',
    registration:'',
    notes:'',
    reviewConfirmed:false
  });

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('सबै');
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('home');
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [notice, setNotice] = useState('');

  const [form, setForm] = useState({
    name:'',
    nepali:'',
    category:'',
    use:'',
    symptoms:'',
    caution:'',
    side:'',
    forms:'',
    price:'',
    priceNote:'',
    prescription:'',
    source:''
  });

  useEffect(() => {
    fetch('/api/medicines')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.items?.length) setItems(d.items);
      })
      .catch(() => {});
  }, []);

  const categories = [
    'सबै',
    ...new Set(items.map(x => x.category).filter(Boolean))
  ];

  const filtered = useMemo(
    () => items.filter(x =>
      `${x.name} ${x.nepali} ${x.category} ${x.use}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (category === 'सबै' || x.category === category)
    ),
    [items, query, category]
  );

  async function saveVerification(e) {
    e.preventDefault();
    setNotice('');

    try {
      const r = await fetch(
        `/api/medicines/${encodeURIComponent(verificationForm.medicineId)}/verification`,
        {
          method:'PATCH',
          headers:{
            'Content-Type':'application/json',
            'x-admin-key':adminKey
          },
          body:JSON.stringify({
            status:verificationForm.status,
            notes:verificationForm.notes,
            ...(verificationForm.status === 'verified' ? {
              pharmacistName:verificationForm.pharmacistName,
              registration:verificationForm.registration,
              reviewConfirmed:verificationForm.reviewConfirmed
            } : {})
          })
        }
      );

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.error || 'Verification असफल भयो');
      }

      setItems(old =>
        old.map(item => item.id === d.item.id ? d.item : item)
      );

      setSelected(d.item);
      setNotice('Verification status सफलतापूर्वक अपडेट भयो।');

      setVerificationForm({
        medicineId:'',
        status:'pending',
        pharmacistName:'',
        registration:'',
        notes:'',
        reviewConfirmed:false
      });

    } catch (err) {
      setNotice(err.message);
    }
  }

  async function saveMedicine(e) {
    e.preventDefault();
    setNotice('');

    try {
      const r = await fetch('/api/medicines', {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'x-admin-key':adminKey
        },
        body:JSON.stringify({
          ...form,
          price:form.price === '' ? null : Number(form.price)
        })
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.error || 'सेभ गर्न सकिएन');
      }

      setItems(old => [
        d.item,
        ...old.filter(x => x.id !== d.item.id)
      ]);

      setForm({
        name:'',
        nepali:'',
        category:'',
        use:'',
        symptoms:'',
        caution:'',
        side:'',
        forms:'',
        price:'',
        priceNote:'',
        prescription:'',
        source:''
      });

      setNotice('औषधिको विवरण सेभ भयो।');

    } catch (err) {
      setNotice(err.message + ' — API/database setup जाँच गर्नुहोस्।');
    }
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

          <button onClick={() => {
            setTab('about');
            setSelected(null);
          }}>
            हाम्रो बारेमा
          </button>

          <button onClick={() => setShowAdmin(v => !v)}>
            Admin
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
              औषधिबारे सही जानकारी,<br />
              <i>नेपाली भाषामा।</i>
            </h1>

            <p>
              कुन औषधि केका लागि प्रयोग हुन्छ, के सावधानी अपनाउने
              र मूल्य कहाँ पुष्टि गर्ने—एकै ठाउँमा बुझ्नुहोस्।
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
              आपतकालीन लक्षण, सास फेर्न गाह्रो, बेहोस हुने,
              छाती दुख्ने वा गम्भीर एलर्जी भए तुरुन्त नजिकको
              स्वास्थ्य संस्था जानुहोस्।
            </p>
          </section>
        ) : (
          <>
            <section className="search-wrap">
              <div className="search">
                <span>⌕</span>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="औषधिको नाम खोज्नुहोस् — जस्तै Paracetamol, ज्वरो, एलर्जी..."
                />
                <kbd>SEARCH</kbd>
              </div>

              <div className="chips">
                {categories.map(c => (
                  <button
                    key={c}
                    className={category === c ? 'chosen' : ''}
                    onClick={() => setCategory(c)}
                  >
                    {c}
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
              {filtered.map(m => (
                <article
                  className="medicine-card"
                  key={m.id}
                  onClick={() => setSelected(m)}
                >
                  <div className="med-top">
                    <div className="med-icon">
                      {m.category === 'एन्टिबायोटिक'
                        ? 'Rx'
                        : m.category === 'एलर्जी' ? '✿' : '✚'}
                    </div>

                    <div style={{
                      display:'flex',
                      flexDirection:'column',
                      alignItems:'flex-end',
                      gap:'7px'
                    }}>
                      {verificationBadge(m.verificationStatus)}

                      <span className={m.priceVerified ? 'verified' : 'unverified'}>
                        {m.priceVerified
                          ? '✓ मूल्य स्रोत पुष्टि'
                          : 'मूल्य/जानकारी पुष्टि बाँकी'}
                      </span>
                    </div>
                  </div>

                  <div className="med-category">{m.category}</div>
                  <h3>{m.name}</h3>
                  <div className="nepali">{m.nepali}</div>
                  <p>{m.use}</p>

                  <div className="med-bottom">
                    <div>
                      <small>मूल्य</small>
                      <b>{money(m.price)}</b>
                    </div>

                    <button onClick={e => {
                      e.stopPropagation();
                      setSelected(m);
                    }}>
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
              Admin API key राखेर औषधिको विवरण र फार्मेसीबाट
              पुष्टि भएको मूल्य थप्नुहोस्।
            </p>

            <form onSubmit={saveMedicine}>
              <label>
                Admin API key
                <input
                  type="password"
                  value={adminKey}
                  onChange={e => setAdminKey(e.target.value)}
                  required
                />
              </label>

              <div className="form-grid">
                {[
                  ['name','Medicine name'],
                  ['nepali','नेपाली नाम'],
                  ['category','Category'],
                  ['forms','Dosage forms'],
                  ['use','के कामका लागि प्रयोग हुन्छ'],
                  ['symptoms','कुन अवस्थामा प्रयोग गरिन्छ'],
                  ['caution','सावधानी'],
                  ['side','सम्भावित side effects'],
                  ['prescription','Prescription स्थिति'],
                  ['price','मूल्य (रु.)'],
                  ['priceNote','मूल्य स्रोत/प्याकेट विवरण'],
                  ['source','जानकारीको स्रोत']
                ].map(([k, l]) => (
                  <label key={k}>
                    {l}

                    {['use','symptoms','caution','side','source'].includes(k) ? (
                      <textarea
                        value={form[k]}
                        onChange={e => setForm({
                          ...form,
                          [k]:e.target.value
                        })}
                        required={['name','nepali','category','use','caution','source'].includes(k)}
                      />
                    ) : (
                      <input
                        type={k === 'price' ? 'number' : 'text'}
                        min="0"
                        value={form[k]}
                        onChange={e => setForm({
                          ...form,
                          [k]:e.target.value
                        })}
                        required={['name','nepali','category'].includes(k)}
                      />
                    )}
                  </label>
                ))}
              </div>

              <button className="primary" type="submit">
                औषधि सेभ गर्नुहोस्
              </button>

              {notice && <p className="notice">{notice}</p>}
            </form>

            <hr />

            <h3>Pharmacist Verification</h3>

            <form onSubmit={saveVerification}>
              <label>
                औषधि छान्नुहोस्
                <select
                  value={verificationForm.medicineId}
                  onChange={e => setVerificationForm({
                    ...verificationForm,
                    medicineId:e.target.value
                  })}
                  required
                >
                  <option value="">औषधि छान्नुहोस्</option>
                  {items.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.nepali}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Verification Status
                <select
                  value={verificationForm.status}
                  onChange={e => setVerificationForm({
                    ...verificationForm,
                    status:e.target.value
                  })}
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
                      onChange={e => setVerificationForm({
                        ...verificationForm,
                        pharmacistName:e.target.value
                      })}
                      required
                    />
                  </label>

                  <label>
                    Registration Number
                    <input
                      value={verificationForm.registration}
                      onChange={e => setVerificationForm({
                        ...verificationForm,
                        registration:e.target.value
                      })}
                      required
                    />
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={verificationForm.reviewConfirmed}
                      onChange={e => setVerificationForm({
                        ...verificationForm,
                        reviewConfirmed:e.target.checked
                      })}
                      required
                    />
                    मैले pharmacist को योग्यता जाँच गरी वास्तविक समीक्षा भएको पुष्टि गर्छु।
                  </label>
                </>
              )}

              <label>
                Review Notes
                <textarea
                  value={verificationForm.notes}
                  onChange={e => setVerificationForm({
                    ...verificationForm,
                    notes:e.target.value
                  })}
                />
              </label>

              <button className="primary" type="submit">
                Update Verification
              </button>

              {notice && <p className="notice">{notice}</p>}
            </form>
          </section>
        )}

        <section className="warning">
          <h3>महत्त्वपूर्ण स्वास्थ्य सूचना</h3>
          <p>
            WYRMORA MEDICAL मा दिइएको औषधिसम्बन्धी जानकारी
            शैक्षिक प्रयोजनका लागि मात्र हो। यो चिकित्सकीय
            सल्लाह, निदान वा उपचारको विकल्प होइन।
            कुनै पनि औषधि प्रयोग गर्नुअघि योग्य चिकित्सक
            वा फार्मासिस्टसँग परामर्श गर्नुहोस्।
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
            कुनै औषधि सुरु, बन्द वा मात्रा परिवर्तन गर्नुअघि
            योग्य स्वास्थ्यकर्मीसँग सल्लाह लिनुहोस्।
          </p>

          <small>
            © {new Date().getFullYear()} WYRMORA Medical. All rights reserved.
          </small>
        </footer>
      </main>

      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <section className="detail" onClick={e => e.stopPropagation()}>
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
            ].map(([h, v]) => (
              <div className="detail-row" key={h}>
                <h3>{h}</h3>
                <p>{v || 'जानकारी थपिँदैछ।'}</p>
              </div>
            ))}

            <div className="warning">
              यो जानकारी व्यक्तिगत उपचार योजना होइन।
              औषधिको मात्रा/समय आफैं निर्धारण नगर्नुहोस्।
              औषधिको प्याकेट र योग्य चिकित्सक/फार्मासिस्टको
              सल्लाह पालना गर्नुहोस्।
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
