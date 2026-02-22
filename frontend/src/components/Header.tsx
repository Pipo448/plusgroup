// INSTRUCTION: Nan Dashboard.jsx, chèche liy ki di:
//   <Link to="/quotes/new"
// Epi ANVAN link sa a, ajoute:
//   <div style={{ display:'flex', alignItems:'center', gap:12 }}>
//     <LanguageSwitcher />

// ESKE RETIRE liy sa a TOU (ki mete LanguageSwitcher nan absolute position):
// {/* Language Switcher - Top Right */}
// <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
//   <LanguageSwitcher />
// </div>

// SA VLE DI:
// - RETIRE bouton absolute top-right
// - AJOUTE bouton inline akote "Nouvo devis"

// Egzanp apre chanjman (liy ~305-330):

          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <LanguageSwitcher />
            <Link to="/quotes/new"
              style={{
                display:'flex', alignItems:'center', gap:7,
                padding:'9px 18px', borderRadius:12, textDecoration:'none',
                background:`linear-gradient(135deg, ${C.gold}, ${C.goldDm})`,
                color:C.black, fontWeight:800, fontSize:12, letterSpacing:'0.03em',
                boxShadow:`0 4px 20px ${C.gold}50`,
                transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='scale(1.05)'; e.currentTarget.style.boxShadow=`0 8px 28px ${C.gold}70` }}
              onMouseLeave={e => { e.currentTarget.style.transform='scale(1)';    e.currentTarget.style.boxShadow=`0 4px 20px ${C.gold}50` }}
            >
              <Plus size={14}/> {t('dashboard.newQuote')}
            </Link>
          </div>

// ETAP:
// 1. Ouvè Dashboard.jsx
// 2. EFASE liy 283-286 (absolute position LanguageSwitcher)
// 3. Nan liy ~305, RANPLASE:
//    <Link to="/quotes/new" ...>
//    AK:
//    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
//      <LanguageSwitcher />
//      <Link to="/quotes/new" ...>
//      </Link>
//    </div>
// 4. Save epi refresh!
