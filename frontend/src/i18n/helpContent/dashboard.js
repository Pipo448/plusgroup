// src/i18n/helpContent/dashboard.js
export default {
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

    es: {
      title: '📊 Panel — Cómo funciona',
      sections: [
        {
          role: ['admin'],
          icon: '👑',
          heading: 'Para Administradores',
          steps: [
            'El panel muestra un resumen completo de la actividad del negocio: ventas, facturas, inventario y ganancias.',
            'Las 4 tarjetas KPI de arriba (Facturas no pagadas, Ventas del mes, Pagos parciales, Alertas de inventario) dan una vista rápida.',
            'La sección "Informe de Ganancias" muestra la diferencia entre ventas y costos de productos — le ayuda a saber si el negocio está generando dinero.',
            'El gráfico de ventas de 7 días muestra la evolución diaria para ver qué día fue más fuerte.',
            'Las alertas de inventario bajo muestran los productos que necesitan reabastecerse rápidamente.',
          ],
        },
        {
          role: ['cashier'],
          icon: '💰',
          heading: 'Para Cajeros',
          steps: [
            'Usted ve un resumen de las ventas del día y las facturas recientes.',
            'La sección "Últimas Facturas" muestra las transacciones recientes para dar seguimiento a los pagos.',
            'Si ve una factura "No pagada" o "Parcial", puede hacer clic en ella para registrar un pago.',
            'El botón "Nueva Cotización" en el panel le permite crear una venta rápida.',
          ],
        },
        {
          role: ['stock_manager'],
          icon: '📦',
          heading: 'Para Gerentes de Inventario',
          steps: [
            'La sección "Alertas de Inventario" muestra los productos por debajo de su umbral de alerta.',
            'Haga clic en un producto para ir a la página de Inventario y hacer un ajuste.',
            'Su rol no tiene acceso a los datos financieros — solo ve inventario y productos.',
          ],
        },
        {
          role: ['viewer'],
          icon: '👁️',
          heading: 'Para Observadores',
          steps: [
            'Usted tiene acceso de solo lectura — no puede crear ni modificar nada.',
            'Puede ver el resumen de la actividad del negocio pero no puede realizar acciones.',
          ],
        },
      ],
    },
}
