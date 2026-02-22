# 🚀 PLUS GROUP - Guide Enstalasyon Frontend

## 📦 Preparasyon

### 1. Enstale Node.js ak npm
Ou bezwen Node.js version 18+ enstale sou òdinatè ou.

Verifye si ou genyen yo:
```bash
node --version
npm --version
```

### 2. Enstale Depandans yo

Nan folde `plusgroup-frontend/`, kouri:

```bash
npm install
```

Sa ap enstale:
- React 18
- React Router v6
- i18next (tradiksyon)
- lucide-react (icons)
- axios (API calls)
- Tout lòt depandans

## ⚙️ Konfigirasyon

### 1. Kreye fichye `.env`

Kreye yon fichye `.env` nan ras folde a ak kontni sa:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_TENANT_SLUG=moncoeur
```

**Enpòtan:**
- `VITE_API_URL`: URL backend API ou (sèvè Node.js)
- `VITE_TENANT_SLUG`: Slug biznis ou (pa egzanp: `moncoeur`, `plusgroup`, etc.)

### 2. Verifye Backend API

Asire w backend API ou ap travay sou `http://localhost:5000`

## 🎨 Karakteristik

✅ **100% Multilang** - Kreyòl / Fransè / Anglè
✅ **Modern UI** - Design pwofesyonèl ak animasyon
✅ **Responsive** - Fonksyone sou desktop ak mobil
✅ **Dark Theme** - Sidebar modern ak coulè brand PLUS GROUP
✅ **Real-time** - Konekte dirèk ak backend API

## 🏃 Lanse App La

### Mode Developman:
```bash
npm run dev
```

App la ap ouvè sou: `http://localhost:5173`

### Build pou Production:
```bash
npm run build
```

Fichye yo pral nan folde `dist/`

## 📱 Itilizasyon

### Login
1. Ouvè `http://localhost:5173`
2. Antre email ak password ou
3. Chwazi lang ou vle (HT/FR/EN)

### Navigasyon
- **Dashboard** - Wè tout estatistik
- **Pwodui** - Jesyon pwodui
- **Kliyan** - Jesyon kliyan
- **Devis** - Kreye devis
- **Faktir** - Jesyon faktir
- **Estòk** - Siviv estòk
- **Rapò** - Wè rapò
- **Paramèt** - Konfigirasyon

## 🔧 Personnalizasyon

### Chanje Koulè Brand
Nan `src/styles/global.css`:
```css
:root {
  --primary: #f5680c;  /* Koulè prensipal */
  --secondary: #130463; /* Koulè segondè */
}
```

### Ajoute Nouvo Tradiksyon
Nan `src/i18n/config.ts`, ajoute nouvo mo nan seksyon `translation`

## 🐛 Depanaj

### Pwoblèm 1: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Pwoblèm 2: "API connection failed"
Verifye:
- Backend API ap travay
- `.env` gen bon URL
- CORS aktivé nan backend

### Pwoblèm 3: "Language not changing"
Netwayk browser cache:
- Chrome: Ctrl+Shift+Delete
- Reload page

## 📞 Sipò

Pou kesyon oswa pwoblèm, kontakte ekip PLUS GROUP Innov@tion & Tech

---

**Kreye pa:** Claude AI + Dasner ANGELOT  
**Version:** 1.0.0  
**Dat:** 2026-02-19
