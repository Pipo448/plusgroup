// src/i18n/helpContent.js
// Kontni guide pa paj, pa wòl, pa lang
// Itilize nan HelpModal.jsx

const helpContent = {

  // ══════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════
  dashboard: {
    ht: {
      title: '📊 Tablo Bò — Kijan li travay',
      sections: [
        {
          role: ['admin'],
          icon: '👑',
          heading: 'Pou Administratè',
          steps: [
            'Tablo bò montre yon rezime konplè aktivite biznis ou a: vant, fakti, stock ak benefis.',
            'Kat KPI anlè a (Fakti pa peye, Vant Mwa, Pèman Pasyal, Alèt Stock) ba ou enfòmasyon rapid sou eta biznis la.',
            'Seksyon "Rapò Benefis" montre diferans ant vant ak kout pwodui yo — sa ede w konnen si biznis la ap fè lajan.',
            'Grafik vant 7 jou a montre evolisyon chak jou pou ou ka wè ki jou ki pi fò.',
            'Alèt stock ba yo montre pwodui ki bezwen restòk rapidman.',
          ],
        },
        {
          role: ['cashier'],
          icon: '💰',
          heading: 'Pou Kesye',
          steps: [
            'Ou wè yon rezime vant jounen an ak fakti resan yo.',
            'Seksyon "Dènye Fakti" montre dènye tranzaksyon yo pou ou ka swiv pèman yo.',
            'Si ou wè yon fakti "Pa peye" oswa "Pasyal", ou ka klike sou li pou anrejistre pèman.',
            'Bouton "Nouvo Devi" nan tablo bò a pèmèt ou kreye yon vant rapid.',
          ],
        },
        {
          role: ['stock_manager'],
          icon: '📦',
          heading: 'Pou Jesyonè Stock',
          steps: [
            'Seksyon "Alèt Stock" montre pwodui ki anba sèy alèt yo.',
            'Klike sou yon pwodui pou al nan paj Stock epi fè ajisteman.',
            'Wòl ou a pa gen aksè nan done finansyè yo — ou wè sèlman stock ak pwodui.',
          ],
        },
        {
          role: ['viewer'],
          icon: '👁️',
          heading: 'Pou Obsèvatè',
          steps: [
            'Ou gen aksè an lekti sèlman — ou pa ka kreye ni modifye anyen.',
            'Ou ka wè rezime aktivite biznis la men ou pa ka fè aksyon.',
          ],
        },
      ],
    },
    fr: {
      title: '📊 Tableau de Bord — Comment ça fonctionne',
      sections: [
        {
          role: ['admin'],
          icon: '👑',
          heading: 'Pour les Administrateurs',
          steps: [
            'Le tableau de bord affiche un résumé complet de l\'activité: ventes, factures, stock et bénéfices.',
            'Les 4 KPI en haut (Factures impayées, Ventes du mois, Paiements partiels, Alertes stock) donnent une vue rapide.',
            'La section "Rapport Bénéfices" montre la différence entre ventes et coûts produits.',
            'Le graphique des ventes sur 7 jours montre l\'évolution quotidienne.',
            'Les alertes stock bas indiquent les produits à réapprovisionner rapidement.',
          ],
        },
        {
          role: ['cashier'],
          icon: '💰',
          heading: 'Pour les Caissiers',
          steps: [
            'Vous voyez un résumé des ventes du jour et les factures récentes.',
            'La section "Dernières Factures" permet de suivre les paiements.',
            'Si une facture est "Impayée" ou "Partielle", cliquez dessus pour enregistrer un paiement.',
            'Le bouton "Nouveau Devis" permet de créer une vente rapidement.',
          ],
        },
        {
          role: ['stock_manager'],
          icon: '📦',
          heading: 'Pour les Gestionnaires de Stock',
          steps: [
            'La section "Alertes Stock" montre les produits sous leur seuil d\'alerte.',
            'Cliquez sur un produit pour aller à la page Stock et faire un ajustement.',
            'Votre rôle n\'a pas accès aux données financières.',
          ],
        },
        {
          role: ['viewer'],
          icon: '👁️',
          heading: 'Pour les Observateurs',
          steps: [
            'Vous avez accès en lecture seule — vous ne pouvez pas créer ni modifier.',
            'Vous pouvez voir le résumé de l\'activité mais sans effectuer d\'actions.',
          ],
        },
      ],
    },
    en: {
      title: '📊 Dashboard — How it works',
      sections: [
        {
          role: ['admin'],
          icon: '👑',
          heading: 'For Administrators',
          steps: [
            'The dashboard shows a complete summary of business activity: sales, invoices, stock and profit.',
            'The 4 KPI cards at the top (Unpaid invoices, Monthly sales, Partial payments, Stock alerts) give a quick overview.',
            'The "Profit Report" section shows the difference between sales and product costs.',
            'The 7-day sales chart shows daily evolution.',
            'Low stock alerts indicate products that need restocking quickly.',
          ],
        },
        {
          role: ['cashier'],
          icon: '💰',
          heading: 'For Cashiers',
          steps: [
            'You see a summary of today\'s sales and recent invoices.',
            'The "Recent Invoices" section lets you track payments.',
            'If an invoice is "Unpaid" or "Partial", click on it to record a payment.',
            'The "New Quote" button lets you create a sale quickly.',
          ],
        },
        {
          role: ['stock_manager'],
          icon: '📦',
          heading: 'For Stock Managers',
          steps: [
            'The "Stock Alerts" section shows products below their alert threshold.',
            'Click on a product to go to the Stock page and make an adjustment.',
            'Your role does not have access to financial data.',
          ],
        },
        {
          role: ['viewer'],
          icon: '👁️',
          heading: 'For Viewers',
          steps: [
            'You have read-only access — you cannot create or modify anything.',
            'You can see the business activity summary but cannot perform actions.',
          ],
        },
      ],
    },
  },

  // ══════════════════════════════════════════════
  // PRODUITS
  // ══════════════════════════════════════════════
  products: {
    ht: {
      title: '📦 Pwodui — Kijan li travay',
      sections: [
        {
          role: ['admin'],
          icon: '👑',
          heading: 'Jere Katalòg Pwodui',
          steps: [
            'Klike "Nouvo Pwodui" pou ajoute yon pwodui nan katalòg la.',
            'Chak pwodui gen: non, kòd, kategori, pri HTG, pri kout (pou kalkile benefis), ak kantite stock.',
            'Si pwodui a se yon sèvis (pa gen stock), koche "Se yon sèvis" — li pa ap janm gen alèt stock.',
            'Sèy Alèt: lè stock tonbe anba nivo sa, sistèm lan voye yon alèt. Mete li selon biznis ou a.',
            'Ou ka kreye kategori pou òganize pwodui yo (Manje, Bwason, Sèvis, etc.).',
            'Enpòtan: Pri Kout (costPriceHtg) obligatwa pou wè rapò benefis la kòrèkteman.',
          ],
        },
        {
          role: ['cashier'],
          icon: '💰',
          heading: 'Wè Pwodui yo',
          steps: [
            'Ou ka wè tout pwodui yo ak nivo stock yo.',
            'Itilize rechèch la pou jwenn yon pwodui rapid.',
            'Ou pa ka ajoute oswa modifye pwodui — kontakte admin ou a.',
          ],
        },
        {
          role: ['stock_manager'],
          icon: '📦',
          heading: 'Jere Stock Pwodui',
          steps: [
            'Ou ka wè ak modifye enfòmasyon pwodui yo.',
            'Pou ajiste kantite stock, ale nan paj "Estòk" — pa sou paj pwodui a.',
            'Ou ka ajoute nouvo pwodui si admin ou a ba ou pèmisyon sa.',
          ],
        },
      ],
    },
    fr: {
      title: '📦 Produits — Comment ça fonctionne',
      sections: [
        {
          role: ['admin'],
          icon: '👑',
          heading: 'Gérer le Catalogue Produits',
          steps: [
            'Cliquez "Nouveau Produit" pour ajouter un produit au catalogue.',
            'Chaque produit a: nom, code, catégorie, prix HTG, prix coût (pour le calcul des bénéfices), et quantité stock.',
            'Si le produit est un service (pas de stock), cochez "C\'est un service".',
            'Seuil d\'alerte: quand le stock tombe sous ce niveau, le système envoie une alerte.',
            'Vous pouvez créer des catégories pour organiser les produits.',
            'Important: Le Prix Coût (costPriceHtg) est nécessaire pour voir le rapport de bénéfices correctement.',
          ],
        },
        {
          role: ['cashier'],
          icon: '💰',
          heading: 'Voir les Produits',
          steps: [
            'Vous pouvez voir tous les produits et leurs niveaux de stock.',
            'Utilisez la recherche pour trouver un produit rapidement.',
            'Vous ne pouvez pas ajouter ou modifier des produits — contactez votre admin.',
          ],
        },
        {
          role: ['stock_manager'],
          icon: '📦',
          heading: 'Gérer le Stock Produits',
          steps: [
            'Vous pouvez voir et modifier les informations des produits.',
            'Pour ajuster les quantités, allez à la page "Stock".',
            'Vous pouvez ajouter de nouveaux produits si votre admin vous en donne la permission.',
          ],
        },
      ],
    },
    en: {
      title: '📦 Products — How it works',
      sections: [
        {
          role: ['admin'],
          icon: '👑',
          heading: 'Manage Product Catalog',
          steps: [
            'Click "New Product" to add a product to the catalog.',
            'Each product has: name, code, category, HTG price, cost price (for profit calculation), and stock quantity.',
            'If the product is a service (no stock), check "This is a service".',
            'Alert Threshold: when stock falls below this level, the system sends an alert.',
            'You can create categories to organize products.',
            'Important: The Cost Price (costPriceHtg) is required to see the profit report correctly.',
          ],
        },
        {
          role: ['cashier'],
          icon: '💰',
          heading: 'View Products',
          steps: [
            'You can view all products and their stock levels.',
            'Use the search to find a product quickly.',
            'You cannot add or modify products — contact your admin.',
          ],
        },
        {
          role: ['stock_manager'],
          icon: '📦',
          heading: 'Manage Product Stock',
          steps: [
            'You can view and modify product information.',
            'To adjust quantities, go to the "Stock" page.',
            'You can add new products if your admin gives you that permission.',
          ],
        },
      ],
    },
  },

  // ══════════════════════════════════════════════
  // CLIENTS
  // ══════════════════════════════════════════════
  clients: {
    ht: {
      title: '👥 Kliyan — Kijan li travay',
      sections: [
        {
          role: ['admin', 'cashier'],
          icon: '👥',
          heading: 'Jere Kliyan yo',
          steps: [
            'Klike "Nouvo Kliyan" pou ajoute yon kliyan nan sistèm nan.',
            'Tip kliyan: "Patikilye" (yon moun) oswa "Entreprise" (yon biznis).',
            'NIF: Nimewo fisk kliyan an — enpòtan pou faktire biznis ofisyèl.',
            'Yon fwa kliyan kreye, ou ka chwazi li nan paj Devi oswa Fakti.',
            'Fich kliyan an montre tout istwa devi ak fakti li yo.',
            'Ou pa ka efase yon kliyan ki gen fakti — ou ka sèlman dezaktive li.',
          ],
        },
      ],
    },
    fr: {
      title: '👥 Clients — Comment ça fonctionne',
      sections: [
        {
          role: ['admin', 'cashier'],
          icon: '👥',
          heading: 'Gérer les Clients',
          steps: [
            'Cliquez "Nouveau Client" pour ajouter un client au système.',
            'Type de client: "Particulier" (une personne) ou "Entreprise" (une société).',
            'NIF: Numéro fiscal du client — important pour la facturation officielle.',
            'Une fois le client créé, vous pouvez le sélectionner dans Devis ou Factures.',
            'La fiche client montre tout l\'historique des devis et factures.',
            'Vous ne pouvez pas supprimer un client ayant des factures — désactivez-le seulement.',
          ],
        },
      ],
    },
    en: {
      title: '👥 Clients — How it works',
      sections: [
        {
          role: ['admin', 'cashier'],
          icon: '👥',
          heading: 'Manage Clients',
          steps: [
            'Click "New Client" to add a client to the system.',
            'Client type: "Individual" (a person) or "Company" (a business).',
            'TIN: Client\'s tax number — important for official invoicing.',
            'Once a client is created, you can select them in Quotes or Invoices.',
            'The client record shows the complete history of quotes and invoices.',
            'You cannot delete a client with invoices — you can only deactivate them.',
          ],
        },
      ],
    },
  },

  // ══════════════════════════════════════════════
  // QUOTES / DEVIS
  // ══════════════════════════════════════════════
  quotes: {
    ht: {
      title: '📋 Devi — Kijan li travay',
      sections: [
        {
          role: ['admin', 'cashier'],
          icon: '📋',
          heading: 'Kreye ak Jere Devi',
          steps: [
            'Devi se premye etap yon vant. Ou kreye yon devi, kliyan aksepte, epi ou konvèti an fakti.',
            'Klike "Nouvo Devi" → chwazi kliyan (opsyonèl) → ajoute pwodui → mete pri → sovgade.',
            'Ou ka ajoute yon remiz sou chak atik (%) oswa sou total la (HTG oswa %).',
            'Dat ekspirasyon: si devi a pa konvèti avan dat sa, li pase an "Ekspire" otomatikman.',
            'Bouton "Konvèti": transfòme devi a an fakti an yon klike — stock ap dedui otomatikman.',
            'Yon devi konvèti pa ka modifye ankò.',
            'Ou ka enprime oswa telechaje PDF pou voye bay kliyan.',
          ],
        },
      ],
    },
    fr: {
      title: '📋 Devis — Comment ça fonctionne',
      sections: [
        {
          role: ['admin', 'cashier'],
          icon: '📋',
          heading: 'Créer et Gérer les Devis',
          steps: [
            'Le devis est la première étape d\'une vente. Vous créez un devis, le client accepte, puis vous convertissez en facture.',
            'Cliquez "Nouveau Devis" → choisissez un client (optionnel) → ajoutez des produits → enregistrez.',
            'Vous pouvez ajouter une remise sur chaque article (%) ou sur le total (HTG ou %).',
            'Date d\'expiration: si le devis n\'est pas converti avant cette date, il passe en "Expiré" automatiquement.',
            'Bouton "Convertir": transforme le devis en facture en un clic — le stock est déduit automatiquement.',
            'Un devis converti ne peut plus être modifié.',
            'Vous pouvez imprimer ou télécharger un PDF pour l\'envoyer au client.',
          ],
        },
      ],
    },
    en: {
      title: '📋 Quotes — How it works',
      sections: [
        {
          role: ['admin', 'cashier'],
          icon: '📋',
          heading: 'Create and Manage Quotes',
          steps: [
            'A quote is the first step of a sale. You create a quote, the client accepts, then you convert to invoice.',
            'Click "New Quote" → choose a client (optional) → add products → save.',
            'You can add a discount on each item (%) or on the total (HTG or %).',
            'Expiry date: if the quote is not converted before this date, it automatically becomes "Expired".',
            '"Convert" button: transforms the quote to an invoice in one click — stock is deducted automatically.',
            'A converted quote can no longer be modified.',
            'You can print or download a PDF to send to the client.',
          ],
        },
      ],
    },
  },

  // ══════════════════════════════════════════════
  // INVOICES / FAKTI
  // ══════════════════════════════════════════════
  invoices: {
    ht: {
      title: '🧾 Fakti — Kijan li travay',
      sections: [
        {
          role: ['admin', 'cashier'],
          icon: '🧾',
          heading: 'Jere Fakti ak Pèman',
          steps: [
            'Fakti kreye otomatikman lè ou konvèti yon devi — ou pa kreye fakti dirèkteman.',
            'Statut fakti: Impaye → Pasyal → Peye. Li chanje otomatikman selon pèman yo.',
            'Klike "Anrejistre Pèman" pou antre yon pèman: Kach, MonCash, NatCash, Kat, Virement.',
            'Pèman pasyal: si kliyan peye yon pati, balans lan rete. Ou ka antre plizyè pèman.',
            'Kalkil monnen: si kliyan ba ou plis ke balans la, sistèm nan kalkile monnen pou ba li.',
            'Ou ka enprime resi thermal (80mm/57mm) oswa telechaje PDF pou kliyan.',
            'Anile fakti: sèlman admin ka anile. Yon fakti anile pa ka vin aktif ankò.',
          ],
        },
      ],
    },
    fr: {
      title: '🧾 Factures — Comment ça fonctionne',
      sections: [
        {
          role: ['admin', 'cashier'],
          icon: '🧾',
          heading: 'Gérer les Factures et Paiements',
          steps: [
            'Les factures sont créées automatiquement lors de la conversion d\'un devis.',
            'Statut facture: Impayé → Partiel → Payé. Il change automatiquement selon les paiements.',
            'Cliquez "Enregistrer Paiement" pour saisir un paiement: Espèces, MonCash, NatCash, Carte, Virement.',
            'Paiement partiel: si le client paye une partie, le solde reste. Vous pouvez saisir plusieurs paiements.',
            'Calcul de monnaie: si le client paie plus que le solde, le système calcule la monnaie à rendre.',
            'Vous pouvez imprimer un reçu thermique (80mm/57mm) ou télécharger un PDF.',
            'Annulation: seul l\'admin peut annuler. Une facture annulée ne peut pas être réactivée.',
          ],
        },
      ],
    },
    en: {
      title: '🧾 Invoices — How it works',
      sections: [
        {
          role: ['admin', 'cashier'],
          icon: '🧾',
          heading: 'Manage Invoices and Payments',
          steps: [
            'Invoices are created automatically when you convert a quote.',
            'Invoice status: Unpaid → Partial → Paid. It changes automatically based on payments.',
            'Click "Record Payment" to enter a payment: Cash, MonCash, NatCash, Card, Wire Transfer.',
            'Partial payment: if the client pays part, the balance remains. You can enter multiple payments.',
            'Change calculation: if the client pays more than the balance, the system calculates the change.',
            'You can print a thermal receipt (80mm/57mm) or download a PDF.',
            'Cancellation: only admins can cancel. A cancelled invoice cannot be reactivated.',
          ],
        },
      ],
    },
  },

  // ══════════════════════════════════════════════
  // STOCK
  // ══════════════════════════════════════════════
  stock: {
    ht: {
      title: '📦 Estòk — Kijan li travay',
      sections: [
        {
          role: ['admin', 'stock_manager'],
          icon: '📦',
          heading: 'Jere Mouvman Stock',
          steps: [
            'Paj stock montre tout istwa mouvman pwodui yo: vant, acha, ajisteman, retou, pèt.',
            'Stock dedui otomatikman lè yon fakti kreye — ou pa bezwen fè li manyèlman.',
            'Klike "Ajiste Stock" pou fè yon ajisteman manyèl (envantè fizik, pèt, acha nouvo).',
            'Tip mouvman: "Ajoute" ogmante stock, "Retire" diminye stock.',
            'Toujou mete yon nòt pou eksplike rezon ajisteman an — sa ede pou odit.',
            'Filtre: ou ka filtre pa tip mouvman (Vant, Acha, Ajisteman, etc.) pou wè istwa espesifik.',
          ],
        },
        {
          role: ['cashier'],
          icon: '💰',
          heading: 'Stock pou Kesye',
          steps: [
            'Ou ka wè nivo stock pwodui yo men ou pa ka fè ajisteman.',
            'Stock dedui otomatikman lè ou konvèti yon devi an fakti.',
            'Si ou wè yon stock ba, avèti jesyonè stock ou a.',
          ],
        },
      ],
    },
    fr: {
      title: '📦 Stock — Comment ça fonctionne',
      sections: [
        {
          role: ['admin', 'stock_manager'],
          icon: '📦',
          heading: 'Gérer les Mouvements de Stock',
          steps: [
            'La page stock montre tout l\'historique des mouvements: ventes, achats, ajustements, retours, pertes.',
            'Le stock est déduit automatiquement quand une facture est créée.',
            'Cliquez "Ajuster Stock" pour un ajustement manuel (inventaire physique, perte, nouvel achat).',
            'Type de mouvement: "Ajouter" augmente le stock, "Retirer" le diminue.',
            'Ajoutez toujours une note pour expliquer la raison — utile pour l\'audit.',
            'Filtrez par type de mouvement pour voir un historique spécifique.',
          ],
        },
        {
          role: ['cashier'],
          icon: '💰',
          heading: 'Stock pour Caissiers',
          steps: [
            'Vous pouvez voir les niveaux de stock mais pas faire d\'ajustements.',
            'Le stock est déduit automatiquement lors de la conversion d\'un devis en facture.',
            'Si vous voyez un stock bas, prévenez votre gestionnaire de stock.',
          ],
        },
      ],
    },
    en: {
      title: '📦 Stock — How it works',
      sections: [
        {
          role: ['admin', 'stock_manager'],
          icon: '📦',
          heading: 'Manage Stock Movements',
          steps: [
            'The stock page shows the complete history of movements: sales, purchases, adjustments, returns, losses.',
            'Stock is deducted automatically when an invoice is created.',
            'Click "Adjust Stock" for a manual adjustment (physical inventory, loss, new purchase).',
            'Movement type: "Add" increases stock, "Remove" decreases it.',
            'Always add a note to explain the reason — useful for auditing.',
            'Filter by movement type to see a specific history.',
          ],
        },
        {
          role: ['cashier'],
          icon: '💰',
          heading: 'Stock for Cashiers',
          steps: [
            'You can view stock levels but cannot make adjustments.',
            'Stock is deducted automatically when a quote is converted to an invoice.',
            'If you see low stock, notify your stock manager.',
          ],
        },
      ],
    },
  },

  // ══════════════════════════════════════════════
  // REPORTS
  // ══════════════════════════════════════════════
  reports: {
    ht: {
      title: '📈 Rapò — Kijan li travay',
      sections: [
        {
          role: ['admin'],
          icon: '📈',
          heading: 'Analiz Biznis ou a',
          steps: [
            'Tab "Vant": wè total vant pa peryòd (7j, 30j, 90j), distribisyon pa statut, ak top pwodui.',
            'Tab "Stock": wè valè total stock ou a, pwodui ki ba, ak pwodui ki sòti.',
            'Rapò Benefis (nan Tablo Bò): konpare vant ak kout pou kalkile benefis net ak maji.',
            'Pou benefis yo parèt, pwodui yo dwe gen "Pri Kout" defini nan paj Pwodui a.',
            'Eksportasyon: ou ka telechaje rapò yo an PDF pou konsèvasyon.',
          ],
        },
        {
          role: ['cashier', 'stock_manager', 'viewer'],
          icon: '📊',
          heading: 'Aksè Rapò',
          steps: [
            'Wòl ou a gen aksè limite nan rapò yo.',
            'Kontakte admin ou a si ou bezwen yon rapò espesifik.',
          ],
        },
      ],
    },
    fr: {
      title: '📈 Rapports — Comment ça fonctionne',
      sections: [
        {
          role: ['admin'],
          icon: '📈',
          heading: 'Analyser votre Business',
          steps: [
            'Onglet "Ventes": voir le total des ventes par période (7j, 30j, 90j), distribution par statut, et top produits.',
            'Onglet "Stock": voir la valeur totale du stock, les produits bas et les ruptures.',
            'Rapport Bénéfices (dans Tableau de Bord): comparer ventes et coûts pour calculer le bénéfice net.',
            'Pour que les bénéfices s\'affichent, les produits doivent avoir un "Prix Coût" défini.',
            'Export: vous pouvez télécharger les rapports en PDF.',
          ],
        },
        {
          role: ['cashier', 'stock_manager', 'viewer'],
          icon: '📊',
          heading: 'Accès aux Rapports',
          steps: [
            'Votre rôle a un accès limité aux rapports.',
            'Contactez votre admin si vous avez besoin d\'un rapport spécifique.',
          ],
        },
      ],
    },
    en: {
      title: '📈 Reports — How it works',
      sections: [
        {
          role: ['admin'],
          icon: '📈',
          heading: 'Analyze Your Business',
          steps: [
            '"Sales" tab: see total sales by period (7d, 30d, 90d), distribution by status, and top products.',
            '"Stock" tab: see total stock value, low products, and out-of-stock items.',
            'Profit Report (in Dashboard): compare sales and costs to calculate net profit and margin.',
            'For profits to show, products must have a "Cost Price" defined on the Products page.',
            'Export: you can download reports as PDF.',
          ],
        },
        {
          role: ['cashier', 'stock_manager', 'viewer'],
          icon: '📊',
          heading: 'Report Access',
          steps: [
            'Your role has limited access to reports.',
            'Contact your admin if you need a specific report.',
          ],
        },
      ],
    },
  },

  // ══════════════════════════════════════════════
  // SETTINGS
  // ══════════════════════════════════════════════
  settings: {
    ht: {
      title: '⚙️ Paramèt — Kijan li travay',
      sections: [
        {
          role: ['admin'],
          icon: '⚙️',
          heading: 'Konfigirasyon Biznis ou a',
          steps: [
            'Tab Jeneral: non biznis, email, telefòn, adrès, koulè prensipal, logo, lang ak devise defò.',
            'Logo: imaj ou telechaje a sove dirèkteman nan baz done — li pa janm efase menm apre yon deploy.',
            'Koulè Prensipal: chanje koulè bouton ak entèfas la pou matche ak mak ou a.',
            'Toggle "Montre Taux Chanje": si aktive, taux HTG/USD ap parèt sou resi enprime yo.',
            'Toggle "Afiche QR Code": si dezaktive, QR code pa ap parèt sou resi — ekonomize papye.',
            'Tab Printer: chwazi koneksyon Bluetooth, USB, oswa WiFi pou printer thermal ou a.',
            'Tab Taux & Devise: antre taux pou USD, DOP, EUR, CAD pou konvèsyon otomatik.',
            'Tab Itilizatè: jere ekip ou a — ajoute, modifye wòl, oswa dezaktive aksè.',
          ],
        },
      ],
    },
    fr: {
      title: '⚙️ Paramètres — Comment ça fonctionne',
      sections: [
        {
          role: ['admin'],
          icon: '⚙️',
          heading: 'Configuration de votre Business',
          steps: [
            'Onglet Général: nom entreprise, email, téléphone, adresse, couleur principale, logo, langue et devise.',
            'Logo: l\'image uploadée est sauvegardée en base de données — elle ne sera jamais effacée.',
            'Couleur Principale: changez la couleur des boutons pour correspondre à votre marque.',
            'Toggle "Afficher Taux de Change": si activé, le taux HTG/USD apparaîtra sur les reçus.',
            'Toggle "Afficher QR Code": si désactivé, le QR code n\'apparaît pas sur les reçus — économise le papier.',
            'Onglet Imprimante: choisissez Bluetooth, USB ou WiFi pour votre imprimante thermique.',
            'Onglet Taux & Devise: entrez les taux pour USD, DOP, EUR, CAD pour la conversion automatique.',
            'Onglet Utilisateurs: gérez votre équipe — ajoutez, modifiez les rôles ou désactivez l\'accès.',
          ],
        },
      ],
    },
    en: {
      title: '⚙️ Settings — How it works',
      sections: [
        {
          role: ['admin'],
          icon: '⚙️',
          heading: 'Business Configuration',
          steps: [
            'General tab: business name, email, phone, address, primary color, logo, language and currency.',
            'Logo: the uploaded image is saved in the database — it will never be deleted.',
            'Primary Color: change the button color to match your brand.',
            '"Show Exchange Rate" toggle: if enabled, the HTG/USD rate will appear on printed receipts.',
            '"Show QR Code" toggle: if disabled, the QR code won\'t appear on receipts — saves paper.',
            'Printer tab: choose Bluetooth, USB or WiFi for your thermal printer.',
            'Rates & Currency tab: enter rates for USD, DOP, EUR, CAD for automatic conversion.',
            'Users tab: manage your team — add, modify roles, or disable access.',
          ],
        },
      ],
    },
  },
}

export default helpContent
