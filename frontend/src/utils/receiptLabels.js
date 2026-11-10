// src/utils/receiptLabels.js
// Etikèt FAKTI/RESI nan 4 lang (ht · fr · en · es). Sèvi pou tout sòti fakti a
// (resi ekran/PDF, enprime navigatè, PDF backend). Lang lan chwazi pa antrepriz la.
export const INVOICE_LANGS = [
  { code: 'ht', label: 'Kreyòl Ayisyen', short: 'HT', flag: '🇭🇹' },
  { code: 'fr', label: 'Français',       short: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'English',        short: 'EN', flag: '🇺🇸' },
  { code: 'es', label: 'Español',        short: 'ES', flag: '🇪🇸' },
]

export const normalizeLang = (c) => (['ht', 'fr', 'en', 'es'].includes(c) ? c : 'ht')

// Priyorite: chwa pou enprime sa a > lang fakti antrepriz la > lang defo antrepriz la > ht
export const resolveInvoiceLang = (tenant, override) =>
  normalizeLang(override || tenant?.invoiceLanguage || tenant?.defaultLanguage || 'ht')

export const DATE_LOCALE = { ht: 'fr-HT', fr: 'fr-FR', en: 'en-US', es: 'es-ES' }

const L = {
  ht: {
    date: 'Dat', receiptNo: 'Resi N°', client: 'Kliyan', tel: 'Tel', cashier: 'Kesye', nif: 'NIF',
    product: 'Pwodwi', qty: 'Q', price: 'Pri', priceG: 'Pri G', total: 'Total',
    discount: 'Remiz', tax: 'Taks', grandTotal: 'TOTAL',
    amountGiven: 'Kòb kliyan bay', change: 'Monnen remèt', deposit: 'Depo peye', amountPaid: 'Kòb peye',
    method: 'Metod', ref: 'Ref', balanceDue: 'Balans pou peye', balanceLeft: 'Balans ki rete',
    dueDate: 'Dat pou peye', dueLimit: 'Dat limit', payASAP: 'Peye pi vit posib',
    fullyPaid: '✓ KLIYAN AN PA DWE ANKÒ',
    statusPaid: 'TOTAL PEYE', statusCancelled: 'ANILE', statusCredit: 'KREDI', statusPartial: 'PASYEL', statusUnpaid: 'IMPAYE',
    amountOwed: 'MONTANT DI', alreadyPaid: 'DEJA PEYE',
    item: 'Atik', thanks: 'Mèsi paske ou achte lakay nou!', producedBy: 'Pwodwi pa', printed: 'Enprime',
    methods: { cash: 'Kach', moncash: 'MonCash', natcash: 'NatCash', card: 'Kat kredi', transfer: 'Virement', check: 'Chèk', credit: 'Kredi', other: 'Lòt' },
    // PDF backend
    invoiceTitle: 'FACTURE', paid: 'Peye', balance: 'Balans', subtotal: 'Sou-total', vat: 'TVA', notes: 'Nòt', terms: 'Kondisyon', thanksShort: 'Mèsi pou konfyans ou!',
  },
  fr: {
    date: 'Date', receiptNo: 'Reçu N°', client: 'Client', tel: 'Tél', cashier: 'Caissier', nif: 'NIF',
    product: 'Produit', qty: 'Q', price: 'Prix', priceG: 'Prix G', total: 'Total',
    discount: 'Remise', tax: 'Taxe', grandTotal: 'TOTAL',
    amountGiven: 'Montant remis', change: 'Monnaie rendue', deposit: 'Acompte payé', amountPaid: 'Montant payé',
    method: 'Mode', ref: 'Réf', balanceDue: 'Solde à payer', balanceLeft: 'Solde restant',
    dueDate: 'Date d\'échéance', dueLimit: 'Date limite', payASAP: 'Payer dès que possible',
    fullyPaid: '✓ LE CLIENT NE DOIT PLUS RIEN',
    statusPaid: 'TOTAL PAYÉ', statusCancelled: 'ANNULÉ', statusCredit: 'CRÉDIT', statusPartial: 'PARTIEL', statusUnpaid: 'IMPAYÉ',
    amountOwed: 'MONTANT DÛ', alreadyPaid: 'DÉJÀ PAYÉ',
    item: 'Article', thanks: 'Merci de votre achat chez nous !', producedBy: 'Produit par', printed: 'Imprimé',
    methods: { cash: 'Espèces', moncash: 'MonCash', natcash: 'NatCash', card: 'Carte', transfer: 'Virement', check: 'Chèque', credit: 'Crédit', other: 'Autre' },
    invoiceTitle: 'FACTURE', paid: 'Payé', balance: 'Solde', subtotal: 'Sous-total', vat: 'TVA', notes: 'Notes', terms: 'Conditions', thanksShort: 'Merci de votre confiance !',
  },
  en: {
    date: 'Date', receiptNo: 'Receipt #', client: 'Customer', tel: 'Tel', cashier: 'Cashier', nif: 'Tax ID',
    product: 'Product', qty: 'Q', price: 'Price', priceG: 'Price G', total: 'Total',
    discount: 'Discount', tax: 'Tax', grandTotal: 'TOTAL',
    amountGiven: 'Amount tendered', change: 'Change given', deposit: 'Deposit paid', amountPaid: 'Amount paid',
    method: 'Method', ref: 'Ref', balanceDue: 'Balance due', balanceLeft: 'Balance remaining',
    dueDate: 'Due date', dueLimit: 'Due date', payASAP: 'Pay as soon as possible',
    fullyPaid: '✓ CUSTOMER OWES NOTHING',
    statusPaid: 'TOTAL PAID', statusCancelled: 'CANCELLED', statusCredit: 'CREDIT', statusPartial: 'PARTIAL', statusUnpaid: 'UNPAID',
    amountOwed: 'AMOUNT OWED', alreadyPaid: 'ALREADY PAID',
    item: 'Item', thanks: 'Thank you for shopping with us!', producedBy: 'Powered by', printed: 'Printed',
    methods: { cash: 'Cash', moncash: 'MonCash', natcash: 'NatCash', card: 'Card', transfer: 'Transfer', check: 'Check', credit: 'Credit', other: 'Other' },
    invoiceTitle: 'INVOICE', paid: 'Paid', balance: 'Balance', subtotal: 'Subtotal', vat: 'VAT', notes: 'Notes', terms: 'Terms', thanksShort: 'Thank you for your trust!',
  },
  es: {
    date: 'Fecha', receiptNo: 'Recibo N°', client: 'Cliente', tel: 'Tel', cashier: 'Cajero', nif: 'ID fiscal',
    product: 'Producto', qty: 'C', price: 'Precio', priceG: 'Precio G', total: 'Total',
    discount: 'Descuento', tax: 'Impuesto', grandTotal: 'TOTAL',
    amountGiven: 'Monto entregado', change: 'Cambio devuelto', deposit: 'Anticipo pagado', amountPaid: 'Monto pagado',
    method: 'Método', ref: 'Ref', balanceDue: 'Saldo a pagar', balanceLeft: 'Saldo pendiente',
    dueDate: 'Fecha de pago', dueLimit: 'Fecha límite', payASAP: 'Pagar lo antes posible',
    fullyPaid: '✓ EL CLIENTE YA NO DEBE NADA',
    statusPaid: 'TOTAL PAGADO', statusCancelled: 'ANULADO', statusCredit: 'CRÉDITO', statusPartial: 'PARCIAL', statusUnpaid: 'IMPAGO',
    amountOwed: 'MONTO ADEUDADO', alreadyPaid: 'YA PAGADO',
    item: 'Artículo', thanks: '¡Gracias por su compra!', producedBy: 'Producido por', printed: 'Impreso',
    methods: { cash: 'Efectivo', moncash: 'MonCash', natcash: 'NatCash', card: 'Tarjeta', transfer: 'Transferencia', check: 'Cheque', credit: 'Crédito', other: 'Otro' },
    invoiceTitle: 'FACTURA', paid: 'Pagado', balance: 'Saldo', subtotal: 'Subtotal', vat: 'IVA', notes: 'Notas', terms: 'Condiciones', thanksShort: '¡Gracias por su confianza!',
  },
}

export const getReceiptLabels = (lang) => L[normalizeLang(lang)]
