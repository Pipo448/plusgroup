// src/i18n/helpContent/products.js
export default {
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

    es: {
      title: '📦 Productos — Cómo funciona',
      sections: [
        {
          role: ['admin'],
          icon: '👑',
          heading: 'Gestionar el Catálogo de Productos',
          steps: [
            'Haga clic en "Nuevo Producto" para agregar un producto al catálogo.',
            'Cada producto tiene: nombre, código, categoría, precio en HTG, precio de costo (para calcular la ganancia), y cantidad en inventario.',
            'Si el producto es un servicio (sin inventario), marque "Esto es un servicio" — nunca tendrá alertas de inventario.',
            'Umbral de Alerta: cuando el inventario cae por debajo de este nivel, el sistema envía una alerta. Configúrelo según su negocio.',
            'Puede crear categorías para organizar los productos (Comida, Bebidas, Servicios, etc.).',
            'Importante: el Precio de Costo (costPriceHtg) es obligatorio para ver el informe de ganancias correctamente.',
          ],
        },
        {
          role: ['cashier'],
          icon: '💰',
          heading: 'Ver Productos',
          steps: [
            'Puede ver todos los productos y sus niveles de inventario.',
            'Use la búsqueda para encontrar un producto rápidamente.',
            'No puede agregar ni modificar productos — contacte a su administrador.',
          ],
        },
        {
          role: ['stock_manager'],
          icon: '📦',
          heading: 'Gestionar el Inventario de Productos',
          steps: [
            'Puede ver y modificar la información de los productos.',
            'Para ajustar las cantidades de inventario, vaya a la página "Inventario" — no en la página de productos.',
            'Puede agregar nuevos productos si su administrador le da ese permiso.',
          ],
        },
      ],
    },
}
