// src/routes/pre.engine.js — V2.1
// 3 Tip Kalkil: Flat | Declining Balance | Amortissement Constant

// ══════════════════════════════════════════════════════════════
// KONSTANT
// ══════════════════════════════════════════════════════════════
const TIP_KALKIL = {
  FLAT:        'flat',        // Enterè sou kapital total (pwogresif)
  DECLINING:   'declining',   // Enterè sou rès kapital (degressif)
  CONSTANT:    'constant',    // Kapital egal chak peman (amortissement constant)
  BOUS_SOLEIL: 'bous_soleil', // Peman fiks chak jou × nombre jou
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
// ══════════════════════════════════════════════════════════════
function genereEcheancesFlat(kapital, tauxMensuel, nbrPeman, datDebut, frekans) {
  const r            = tauxParPeriode(tauxMensuel, frekans)
  const totalInteret = round2(kapital * r * nbrPeman)
  const totalDu      = round2(kapital + totalInteret)
  const pmt          = round2(totalDu / nbrPeman)

  const echeances = []
  let resteKapital  = kapital
  let totalPaye     = 0

  for (let i = 1; i <= nbrPeman; i++) {
    const interetPeriode = round2(totalInteret / nbrPeman)

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
// ══════════════════════════════════════════════════════════════
function genereEcheancesDeclining(kapital, tauxMensuel, nbrPeman, datDebut, frekans) {
  const r = tauxParPeriode(tauxMensuel, frekans)

  const pmt = r === 0
    ? round2(kapital / nbrPeman)
    : round2(kapital * r / (1 - Math.pow(1 + r, -nbrPeman)))

  const echeances = []
  let balans = kapital

  for (let i = 1; i <= nbrPeman; i++) {
    const balansAvant    = round2(balans)
    const interetPeriode = round2(balans * r)
    let   capitalPeriode = round2(pmt - interetPeriode)
    let   montantTotal   = pmt

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
// TIP 3: AMORTISSEMENT CONSTANT
// ══════════════════════════════════════════════════════════════
function genereEcheancesConstant(kapital, tauxMensuel, nbrPeman, datDebut, frekans) {
  const r           = tauxParPeriode(tauxMensuel, frekans)
  const capitalFixe = round2(kapital / nbrPeman)

  const echeances = []
  let balans = kapital

  for (let i = 1; i <= nbrPeman; i++) {
    const balansAvant    = round2(balans)
    const interetPeriode = round2(balans * r)
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
// TIP 4: BOUS SOLÈY
// ══════════════════════════════════════════════════════════════
function genereEcheancesBousSoleil(kapital, pemaParJou, nombreJou, datDebut) {
  if (!pemaParJou || pemaParJou <= 0) throw new Error('Peman pa jou dwe > 0')
  if (!nombreJou  || nombreJou  <= 0) throw new Error('Nombre jou dwe > 0')

  const totalPaye    = round2(pemaParJou * nombreJou)
  const totalInteret = round2(totalPaye - kapital)

  const echeances = []
  let resteKapital = kapital

  for (let i = 1; i <= nombreJou; i++) {
    const dat      = new Date(datDebut)
    dat.setDate(dat.getDate() + (i - 1))
    const datLimit = dat.toISOString().split('T')[0]

    const enterePajou  = round2(totalInteret / nombreJou)
    const capitalPajou = round2(pemaParJou - enterePajou)
    const balansAvant  = round2(resteKapital)

    const isLast       = i === nombreJou
    const capReyèl     = isLast ? round2(resteKapital) : capitalPajou
    const intReyèl     = isLast ? round2(pemaParJou - capReyèl) : enterePajou
    const totReyèl     = round2(capReyèl + intReyèl)

    resteKapital = round2(Math.max(0, resteKapital - capReyèl))

    echeances.push({
      numero:         i,
      datLimit,
      montantCapital: capReyèl,
      montantInteret: intReyèl,
      montantTotal:   totReyèl,
      balansAvant,
      balansApre:     resteKapital,
      statut:         'attente',
      montantPaye:    0,
      interetKouru:   0,
      jouReta:        0,
    })
  }

  return {
    echeances,
    totalDu:      round2(echeances.reduce((s, e) => s + e.montantTotal, 0)),
    totalInteret: round2(totalInteret),
    pmtMwayèn:    round2(pemaParJou),
    pemaParJou:   round2(pemaParJou),
    nombreJou,
  }
}

// ══════════════════════════════════════════════════════════════
// DISPATCHER
// ══════════════════════════════════════════════════════════════
function genereEcheances(kapital, tauxMensuel, nbrPeman, datDebut, frekans, tipKalkil = 'declining', opts = {}) {
  switch (tipKalkil) {
    case TIP_KALKIL.FLAT:        return genereEcheancesFlat(kapital, tauxMensuel, nbrPeman, datDebut, frekans)
    case TIP_KALKIL.CONSTANT:    return genereEcheancesConstant(kapital, tauxMensuel, nbrPeman, datDebut, frekans)
    case TIP_KALKIL.BOUS_SOLEIL: return genereEcheancesBousSoleil(kapital, opts.pemaParJou || 0, opts.nombreJou || nbrPeman, datDebut)
    case TIP_KALKIL.DECLINING:
    default:                     return genereEcheancesDeclining(kapital, tauxMensuel, nbrPeman, datDebut, frekans)
  }
}

// ══════════════════════════════════════════════════════════════
// KALKIL ENTERE KOURU (si an reta)
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
// ALOKASYON PEMAN — FIX: datPaye ajoute pou peman pasyèl tou
// ══════════════════════════════════════════════════════════════
function alokePaiement(echeances, montantPaye, tauxMensuel, datPaiement = new Date()) {
  let resteAPayer = montantPaye
  const echeancesMise = []
  const datStr = datPaiement instanceof Date
    ? datPaiement.toISOString().split('T')[0]
    : datPaiement

  for (const ech of echeances) {
    if (resteAPayer <= 0) break
    if (ech.statut === 'paye') continue

    const { interetKouru, jouReta } = calcInteretKouru(
      ech.balansAvant, tauxMensuel, ech.datLimit, datPaiement
    )
    const totalDweAjou = round2(ech.montantTotal + interetKouru - ech.montantPaye)

    if (resteAPayer >= totalDweAjou) {
      // Peman konplè
      echeancesMise.push({
        ...ech,
        montantPaye:  round2(ech.montantPaye + totalDweAjou),
        datPaye:      datStr,   // ✅ toujou set
        statut:       'paye',
        interetKouru,
        jouReta,
      })
      resteAPayer = round2(resteAPayer - totalDweAjou)
    } else {
      // Peman pasyèl — FIX: datPaye te manke isit
      echeancesMise.push({
        ...ech,
        montantPaye:  round2(ech.montantPaye + resteAPayer),
        datPaye:      datStr,   // ✅ ajoute — te undefined anvan
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
  genereEcheancesBousSoleil,
  calcNbrPeman,
  calcDateLimite,
  calcInteretKouru,
  alokePaiement,
  previewKalkil,
}