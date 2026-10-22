// src/pages/restaurant/restoI18n.js
// ─── Tradiksyon modil Restoran an: Kreyòl, Français, English, Español ──
// Tradiksyon yo ajoute tèt yo otomatikman nan i18n app la (anba kle `resto`),
// kidonk ou pa bezwen manyen fichye lang ou yo.
import { useTranslation } from 'react-i18next'

const ht = {
  common: {
    back: 'Retounen', refresh: 'Rafrechi', close: 'Fèmen', cancel: 'Anile', save: 'Sove', saving: 'N ap sove...',
    delete: 'Efase', edit: 'Modifye', confirm: 'Konfime', yes: 'Wi', no: 'Non', search: 'Chèche', all: 'Tout',
    loading: 'N ap chaje...', error: 'Gen yon erè. Eseye ankò.', retry: 'Eseye ankò', add: 'Ajoute', copy: 'Kopye',
    copied: 'Kopye!', open: 'Louvri', themeDark: 'Mòd nwit', themeLight: 'Mòd jou', items: '{{count}} atik',
    people: '{{count}} moun', minutes: '{{count}} min', today: 'Jodi a', tomorrow: 'Demen', phone: 'Telefòn',
    notes: 'Nòt', optional: 'opsyonèl', language: 'Lang', ago: 'sa gen {{count}} min', justNow: 'kounye a',
    hoursAgo: 'sa gen {{count}} è', days: 'Dim,Len,Mad,Mèk,Jed,Van,Sam',
    months: 'jan,fev,mas,avr,me,jen,jiy,out,sep,okt,nov,des',
  },
  nav: { menu: 'Meni', tables: 'Tab', orders: 'Kòmand an liy', reservations: 'Rezèvasyon', portal: 'Pòtal kliyan' },
  menu: {
    title: 'Meni', subtitle: 'Manje ak bwason restoran an', newItem: 'Nouvo plat', searchPh: 'Chèche yon plat oswa yon bwason...',
    manageCategories: 'Kategori', stats: { items: 'Plat nan meni', categories: 'Kategori', lowStock: 'Estòk ba', outStock: 'Fini' },
    low: 'Estòk ba', out: 'Fini', inStock: '{{count}} {{unit}}', noCategory: 'San kategori',
    empty: 'Meni an vid', emptyText: 'Ajoute premye plat ou a pou kliyan yo ka wè l.', emptySearch: 'Okenn plat pa koresponn ak rechèch la.',
    confirmDeleteTitle: 'Retire plat sa a?', confirmDelete: '"{{name}}" ap soti nan meni an.',
    added: 'Plat ajoute nan meni an.', updated: 'Plat modifye.', deleted: 'Plat retire.',
    page: 'Paj {{page}} / {{pages}}',
    modal: {
      newTitle: 'Nouvo plat', editTitle: 'Modifye plat', photo: 'Foto (opsyonèl)', addPhoto: 'Ajoute foto', changePhoto: 'Chanje foto',
      removePhoto: 'Retire', imageOnly: 'Se sèlman imaj ki aksepte.', imageTooLarge: 'Imaj la twò gwo (maks 2 MB).',
      name: 'Non plat la', namePh: 'Egz. Griyo ak bannann peze', category: 'Kategori', unit: 'Inite', unitPh: 'pòsyon, boutèy...',
      priceHtg: 'Pri (HTG)', priceUsd: 'Pri (USD)', quantity: 'Kantite disponib', alertThreshold: 'Alèt estòk ba',
      description: 'Deskripsyon', descriptionPh: 'Sa ki nan plat la, gou li...', add: 'Ajoute nan meni an', update: 'Anrejistre chanjman yo',
      required: 'Chan sa a obligatwa.',
    },
    cats: {
      title: 'Kategori meni', subtitle: 'Antre, plat prensipal, bwason, desè...', namePh: 'Non nouvo kategori a',
      empty: 'Pa gen kategori ankò.', saved: 'Kategori anrejistre.', deleted: 'Kategori efase.',
      confirmDelete: 'Efase kategori "{{name}}"?',
    },
  },
  tables: {
    title: 'Tab ak kòmand', subtitle: 'Klike sou yon tab pou louvri oswa kontinye kòmand li', newTable: 'Nouvo tab',
    free: 'Lib', busy: 'Okipe', allZones: 'Tout zòn', reserved: 'Rezève', reservedAt: 'Rezève {{time}}', seats: '{{count}} plas',
    stats: { free: 'Tab lib', busy: 'Tab okipe', openTotal: 'Total ouvè', resv: 'Rezèvasyon jodi a' },
    empty: 'Pa gen tab konfigire ankò', emptyText: 'Kreye tab restoran an pou kòmanse pran kòmand.', createFirst: 'Kreye premye tab la',
    modal: { title: 'Nouvo tab', name: 'Non tab la', namePh: 'Egz. Tab 1, Teras A', zone: 'Zòn', zonePh: 'Egz. Anndan, Teras', seats: 'Kantite chèz', add: 'Ajoute tab la', nameRequired: 'Antre non tab la.', added: 'Tab ajoute.' },
    order: {
      searchPh: 'Chèche yon plat nan meni an...', empty: 'Pa gen plat ankò', emptyText: 'Chèche epi klike sou yon plat pou ajoute l.',
      sent: 'Voye nan kizin', pending: 'Poko voye', total: 'Total', cancel: 'Anile tab', sendKitchen: 'Voye kizin', close: 'Fèmen tab',
      closing: 'N ap fèmen...', needItem: 'Ajoute omwen yon plat anvan w fèmen tab la.', sentToast: 'Voye nan kizin — tikè pare pou enprime.',
      cancelledToast: 'Kòmand anile.', closedToast: 'Tab fèmen — fakti kreye.', closeError: 'Erè pandan fèmen tab la.',
      cancelTitle: 'Anile kòmand tab sa a?', cancelText: 'Tout plat ki nan kòmand lan ap retire.',
      closeTitle: 'Fèmen tab la?', closeText: 'Y ap kreye yon fakti kach pou {{amount}}.', openedAt: 'Louvri {{time}}', printKitchen: 'Tikè kizin', printBill: 'Adisyon', removeSentTitle: 'Retire yon plat ki deja nan kizin?', removeSentText: 'Kizin nan ka deja ap prepare l. Asire w ou avèti chef la.', resumeClose: 'Fakti a te deja kreye — n ap fini fèmen tab la.', pay: { title: 'Peye epi fèmen tab la', method: 'Fason peman', cash: 'Kach', moncash: 'MonCash', natcash: 'NatCash', card: 'Kat', discount: 'Rabè (%)', given: 'Kòb kliyan an bay', exact: 'Egzak', change: 'Monnen pou remèt', short: 'Manke', confirm: 'Konfime peman an', subtotal: 'Sou-total' },
    },
  },
  orders: {
    title: 'Kòmand an liy', subtitle: 'Kòmand kliyan yo fè sou pòtal restoran an', newCount: '{{count}} nouvo',
    cols: { nouvo: 'Nouvo', kitchen: 'Nan preparasyon', ready: 'Pare / sou wout', done: 'Fini jodi a' },
    status: { nouvo: 'Nouvo', konfime: 'Konfime', nan_kizin: 'Nan kizin', pare: 'Pare', sou_wout: 'Sou wout', livre: 'Livre', anile: 'Anile' },
    actions: { konfime: 'Aksepte', nan_kizin: 'Voye kizin', pare: 'Make pare', sou_wout: 'Voye livrezon', livre: 'Livre', livrePickup: 'Kliyan pran l', anile: 'Anile', invoice: 'Kreye fakti', invoiced: 'Fakti kreye', call: 'Rele', whatsapp: 'WhatsApp' },
    mode: { delivery: 'Livrezon', pickup: 'Pran sou plas' },
    payment: { cash: 'Kach', moncash: 'MonCash', natcash: 'NatCash' },
    colEmpty: 'Anyen la a', customer: 'Kliyan', address: 'Adrès', items: 'Atik yo', subtotal: 'Sou-total', deliveryFee: 'Frè livrezon',
    total: 'Total', history: 'Istorik', cancelTitle: 'Anile kòmand {{code}}?', cancelText: 'Kliyan an ap wè kòmand lan anile.',
    updated: 'Kòmand mete ajou.', invoiceCreated: 'Fakti kreye pou kòmand {{code}}.', invoiceError: 'Fakti a pa t ka kreye.',
    newAlert: 'Nouvo kòmand an liy!', portalOff: 'Pòtal kliyan an pa aktive. Aktive l nan Paramèt pòtal.', setupPortal: 'Paramèt pòtal',
    scope: { active: 'Aktif', history: 'Istorik 30 jou' }, emptyHistory: 'Pa gen istorik ankò.', notify: 'Avèti kliyan an', printKitchen: 'Tikè kizin', autoInvoice: 'Fakti a ap kreye otomatikman lè w make l livre.', deliverAndInvoice: 'Livre + fakti', rating: 'Nòt kliyan an', wa: { konfime: 'Bonjou {{name}}, {{resto}} konfime kòmand {{code}} ou a. Swiv li la: {{link}}', nan_kizin: 'Bonjou {{name}}, chef la ap prepare kòmand {{code}} ou a. {{link}}', pare: 'Bonjou {{name}}, kòmand {{code}} ou a pare! {{link}}', sou_wout: 'Bonjou {{name}}, livrè a sou wout ak kòmand {{code}} ou a. {{link}}', livre: 'Mèsi {{name}}! Bon apeti. Ou ka bay nòt kòmand lan la: {{link}}', anile: 'Bonjou {{name}}, nou regrèt, kòmand {{code}} ou a anile. Kontakte nou pou plis enfòmasyon.' },
  },
  resv: {
    title: 'Rezèvasyon', subtitle: 'Tab kliyan yo rezève an liy oswa nan telefòn', new: 'Nouvo rezèvasyon',
    empty: 'Pa gen rezèvasyon pou jou sa a', emptyText: 'Rezèvasyon kliyan yo fè sou pòtal la ap parèt isit la.',
    status: { an_atant: 'An atant', konfime: 'Konfime', chita: 'Chita', fini: 'Fini', anile: 'Anile', pa_vini: 'Pa vini' },
    actions: { konfime: 'Konfime', chita: 'Chita kliyan an', fini: 'Fini', anile: 'Anile', pa_vini: 'Pa vini' },
    table: 'Tab', noTable: 'Okenn tab', assign: 'Bay yon tab', source: { online: 'An liy', staff: 'Staff' },
    stats: { count: 'Rezèvasyon', guests: 'Moun ap vini', pending: 'An atant' },
    modal: { title: 'Nouvo rezèvasyon', name: 'Non kliyan an', phone: 'Telefòn', email: 'Imèl', party: 'Kantite moun', date: 'Dat', time: 'Lè', notes: 'Nòt', create: 'Kreye rezèvasyon an' },
    created: 'Rezèvasyon kreye.', updated: 'Rezèvasyon mete ajou.', details: 'Detay rezèvasyon', notify: 'Avèti kliyan an', tableOpened: 'Tab {{table}} louvri pou {{name}}.', tableBusy: 'Tab sa a deja okipe.', waConfirm: 'Bonjou {{name}}, rezèvasyon ou nan {{resto}} pou {{date}} a {{time}} ({{people}} moun) konfime. Kòd: {{code}}. N ap tann ou!',
  },
  portal: {
    title: 'Pòtal kliyan', subtitle: 'Kote kliyan yo kòmande ak rezève an liy', enabled: 'Pòtal la aktif',
    enabledDesc: 'Kliyan yo ka wè meni an epi kòmande / rezève', link: 'Lyen pòtal ou a', slug: 'Non nan lyen an',
    slugHint: 'Lèt, chif ak tirè sèlman. Egz: {{example}}', notSaved: 'Sove paramèt yo pou lyen an mache.',
    sections: { general: 'Enfòmasyon restoran an', orders: 'Kòmand an liy', reservations: 'Rezèvasyon', payment: 'Peman' },
    acceptOrders: 'Aksepte kòmand an liy', acceptOrdersDesc: 'Kliyan yo ka pase kòmand sou pòtal la',
    acceptingNow: 'N ap pran kòmand kounye a', acceptingNowDesc: 'Etenn sa lè kizin nan fèmen oswa twò chaje',
    delivery: 'Livrezon', deliveryDesc: 'Nou livre lakay kliyan an', pickup: 'Pran sou plas', pickupDesc: 'Kliyan an vin pran kòmand lan',
    deliveryFee: 'Frè livrezon (HTG)', minOrder: 'Kòmand minimòm (HTG)', prepMinutes: 'Tan preparasyon (minit)',
    phone: 'Telefòn', whatsapp: 'WhatsApp', address: 'Adrès', hours: 'Lè ouvèti', hoursPh: 'Egz. Lendi–Samdi 10è–10è',
    welcome: 'Mesaj akèy', welcomePh: 'Egz. Pi bon griyo nan zòn nan!', payments: 'Fason kliyan ka peye', moncashNumber: 'Nimewo MonCash',
    acceptResv: 'Aksepte rezèvasyon', acceptResvDesc: 'Kliyan yo ka rezève yon tab an liy', slots: 'Lè rezèvasyon yo',
    slotsHint: 'Klike sou yon lè pou retire l.', addSlot: 'Ajoute lè', slotCapacity: 'Rezèvasyon maks pa lè', maxParty: 'Maks moun pa rezèvasyon',
    saved: 'Paramèt pòtal anrejistre.', errors: { SLUG_TAKEN: 'Lyen sa a deja pran pa yon lòt restoran.', SLUG_INVALID: 'Lyen an twò kout (omwen 3 karaktè).' },
    preview: 'Gade pòtal la', livePreview: 'Apèsi an dirèk', previewHint: 'Men sa kliyan ou yo ap wè. Sove pou w wè chanjman yo.',
  },
  pub: {
    nav: { menu: 'Meni', reserve: 'Rezève', cart: 'Panye', track: 'Swivi' },
    open: 'Ouvè', closed: 'Pa pran kòmand kounye a', ordersPaused: 'Restoran an pa pran kòmand an liy kounye a. Ou ka toujou gade meni an.',
    promoTag: 'Kòmande an liy', promoTitle: 'Bon gou, livre cho', promoDesc: 'Chwazi plat ou, nou pare l touswit.', promoBtn: 'Gade meni an',
    hint1: 'Chèche yon plat...', hint2: 'Eseye "griyo"', hint3: 'Bwason, desè...', all: 'Tout', menuTitle: 'Meni nou',
    unavailable: 'Pa disponib', add: 'Ajoute', addToCart: 'Ajoute nan panye', added: 'Ajoute nan panye!', itemNotePh: 'Nòt pou kizin nan (opsyonèl)',
    cart: { clear: 'Vide panye a', title: 'Panye ou', empty: 'Panye ou vid', emptyText: 'Ajoute plat ou renmen yo pou kòmande.', browse: 'Gade meni an', subtotal: 'Sou-total', deliveryFee: 'Livrezon', free: 'Gratis', total: 'Total', checkout: 'Kontinye', view: 'Gade panye', min: 'Kòmand minimòm: {{amount}}' },
    checkout: { title: 'Fini kòmand lan', mode: 'Kijan w ap resevwa l?', name: 'Non ou', namePh: 'Egz. Mika Jean', phone: 'Telefòn', phonePh: 'Egz. 3700 0000', address: 'Adrès livrezon', addressPh: 'Ri, zòn, pwen referans...', payment: 'Peman', notes: 'Nòt', notesPh: 'Egz. San piman, sonnen 2 fwa...', place: 'Pase kòmand', placing: 'N ap voye...', moncashNote: 'Voye lajan an sou MonCash {{number}} epi mete kòd kòmand lan.', payOnReceive: 'Ou peye lè w resevwa kòmand lan.' },
    success: { title: 'Kòmand voye!', text: 'Restoran an resevwa kòmand ou. Kenbe kòd sa a pou swiv li.', track: 'Swiv kòmand lan' },
    track: { steps: { received: 'Resevwa', kitchen: 'Nan kizin', ready: 'Pare', onTheWay: 'Sou wout', delivered: 'Livre', pickedUp: 'Pran' }, eta: 'Pare nan apeprè', title: 'Swiv kòmand ou', lookup: 'Antre kòd kòmand lan ak 4 dènye chif telefòn ou.', code: 'Kòd kòmand', last4: '4 dènye chif telefòn', find: 'Chèche', notFound: 'Nou pa jwenn kòmand sa a.', mine: 'Kòmand mwen yo', none: 'Ou poko gen kòmand.', updatedAuto: 'Mete ajou otomatikman',
      text: { nouvo: 'Restoran an resevwa kòmand ou. Y ap konfime l touswit.', konfime: 'Kòmand ou konfime!', nan_kizin: 'Chef la ap prepare plat ou yo.', pare: 'Kòmand ou pare!', sou_wout: 'Livrè a sou wout lakay ou.', livre: 'Bon apeti! Mèsi paske w chwazi nou.', anile: 'Kòmand sa a anile. Kontakte restoran an.' } },
    reserve: { title: 'Rezève yon tab', subtitle: 'Chwazi jou a, lè a ak kantite moun', day: 'Jou', time: 'Lè', people: 'Konbyen moun', name: 'Non ou', phone: 'Telefòn', email: 'Imèl (opsyonèl)', notes: 'Demann espesyal', confirm: 'Konfime rezèvasyon', done: 'Tab ou rezève!', doneText: 'Restoran an ap konfime rezèvasyon ou. Kòd ou: {{code}}', again: 'Fè yon lòt rezèvasyon', noSlots: 'Pa gen lè disponib jou sa a.', closed: 'Restoran sa a pa aksepte rezèvasyon an liy.', pickTime: 'Chwazi yon lè.' },
    errors: {
      PORTAL_NOT_FOUND: 'Nou pa jwenn restoran sa a.', PORTAL_DISABLED: 'Pòtal restoran sa a pa aktif kounye a.',
      ORDERS_DISABLED: 'Restoran an pa pran kòmand an liy.', ORDERS_PAUSED: 'Restoran an pa pran kòmand kounye a.',
      MODE_UNAVAILABLE: 'Opsyon sa a pa disponib.', NAME_REQUIRED: 'Antre non ou.', PHONE_INVALID: 'Nimewo telefòn nan pa bon.',
      ADDRESS_REQUIRED: 'Antre adrès livrezon an.', CART_EMPTY: 'Panye a vid.', ITEM_UNAVAILABLE: 'Yon plat pa disponib ankò.',
      ITEM_NOT_FOUND: 'Yon plat pa nan meni an ankò.', MIN_ORDER: 'Montan kòmand lan pa rive minimòm nan.', SLOT_FULL: 'Lè sa a fin plen. Chwazi yon lòt.',
      DATE_INVALID: 'Dat la pa bon.', TIME_INVALID: 'Lè a pa bon.', PARTY_INVALID: 'Kantite moun nan pa bon.',
      RESV_DISABLED: 'Rezèvasyon pa disponib.', TOO_MANY: 'Twòp demann. Tann kèk minit.', generic: 'Gen yon erè. Eseye ankò.',
    },
    info: { title: 'Enfòmasyon', phone: 'Telefòn', address: 'Adrès', hours: 'Lè ouvèti' },
    notFoundTitle: 'Restoran pa jwenn', poweredBy: 'Pòtal pa PLUS GROUP', favorites: 'Favori', addFav: 'Mete nan favori', removeFav: 'Retire nan favori', reviews: '{{count}} nòt', rate: { title: 'Kijan kòmand lan te ye?', reviewPh: 'Yon ti kòmantè (opsyonèl)', send: 'Voye nòt la', thanks: 'Mèsi pou nòt ou!' },
  },
}

const fr = {
  common: {
    back: 'Retour', refresh: 'Actualiser', close: 'Fermer', cancel: 'Annuler', save: 'Enregistrer', saving: 'Enregistrement...',
    delete: 'Supprimer', edit: 'Modifier', confirm: 'Confirmer', yes: 'Oui', no: 'Non', search: 'Rechercher', all: 'Tout',
    loading: 'Chargement...', error: 'Une erreur est survenue. Réessayez.', retry: 'Réessayer', add: 'Ajouter', copy: 'Copier',
    copied: 'Copié !', open: 'Ouvrir', themeDark: 'Mode nuit', themeLight: 'Mode jour', items: '{{count}} article(s)',
    people: '{{count}} pers.', minutes: '{{count}} min', today: "Aujourd'hui", tomorrow: 'Demain', phone: 'Téléphone',
    notes: 'Notes', optional: 'facultatif', language: 'Langue', ago: 'il y a {{count}} min', justNow: "à l'instant",
    hoursAgo: 'il y a {{count}} h', days: 'Dim,Lun,Mar,Mer,Jeu,Ven,Sam',
    months: 'janv,févr,mars,avr,mai,juin,juil,août,sept,oct,nov,déc',
  },
  nav: { menu: 'Menu', tables: 'Tables', orders: 'Commandes en ligne', reservations: 'Réservations', portal: 'Portail client' },
  menu: {
    title: 'Menu', subtitle: 'Plats et boissons du restaurant', newItem: 'Nouveau plat', searchPh: 'Rechercher un plat ou une boisson...',
    manageCategories: 'Catégories', stats: { items: 'Plats au menu', categories: 'Catégories', lowStock: 'Stock bas', outStock: 'Épuisé' },
    low: 'Stock bas', out: 'Épuisé', inStock: '{{count}} {{unit}}', noCategory: 'Sans catégorie',
    empty: 'Le menu est vide', emptyText: 'Ajoutez votre premier plat pour que les clients le voient.', emptySearch: 'Aucun plat ne correspond à la recherche.',
    confirmDeleteTitle: 'Retirer ce plat ?', confirmDelete: '« {{name}} » sera retiré du menu.',
    added: 'Plat ajouté au menu.', updated: 'Plat modifié.', deleted: 'Plat retiré.',
    page: 'Page {{page}} / {{pages}}',
    modal: {
      newTitle: 'Nouveau plat', editTitle: 'Modifier le plat', photo: 'Photo (facultatif)', addPhoto: 'Ajouter une photo', changePhoto: 'Changer la photo',
      removePhoto: 'Retirer', imageOnly: 'Seules les images sont acceptées.', imageTooLarge: 'Image trop lourde (max 2 Mo).',
      name: 'Nom du plat', namePh: 'Ex. Griot et bananes pesées', category: 'Catégorie', unit: 'Unité', unitPh: 'portion, bouteille...',
      priceHtg: 'Prix (HTG)', priceUsd: 'Prix (USD)', quantity: 'Quantité disponible', alertThreshold: 'Alerte stock bas',
      description: 'Description', descriptionPh: 'Ingrédients, goût...', add: 'Ajouter au menu', update: 'Enregistrer les modifications',
      required: 'Ce champ est obligatoire.',
    },
    cats: {
      title: 'Catégories du menu', subtitle: 'Entrées, plats, boissons, desserts...', namePh: 'Nom de la nouvelle catégorie',
      empty: 'Aucune catégorie pour le moment.', saved: 'Catégorie enregistrée.', deleted: 'Catégorie supprimée.',
      confirmDelete: 'Supprimer la catégorie « {{name}} » ?',
    },
  },
  tables: {
    title: 'Tables et commandes', subtitle: 'Touchez une table pour ouvrir ou reprendre sa commande', newTable: 'Nouvelle table',
    free: 'Libre', busy: 'Occupée', allZones: 'Toutes les zones', reserved: 'Réservée', reservedAt: 'Réservée {{time}}', seats: '{{count}} places',
    stats: { free: 'Tables libres', busy: 'Tables occupées', openTotal: 'Total ouvert', resv: "Réservations du jour" },
    empty: 'Aucune table configurée', emptyText: 'Créez les tables du restaurant pour commencer à prendre des commandes.', createFirst: 'Créer la première table',
    modal: { title: 'Nouvelle table', name: 'Nom de la table', namePh: 'Ex. Table 1, Terrasse A', zone: 'Zone', zonePh: 'Ex. Intérieur, Terrasse', seats: 'Nombre de chaises', add: 'Ajouter la table', nameRequired: 'Saisissez le nom de la table.', added: 'Table ajoutée.' },
    order: {
      searchPh: 'Rechercher un plat du menu...', empty: 'Aucun plat pour le moment', emptyText: 'Recherchez puis touchez un plat pour l’ajouter.',
      sent: 'Envoyé en cuisine', pending: 'Pas encore envoyé', total: 'Total', cancel: 'Annuler la table', sendKitchen: 'Envoyer en cuisine', close: 'Clôturer la table',
      closing: 'Clôture...', needItem: 'Ajoutez au moins un plat avant de clôturer.', sentToast: 'Envoyé en cuisine — ticket prêt à imprimer.',
      cancelledToast: 'Commande annulée.', closedToast: 'Table clôturée — facture créée.', closeError: 'Erreur lors de la clôture.',
      cancelTitle: 'Annuler la commande de cette table ?', cancelText: 'Tous les plats de la commande seront retirés.',
      closeTitle: 'Clôturer la table ?', closeText: 'Une facture en espèces de {{amount}} sera créée.', openedAt: 'Ouverte à {{time}}', printKitchen: 'Bon cuisine', printBill: 'Addition', removeSentTitle: 'Retirer un plat déjà envoyé en cuisine ?', removeSentText: 'La cuisine le prépare peut-être déjà. Prévenez le chef.', resumeClose: 'La facture existe déjà — finalisation de la clôture.', pay: { title: 'Encaisser et clôturer la table', method: 'Mode de paiement', cash: 'Espèces', moncash: 'MonCash', natcash: 'NatCash', card: 'Carte', discount: 'Remise (%)', given: 'Montant reçu', exact: 'Exact', change: 'Monnaie à rendre', short: 'Manque', confirm: 'Confirmer le paiement', subtotal: 'Sous-total' },
    },
  },
  orders: {
    title: 'Commandes en ligne', subtitle: 'Commandes passées par les clients sur le portail', newCount: '{{count}} nouvelle(s)',
    cols: { nouvo: 'Nouvelles', kitchen: 'En préparation', ready: 'Prêtes / en route', done: "Terminées aujourd'hui" },
    status: { nouvo: 'Nouvelle', konfime: 'Confirmée', nan_kizin: 'En cuisine', pare: 'Prête', sou_wout: 'En route', livre: 'Livrée', anile: 'Annulée' },
    actions: { konfime: 'Accepter', nan_kizin: 'Envoyer en cuisine', pare: 'Marquer prête', sou_wout: 'Envoyer en livraison', livre: 'Livrée', livrePickup: 'Récupérée', anile: 'Annuler', invoice: 'Créer la facture', invoiced: 'Facture créée', call: 'Appeler', whatsapp: 'WhatsApp' },
    mode: { delivery: 'Livraison', pickup: 'À emporter' },
    payment: { cash: 'Espèces', moncash: 'MonCash', natcash: 'NatCash' },
    colEmpty: 'Rien ici', customer: 'Client', address: 'Adresse', items: 'Articles', subtotal: 'Sous-total', deliveryFee: 'Frais de livraison',
    total: 'Total', history: 'Historique', cancelTitle: 'Annuler la commande {{code}} ?', cancelText: 'Le client verra la commande comme annulée.',
    updated: 'Commande mise à jour.', invoiceCreated: 'Facture créée pour la commande {{code}}.', invoiceError: "La facture n'a pas pu être créée.",
    newAlert: 'Nouvelle commande en ligne !', portalOff: "Le portail client n'est pas activé. Activez-le dans Paramètres du portail.", setupPortal: 'Paramètres du portail',
    scope: { active: 'Actives', history: 'Historique 30 jours' }, emptyHistory: 'Pas encore d\'historique.', notify: 'Prévenir le client', printKitchen: 'Bon cuisine', autoInvoice: 'La facture sera créée automatiquement à la livraison.', deliverAndInvoice: 'Livrer + facturer', rating: 'Note du client', wa: { konfime: 'Bonjour {{name}}, {{resto}} a confirmé votre commande {{code}}. Suivez-la ici : {{link}}', nan_kizin: 'Bonjour {{name}}, le chef prépare votre commande {{code}}. {{link}}', pare: 'Bonjour {{name}}, votre commande {{code}} est prête ! {{link}}', sou_wout: 'Bonjour {{name}}, le livreur est en route avec votre commande {{code}}. {{link}}', livre: 'Merci {{name}} ! Bon appétit. Notez votre commande ici : {{link}}', anile: 'Bonjour {{name}}, désolé, votre commande {{code}} a été annulée. Contactez-nous pour plus d’informations.' },
  },
  resv: {
    title: 'Réservations', subtitle: 'Tables réservées en ligne ou par téléphone', new: 'Nouvelle réservation',
    empty: 'Aucune réservation ce jour-là', emptyText: 'Les réservations faites sur le portail apparaîtront ici.',
    status: { an_atant: 'En attente', konfime: 'Confirmée', chita: 'Installée', fini: 'Terminée', anile: 'Annulée', pa_vini: 'Absent' },
    actions: { konfime: 'Confirmer', chita: 'Installer le client', fini: 'Terminer', anile: 'Annuler', pa_vini: 'Absent' },
    table: 'Table', noTable: 'Aucune table', assign: 'Attribuer une table', source: { online: 'En ligne', staff: 'Personnel' },
    stats: { count: 'Réservations', guests: 'Personnes attendues', pending: 'En attente' },
    modal: { title: 'Nouvelle réservation', name: 'Nom du client', phone: 'Téléphone', email: 'E-mail', party: 'Nombre de personnes', date: 'Date', time: 'Heure', notes: 'Notes', create: 'Créer la réservation' },
    created: 'Réservation créée.', updated: 'Réservation mise à jour.', details: 'Détails de la réservation', notify: 'Prévenir le client', tableOpened: 'Table {{table}} ouverte pour {{name}}.', tableBusy: 'Cette table est déjà occupée.', waConfirm: 'Bonjour {{name}}, votre réservation chez {{resto}} le {{date}} à {{time}} ({{people}} pers.) est confirmée. Code : {{code}}. À bientôt !',
  },
  portal: {
    title: 'Portail client', subtitle: 'Là où vos clients commandent et réservent en ligne', enabled: 'Portail actif',
    enabledDesc: 'Les clients peuvent voir le menu, commander et réserver', link: 'Lien de votre portail', slug: 'Nom dans le lien',
    slugHint: 'Lettres, chiffres et tirets uniquement. Ex : {{example}}', notSaved: 'Enregistrez les paramètres pour activer le lien.',
    sections: { general: 'Informations du restaurant', orders: 'Commandes en ligne', reservations: 'Réservations', payment: 'Paiement' },
    acceptOrders: 'Accepter les commandes en ligne', acceptOrdersDesc: 'Les clients peuvent commander sur le portail',
    acceptingNow: 'Commandes ouvertes maintenant', acceptingNowDesc: 'Désactivez quand la cuisine est fermée ou débordée',
    delivery: 'Livraison', deliveryDesc: 'Nous livrons chez le client', pickup: 'À emporter', pickupDesc: 'Le client vient chercher sa commande',
    deliveryFee: 'Frais de livraison (HTG)', minOrder: 'Commande minimum (HTG)', prepMinutes: 'Temps de préparation (minutes)',
    phone: 'Téléphone', whatsapp: 'WhatsApp', address: 'Adresse', hours: "Heures d'ouverture", hoursPh: 'Ex. Lundi–Samedi 10h–22h',
    welcome: "Message d'accueil", welcomePh: 'Ex. Le meilleur griot du quartier !', payments: 'Modes de paiement acceptés', moncashNumber: 'Numéro MonCash',
    acceptResv: 'Accepter les réservations', acceptResvDesc: 'Les clients peuvent réserver une table en ligne', slots: 'Créneaux de réservation',
    slotsHint: 'Touchez un créneau pour le retirer.', addSlot: 'Ajouter', slotCapacity: 'Réservations max par créneau', maxParty: 'Personnes max par réservation',
    saved: 'Paramètres du portail enregistrés.', errors: { SLUG_TAKEN: 'Ce lien est déjà utilisé par un autre restaurant.', SLUG_INVALID: 'Lien trop court (3 caractères minimum).' },
    preview: 'Voir le portail', livePreview: 'Aperçu en direct', previewHint: 'Voici ce que verront vos clients. Enregistrez pour voir les changements.',
  },
  pub: {
    nav: { menu: 'Menu', reserve: 'Réserver', cart: 'Panier', track: 'Suivi' },
    open: 'Ouvert', closed: 'Commandes fermées', ordersPaused: "Le restaurant ne prend pas de commandes en ligne pour l'instant. Vous pouvez consulter le menu.",
    promoTag: 'Commande en ligne', promoTitle: 'Bon goût, livré chaud', promoDesc: 'Choisissez vos plats, nous les préparons tout de suite.', promoBtn: 'Voir le menu',
    hint1: 'Rechercher un plat...', hint2: 'Essayez « griot »', hint3: 'Boissons, desserts...', all: 'Tout', menuTitle: 'Notre menu',
    unavailable: 'Indisponible', add: 'Ajouter', addToCart: 'Ajouter au panier', added: 'Ajouté au panier !', itemNotePh: 'Note pour la cuisine (facultatif)',
    cart: { clear: 'Vider le panier', title: 'Votre panier', empty: 'Votre panier est vide', emptyText: 'Ajoutez vos plats préférés pour commander.', browse: 'Voir le menu', subtotal: 'Sous-total', deliveryFee: 'Livraison', free: 'Gratuit', total: 'Total', checkout: 'Continuer', view: 'Voir le panier', min: 'Commande minimum : {{amount}}' },
    checkout: { title: 'Finaliser la commande', mode: 'Comment la recevoir ?', name: 'Votre nom', namePh: 'Ex. Mika Jean', phone: 'Téléphone', phonePh: 'Ex. 3700 0000', address: 'Adresse de livraison', addressPh: 'Rue, quartier, point de repère...', payment: 'Paiement', notes: 'Notes', notesPh: 'Ex. Sans piment, sonner 2 fois...', place: 'Passer la commande', placing: 'Envoi...', moncashNote: 'Envoyez le montant au MonCash {{number}} avec le code de commande.', payOnReceive: 'Vous payez à la réception.' },
    success: { title: 'Commande envoyée !', text: 'Le restaurant a reçu votre commande. Gardez ce code pour la suivre.', track: 'Suivre la commande' },
    track: { steps: { received: 'Reçue', kitchen: 'En cuisine', ready: 'Prête', onTheWay: 'En route', delivered: 'Livrée', pickedUp: 'Récupérée' }, eta: 'Prête dans environ', title: 'Suivre votre commande', lookup: 'Saisissez le code de commande et les 4 derniers chiffres de votre téléphone.', code: 'Code de commande', last4: '4 derniers chiffres du téléphone', find: 'Rechercher', notFound: 'Commande introuvable.', mine: 'Mes commandes', none: "Vous n'avez pas encore de commande.", updatedAuto: 'Mise à jour automatique',
      text: { nouvo: 'Le restaurant a reçu votre commande. Confirmation imminente.', konfime: 'Votre commande est confirmée !', nan_kizin: 'Le chef prépare vos plats.', pare: 'Votre commande est prête !', sou_wout: 'Le livreur est en route.', livre: 'Bon appétit ! Merci de nous avoir choisis.', anile: 'Cette commande a été annulée. Contactez le restaurant.' } },
    reserve: { title: 'Réserver une table', subtitle: 'Choisissez le jour, l’heure et le nombre de personnes', day: 'Jour', time: 'Heure', people: 'Nombre de personnes', name: 'Votre nom', phone: 'Téléphone', email: 'E-mail (facultatif)', notes: 'Demande spéciale', confirm: 'Confirmer la réservation', done: 'Table réservée !', doneText: 'Le restaurant va confirmer votre réservation. Votre code : {{code}}', again: 'Faire une autre réservation', noSlots: 'Aucun créneau disponible ce jour-là.', closed: "Ce restaurant n'accepte pas les réservations en ligne.", pickTime: 'Choisissez une heure.' },
    errors: {
      PORTAL_NOT_FOUND: 'Restaurant introuvable.', PORTAL_DISABLED: "Le portail de ce restaurant n'est pas actif.",
      ORDERS_DISABLED: 'Ce restaurant ne prend pas de commandes en ligne.', ORDERS_PAUSED: 'Le restaurant ne prend pas de commandes pour le moment.',
      MODE_UNAVAILABLE: "Cette option n'est pas disponible.", NAME_REQUIRED: 'Saisissez votre nom.', PHONE_INVALID: 'Numéro de téléphone invalide.',
      ADDRESS_REQUIRED: "Saisissez l'adresse de livraison.", CART_EMPTY: 'Le panier est vide.', ITEM_UNAVAILABLE: "Un plat n'est plus disponible.",
      ITEM_NOT_FOUND: "Un plat n'est plus au menu.", MIN_ORDER: "Le montant minimum n'est pas atteint.", SLOT_FULL: 'Ce créneau est complet. Choisissez-en un autre.',
      DATE_INVALID: 'Date invalide.', TIME_INVALID: 'Heure invalide.', PARTY_INVALID: 'Nombre de personnes invalide.',
      RESV_DISABLED: 'Réservations indisponibles.', TOO_MANY: 'Trop de demandes. Patientez quelques minutes.', generic: 'Une erreur est survenue. Réessayez.',
    },
    info: { title: 'Informations', phone: 'Téléphone', address: 'Adresse', hours: "Heures d'ouverture" },
    notFoundTitle: 'Restaurant introuvable', poweredBy: 'Portail par PLUS GROUP', favorites: 'Favoris', addFav: 'Ajouter aux favoris', removeFav: 'Retirer des favoris', reviews: '{{count}} avis', rate: { title: 'Comment était votre commande ?', reviewPh: 'Un petit commentaire (facultatif)', send: 'Envoyer la note', thanks: 'Merci pour votre avis !' },
  },
}

const en = {
  common: {
    back: 'Back', refresh: 'Refresh', close: 'Close', cancel: 'Cancel', save: 'Save', saving: 'Saving...',
    delete: 'Delete', edit: 'Edit', confirm: 'Confirm', yes: 'Yes', no: 'No', search: 'Search', all: 'All',
    loading: 'Loading...', error: 'Something went wrong. Try again.', retry: 'Try again', add: 'Add', copy: 'Copy',
    copied: 'Copied!', open: 'Open', themeDark: 'Night mode', themeLight: 'Day mode', items: '{{count}} item(s)',
    people: '{{count}} guests', minutes: '{{count}} min', today: 'Today', tomorrow: 'Tomorrow', phone: 'Phone',
    notes: 'Notes', optional: 'optional', language: 'Language', ago: '{{count}} min ago', justNow: 'just now',
    hoursAgo: '{{count}} h ago', days: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
    months: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec',
  },
  nav: { menu: 'Menu', tables: 'Tables', orders: 'Online orders', reservations: 'Reservations', portal: 'Customer portal' },
  menu: {
    title: 'Menu', subtitle: "The restaurant's food and drinks", newItem: 'New dish', searchPh: 'Search a dish or a drink...',
    manageCategories: 'Categories', stats: { items: 'Dishes on menu', categories: 'Categories', lowStock: 'Low stock', outStock: 'Sold out' },
    low: 'Low stock', out: 'Sold out', inStock: '{{count}} {{unit}}', noCategory: 'No category',
    empty: 'The menu is empty', emptyText: 'Add your first dish so customers can see it.', emptySearch: 'No dish matches your search.',
    confirmDeleteTitle: 'Remove this dish?', confirmDelete: '"{{name}}" will be removed from the menu.',
    added: 'Dish added to the menu.', updated: 'Dish updated.', deleted: 'Dish removed.',
    page: 'Page {{page}} / {{pages}}',
    modal: {
      newTitle: 'New dish', editTitle: 'Edit dish', photo: 'Photo (optional)', addPhoto: 'Add photo', changePhoto: 'Change photo',
      removePhoto: 'Remove', imageOnly: 'Only images are accepted.', imageTooLarge: 'Image too large (max 2 MB).',
      name: 'Dish name', namePh: 'E.g. Griot with fried plantains', category: 'Category', unit: 'Unit', unitPh: 'portion, bottle...',
      priceHtg: 'Price (HTG)', priceUsd: 'Price (USD)', quantity: 'Available quantity', alertThreshold: 'Low-stock alert',
      description: 'Description', descriptionPh: 'Ingredients, taste...', add: 'Add to menu', update: 'Save changes',
      required: 'This field is required.',
    },
    cats: {
      title: 'Menu categories', subtitle: 'Starters, mains, drinks, desserts...', namePh: 'New category name',
      empty: 'No categories yet.', saved: 'Category saved.', deleted: 'Category deleted.',
      confirmDelete: 'Delete category "{{name}}"?',
    },
  },
  tables: {
    title: 'Tables & orders', subtitle: 'Tap a table to open or continue its order', newTable: 'New table',
    free: 'Free', busy: 'Occupied', allZones: 'All zones', reserved: 'Reserved', reservedAt: 'Reserved {{time}}', seats: '{{count}} seats',
    stats: { free: 'Free tables', busy: 'Occupied tables', openTotal: 'Open total', resv: "Today's reservations" },
    empty: 'No tables set up yet', emptyText: "Create the restaurant's tables to start taking orders.", createFirst: 'Create the first table',
    modal: { title: 'New table', name: 'Table name', namePh: 'E.g. Table 1, Terrace A', zone: 'Zone', zonePh: 'E.g. Inside, Terrace', seats: 'Number of seats', add: 'Add table', nameRequired: 'Enter the table name.', added: 'Table added.' },
    order: {
      searchPh: 'Search a dish on the menu...', empty: 'No dishes yet', emptyText: 'Search and tap a dish to add it.',
      sent: 'Sent to kitchen', pending: 'Not sent yet', total: 'Total', cancel: 'Cancel table', sendKitchen: 'Send to kitchen', close: 'Close table',
      closing: 'Closing...', needItem: 'Add at least one dish before closing the table.', sentToast: 'Sent to kitchen — ticket ready to print.',
      cancelledToast: 'Order cancelled.', closedToast: 'Table closed — invoice created.', closeError: 'Error while closing the table.',
      cancelTitle: "Cancel this table's order?", cancelText: 'All dishes in the order will be removed.',
      closeTitle: 'Close the table?', closeText: 'A cash invoice of {{amount}} will be created.', openedAt: 'Opened {{time}}', printKitchen: 'Kitchen ticket', printBill: 'Bill', removeSentTitle: 'Remove a dish already sent to the kitchen?', removeSentText: 'The kitchen may already be preparing it. Let the chef know.', resumeClose: 'The invoice already exists — finishing the table close.', pay: { title: 'Take payment & close table', method: 'Payment method', cash: 'Cash', moncash: 'MonCash', natcash: 'NatCash', card: 'Card', discount: 'Discount (%)', given: 'Amount received', exact: 'Exact', change: 'Change due', short: 'Missing', confirm: 'Confirm payment', subtotal: 'Subtotal' },
    },
  },
  orders: {
    title: 'Online orders', subtitle: 'Orders placed by customers on the restaurant portal', newCount: '{{count}} new',
    cols: { nouvo: 'New', kitchen: 'Preparing', ready: 'Ready / on the way', done: 'Done today' },
    status: { nouvo: 'New', konfime: 'Confirmed', nan_kizin: 'In kitchen', pare: 'Ready', sou_wout: 'On the way', livre: 'Delivered', anile: 'Cancelled' },
    actions: { konfime: 'Accept', nan_kizin: 'Send to kitchen', pare: 'Mark ready', sou_wout: 'Send for delivery', livre: 'Delivered', livrePickup: 'Picked up', anile: 'Cancel', invoice: 'Create invoice', invoiced: 'Invoice created', call: 'Call', whatsapp: 'WhatsApp' },
    mode: { delivery: 'Delivery', pickup: 'Pickup' },
    payment: { cash: 'Cash', moncash: 'MonCash', natcash: 'NatCash' },
    colEmpty: 'Nothing here', customer: 'Customer', address: 'Address', items: 'Items', subtotal: 'Subtotal', deliveryFee: 'Delivery fee',
    total: 'Total', history: 'History', cancelTitle: 'Cancel order {{code}}?', cancelText: 'The customer will see the order as cancelled.',
    updated: 'Order updated.', invoiceCreated: 'Invoice created for order {{code}}.', invoiceError: 'The invoice could not be created.',
    newAlert: 'New online order!', portalOff: 'The customer portal is not enabled. Turn it on in Portal settings.', setupPortal: 'Portal settings',
    scope: { active: 'Active', history: '30-day history' }, emptyHistory: 'No history yet.', notify: 'Notify customer', printKitchen: 'Kitchen ticket', autoInvoice: 'The invoice is created automatically when you mark it delivered.', deliverAndInvoice: 'Deliver + invoice', rating: 'Customer rating', wa: { konfime: 'Hi {{name}}, {{resto}} confirmed your order {{code}}. Track it here: {{link}}', nan_kizin: 'Hi {{name}}, the chef is preparing your order {{code}}. {{link}}', pare: 'Hi {{name}}, your order {{code}} is ready! {{link}}', sou_wout: 'Hi {{name}}, the courier is on the way with your order {{code}}. {{link}}', livre: 'Thanks {{name}}! Enjoy your meal. Rate your order here: {{link}}', anile: 'Hi {{name}}, sorry, your order {{code}} was cancelled. Contact us for more information.' },
  },
  resv: {
    title: 'Reservations', subtitle: 'Tables booked online or by phone', new: 'New reservation',
    empty: 'No reservations for this day', emptyText: 'Reservations made on the portal will appear here.',
    status: { an_atant: 'Pending', konfime: 'Confirmed', chita: 'Seated', fini: 'Finished', anile: 'Cancelled', pa_vini: 'No-show' },
    actions: { konfime: 'Confirm', chita: 'Seat guests', fini: 'Finish', anile: 'Cancel', pa_vini: 'No-show' },
    table: 'Table', noTable: 'No table', assign: 'Assign a table', source: { online: 'Online', staff: 'Staff' },
    stats: { count: 'Reservations', guests: 'Expected guests', pending: 'Pending' },
    modal: { title: 'New reservation', name: 'Customer name', phone: 'Phone', email: 'Email', party: 'Party size', date: 'Date', time: 'Time', notes: 'Notes', create: 'Create reservation' },
    created: 'Reservation created.', updated: 'Reservation updated.', details: 'Reservation details', notify: 'Notify customer', tableOpened: 'Table {{table}} opened for {{name}}.', tableBusy: 'This table is already occupied.', waConfirm: 'Hi {{name}}, your booking at {{resto}} on {{date}} at {{time}} ({{people}} guests) is confirmed. Code: {{code}}. See you soon!',
  },
  portal: {
    title: 'Customer portal', subtitle: 'Where your customers order and book online', enabled: 'Portal is live',
    enabledDesc: 'Customers can see the menu, order and book', link: 'Your portal link', slug: 'Name in the link',
    slugHint: 'Letters, numbers and dashes only. E.g. {{example}}', notSaved: 'Save the settings to activate the link.',
    sections: { general: 'Restaurant information', orders: 'Online orders', reservations: 'Reservations', payment: 'Payment' },
    acceptOrders: 'Accept online orders', acceptOrdersDesc: 'Customers can order on the portal',
    acceptingNow: 'Taking orders right now', acceptingNowDesc: 'Turn off when the kitchen is closed or too busy',
    delivery: 'Delivery', deliveryDesc: 'We deliver to the customer', pickup: 'Pickup', pickupDesc: 'The customer picks up the order',
    deliveryFee: 'Delivery fee (HTG)', minOrder: 'Minimum order (HTG)', prepMinutes: 'Preparation time (minutes)',
    phone: 'Phone', whatsapp: 'WhatsApp', address: 'Address', hours: 'Opening hours', hoursPh: 'E.g. Mon–Sat 10am–10pm',
    welcome: 'Welcome message', welcomePh: 'E.g. The best griot in town!', payments: 'Accepted payment methods', moncashNumber: 'MonCash number',
    acceptResv: 'Accept reservations', acceptResvDesc: 'Customers can book a table online', slots: 'Reservation times',
    slotsHint: 'Tap a time to remove it.', addSlot: 'Add time', slotCapacity: 'Max reservations per time', maxParty: 'Max guests per reservation',
    saved: 'Portal settings saved.', errors: { SLUG_TAKEN: 'This link is already used by another restaurant.', SLUG_INVALID: 'Link too short (at least 3 characters).' },
    preview: 'View portal', livePreview: 'Live preview', previewHint: 'This is what your customers see. Save to see your changes.',
  },
  pub: {
    nav: { menu: 'Menu', reserve: 'Book', cart: 'Cart', track: 'Track' },
    open: 'Open', closed: 'Not taking orders', ordersPaused: "The restaurant isn't taking online orders right now. You can still browse the menu.",
    promoTag: 'Order online', promoTitle: 'Great taste, delivered hot', promoDesc: "Pick your dishes, we'll prepare them right away.", promoBtn: 'See the menu',
    hint1: 'Search a dish...', hint2: 'Try "griot"', hint3: 'Drinks, desserts...', all: 'All', menuTitle: 'Our menu',
    unavailable: 'Unavailable', add: 'Add', addToCart: 'Add to cart', added: 'Added to cart!', itemNotePh: 'Note for the kitchen (optional)',
    cart: { clear: 'Clear cart', title: 'Your cart', empty: 'Your cart is empty', emptyText: 'Add the dishes you love to order.', browse: 'Browse the menu', subtotal: 'Subtotal', deliveryFee: 'Delivery', free: 'Free', total: 'Total', checkout: 'Continue', view: 'View cart', min: 'Minimum order: {{amount}}' },
    checkout: { title: 'Complete your order', mode: 'How do you want it?', name: 'Your name', namePh: 'E.g. Mika Jean', phone: 'Phone', phonePh: 'E.g. 3700 0000', address: 'Delivery address', addressPh: 'Street, area, landmark...', payment: 'Payment', notes: 'Notes', notesPh: 'E.g. No hot pepper, ring twice...', place: 'Place order', placing: 'Sending...', moncashNote: 'Send the amount to MonCash {{number}} with your order code.', payOnReceive: 'You pay when you receive your order.' },
    success: { title: 'Order sent!', text: 'The restaurant received your order. Keep this code to track it.', track: 'Track order' },
    track: { steps: { received: 'Received', kitchen: 'In kitchen', ready: 'Ready', onTheWay: 'On the way', delivered: 'Delivered', pickedUp: 'Picked up' }, eta: 'Ready in about', title: 'Track your order', lookup: 'Enter your order code and the last 4 digits of your phone.', code: 'Order code', last4: 'Last 4 phone digits', find: 'Find', notFound: 'We could not find this order.', mine: 'My orders', none: "You don't have any orders yet.", updatedAuto: 'Updates automatically',
      text: { nouvo: 'The restaurant received your order and will confirm it shortly.', konfime: 'Your order is confirmed!', nan_kizin: 'The chef is preparing your dishes.', pare: 'Your order is ready!', sou_wout: 'The courier is on the way.', livre: 'Enjoy your meal! Thanks for choosing us.', anile: 'This order was cancelled. Please contact the restaurant.' } },
    reserve: { title: 'Book a table', subtitle: 'Pick the day, time and party size', day: 'Day', time: 'Time', people: 'Party size', name: 'Your name', phone: 'Phone', email: 'Email (optional)', notes: 'Special request', confirm: 'Confirm booking', done: 'Table booked!', doneText: 'The restaurant will confirm your booking. Your code: {{code}}', again: 'Make another booking', noSlots: 'No times available on this day.', closed: "This restaurant doesn't take online bookings.", pickTime: 'Pick a time.' },
    errors: {
      PORTAL_NOT_FOUND: "We couldn't find this restaurant.", PORTAL_DISABLED: "This restaurant's portal isn't active right now.",
      ORDERS_DISABLED: "The restaurant doesn't take online orders.", ORDERS_PAUSED: "The restaurant isn't taking orders right now.",
      MODE_UNAVAILABLE: 'This option is not available.', NAME_REQUIRED: 'Enter your name.', PHONE_INVALID: 'Invalid phone number.',
      ADDRESS_REQUIRED: 'Enter the delivery address.', CART_EMPTY: 'The cart is empty.', ITEM_UNAVAILABLE: 'A dish is no longer available.',
      ITEM_NOT_FOUND: 'A dish is no longer on the menu.', MIN_ORDER: "The order doesn't reach the minimum amount.", SLOT_FULL: 'This time is fully booked. Pick another.',
      DATE_INVALID: 'Invalid date.', TIME_INVALID: 'Invalid time.', PARTY_INVALID: 'Invalid party size.',
      RESV_DISABLED: 'Reservations are not available.', TOO_MANY: 'Too many requests. Wait a few minutes.', generic: 'Something went wrong. Try again.',
    },
    info: { title: 'Information', phone: 'Phone', address: 'Address', hours: 'Opening hours' },
    notFoundTitle: 'Restaurant not found', poweredBy: 'Portal by PLUS GROUP', favorites: 'Favorites', addFav: 'Add to favorites', removeFav: 'Remove from favorites', reviews: '{{count}} reviews', rate: { title: 'How was your order?', reviewPh: 'A short comment (optional)', send: 'Send rating', thanks: 'Thanks for your feedback!' },
  },
}

const es = {
  common: {
    back: 'Volver', refresh: 'Actualizar', close: 'Cerrar', cancel: 'Cancelar', save: 'Guardar', saving: 'Guardando...',
    delete: 'Eliminar', edit: 'Editar', confirm: 'Confirmar', yes: 'Sí', no: 'No', search: 'Buscar', all: 'Todo',
    loading: 'Cargando...', error: 'Ocurrió un error. Inténtelo de nuevo.', retry: 'Reintentar', add: 'Agregar', copy: 'Copiar',
    copied: '¡Copiado!', open: 'Abrir', themeDark: 'Modo noche', themeLight: 'Modo día', items: '{{count}} artículo(s)',
    people: '{{count}} pers.', minutes: '{{count}} min', today: 'Hoy', tomorrow: 'Mañana', phone: 'Teléfono',
    notes: 'Notas', optional: 'opcional', language: 'Idioma', ago: 'hace {{count}} min', justNow: 'ahora mismo',
    hoursAgo: 'hace {{count}} h', days: 'Dom,Lun,Mar,Mié,Jue,Vie,Sáb',
    months: 'ene,feb,mar,abr,may,jun,jul,ago,sep,oct,nov,dic',
  },
  nav: { menu: 'Menú', tables: 'Mesas', orders: 'Pedidos en línea', reservations: 'Reservas', portal: 'Portal de clientes' },
  menu: {
    title: 'Menú', subtitle: 'Comidas y bebidas del restaurante', newItem: 'Nuevo plato', searchPh: 'Buscar un plato o una bebida...',
    manageCategories: 'Categorías', stats: { items: 'Platos en el menú', categories: 'Categorías', lowStock: 'Stock bajo', outStock: 'Agotado' },
    low: 'Stock bajo', out: 'Agotado', inStock: '{{count}} {{unit}}', noCategory: 'Sin categoría',
    empty: 'El menú está vacío', emptyText: 'Agregue su primer plato para que los clientes lo vean.', emptySearch: 'Ningún plato coincide con la búsqueda.',
    confirmDeleteTitle: '¿Quitar este plato?', confirmDelete: '«{{name}}» saldrá del menú.',
    added: 'Plato agregado al menú.', updated: 'Plato modificado.', deleted: 'Plato eliminado.',
    page: 'Página {{page}} / {{pages}}',
    modal: {
      newTitle: 'Nuevo plato', editTitle: 'Editar plato', photo: 'Foto (opcional)', addPhoto: 'Agregar foto', changePhoto: 'Cambiar foto',
      removePhoto: 'Quitar', imageOnly: 'Solo se aceptan imágenes.', imageTooLarge: 'Imagen demasiado grande (máx. 2 MB).',
      name: 'Nombre del plato', namePh: 'Ej. Griot con plátanos fritos', category: 'Categoría', unit: 'Unidad', unitPh: 'porción, botella...',
      priceHtg: 'Precio (HTG)', priceUsd: 'Precio (USD)', quantity: 'Cantidad disponible', alertThreshold: 'Alerta de stock bajo',
      description: 'Descripción', descriptionPh: 'Ingredientes, sabor...', add: 'Agregar al menú', update: 'Guardar cambios',
      required: 'Este campo es obligatorio.',
    },
    cats: {
      title: 'Categorías del menú', subtitle: 'Entradas, platos fuertes, bebidas, postres...', namePh: 'Nombre de la nueva categoría',
      empty: 'Aún no hay categorías.', saved: 'Categoría guardada.', deleted: 'Categoría eliminada.',
      confirmDelete: '¿Eliminar la categoría «{{name}}»?',
    },
  },
  tables: {
    title: 'Mesas y pedidos', subtitle: 'Toque una mesa para abrir o continuar su pedido', newTable: 'Nueva mesa',
    free: 'Libre', busy: 'Ocupada', allZones: 'Todas las zonas', reserved: 'Reservada', reservedAt: 'Reservada {{time}}', seats: '{{count}} puestos',
    stats: { free: 'Mesas libres', busy: 'Mesas ocupadas', openTotal: 'Total abierto', resv: 'Reservas de hoy' },
    empty: 'Aún no hay mesas configuradas', emptyText: 'Cree las mesas del restaurante para empezar a tomar pedidos.', createFirst: 'Crear la primera mesa',
    modal: { title: 'Nueva mesa', name: 'Nombre de la mesa', namePh: 'Ej. Mesa 1, Terraza A', zone: 'Zona', zonePh: 'Ej. Interior, Terraza', seats: 'Número de sillas', add: 'Agregar mesa', nameRequired: 'Ingrese el nombre de la mesa.', added: 'Mesa agregada.' },
    order: {
      searchPh: 'Buscar un plato del menú...', empty: 'Aún no hay platos', emptyText: 'Busque y toque un plato para agregarlo.',
      sent: 'Enviado a cocina', pending: 'Aún no enviado', total: 'Total', cancel: 'Cancelar mesa', sendKitchen: 'Enviar a cocina', close: 'Cerrar mesa',
      closing: 'Cerrando...', needItem: 'Agregue al menos un plato antes de cerrar la mesa.', sentToast: 'Enviado a cocina — ticket listo para imprimir.',
      cancelledToast: 'Pedido cancelado.', closedToast: 'Mesa cerrada — factura creada.', closeError: 'Error al cerrar la mesa.',
      cancelTitle: '¿Cancelar el pedido de esta mesa?', cancelText: 'Se quitarán todos los platos del pedido.',
      closeTitle: '¿Cerrar la mesa?', closeText: 'Se creará una factura en efectivo de {{amount}}.', openedAt: 'Abierta {{time}}', printKitchen: 'Comanda', printBill: 'Cuenta', removeSentTitle: '¿Quitar un plato ya enviado a cocina?', removeSentText: 'Puede que la cocina ya lo esté preparando. Avise al chef.', resumeClose: 'La factura ya existe — terminando el cierre de la mesa.', pay: { title: 'Cobrar y cerrar la mesa', method: 'Método de pago', cash: 'Efectivo', moncash: 'MonCash', natcash: 'NatCash', card: 'Tarjeta', discount: 'Descuento (%)', given: 'Monto recibido', exact: 'Exacto', change: 'Cambio a devolver', short: 'Falta', confirm: 'Confirmar pago', subtotal: 'Subtotal' },
    },
  },
  orders: {
    title: 'Pedidos en línea', subtitle: 'Pedidos hechos por los clientes en el portal', newCount: '{{count}} nuevo(s)',
    cols: { nouvo: 'Nuevos', kitchen: 'En preparación', ready: 'Listos / en camino', done: 'Terminados hoy' },
    status: { nouvo: 'Nuevo', konfime: 'Confirmado', nan_kizin: 'En cocina', pare: 'Listo', sou_wout: 'En camino', livre: 'Entregado', anile: 'Cancelado' },
    actions: { konfime: 'Aceptar', nan_kizin: 'Enviar a cocina', pare: 'Marcar listo', sou_wout: 'Enviar a domicilio', livre: 'Entregado', livrePickup: 'Recogido', anile: 'Cancelar', invoice: 'Crear factura', invoiced: 'Factura creada', call: 'Llamar', whatsapp: 'WhatsApp' },
    mode: { delivery: 'Domicilio', pickup: 'Para llevar' },
    payment: { cash: 'Efectivo', moncash: 'MonCash', natcash: 'NatCash' },
    colEmpty: 'Nada aquí', customer: 'Cliente', address: 'Dirección', items: 'Artículos', subtotal: 'Subtotal', deliveryFee: 'Costo de envío',
    total: 'Total', history: 'Historial', cancelTitle: '¿Cancelar el pedido {{code}}?', cancelText: 'El cliente verá el pedido como cancelado.',
    updated: 'Pedido actualizado.', invoiceCreated: 'Factura creada para el pedido {{code}}.', invoiceError: 'No se pudo crear la factura.',
    newAlert: '¡Nuevo pedido en línea!', portalOff: 'El portal de clientes no está activado. Actívelo en Configuración del portal.', setupPortal: 'Configuración del portal',
    scope: { active: 'Activos', history: 'Historial 30 días' }, emptyHistory: 'Aún no hay historial.', notify: 'Avisar al cliente', printKitchen: 'Comanda', autoInvoice: 'La factura se crea automáticamente al marcarlo entregado.', deliverAndInvoice: 'Entregar + facturar', rating: 'Calificación del cliente', wa: { konfime: 'Hola {{name}}, {{resto}} confirmó su pedido {{code}}. Sígalo aquí: {{link}}', nan_kizin: 'Hola {{name}}, el chef está preparando su pedido {{code}}. {{link}}', pare: 'Hola {{name}}, ¡su pedido {{code}} está listo! {{link}}', sou_wout: 'Hola {{name}}, el repartidor va en camino con su pedido {{code}}. {{link}}', livre: '¡Gracias {{name}}! Buen provecho. Califique su pedido aquí: {{link}}', anile: 'Hola {{name}}, lo sentimos, su pedido {{code}} fue cancelado. Contáctenos para más información.' },
  },
  resv: {
    title: 'Reservas', subtitle: 'Mesas reservadas en línea o por teléfono', new: 'Nueva reserva',
    empty: 'No hay reservas para este día', emptyText: 'Las reservas hechas en el portal aparecerán aquí.',
    status: { an_atant: 'Pendiente', konfime: 'Confirmada', chita: 'Sentados', fini: 'Terminada', anile: 'Cancelada', pa_vini: 'No vino' },
    actions: { konfime: 'Confirmar', chita: 'Sentar al cliente', fini: 'Terminar', anile: 'Cancelar', pa_vini: 'No vino' },
    table: 'Mesa', noTable: 'Sin mesa', assign: 'Asignar mesa', source: { online: 'En línea', staff: 'Personal' },
    stats: { count: 'Reservas', guests: 'Personas esperadas', pending: 'Pendientes' },
    modal: { title: 'Nueva reserva', name: 'Nombre del cliente', phone: 'Teléfono', email: 'Correo', party: 'Número de personas', date: 'Fecha', time: 'Hora', notes: 'Notas', create: 'Crear reserva' },
    created: 'Reserva creada.', updated: 'Reserva actualizada.', details: 'Detalles de la reserva', notify: 'Avisar al cliente', tableOpened: 'Mesa {{table}} abierta para {{name}}.', tableBusy: 'Esta mesa ya está ocupada.', waConfirm: 'Hola {{name}}, su reserva en {{resto}} el {{date}} a las {{time}} ({{people}} pers.) está confirmada. Código: {{code}}. ¡Le esperamos!',
  },
  portal: {
    title: 'Portal de clientes', subtitle: 'Donde sus clientes piden y reservan en línea', enabled: 'Portal activo',
    enabledDesc: 'Los clientes pueden ver el menú, pedir y reservar', link: 'Enlace de su portal', slug: 'Nombre en el enlace',
    slugHint: 'Solo letras, números y guiones. Ej.: {{example}}', notSaved: 'Guarde la configuración para activar el enlace.',
    sections: { general: 'Información del restaurante', orders: 'Pedidos en línea', reservations: 'Reservas', payment: 'Pago' },
    acceptOrders: 'Aceptar pedidos en línea', acceptOrdersDesc: 'Los clientes pueden pedir en el portal',
    acceptingNow: 'Recibiendo pedidos ahora', acceptingNowDesc: 'Desactívelo cuando la cocina esté cerrada o saturada',
    delivery: 'Domicilio', deliveryDesc: 'Entregamos en casa del cliente', pickup: 'Para llevar', pickupDesc: 'El cliente recoge el pedido',
    deliveryFee: 'Costo de envío (HTG)', minOrder: 'Pedido mínimo (HTG)', prepMinutes: 'Tiempo de preparación (minutos)',
    phone: 'Teléfono', whatsapp: 'WhatsApp', address: 'Dirección', hours: 'Horario', hoursPh: 'Ej. Lun–Sáb 10:00–22:00',
    welcome: 'Mensaje de bienvenida', welcomePh: 'Ej. ¡El mejor griot de la zona!', payments: 'Métodos de pago aceptados', moncashNumber: 'Número MonCash',
    acceptResv: 'Aceptar reservas', acceptResvDesc: 'Los clientes pueden reservar una mesa en línea', slots: 'Horarios de reserva',
    slotsHint: 'Toque un horario para quitarlo.', addSlot: 'Agregar', slotCapacity: 'Reservas máx. por horario', maxParty: 'Personas máx. por reserva',
    saved: 'Configuración del portal guardada.', errors: { SLUG_TAKEN: 'Este enlace ya lo usa otro restaurante.', SLUG_INVALID: 'Enlace demasiado corto (mínimo 3 caracteres).' },
    preview: 'Ver el portal', livePreview: 'Vista previa en vivo', previewHint: 'Esto es lo que verán sus clientes. Guarde para ver los cambios.',
  },
  pub: {
    nav: { menu: 'Menú', reserve: 'Reservar', cart: 'Carrito', track: 'Seguir' },
    open: 'Abierto', closed: 'Pedidos cerrados', ordersPaused: 'El restaurante no recibe pedidos en línea por ahora. Puede ver el menú.',
    promoTag: 'Pida en línea', promoTitle: 'Buen sabor, entregado caliente', promoDesc: 'Elija sus platos y los preparamos enseguida.', promoBtn: 'Ver el menú',
    hint1: 'Buscar un plato...', hint2: 'Pruebe «griot»', hint3: 'Bebidas, postres...', all: 'Todo', menuTitle: 'Nuestro menú',
    unavailable: 'No disponible', add: 'Agregar', addToCart: 'Agregar al carrito', added: '¡Agregado al carrito!', itemNotePh: 'Nota para la cocina (opcional)',
    cart: { clear: 'Vaciar carrito', title: 'Su carrito', empty: 'Su carrito está vacío', emptyText: 'Agregue sus platos favoritos para pedir.', browse: 'Ver el menú', subtotal: 'Subtotal', deliveryFee: 'Envío', free: 'Gratis', total: 'Total', checkout: 'Continuar', view: 'Ver carrito', min: 'Pedido mínimo: {{amount}}' },
    checkout: { title: 'Finalizar el pedido', mode: '¿Cómo lo quiere recibir?', name: 'Su nombre', namePh: 'Ej. Mika Jean', phone: 'Teléfono', phonePh: 'Ej. 3700 0000', address: 'Dirección de entrega', addressPh: 'Calle, zona, referencia...', payment: 'Pago', notes: 'Notas', notesPh: 'Ej. Sin picante, tocar 2 veces...', place: 'Hacer pedido', placing: 'Enviando...', moncashNote: 'Envíe el monto al MonCash {{number}} con el código del pedido.', payOnReceive: 'Paga al recibir el pedido.' },
    success: { title: '¡Pedido enviado!', text: 'El restaurante recibió su pedido. Guarde este código para seguirlo.', track: 'Seguir el pedido' },
    track: { steps: { received: 'Recibido', kitchen: 'En cocina', ready: 'Listo', onTheWay: 'En camino', delivered: 'Entregado', pickedUp: 'Recogido' }, eta: 'Listo en aprox.', title: 'Siga su pedido', lookup: 'Ingrese el código del pedido y los 4 últimos dígitos de su teléfono.', code: 'Código del pedido', last4: '4 últimos dígitos del teléfono', find: 'Buscar', notFound: 'No encontramos este pedido.', mine: 'Mis pedidos', none: 'Aún no tiene pedidos.', updatedAuto: 'Se actualiza automáticamente',
      text: { nouvo: 'El restaurante recibió su pedido y lo confirmará pronto.', konfime: '¡Su pedido está confirmado!', nan_kizin: 'El chef está preparando sus platos.', pare: '¡Su pedido está listo!', sou_wout: 'El repartidor va en camino.', livre: '¡Buen provecho! Gracias por elegirnos.', anile: 'Este pedido fue cancelado. Contacte al restaurante.' } },
    reserve: { title: 'Reservar una mesa', subtitle: 'Elija el día, la hora y el número de personas', day: 'Día', time: 'Hora', people: 'Número de personas', name: 'Su nombre', phone: 'Teléfono', email: 'Correo (opcional)', notes: 'Solicitud especial', confirm: 'Confirmar reserva', done: '¡Mesa reservada!', doneText: 'El restaurante confirmará su reserva. Su código: {{code}}', again: 'Hacer otra reserva', noSlots: 'No hay horarios disponibles ese día.', closed: 'Este restaurante no acepta reservas en línea.', pickTime: 'Elija una hora.' },
    errors: {
      PORTAL_NOT_FOUND: 'No encontramos este restaurante.', PORTAL_DISABLED: 'El portal de este restaurante no está activo.',
      ORDERS_DISABLED: 'El restaurante no recibe pedidos en línea.', ORDERS_PAUSED: 'El restaurante no recibe pedidos por ahora.',
      MODE_UNAVAILABLE: 'Esta opción no está disponible.', NAME_REQUIRED: 'Ingrese su nombre.', PHONE_INVALID: 'Número de teléfono inválido.',
      ADDRESS_REQUIRED: 'Ingrese la dirección de entrega.', CART_EMPTY: 'El carrito está vacío.', ITEM_UNAVAILABLE: 'Un plato ya no está disponible.',
      ITEM_NOT_FOUND: 'Un plato ya no está en el menú.', MIN_ORDER: 'El pedido no alcanza el monto mínimo.', SLOT_FULL: 'Este horario está lleno. Elija otro.',
      DATE_INVALID: 'Fecha inválida.', TIME_INVALID: 'Hora inválida.', PARTY_INVALID: 'Número de personas inválido.',
      RESV_DISABLED: 'Reservas no disponibles.', TOO_MANY: 'Demasiadas solicitudes. Espere unos minutos.', generic: 'Ocurrió un error. Inténtelo de nuevo.',
    },
    info: { title: 'Información', phone: 'Teléfono', address: 'Dirección', hours: 'Horario' },
    notFoundTitle: 'Restaurante no encontrado', poweredBy: 'Portal por PLUS GROUP', favorites: 'Favoritos', addFav: 'Agregar a favoritos', removeFav: 'Quitar de favoritos', reviews: '{{count}} reseñas', rate: { title: '¿Qué tal estuvo su pedido?', reviewPh: 'Un comentario corto (opcional)', send: 'Enviar calificación', thanks: '¡Gracias por su opinión!' },
  },
}

export const RESTO_BUNDLES = { ht, fr, en, es }

// Kòd lang yo ka diferan nan app la (ht/kr/cr, fr-FR...). N anrejistre Kreyòl anba plizyè kòd.
const CODE_ALIASES = { ht: ['ht', 'kr', 'cr', 'ht-HT', 'kreyol', 'creole'], fr: ['fr'], en: ['en'], es: ['es'] }

export const LANGS = [
  { id: 'ht', label: 'Kreyòl', short: 'KR' },
  { id: 'fr', label: 'Français', short: 'FR' },
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'es', label: 'Español', short: 'ES' },
]

const registered = new WeakSet()
export function ensureRestoI18n(i18n) {
  if (!i18n || registered.has(i18n) || typeof i18n.addResourceBundle !== 'function') return
  const ns = (i18n.options && (i18n.options.defaultNS && [].concat(i18n.options.defaultNS)[0])) || 'translation'
  Object.entries(RESTO_BUNDLES).forEach(([lng, bundle]) => {
    CODE_ALIASES[lng].forEach((code) => i18n.addResourceBundle(code, ns, { resto: bundle }, true, true))
  })
  registered.add(i18n)
}

// Ki lang (ht/fr/en/es) app la ap itilize kounye a
export function baseLang(i18n) {
  const l = String(i18n?.language || i18n?.resolvedLanguage || 'ht').toLowerCase()
  if (l.startsWith('fr')) return 'fr'
  if (l.startsWith('en')) return 'en'
  if (l.startsWith('es')) return 'es'
  return 'ht'
}

// Chanje lang lan an itilizan kòd app la deja konnen (si li egziste)
export function changeRestoLang(i18n, id) {
  const known = [].concat(i18n?.options?.supportedLngs || []).concat(Object.keys(i18n?.options?.resources || {}))
  const target = CODE_ALIASES[id].find((c) => known.includes(c)) || id
  try { localStorage.setItem('plusgroup-lang', target) } catch { /* */ } // menm kle ak AppLayout
  return i18n.changeLanguage(target)
}

// Hook pou tout paj restoran yo: const { t, i18n, lang } = useRT()
export function useRT() {
  const r = useTranslation()
  ensureRestoI18n(r.i18n)
  const t = (key, opts) => r.t(`resto.${key}`, opts)
  // Tradui yon kòd erè backend (SLOT_FULL...) — sinon mesaj jeneral
  const te = (code) => {
    const k = `resto.pub.errors.${code}`
    return code && r.i18n.exists(k) ? r.t(k) : r.t('resto.pub.errors.generic')
  }
  return { t, te, i18n: r.i18n, lang: baseLang(r.i18n) }
}
