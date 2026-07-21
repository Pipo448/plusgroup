// src/i18n/helpContent/index.js
// Kontni guide pa paj, pa wòl, pa lang — divize an plizyè fichye (yon fichye
// pa paj) pou yo pa twò long. Ajoute yon nouvo paj = ajoute yon nouvo
// fichye isit la, san w pa touche rès yo.
//
// ⚠️ Sa a ranplase ansyen '../helpContent.js' la. Chemen enpòtasyon an
// ('./helpContent' oswa '../i18n/helpContent') rete EGZAKTEMAN menm jan an
// nan HelpModal.jsx — yon dosye ki rele 'helpContent' ak yon 'index.js'
// anndan l reponn menm apèl la otomatikman.

import dashboard from './dashboard'
import products from './products'
import clients from './clients'
import quotes from './quotes'
import invoices from './invoices'
import stock from './stock'
import reports from './reports'
import settings from './settings'

const helpContent = {
  dashboard, products, clients, quotes, invoices, stock, reports, settings,
}

export default helpContent
