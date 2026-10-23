// src/components/layout/layoutI18n.js
// ─── Tradiksyon meni prensipal la (sidebar + header) — 4 lang ─────────
// Non seksyon yo ak modil yo (Antrepriz, Hotel, Restoran, Prese, RH...) te
// ekri an dur an Kreyòl; kounye a yo swiv lang ki chwazi a. Yo ajoute tèt yo
// nan i18n app la anba kle `lay.*` — ou pa bezwen manyen fichye lang ou yo.

const ht = {
  mainMenu: 'Meni prensipal', dashboard: 'Tablo bò', products: 'Pwodui', clients: 'Kliyan', quotes: 'Devi', directQuotes: 'Devi Dirèk',
  invoices: 'Fakti', stock: 'Estòk', reports: 'Rapò', kesSesyon: 'Sesyon Kès', estokKontwol: 'Kontwòl Estòk', branches: 'Branch',
  enterprise: '✦ Antrepriz', kane: 'Ti Kanè Kès', mikwo: 'Mikwo Kredi', kaneEpay: 'Kanè Epay', pre: 'Prè', cashFlow: 'Rapò Antre/Soti',
  guide: 'Gid', profit: 'Pwofi/Pèt', sabotay: 'Sabotay', mobilpay: 'MonCash / NatCash',
  hotel: '🏨 Otèl', hotelDash: 'Tablo Otèl', hotelResv: 'Rezèvasyon', roomTypes: 'Tip Chanm',
  restaurant: '🍽️ Restoran', dry: '👔 Prese', dryManage: 'Jesyon Prese',
  rh: '💼 RH & Finans', employees: 'Anplwaye', expenses: 'Depans', founise: 'Founisè', settings: 'Paramèt',
  search: 'Chèche yon paj…', noMatch: 'Okenn paj pa koresponn ak « {{q}} »', collapse: 'Redwi meni an', expand: 'Agrandi meni an',
  offline: 'Ou pa konekte ak entènèt — kèk done ka pa ajou.', refreshed: 'Done yo rafrechi', backTop: 'Remonte anlè', logout: 'Dekonekte', branding: 'Koulè restoran',
  changeBranch: 'Chanje branch', allBranches: 'Tout branch yo', globalData: 'Wè done global', manageBranches: 'Jere branch yo →',
  active: 'Aktif', blocked: 'Bloke', upgrade: 'Upgrade →',
  roles: { admin: 'Admin', cashier: 'Kesye', stock_manager: 'Jesyonè Estòk', viewer: 'Obsèvatè', server: 'Sèvè' },
}
const fr = {
  mainMenu: 'Menu principal', dashboard: 'Tableau de bord', products: 'Produits', clients: 'Clients', quotes: 'Devis', directQuotes: 'Devis direct',
  invoices: 'Factures', stock: 'Stock', reports: 'Rapports', kesSesyon: 'Sessions de caisse', estokKontwol: 'Contrôle de stock', branches: 'Succursales',
  enterprise: '✦ Entreprise', kane: 'Carnet de caisse', mikwo: 'Microcrédit', kaneEpay: 'Carnet d’épargne', pre: 'Prêts', cashFlow: 'Rapport entrées/sorties',
  guide: 'Guide', profit: 'Profits/Pertes', sabotay: 'Sabotay', mobilpay: 'MonCash / NatCash',
  hotel: '🏨 Hôtel', hotelDash: 'Tableau Hôtel', hotelResv: 'Réservations', roomTypes: 'Types de chambres',
  restaurant: '🍽️ Restaurant', dry: '👔 Pressing', dryManage: 'Gestion du pressing',
  rh: '💼 RH & Finances', employees: 'Employés', expenses: 'Dépenses', founise: 'Fournisseurs', settings: 'Paramètres',
  search: 'Rechercher une page…', noMatch: 'Aucune page ne correspond à « {{q}} »', collapse: 'Réduire le menu', expand: 'Agrandir le menu',
  offline: 'Vous n’êtes pas connecté à Internet — certaines données peuvent ne pas être à jour.', refreshed: 'Données actualisées', backTop: 'Remonter', logout: 'Déconnexion', branding: 'Couleurs du restaurant',
  changeBranch: 'Changer de succursale', allBranches: 'Toutes les succursales', globalData: 'Voir les données globales', manageBranches: 'Gérer les succursales →',
  active: 'Active', blocked: 'Bloquée', upgrade: 'Mettre à niveau →',
  roles: { admin: 'Admin', cashier: 'Caissier', stock_manager: 'Gestionnaire de stock', viewer: 'Observateur', server: 'Serveur' },
}
const en = {
  mainMenu: 'Main menu', dashboard: 'Dashboard', products: 'Products', clients: 'Clients', quotes: 'Quotes', directQuotes: 'Direct quotes',
  invoices: 'Invoices', stock: 'Stock', reports: 'Reports', kesSesyon: 'Cash sessions', estokKontwol: 'Stock control', branches: 'Branches',
  enterprise: '✦ Enterprise', kane: 'Cash book', mikwo: 'Microcredit', kaneEpay: 'Savings book', pre: 'Loans', cashFlow: 'Cash in/out report',
  guide: 'Guide', profit: 'Profit/Loss', sabotay: 'Sabotay', mobilpay: 'MonCash / NatCash',
  hotel: '🏨 Hotel', hotelDash: 'Hotel dashboard', hotelResv: 'Reservations', roomTypes: 'Room types',
  restaurant: '🍽️ Restaurant', dry: '👔 Dry cleaning', dryManage: 'Dry cleaning',
  rh: '💼 HR & Finance', employees: 'Employees', expenses: 'Expenses', founise: 'Suppliers', settings: 'Settings',
  search: 'Search a page…', noMatch: 'No page matches “{{q}}”', collapse: 'Collapse menu', expand: 'Expand menu',
  offline: 'You are offline — some data may be out of date.', refreshed: 'Data refreshed', backTop: 'Back to top', logout: 'Log out', branding: 'Restaurant colors',
  changeBranch: 'Switch branch', allBranches: 'All branches', globalData: 'See global data', manageBranches: 'Manage branches →',
  active: 'Active', blocked: 'Blocked', upgrade: 'Upgrade →',
  roles: { admin: 'Admin', cashier: 'Cashier', stock_manager: 'Stock manager', viewer: 'Viewer', server: 'Server' },
}
const es = {
  mainMenu: 'Menú principal', dashboard: 'Panel', products: 'Productos', clients: 'Clientes', quotes: 'Cotizaciones', directQuotes: 'Cotización directa',
  invoices: 'Facturas', stock: 'Inventario', reports: 'Reportes', kesSesyon: 'Sesiones de caja', estokKontwol: 'Control de inventario', branches: 'Sucursales',
  enterprise: '✦ Empresa', kane: 'Libreta de caja', mikwo: 'Microcrédito', kaneEpay: 'Libreta de ahorro', pre: 'Préstamos', cashFlow: 'Reporte entradas/salidas',
  guide: 'Guía', profit: 'Ganancias/Pérdidas', sabotay: 'Sabotay', mobilpay: 'MonCash / NatCash',
  hotel: '🏨 Hotel', hotelDash: 'Panel del hotel', hotelResv: 'Reservas', roomTypes: 'Tipos de habitación',
  restaurant: '🍽️ Restaurante', dry: '👔 Tintorería', dryManage: 'Gestión de tintorería',
  rh: '💼 RR. HH. y Finanzas', employees: 'Empleados', expenses: 'Gastos', founise: 'Proveedores', settings: 'Configuración',
  search: 'Buscar una página…', noMatch: 'Ninguna página coincide con «{{q}}»', collapse: 'Reducir menú', expand: 'Ampliar menú',
  offline: 'No tiene conexión a Internet — algunos datos pueden no estar actualizados.', refreshed: 'Datos actualizados', backTop: 'Volver arriba', logout: 'Cerrar sesión', branding: 'Colores del restaurante',
  changeBranch: 'Cambiar sucursal', allBranches: 'Todas las sucursales', globalData: 'Ver datos globales', manageBranches: 'Gestionar sucursales →',
  active: 'Activa', blocked: 'Bloqueada', upgrade: 'Mejorar plan →',
  roles: { admin: 'Admin', cashier: 'Cajero', stock_manager: 'Encargado de inventario', viewer: 'Observador', server: 'Mesero' },
}

export const LAYOUT_BUNDLES = { ht, fr, en, es }
const ALIASES = { ht: ['ht', 'kr', 'cr', 'ht-HT'], fr: ['fr'], en: ['en'], es: ['es'] }
const done = new WeakSet()
export function ensureLayoutI18n(i18n) {
  if (!i18n || done.has(i18n) || typeof i18n.addResourceBundle !== 'function') return
  const ns = (i18n.options && i18n.options.defaultNS && [].concat(i18n.options.defaultNS)[0]) || 'translation'
  Object.entries(LAYOUT_BUNDLES).forEach(([lng, b]) => ALIASES[lng].forEach((code) => i18n.addResourceBundle(code, ns, { lay: b }, true, true)))
  done.add(i18n)
}