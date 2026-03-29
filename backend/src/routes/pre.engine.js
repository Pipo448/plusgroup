// src/routes/pre.engine.js — V2
// 3 Tip Kalkil: Flat | Declining Balance | Amortissement Constant

// ══════════════════════════════════════════════════════════════
// KONSTANT
// ══════════════════════════════════════════════════════════════
const TIP_KALKIL = {
  FLAT:      'flat',       // Enterè sou kapital total (pwogresif)
  DECLINING: 'declining',  // Enterè sou rès kapital (degressif)
  CONSTANT:  'constant',   // Kapital egal chak peman (amortissement constant)
}

// ══════════════════════════════════════════════════════════════
// KONVÈTI TAUX MENSUEL → TAUX PA PERIODE
// ══════════════════════════════════════════════════════════════
function tauxParPeriode(tauxMensuel, frekans) {
  const r = tauxMensuel / 100
  switch (frekans) {
    case 'jounal':    return Math.pow(1 + r, 1/30)  - 1
    case 'semaine':   return Math.pow(1 + r, 7/30)  - 1
    case 'biweekly':  return Math.pow(1 + r, 14/30) - 1
    case 'mois':      return r
    case 'trimestre': return Math.pow(1 + r, 3)     - 1
    default:          return r
  }
}

// ══════════════════════════════════════════════════════════════
// NOMBRE PEMAN selon frekans
// ══════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════
// DAT LIMIT chak echeans
// ══════════════════════════════════════════════════════════════
function calcDateLimite(datDebut, numero, frekans) {
  const d = new Date(datDebut)
  switch (frekans) {
    case 'jounal':    d.setDate(d.getDate()   + (numero - 1));        break
    case 'semaine':   d.setDate(d.getDate()   + (numero - 1) * 7);   break
    case 'biweekly':  d.setDate(d.getDate()   + (numero - 1) * 14);  break
    case 'mois':      d.setMonth(d.getMonth() + (numero - 1));        break
    case 'trimestre': d.setMonth(d.getMonth() + (numero - 1) * 3);   break
    default:          d.setMonth(d.getMonth() + (numero - 1));
  }
  return d.toISOString().split('T')[0]
}

const round2 = (n) => Math.round(n * 100) / 100

// ══════════════════════════════════════════════════════════════
// TIP 1: FLAT (Pwogresif / Intérêt simple)
// Enterè kalkile yon sèl fwa sou kapital total la
// Chak peman = (kapital + total enterè) / nbrPeman
// ══════════════════════════════════════════════════════════════
function genereEcheancesFlat(kapital, tauxMensuel, nbrPeman, datDebut, frekans) {
  const r           = tauxParPeriode(tauxMensuel, frekans)
  const totalInteret = round2(kapital * r * nbrPeman)
  const totalDu      = round2(kapital + totalInteret)
  const pmt          = round2(totalDu / nbrPeman)

  const echeances = []
  let resteKapital  = kapital
  let totalPaye     = 0

  for (let i = 1; i <= nbrPeman; i++) {
    const interetPeriode = round2(totalInteret / nbrPeman)

    // Dènye peman — ajiste pou evite diferans arondiman
    let capitalPeriode, montantTotal
    if (i === nbrPeman) {
      capitalPeriode = round2(resteKapital)
      montantTotal   = round2(capitalPeriode + interetPeriode)
    } else {
      capitalPeriode = round2(pmt - interetPeriode)
      montantTotal   = pmt
    }

    const balansAvant = round2(resteKapital)
    resteKapital      = round2(resteKapital - capitalPeriode)
    totalPaye         = round2(totalPaye + montantTotal)

    echeances.push({
      numero:         i,
      datLimit:       calcDateLimite(datDebut, i, frekans),
      montantCapital: capitalPeriode,
      montantInteret: interetPeriode,
      montantTotal,
      balansAvant,
      balansApre:     Math.max(0, resteKapital),
      statut:         'attente',
      montantPaye:    0,
      interetKouru:   0,
      jouReta:        0,
    })
  }

  return {
    echeances,
    totalDu:      round2(echeances.reduce((s, e) => s + e.montantTotal, 0)),
    totalInteret: round2(echeances.reduce((s, e) => s + e.montantInteret, 0)),
    pmtMwayèn:    pmt,
  }
}

// ══════════════════════════════════════════════════════════════
// TIP 2: DECLINING BALANCE (Degressif / Réduisant)
// Enterè kalkile sou rès kapital ki rete
// Anuité konstant: PMT = K × i / (1 - (1+i)^-n)
// ══════════════════════════════════════════════════════════════
function genereEcheancesDeclining(kapital, tauxMensuel, nbrPeman, datDebut, frekans) {
  const r = tauxParPeriode(tauxMensuel, frekans)

  // Kalkil PMT (anuité konstant)
  const pmt = r === 0
    ? round2(kapital / nbrPeman)
    : round2(kapital * r / (1 - Math.pow(1 + r, -nbrPeman)))

  const echeances = []
  let balans = kapital

  for (let i = 1; i <= nbrPeman; i++) {
    const balansAvant      = round2(balans)
    const interetPeriode   = round2(balans * r)
    let   capitalPeriode   = round2(pmt - interetPeriode)
    let   montantTotal     = pmt

    // Dènye peman — ajiste
    if (i === nbrPeman) {
      capitalPeriode = round2(balans)
      montantTotal   = round2(capitalPeriode + interetPeriode)
    }

    balans = round2(Math.max(0, balans - capitalPeriode))

    echeances.push({
      numero:         i,
      datLimit:       calcDateLimite(datDebut, i, frekans),
      montantCapital: capitalPeriode,
      montantInteret: interetPeriode,
      montantTotal,
      balansAvant,
      balansApre:     balans,
      statut:         'attente',
      montantPaye:    0,
      interetKouru:   0,
      jouReta:        0,
    })
  }

  return {
    echeances,
    totalDu:      round2(echeances.reduce((s, e) => s + e.montantTotal, 0)),
    totalInteret: round2(echeances.reduce((s, e) => s + e.montantInteret, 0)),
    pmtMwayèn:    pmt,
  }
}

// ══════════════════════════════════════════════════════════════
// TIP 3: AMORTISSEMENT CONSTANT (Kapital egal chak peman)
// Kapital = K / n (menm pou tout peman)
// Enterè diminye chak peman → total peman diminye tou
// ══════════════════════════════════════════════════════════════
function genereEcheancesConstant(kapital, tauxMensuel, nbrPeman, datDebut, frekans) {
  const r              = tauxParPeriode(tauxMensuel, frekans)
  const capitalFixe    = round2(kapital / nbrPeman)

  const echeances = []
  let balans = kapital

  for (let i = 1; i <= nbrPeman; i++) {
    const balansAvant    = round2(balans)
    const interetPeriode = round2(balans * r)

    // Dènye peman — ajiste kapital pou evite arondiman
    const capitalPeriode = i === nbrPeman ? round2(balans) : capitalFixe
    const montantTotal   = round2(capitalPeriode + interetPeriode)

    balans = round2(Math.max(0, balans - capitalPeriode))

    echeances.push({
      numero:         i,
      datLimit:       calcDateLimite(datDebut, i, frekans),
      montantCapital: capitalPeriode,
      montantInteret: interetPeriode,
      montantTotal,
      balansAvant,
      balansApre:     balans,
      statut:         'attente',
      montantPaye:    0,
      interetKouru:   0,
      jouReta:        0,
    })
  }

  return {
    echeances,
    totalDu:      round2(echeances.reduce((s, e) => s + e.montantTotal, 0)),
    totalInteret: round2(echeances.reduce((s, e) => s + e.montantInteret, 0)),
    pmtMwayèn:    round2(echeances.reduce((s, e) => s + e.montantTotal, 0) / nbrPeman),
  }
}

// ══════════════════════════════════════════════════════════════
// DISPATCHER — chwazi tip kalkil
// ══════════════════════════════════════════════════════════════
function genereEcheances(kapital, tauxMensuel, nbrPeman, datDebut, frekans, tipKalkil = 'declining') {
  switch (tipKalkil) {
    case TIP_KALKIL.FLAT:     return genereEcheancesFlat(kapital, tauxMensuel, nbrPeman, datDebut, frekans)
    case TIP_KALKIL.CONSTANT: return genereEcheancesConstant(kapital, tauxMensuel, nbrPeman, datDebut, frekans)
    case TIP_KALKIL.DECLINING:
    default:                  return genereEcheancesDeclining(kapital, tauxMensuel, nbrPeman, datDebut, frekans)
  }
}

// ══════════════════════════════════════════════════════════════
// KALKIL ENTERE KOURU (si an reta)
// Fòmil: I = Balans × (taux/30) × jou_reta
// ══════════════════════════════════════════════════════════════
function calcInteretKouru(balans, tauxMensuel, datLimit, aujourdui = new Date()) {
  const datLimite = new Date(datLimit)
  if (aujourdui <= datLimite) return { interetKouru: 0, jouReta: 0 }
  const jouReta      = Math.floor((aujourdui - datLimite) / (1000 * 60 * 60 * 24))
  const tauxJounalye = tauxMensuel / 100 / 30
  const interetKouru = round2(balans * tauxJounalye * jouReta)
  return { interetKouru, jouReta }
}

// ══════════════════════════════════════════════════════════════
// ALOKASYON PEMAN (enterè anvan kapital — règ standard)
// ══════════════════════════════════════════════════════════════
function alokePaiement(echeances, montantPaye, tauxMensuel, datPaiement = new Date()) {
  let resteAPayer = montantPaye
  const echeancesMise = []

  for (const ech of echeances) {
    if (resteAPayer <= 0) break
    if (ech.statut === 'paye') continue

    const { interetKouru, jouReta } = calcInteretKouru(
      ech.balansAvant, tauxMensuel, ech.datLimit, datPaiement
    )
    const totalDweAjou = round2(ech.montantTotal + interetKouru - ech.montantPaye)

    if (resteAPayer >= totalDweAjou) {
      echeancesMise.push({
        ...ech,
        montantPaye:  round2(ech.montantPaye + totalDweAjou),
        datPaye:      datPaiement.toISOString().split('T')[0],
        statut:       'paye',
        interetKouru,
        jouReta,
      })
      resteAPayer = round2(resteAPayer - totalDweAjou)
    } else {
      echeancesMise.push({
        ...ech,
        montantPaye:  round2(ech.montantPaye + resteAPayer),
        statut:       'partiel',
        interetKouru,
        jouReta,
      })
      resteAPayer = 0
    }
  }

  return { echeancesMise, resteNonAloke: round2(resteAPayer) }
}

// ══════════════════════════════════════════════════════════════
// PREVIEW RAPID (san dat — pou UI sèlman)
// ══════════════════════════════════════════════════════════════
function previewKalkil(kapital, tauxMensuel, nbrPeman, frekans, tipKalkil = 'declining') {
  if (!kapital || !tauxMensuel || !nbrPeman) {
    return { pmt: 0, pmtMwayèn: 0, totalDu: 0, totalInteret: 0, premyePeman: 0, dènyePeman: 0 }
  }

  const datDebut = new Date().toISOString().split('T')[0]
  const { echeances, totalDu, totalInteret, pmtMwayèn } = genereEcheances(
    kapital, tauxMensuel, nbrPeman, datDebut, frekans, tipKalkil
  )

  return {
    pmtMwayèn:    round2(pmtMwayèn),
    totalDu:      round2(totalDu),
    totalInteret: round2(totalInteret),
    premyePeman:  echeances[0]?.montantTotal || 0,
    dènyePeman:   echeances[echeances.length - 1]?.montantTotal || 0,
    pct:          round2((totalInteret / totalDu) * 100),
  }
}

module.exports = {
  TIP_KALKIL,
  genereEcheances,
  genereEcheancesFlat,
  genereEcheancesDeclining,
  genereEcheancesConstant,
  calcNbrPeman,
  calcDateLimite,
  calcInteretKouru,
  alokePaiement,
  previewKalkil,
}