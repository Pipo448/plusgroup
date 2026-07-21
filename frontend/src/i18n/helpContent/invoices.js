// src/i18n/helpContent/invoices.js
export default {
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

    es: {
      title: '🧾 Facturas — Cómo funciona',
      sections: [
        {
          role: ['admin', 'cashier'],
          icon: '🧾',
          heading: 'Gestionar Facturas y Pagos',
          steps: [
            'Las facturas se crean automáticamente cuando usted convierte una cotización — no se crean directamente.',
            'Estado de la factura: No pagada → Parcial → Pagada. Cambia automáticamente según los pagos.',
            'Haga clic en "Registrar Pago" para ingresar un pago: Efectivo, MonCash, NatCash, Tarjeta, Transferencia.',
            'Pago parcial: si el cliente paga una parte, queda el saldo pendiente. Puede ingresar varios pagos.',
            'Cálculo de cambio: si el cliente da más que el saldo, el sistema calcula el cambio a devolver.',
            'Puede imprimir un recibo térmico (80mm/57mm) o descargar un PDF para el cliente.',
            'Anular factura: solo el administrador puede anular. Una factura anulada no puede reactivarse.',
          ],
        },
      ],
    },
}
