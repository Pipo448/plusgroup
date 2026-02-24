// src/i18n/config.ts - KONPLÈ AK QUOTES KEYS + INVOICE RECEIPT KEYS
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
      
      // ── COMMON
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
      
      // ── QUOTES
      quotes: {
        title: 'Devis',
        newQuote: 'Nouvo Devis',
        editQuote: 'Modifye Devis',
        createQuote: 'Kreye Devis',
        quoteCreated: 'Devis kreye!',
        quoteUpdated: 'Devis ajou!',
        clientInfo: 'Enfòmasyon Kliyan',
        client: 'Kliyan',
        searchClient: 'Chèche kliyan...',
        currency: 'Devise',
        gourde: 'Goud',
        dollar: 'Dola',
        expiryDate: 'Dat Ekspirasyon',
        items: 'Atik yo',
        addLine: 'Ajoute yon liy',
        addAnotherItem: 'Ajoute yon atik ankò',
        addAtLeastOneItem: 'Ajoute omwen yon atik.',
        searchProduct: 'Chèche pwodui...',
        orTypeDescription: 'Ou tape yon deskripsyon...',
        productDescription: 'Pwodui / Deskripsyon',
        qty: 'Qte',
        unitPrice: 'Pri U. (HTG)',
        discountPct: 'Remiz %',
        notesForClient: 'Nòt pou kliyan',
        notesPlaceholder: 'Remèsiman, kondisyon spesyal...',
        generalTerms: 'Kondisyon jeneral',
        termsPlaceholder: 'Kondisyon peman, livrezon...',
        defaultNotes: 'Mèsi pou konfyans ou. Nenpòt kesyon, kontakte nou.',
        defaultTerms: 'Peman akepte: Kach, MonCash, NatCash. Machandiz vann pa retounen.',
        summary: 'Rezime',
        subtotal: 'Sou-total',
        discount: 'Remiz',
        taxVAT: 'Taks TVA',
        valueAmount: 'Valè',
        percentage: 'Pousantaj',
        rate: 'Taux',
        selectedCurrency: 'Devise chwazi',
      },

      // ── INVOICE (RESI ENPRIME)
      invoice: {
        // Titre resi
        receiptTitle: 'RESI VANT',
        invoiceNumber: 'Nimewo Fakti',
        date: 'Dat',
        cashier: 'Kasye',

        // Kliyan
        client: 'Kliyan',
        noClient: 'Kliyan pa rekonèt',
        phone: 'Telefòn',
        email: 'Imèl',
        nif: 'NIF',

        // Tablo atik
        product: 'Pwodui',
        qty: 'Qte',
        unitPrice: 'Pri U.',
        discount: 'Rem.',
        total: 'Total',

        // Totaux
        subtotal: 'Sou-total',
        discountTotal: 'Remiz',
        tax: 'TVA',
        grandTotal: 'TOTAL',
        paid: 'Montan peye',
        balance: 'Balans',
        exchangeRate: 'Taux: 1 USD =',

        // Peman
        paymentMethod: 'Metòd peman',
        reference: 'Referans',
        cash: 'Kach',
        moncash: 'MonCash',
        natcash: 'NatCash',
        card: 'Kat Kredi',
        transfer: 'Virement',
        check: 'Chèk',

        // Statut
        statusPaid: '✓ PEYE KONPLÈ',
        statusPartial: '⚡ PEMAN PASYAL',
        statusUnpaid: '⏳ PA PEYE',
        statusCancelled: '✗ ANILE',

        // Pye paj
        thankYou: 'Mèsi pou fè konfyans nou!',
        footerTerms: 'Peman: Kach, MonCash, NatCash. Machandiz vann pa retounen.',
        scanQR: 'Skane QR pou verifye fakti a',
        poweredBy: 'Jere pa PlusGroup',
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
      
      // ── QUOTES
      quotes: {
        title: 'Devis',
        newQuote: 'Nouveau Devis',
        editQuote: 'Modifier Devis',
        createQuote: 'Créer Devis',
        quoteCreated: 'Devis créé!',
        quoteUpdated: 'Devis mis à jour!',
        clientInfo: 'Informations Client',
        client: 'Client',
        searchClient: 'Rechercher client...',
        currency: 'Devise',
        gourde: 'Gourde',
        dollar: 'Dollar',
        expiryDate: 'Date Expiration',
        items: 'Articles',
        addLine: 'Ajouter une ligne',
        addAnotherItem: 'Ajouter un autre article',
        addAtLeastOneItem: 'Ajoutez au moins un article.',
        searchProduct: 'Rechercher produit...',
        orTypeDescription: 'Ou tapez une description...',
        productDescription: 'Produit / Description',
        qty: 'Qté',
        unitPrice: 'Prix U. (HTG)',
        discountPct: 'Remise %',
        notesForClient: 'Notes pour client',
        notesPlaceholder: 'Remerciements, conditions spéciales...',
        generalTerms: 'Conditions générales',
        termsPlaceholder: 'Conditions paiement, livraison...',
        defaultNotes: 'Merci pour votre confiance. Pour toute question, contactez-nous.',
        defaultTerms: 'Paiement accepté: Espèces, MonCash, NatCash. Marchandise vendue non reprise.',
        summary: 'Résumé',
        subtotal: 'Sous-total',
        discount: 'Remise',
        taxVAT: 'Taxe TVA',
        valueAmount: 'Valeur',
        percentage: 'Pourcentage',
        rate: 'Taux',
        selectedCurrency: 'Devise choisie',
      },

      // ── INVOICE (REÇU IMPRIMÉ)
      invoice: {
        // Titre reçu
        receiptTitle: 'REÇU DE VENTE',
        invoiceNumber: 'N° Facture',
        date: 'Date',
        cashier: 'Caissier',

        // Client
        client: 'Client',
        noClient: 'Client non identifié',
        phone: 'Téléphone',
        email: 'Email',
        nif: 'NIF',

        // Tableau articles
        product: 'Produit',
        qty: 'Qté',
        unitPrice: 'Prix U.',
        discount: 'Rem.',
        total: 'Total',

        // Totaux
        subtotal: 'Sous-total',
        discountTotal: 'Remise',
        tax: 'TVA',
        grandTotal: 'TOTAL',
        paid: 'Montant payé',
        balance: 'Solde',
        exchangeRate: 'Taux: 1 USD =',

        // Paiement
        paymentMethod: 'Mode de paiement',
        reference: 'Référence',
        cash: 'Espèces',
        moncash: 'MonCash',
        natcash: 'NatCash',
        card: 'Carte Bancaire',
        transfer: 'Virement',
        check: 'Chèque',

        // Statut
        statusPaid: '✓ PAYÉ INTÉGRALEMENT',
        statusPartial: '⚡ PAIEMENT PARTIEL',
        statusUnpaid: '⏳ NON PAYÉ',
        statusCancelled: '✗ ANNULÉ',

        // Pied de page
        thankYou: 'Merci de votre confiance!',
        footerTerms: 'Paiement: Espèces, MonCash, NatCash. Marchandise vendue non reprise.',
        scanQR: 'Scanner le QR pour vérifier la facture',
        poweredBy: 'Géré par PlusGroup',
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
      
      // ── QUOTES
      quotes: {
        title: 'Quotes',
        newQuote: 'New Quote',
        editQuote: 'Edit Quote',
        createQuote: 'Create Quote',
        quoteCreated: 'Quote created!',
        quoteUpdated: 'Quote updated!',
        clientInfo: 'Client Information',
        client: 'Client',
        searchClient: 'Search client...',
        currency: 'Currency',
        gourde: 'Gourde',
        dollar: 'Dollar',
        expiryDate: 'Expiry Date',
        items: 'Items',
        addLine: 'Add a line',
        addAnotherItem: 'Add another item',
        addAtLeastOneItem: 'Add at least one item.',
        searchProduct: 'Search product...',
        orTypeDescription: 'Or type a description...',
        productDescription: 'Product / Description',
        qty: 'Qty',
        unitPrice: 'Unit Price (HTG)',
        discountPct: 'Discount %',
        notesForClient: 'Notes for client',
        notesPlaceholder: 'Thanks, special conditions...',
        generalTerms: 'General terms',
        termsPlaceholder: 'Payment terms, delivery...',
        defaultNotes: 'Thank you for your trust. Any questions, contact us.',
        defaultTerms: 'Payment accepted: Cash, MonCash, NatCash. Sold goods not returnable.',
        summary: 'Summary',
        subtotal: 'Subtotal',
        discount: 'Discount',
        taxVAT: 'VAT Tax',
        valueAmount: 'Value',
        percentage: 'Percentage',
        rate: 'Rate',
        selectedCurrency: 'Selected currency',
      },

      // ── INVOICE (PRINTED RECEIPT)
      invoice: {
        // Receipt title
        receiptTitle: 'SALES RECEIPT',
        invoiceNumber: 'Invoice No.',
        date: 'Date',
        cashier: 'Cashier',

        // Client
        client: 'Client',
        noClient: 'Walk-in Customer',
        phone: 'Phone',
        email: 'Email',
        nif: 'TIN',

        // Items table
        product: 'Product',
        qty: 'Qty',
        unitPrice: 'Unit Price',
        discount: 'Disc.',
        total: 'Total',

        // Totals
        subtotal: 'Subtotal',
        discountTotal: 'Discount',
        tax: 'VAT',
        grandTotal: 'TOTAL',
        paid: 'Amount paid',
        balance: 'Balance due',
        exchangeRate: 'Rate: 1 USD =',

        // Payment
        paymentMethod: 'Payment method',
        reference: 'Reference',
        cash: 'Cash',
        moncash: 'MonCash',
        natcash: 'NatCash',
        card: 'Credit Card',
        transfer: 'Wire Transfer',
        check: 'Check',

        // Status
        statusPaid: '✓ FULLY PAID',
        statusPartial: '⚡ PARTIAL PAYMENT',
        statusUnpaid: '⏳ UNPAID',
        statusCancelled: '✗ CANCELLED',

        // Footer
        thankYou: 'Thank you for your business!',
        footerTerms: 'Payment: Cash, MonCash, NatCash. All sales are final.',
        scanQR: 'Scan QR to verify this invoice',
        poweredBy: 'Powered by PlusGroup',
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
