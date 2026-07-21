// src/i18n/helpContent/stock.js
export default {
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

    es: {
      title: '📦 Inventario — Cómo funciona',
      sections: [
        {
          role: ['admin', 'stock_manager'],
          icon: '📦',
          heading: 'Gestionar Movimientos de Inventario',
          steps: [
            'La página de inventario muestra todo el historial de movimientos de productos: ventas, compras, ajustes, devoluciones, pérdidas.',
            'El inventario se descuenta automáticamente cuando se crea una factura — no necesita hacerlo manualmente.',
            'Haga clic en "Ajustar Inventario" para un ajuste manual (inventario físico, pérdida, compra nueva).',
            'Tipo de movimiento: "Agregar" aumenta el inventario, "Quitar" lo disminuye.',
            'Siempre agregue una nota para explicar el motivo del ajuste — ayuda para la auditoría.',
            'Filtro: puede filtrar por tipo de movimiento (Venta, Compra, Ajuste, etc.) para ver un historial específico.',
          ],
        },
        {
          role: ['cashier'],
          icon: '💰',
          heading: 'Inventario para Cajeros',
          steps: [
            'Puede ver los niveles de inventario de los productos pero no puede hacer ajustes.',
            'El inventario se descuenta automáticamente cuando convierte una cotización en factura.',
            'Si ve un inventario bajo, avise a su gerente de inventario.',
          ],
        },
      ],
    },
}
