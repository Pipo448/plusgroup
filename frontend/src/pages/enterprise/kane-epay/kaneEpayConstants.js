// src/pages/enterprise/kane-epay/kaneEpayConstants.js

export const PAYMENT_METHODS = [
  { value: 'cash',     label: 'Kach'      },
  { value: 'moncash',  label: 'MonCash'   },
  { value: 'natcash',  label: 'NatCash'   },
  { value: 'transfer', label: 'Virement'  },
  { value: 'card',     label: 'Kat Kredi' },
  { value: 'check',    label: 'Chèk'      },
]

export const FAMILY_RELATIONS = [
  'Manman','Papa','Sè','Frè','Kouzen','Kouzin',
  'Madanm','Mari','Bofis','Bofre','Belmè','Belsè',
  'Grann','Granpap','Pitit Fi','Pitit Gason','Tonton','Tante',
]

export const TX_STYLES = {
  ouverture: { color: '#C9A84C', bg: 'rgba(201,168,76,0.10)', label: 'Ouverture', icon: '🏦' },
  depot:     { color: '#27ae60', bg: 'rgba(39,174,96,0.12)',  label: 'Depo',      icon: '↓'  },
  retrait:   { color: '#C0392B', bg: 'rgba(192,57,43,0.10)',  label: 'Retrè',     icon: '↑'  },
}

export const KANE_STYLES = `
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sheetUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.5} }
  .ke-modal::-webkit-scrollbar       { width: 3px }
  .ke-modal::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.25); border-radius: 2px }
  .ke-modal input::placeholder,
  .ke-modal textarea::placeholder    { color: #2a3a54 }
  .ke-modal select option            { background: #0d1b2a; color: #e8eaf0 }
  .ke-row:hover                      { background: rgba(201,168,76,0.06) !important; }
  .ke-photo-box:hover                { border-color: rgba(201,168,76,0.5) !important; background: rgba(201,168,76,0.04) !important; }
  .ke-btn:active                     { transform: scale(0.97); }
  .ke-input:focus                    { border-color: #C9A84C !important; box-shadow: 0 0 0 2px rgba(201,168,76,0.14) !important; outline: none; }
  .ke-tab-btn:hover                  { background: rgba(201,168,76,0.08) !important; }
  .ke-stats-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .ke-today-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .ke-header        { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .ke-header-right  { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .ke-form-row      { display: flex; flex-direction: column; gap: 10px; }
  .ke-photo-grid    { display: grid; grid-template-columns: 1fr; gap: 12px; }
  .ke-acc-row-btns  { display: flex; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(201,168,76,0.1); }
  @media (min-width: 480px) { .ke-today-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 600px) {
    .ke-stats-grid { grid-template-columns: repeat(3, 1fr); }
    .ke-form-row   { flex-direction: row; }
    .ke-photo-grid { grid-template-columns: 1fr 1fr; }
    .ke-sheet      { border-radius: 20px !important; margin: 20px auto !important; max-height: 88vh !important; }
    .ke-overlay    { align-items: center !important; }
  }
  @media (min-width: 900px) {
    .ke-stats-grid { gap: 12px; grid-template-columns: repeat(4, 1fr); }
    .ke-today-grid { gap: 12px; }
  }
  @media (max-width: 380px) {
    .ke-stat-val    { font-size: 12px !important; }
    .ke-acc-num     { font-size: 10px !important; }
    .ke-acc-name    { font-size: 13px !important; }
    .ke-header-title{ font-size: 17px !important; }
  }
`
