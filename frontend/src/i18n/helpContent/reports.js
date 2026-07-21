// src/i18n/helpContent/reports.js
export default {
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

    es: {
      title: '📈 Informes — Cómo funciona',
      sections: [
        {
          role: ['admin'],
          icon: '📈',
          heading: 'Analizar su Negocio',
          steps: [
            'Pestaña "Ventas": vea el total de ventas por período (7d, 30d, 90d), distribución por estado, y los mejores productos.',
            'Pestaña "Inventario": vea el valor total de su inventario, productos bajos, y productos agotados.',
            'Informe de Ganancias (en el Panel): compare ventas y costos para calcular la ganancia neta y el margen.',
            'Para que aparezcan las ganancias, los productos deben tener un "Precio de Costo" definido en la página de Productos.',
            'Exportación: puede descargar los informes en PDF para conservarlos.',
          ],
        },
        {
          role: ['cashier', 'stock_manager', 'viewer'],
          icon: '📊',
          heading: 'Acceso a Informes',
          steps: [
            'Su rol tiene acceso limitado a los informes.',
            'Contacte a su administrador si necesita un informe específico.',
          ],
        },
      ],
    },
}
