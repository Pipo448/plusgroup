// src/i18n/config.ts - KONPLÈ AK QUOTES KEYS
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  ht: {
    translation: {
      // ── NAV
      nav: {
        dashboard: 'Tablo bò',
        products: 'Pwodui',
        clients: 'Kliyan',
        quotes: 'Devis',
        invoices: 'Faktir',
        stock: 'Estòk',
        reports: 'Rapò',
        settings: 'Paramèt',
      },
      
      // ── HEADER
      header: {
        settings: 'Paramèt',
        logout: 'Dekonekte',
      },
      
      // ── COMMON (← AJOUTE SA SI OU PA GEN L)
      common: {
        search: 'Chèche',
        save: 'Anrejistre',
        saving: 'Ap sovgade...',
        update: 'Mete ajou',
        cancel: 'Anile',
        delete: 'Efase',
        edit: 'Modifye',
        add: 'Ajoute',
        close: 'Fèmen',
        confirm: 'Konfime',
        back: 'Retounen',
        total: 'Total',
        loading: 'Ap chaje...',
        error: 'Erè',
        success: 'Siksè',
      },
      
      // ── DASHBOARD
      dashboard: {
        greeting: 'Bonswa',
        sales30days: 'Vant 30 jou',
        totalSales: 'Total vant',
        paid: 'Peye',
        unpaid: 'Impaye',
        partial: 'Pasyal',
        balance: 'Balans',
        invoices: 'faktir',
        documents: 'dokiman',
        lowStock: 'Estòk ba',
        needRestock: 'Bezwen restock',
        sales7days: 'Vant 7 dènye jou yo',
        salesChart: 'Chif vant an HTG',
        seeReport: 'Wè rapò',
        seeAll: 'Wè tout',
        newQuote: 'Nouvo devis',
        unpaidInvoices: 'Faktir Impaye',
        monthlySales: 'Vant Mwa a',
        partialPayments: 'Peman Pasyal',
        stockAlerts: 'Alèt Estòk',
        products: 'pwodui',
      },
      
      // ── QUOTES (← AJOUTE TOUT SA A!)
      quotes: {
        // Titles
        title: 'Devis',
        newQuote: 'Nouvo Devis',
        editQuote: 'Modifye Devis',
        
        // Actions
        createQuote: 'Kreye Devis',
        quoteCreated: 'Devis kreye!',
        quoteUpdated: 'Devis ajou!',
        
        // Client section
        clientInfo: 'Enfòmasyon Kliyan',
        client: 'Kliyan',
        searchClient: 'Chèche kliyan...',
        
        // Currency
        currency: 'Devise',
        gourde: 'Goud',
        dollar: 'Dola',
        
        // Dates
        expiryDate: 'Dat Ekspirasyon',
        
        // Items section
        items: 'Atik yo',
        addLine: 'Ajoute yon liy',
        addAnotherItem: 'Ajoute yon atik ankò',
        addAtLeastOneItem: 'Ajoute omwen yon atik.',
        
        // Product search
        searchProduct: 'Chèche pwodui...',
        orTypeDescription: 'Ou tape yon deskripsyon...',
        productDescription: 'Pwodui / Deskripsyon',
        
        // Table columns
        qty: 'Qte',
        unitPrice: 'Pri U. (HTG)',
        discountPct: 'Remiz %',
        
        // Notes section
        notesForClient: 'Nòt pou kliyan',
        notesPlaceholder: 'Remèsiman, kondisyon spesyal...',
        generalTerms: 'Kondisyon jeneral',
        termsPlaceholder: 'Kondisyon peman, livrezon...',
        defaultNotes: 'Mèsi pou konfyans ou. Nenpòt kesyon, kontakte nou.',
        defaultTerms: 'Peman akepte: Kach, MonCash, NatCash. Machandiz vann pa retounen.',
        
        // Summary section
        summary: 'Rezime',
        subtotal: 'Sou-total',
        discount: 'Remiz',
        taxVAT: 'Taks TVA',
        valueAmount: 'Valè',
        percentage: 'Pousantaj',
        
        // Exchange info
        rate: 'Taux',
        selectedCurrency: 'Devise chwazi',
      },
    },
  },
  
  fr: {
    translation: {
      // ── NAV
      nav: {
        dashboard: 'Tableau de bord',
        products: 'Produits',
        clients: 'Clients',
        quotes: 'Devis',
        invoices: 'Factures',
        stock: 'Stock',
        reports: 'Rapports',
        settings: 'Paramètres',
      },
      
      // ── HEADER
      header: {
        settings: 'Paramètres',
        logout: 'Déconnexion',
      },
      
      // ── COMMON
      common: {
        search: 'Rechercher',
        save: 'Enregistrer',
        saving: 'Enregistrement...',
        update: 'Mettre à jour',
        cancel: 'Annuler',
        delete: 'Supprimer',
        edit: 'Modifier',
        add: 'Ajouter',
        close: 'Fermer',
        confirm: 'Confirmer',
        back: 'Retour',
        total: 'Total',
        loading: 'Chargement...',
        error: 'Erreur',
        success: 'Succès',
      },
      
      // ── DASHBOARD
      dashboard: {
        greeting: 'Bonjour',
        sales30days: 'Ventes 30 jours',
        totalSales: 'Total ventes',
        paid: 'Payé',
        unpaid: 'Impayé',
        partial: 'Partiel',
        balance: 'Solde',
        invoices: 'factures',
        documents: 'documents',
        lowStock: 'Stock bas',
        needRestock: 'Besoin réappro',
        sales7days: 'Ventes 7 derniers jours',
        salesChart: 'Chiffre ventes HTG',
        seeReport: 'Voir rapport',
        seeAll: 'Voir tout',
        newQuote: 'Nouveau devis',
        unpaidInvoices: 'Factures Impayées',
        monthlySales: 'Ventes du Mois',
        partialPayments: 'Paiements Partiels',
        stockAlerts: 'Alertes Stock',
        products: 'produits',
      },
      
      // ── QUOTES (← FRANSE!)
      quotes: {
        // Titles
        title: 'Devis',
        newQuote: 'Nouveau Devis',
        editQuote: 'Modifier Devis',
        
        // Actions
        createQuote: 'Créer Devis',
        quoteCreated: 'Devis créé!',
        quoteUpdated: 'Devis mis à jour!',
        
        // Client section
        clientInfo: 'Informations Client',
        client: 'Client',
        searchClient: 'Rechercher client...',
        
        // Currency
        currency: 'Devise',
        gourde: 'Gourde',
        dollar: 'Dollar',
        
        // Dates
        expiryDate: 'Date Expiration',
        
        // Items section
        items: 'Articles',
        addLine: 'Ajouter une ligne',
        addAnotherItem: 'Ajouter un autre article',
        addAtLeastOneItem: 'Ajoutez au moins un article.',
        
        // Product search
        searchProduct: 'Rechercher produit...',
        orTypeDescription: 'Ou tapez une description...',
        productDescription: 'Produit / Description',
        
        // Table columns
        qty: 'Qté',
        unitPrice: 'Prix U. (HTG)',
        discountPct: 'Remise %',
        
        // Notes section
        notesForClient: 'Notes pour client',
        notesPlaceholder: 'Remerciements, conditions spéciales...',
        generalTerms: 'Conditions générales',
        termsPlaceholder: 'Conditions paiement, livraison...',
        defaultNotes: 'Merci pour votre confiance. Pour toute question, contactez-nous.',
        defaultTerms: 'Paiement accepté: Espèces, MonCash, NatCash. Marchandise vendue non reprise.',
        
        // Summary section
        summary: 'Résumé',
        subtotal: 'Sous-total',
        discount: 'Remise',
        taxVAT: 'Taxe TVA',
        valueAmount: 'Valeur',
        percentage: 'Pourcentage',
        
        // Exchange info
        rate: 'Taux',
        selectedCurrency: 'Devise choisie',
      },
    },
  },
  
  en: {
    translation: {
      // ── NAV
      nav: {
        dashboard: 'Dashboard',
        products: 'Products',
        clients: 'Clients',
        quotes: 'Quotes',
        invoices: 'Invoices',
        stock: 'Stock',
        reports: 'Reports',
        settings: 'Settings',
      },
      
      // ── HEADER
      header: {
        settings: 'Settings',
        logout: 'Logout',
      },
      
      // ── COMMON
      common: {
        search: 'Search',
        save: 'Save',
        saving: 'Saving...',
        update: 'Update',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        close: 'Close',
        confirm: 'Confirm',
        back: 'Back',
        total: 'Total',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
      },
      
      // ── DASHBOARD
      dashboard: {
        greeting: 'Hello',
        sales30days: 'Sales 30 days',
        totalSales: 'Total sales',
        paid: 'Paid',
        unpaid: 'Unpaid',
        partial: 'Partial',
        balance: 'Balance',
        invoices: 'invoices',
        documents: 'documents',
        lowStock: 'Low stock',
        needRestock: 'Needs restock',
        sales7days: 'Sales last 7 days',
        salesChart: 'Sales figures HTG',
        seeReport: 'See report',
        seeAll: 'See all',
        newQuote: 'New quote',
        unpaidInvoices: 'Unpaid Invoices',
        monthlySales: 'Monthly Sales',
        partialPayments: 'Partial Payments',
        stockAlerts: 'Stock Alerts',
        products: 'products',
      },
      
      // ── QUOTES (← ANGLE!)
      quotes: {
        // Titles
        title: 'Quotes',
        newQuote: 'New Quote',
        editQuote: 'Edit Quote',
        
        // Actions
        createQuote: 'Create Quote',
        quoteCreated: 'Quote created!',
        quoteUpdated: 'Quote updated!',
        
        // Client section
        clientInfo: 'Client Information',
        client: 'Client',
        searchClient: 'Search client...',
        
        // Currency
        currency: 'Currency',
        gourde: 'Gourde',
        dollar: 'Dollar',
        
        // Dates
        expiryDate: 'Expiry Date',
        
        // Items section
        items: 'Items',
        addLine: 'Add a line',
        addAnotherItem: 'Add another item',
        addAtLeastOneItem: 'Add at least one item.',
        
        // Product search
        searchProduct: 'Search product...',
        orTypeDescription: 'Or type a description...',
        productDescription: 'Product / Description',
        
        // Table columns
        qty: 'Qty',
        unitPrice: 'Unit Price (HTG)',
        discountPct: 'Discount %',
        
        // Notes section
        notesForClient: 'Notes for client',
        notesPlaceholder: 'Thanks, special conditions...',
        generalTerms: 'General terms',
        termsPlaceholder: 'Payment terms, delivery...',
        defaultNotes: 'Thank you for your trust. Any questions, contact us.',
        defaultTerms: 'Payment accepted: Cash, MonCash, NatCash. Sold goods not returnable.',
        
        // Summary section
        summary: 'Summary',
        subtotal: 'Subtotal',
        discount: 'Discount',
        taxVAT: 'VAT Tax',
        valueAmount: 'Value',
        percentage: 'Percentage',
        
        // Exchange info
        rate: 'Rate',
        selectedCurrency: 'Selected currency',
      },
    },
  },
}

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('plusgroup-lang') || 'ht',
    fallbackLng: 'ht',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
