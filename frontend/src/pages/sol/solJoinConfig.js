// src/pages/sol/solJoinConfig.js
// ─── Kesyon default fòm "Rejwenn kominote a" ───
// Admin ka modifye yo nan AdminDashboard (Demann Sòl → Kesyon). Lè admin sove yon konfigirasyon,
// li ranplase default sa yo. Si pa gen anyen ki sove (oswa rezo a tonbe), fòm lan itilize default sa yo.
// Non, telefòn, adrès ak de kazye aksepte yo toujou la (pa modifyab).

export const Q_TYPES = [
  { v: 'text',     l: 'Tèks kout' },
  { v: 'textarea', l: 'Tèks long' },
  { v: 'yesno',    l: 'Wi / Non' },
  { v: 'choice',   l: 'Chwa (bouton)' },
  { v: 'stepper',  l: 'Nimewo (+ / −)' },
]

export const DEFAULT_CONFIG = {
  groups: [
    { id: 'g1', title: 'Ki moun ou ye ?',        sub: 'Kèk enfòmasyon pou n konnen ak ki moun n ap pale.' },
    { id: 'g2', title: 'Eksperyans ou',          sub: 'Di nou sa ou te viv, nou vle amelyore sòl la pou ou.' },
    { id: 'g3', title: 'Sòl ou vle a',           sub: 'Konbyen ak ki frekans ki bon pou ou ?' },
    { id: 'g4', title: 'Ede n fè sòl la grandi', sub: 'Plis moun seryè, plis kòb nan men chak manm.' },
  ],
  questions: [
    { id: 'occupation', group: 'g1', type: 'text', label: 'Ki biznis oswa travay ou fè ?', placeholder: 'egz: machann, kowafèz, chofè, anplwaye…' },
    { id: 'beenInOurSol', group: 'g2', type: 'yesno', required: true, label: 'Eske w te nan sòl nou an deja ?', yesLabel: 'Wi, mwen te ladan l', noLabel: 'Non, se premye fwa' },
    { id: 'likedText', group: 'g2', type: 'textarea', label: 'Kisa ou te renmen ?', placeholder: 'Di nou sa ki te bon pou ou…', showIf: { id: 'beenInOurSol', value: true } },
    { id: 'dislikedText', group: 'g2', type: 'textarea', label: 'Gen yon bagay ou pa t renmen ? Di nou pou n ranje l.', placeholder: 'Di nou sa ki pa t mache oswa sa ou ta vle nou chanje…', showIf: { id: 'beenInOurSol', value: true } },
    { id: 'referrer', group: 'g2', type: 'text', label: 'Ki moun ki refere w ?', placeholder: 'Non (ak telefòn si ou gen l). Si pa gen pèsonn, ekri “pèsonn”.', showIf: { id: 'beenInOurSol', value: false } },
    { id: 'howKnow', group: 'g2', type: 'choice', label: 'Kòman ou konnen n ap fè sòl / sabotay la ?', options: ['Zanmi oswa fanmi', 'Facebook', 'WhatsApp', 'Radyo / TV', 'Yon manm sòl la'], allowOther: true, showIf: { id: 'beenInOurSol', value: false } },
    { id: 'joinedOtherSol', group: 'g2', type: 'yesno', required: true, label: 'Eske w konn patisipe nan yon sòl konsa (lòt kote) deja ?' },
    { id: 'otherSolText', group: 'g2', type: 'textarea', label: 'Kijan sa te pase ?', placeholder: 'Sa ou te renmen, sa ou pa t renmen, ak sa ou ta vle wè nan pa nou an…', showIf: { id: 'joinedOtherSol', value: true } },
    { id: 'frequency', group: 'g3', type: 'choice', required: true, label: 'Ki frekans ki bon pou ou ?', options: ['Chak jou', 'Chak semèn', 'Chak 2 semèn', 'Chak mwa'] },
    { id: 'amount', group: 'g3', type: 'choice', required: true, gold: true, label: 'Konbyen ou ka mete chak fwa ? (HTG)', options: ['100', '250', '500', '1000', '2500', '5000'], allowOther: true },
    { id: 'slots', group: 'g3', type: 'stepper', label: 'Konbyen men ou vle ?', min: 1, max: 10 },
    { id: 'startWhen', group: 'g3', type: 'choice', label: 'Kilè ou vle kòmanse ?', options: ['Pi vit posib', 'Nan 1 semèn', 'Nan 1 mwa', 'Poko sèten'] },
    { id: 'canRecruit', group: 'g4', type: 'yesno', required: true, label: 'Eske w ka ede n jwenn kèk moun seryè k ap fè biznis pou rejwenn nou, pou kòb la ka vin pi plis ?', yesLabel: 'Wi, mwen konn moun', noLabel: 'Pa pou kounye a' },
    { id: 'recruitList', group: 'g4', type: 'textarea', label: 'Ki moun yo ?', placeholder: 'Youn pa liy: non + telefòn + ki biznis li fè\negz: Jean Pierre · 3412 5566 · Boutik manje', showIf: { id: 'canRecruit', value: true } },
    { id: 'message', group: 'g4', type: 'textarea', label: 'Yon kesyon oswa yon mesaj pou nou ?', placeholder: 'Ekri sa ou vle nou konnen…' },
  ],
}

// Ranpli chan ki manke yo pou chak kesyon (menm fòm si config la soti nan DB oswa default)
export function normalizeConfig(cfg) {
  const c = cfg && Array.isArray(cfg.groups) && cfg.groups.length && Array.isArray(cfg.questions) ? cfg : DEFAULT_CONFIG
  return {
    groups: c.groups.map((g, i) => ({ id: g.id || `g${i + 1}`, title: g.title || `Etap ${i + 1}`, sub: g.sub || '' })),
    questions: c.questions.map(q => ({
      id: q.id, group: q.group || c.groups[0].id, type: q.type || 'text', label: q.label || '',
      required: !!q.required, active: q.active !== false, placeholder: q.placeholder || '',
      options: Array.isArray(q.options) ? q.options : [], allowOther: !!q.allowOther, gold: !!q.gold,
      yesLabel: q.yesLabel || '', noLabel: q.noLabel || '',
      min: Number.isFinite(Number(q.min)) ? Number(q.min) : 1, max: Number.isFinite(Number(q.max)) ? Number(q.max) : 10,
      showIf: q.showIf && q.showIf.id ? q.showIf : null,
    })),
  }
}

export const isVisible = (q, answers) => {
  if (q.active === false) return false
  if (!q.showIf) return true
  const v = answers[q.showIf.id]
  return v === q.showIf.value
}
