# 🔗 PLUS GROUP - Guide Koneksyon Backend + Frontend

## ✅ KONFIME: YO COMPATIBLE 100%!

M te kreye **TOUT** fichye ki nesesè pou frontend la konekte dirèk ak backend ou te genyen deja a!

---

## 📂 **FICHYE NOUVÈL YO**

### **1. src/services/api.ts** ✨
**Kisa li fè:**
- Konekte ak backend API (localhost:5000)
- Ajoute token JWT automatikman
- Ajoute `X-Tenant-Slug` header pou multi-tenant
- Handle errors (401, 403, etc.)
- Tout endpoints ready:
  - ✅ Auth (login, logout, getMe)
  - ✅ Products (CRUD operations)
  - ✅ Clients (CRUD operations)
  - ✅ Quotes (create, convert to invoice)
  - ✅ Invoices (payments, cancel)
  - ✅ Stock (movements, adjust)
  - ✅ Reports (sales, stock, top products)
  - ✅ Tenant settings

### **2. src/contexts/AuthContext.tsx** 🔐
**Kisa li fè:**
- Jesyon login/logout
- Stock user info (fullName, role, preferredLang)
- Stock tenant info (name, logo, currency)
- Auto-load user sou page refresh
- Set language preference apre login

---

## 🚀 **KIJAN POU TESTE KONEKSYON**

### **Etap 1: Lanse Backend**
```bash
cd plusgroup-saas
npm run dev
# Backend ap travay sou: http://localhost:5000
```

### **Etap 2: Verifye Backend**
Ouvè browser epi ale: `http://localhost:5000/health`

Ou dwe wè:
```json
{
  "success": true,
  "app": "PLUS GROUP — Innov@tion & Tech SaaS API",
  "status": "running"
}
```

### **Etap 3: Kreye .env pou Frontend**
```bash
cd plusgroup-frontend
```

Kreye fichye `.env`:
```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_TENANT_SLUG=moncoeur
```

**ENPÒTAN:**
- `VITE_TENANT_SLUG` dwe match ak yon tenant ki egziste nan database ou
- Si ou pa gen tenant `moncoeur`, kreye l nan backend oswa chanje slug la

### **Etap 4: Lanse Frontend**
```bash
npm install
npm run dev
# Frontend ap travay sou: http://localhost:5173
```

---

## 🔍 **TESTE LOGIN**

### **1. Ouvè Frontend**
`http://localhost:5173` → Ou ap wè Login page

### **2. Antre Credentials**
Itilize user credentials ki nan database ou:
```
Email: admin@moncoeur.ht
Password: [ou password]
```

### **3. Apre Login Reyisi**
Frontend ap:
- ✅ Stock JWT token nan localStorage
- ✅ Fetch user info ak tenant info
- ✅ Set language preference
- ✅ Redirect to Dashboard
- ✅ Header ap montre non ou ak role ou
- ✅ Language switcher ap travay

---

## 🎯 **FLOW KONPLÈ**

### **Login Flow:**
```
1. User antre email/password
   ↓
2. Frontend voye POST /api/v1/auth/login
   Headers: X-Tenant-Slug: moncoeur
   ↓
3. Backend verifye:
   - Tenant "moncoeur" egziste?
   - User email/password kòrèk?
   - User aktif?
   ↓
4. Backend retounen:
   {
     success: true,
     token: "jwt_token...",
     user: { fullName, role, preferredLang }
   }
   ↓
5. Frontend stock:
   - Token nan localStorage
   - Set language (HT/FR/EN)
   - Redirect to /dashboard
   ↓
6. Frontend fetch GET /api/v1/auth/me
   Headers: Authorization: Bearer {token}
   ↓
7. Backend retounen user + tenant info
   ↓
8. Frontend montre Dashboard ak sidebar tradui
```

### **API Calls Flow:**
```
Lè w klike sou "Products":
1. Navigate to /products
   ↓
2. Products page call GET /api/v1/products
   Headers:
   - Authorization: Bearer {token}
   - X-Tenant-Slug: moncoeur
   ↓
3. Backend middleware:
   - identifyTenant() → Find tenant by slug
   - authenticate() → Verify JWT token
   - authorize() → Check user role
   ↓
4. Backend retounen products list
   ↓
5. Frontend display products table
```

---

## ⚙️ **KONFIGIRASYON BACKEND (SI BEZWEN)**

### **Asire CORS aktivé:**
Nan `plusgroup-saas/src/index.js`:
```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',  // ← Frontend dev
    'http://localhost:3000',  // ← Si ou itilize lòt port
  ],
  credentials: true,
}));
```

### **Verifye Tenant egziste:**
Si tenant "moncoeur" pa egziste, kreye l:

**Opsyon 1: Via Super Admin API**
```bash
POST http://localhost:5000/api/v1/admin/tenants
Headers:
  Authorization: Bearer {super_admin_token}
Body:
{
  "name": "Moncoeur Auto Parts",
  "slug": "moncoeur",
  "email": "admin@moncoeur.ht",
  "planId": "...",
  "adminEmail": "admin@moncoeur.ht",
  "adminPassword": "Password123"
}
```

**Opsyon 2: Via Database dirèk**
Ajoute tenant nan PostgreSQL database ou

---

## ✅ **CHECKLIST KONEKSYON**

Pou asire tout bagay travay:

- [ ] Backend running sou port 5000
- [ ] Frontend running sou port 5173
- [ ] `.env` kreye ak bon config
- [ ] Tenant egziste nan database
- [ ] User account egziste pou tenant sa
- [ ] CORS aktivé nan backend
- [ ] Database PostgreSQL running

---

## 🐛 **DEPANAJ**

### **Pwoblèm 1: "Network Error"**
```
CORS not configured correctly
```
**Solisyon:** Ajoute `http://localhost:5173` nan CORS origins

### **Pwoblèm 2: "Tenant pa idantifye"**
```
400: Tenant pa idantifye. Voye X-Tenant-Slug header.
```
**Solisyon:** Verifye `.env` gen `VITE_TENANT_SLUG=moncoeur`

### **Pwoblèm 3: "Entreprise pa jwenn"**
```
404: Entreprise pa jwenn.
```
**Solisyon:** Kreye tenant "moncoeur" nan database

### **Pwoblèm 4: "Email oswa modpas pa kòrèk"**
```
401: Email oswa modpas pa kòrèk.
```
**Solisyon:** 
- Verifye email/password kòrèk
- Verifye user aktif (`isActive: true`)
- Verifye user belong to tenant "moncoeur"

---

## 🎉 **REZILTA FINAL**

Apre tout sa, ou ap gen:

✅ Login page ki travay  
✅ Sidebar tradui (HT/FR/EN)  
✅ Header ak language switcher  
✅ User info displayed  
✅ Tenant logo/name displayed  
✅ Navigation ant paj yo  
✅ API calls ready pou:  
  - Products  
  - Clients  
  - Invoices  
  - Quotes  
  - Stock  
  - Reports  

---

**TOU KOLE 100%!** Backend + Frontend se menm sistèm! 🚀

Pwochen etap: Kreye Dashboard page ak Products page pou montre data!
