// ═══════════════════════════════════════════════════════════════
// MOTÈ KALKIL MIKWO KREDI — Declining Balance + Enterè Kouru
// ═══════════════════════════════════════════════════════════════

/**
 * Jenere tablo echeans konplè (declining balance)
 * @param {number} kapital - Montan prè
 * @param {number} tauxMensuel - To enterè pa mwa (%)
 * @param {number} nbrPeman - Nombre total peman
 * @param {Date} datDebut - Dat premye peman
 * @param {string} frekans - jounal|semaine|biweekly|mois|trimestre
 * @returns {Array} Tablo echeans
 */
function genereEcheances(kapital, tauxMensuel, nbrPeman, datDebut, frekans) {
  const r = tauxMensuel / 100  // taux pa mwa an desimal

  // ── Konvèti taux selon frekans ──────────────────────────────
  // Fòmil: taux_periode = (1 + r)^(jou_periode/30) - 1
  const tauxParPeriode = (() => {
    switch (frekans) {
      case 'jounal':    return Math.pow(1 + r, 1/30)   - 1
      case 'semaine':   return Math.pow(1 + r, 7/30)   - 1
      case 'biweekly':  return Math.pow(1 + r, 14/30)  - 1
      case 'mois':      return r
      case 'trimestre': return Math.pow(1 + r, 3)      - 1
      default:          return r
    }
  })()

  // ── Peman fiks (anuité constante) ───────────────────────────
  // Fòmil anuité: PMT = K × i / (1 - (1+i)^-n)
  let pmt
  if (tauxParPeriode === 0) {
    pmt = kapital / nbrPeman
  } else {
    pmt = kapital * tauxParPeriode / (1 - Math.pow(1 + tauxParPeriode, -nbrPeman))
  }
  pmt = Math.round(pmt * 100) / 100

  // ── Jenere chak echeans ──────────────────────────────────────
  const echeances = []
  let balans = kapital

  for (let i = 1; i <= nbrPeman; i++) {
    const balansAvant  = Math.round(balans * 100) / 100
    const interet      = Math.round(balans * tauxParPeriode * 100) / 100
    let   remCapital   = Math.round((pmt - interet) * 100) / 100

    // Dènye peman — ajuste pou evite diferans arondiman
    if (i === nbrPeman) {
      remCapital = Math.round(balans * 100) / 100
    }

    const montantTotal = Math.round((remCapital + interet) * 100) / 100
    const balansApre   = Math.max(0, Math.round((balans - remCapital) * 100) / 100)

    echeances.push({
      numero:         i,
      datLimit:       calcDateLimite(datDebut, i, frekans),
      montantCapital: remCapital,
      montantInteret: interet,
      montantTotal,
      balansAvant,
      balansApre,
      statut:         'attente',
      montantPaye:    0,
      datePayé:       null,
      interetKouru:   0,
      jouReta:        0,
    })

    balans = balansApre
  }

  return echeances
}

/**
 * Kalkile dat limit chak echeans
 */
function calcDateLimite(datDebut, numero, frekans) {
  const d = new Date(datDebut)
  switch (frekans) {
    case 'jounal':    d.setDate(d.getDate() + (numero - 1));           break
    case 'semaine':   d.setDate(d.getDate() + (numero - 1) * 7);      break
    case 'biweekly':  d.setDate(d.getDate() + (numero - 1) * 14);     break
    case 'mois':      d.setMonth(d.getMonth() + (numero - 1));        break
    case 'trimestre': d.setMonth(d.getMonth() + (numero - 1) * 3);    break
    default:          d.setMonth(d.getMonth() + (numero - 1));
  }
  return d.toISOString().split('T')[0]
}

/**
 * Kalkile nombre peman selon frekans ak dire (mwa)
 */
function calcNbrPeman(dureeEnMois, frekans) {
  switch (frekans) {
    case 'jounal':    return Math.round(dureeEnMois * 30)
    case 'semaine':   return Math.round(dureeEnMois * 4.33)
    case 'biweekly':  return Math.round(dureeEnMois * 2.17)
    case 'mois':      return dureeEnMois
    case 'trimestre': return Math.ceil(dureeEnMois / 3)
    default:          return dureeEnMois
  }
}

/**
 * Kalkile enterè kouru pou yon echeans an reta
 * Fòmil: I = P × (r/30) × jou_reta
 * @param {number} balans - Balans ki rete nan prè a
 * @param {number} tauxMensuel - To enterè pa mwa (%)
 * @param {string} datLimit - Dat limit echeans lan
 * @param {Date} aujourdui - Dat jodi a
 */
function calcInteretKouru(balans, tauxMensuel, datLimit, aujourdui = new Date()) {
  const datLimite = new Date(datLimit)
  if (aujourdui <= datLimite) return { interetKouru: 0, jouReta: 0 }

  const jouReta = Math.floor((aujourdui - datLimite) / (1000 * 60 * 60 * 24))
  const tauxJounalye = tauxMensuel / 100 / 30
  const interetKouru = Math.round(balans * tauxJounalye * jouReta * 100) / 100

  return { interetKouru, jouReta }
}

/**
 * Aloke yon peman sou echeans yo (principle: enterè anvan kapital)
 * @param {Array} echeances - Lis echeans
 * @param {number} montantPaye - Montan kliyan peye
 * @param {number} tauxMensuel - Pou kalkil enterè kouru
 * @param {Date} datPaiement - Dat peman an
 */
function alokePaiement(echeances, montantPaye, tauxMensuel, datPaiement = new Date()) {
  let resteAPayer = montantPaye
  const echeancesMise = []

  for (const ech of echeances) {
    if (resteAPayer <= 0) break
    if (ech.statut === 'paye') continue

    // Kalkile enterè kouru si an reta
    const { interetKouru, jouReta } = calcInteretKouru(
      ech.balansAvant, tauxMensuel, ech.datLimit, datPaiement
    )
    const totalDweAjou = ech.montantTotal + interetKouru - ech.montantPaye

    if (resteAPayer >= totalDweAjou) {
      // Peman konplè pou echeans sa
      echeancesMise.push({
        ...ech,
        montantPaye:  ech.montantPaye + totalDweAjou,
        datPaye:      datPaiement.toISOString().split('T')[0],
        statut:       'paye',
        interetKouru,
        jouReta,
      })
      resteAPayer -= totalDweAjou
    } else {
      // Peman pasyèl
      echeancesMise.push({
        ...ech,
        montantPaye:  ech.montantPaye + resteAPayer,
        statut:       'partiel',
        interetKouru,
        jouReta,
      })
      resteAPayer = 0
    }
  }

  return { echeancesMise, resteNonAloke: resteAPayer }
}

module.exports = {
  genereEcheances,
  calcNbrPeman,
  calcDateLimite,
  calcInteretKouru,
  alokePaiement,
}