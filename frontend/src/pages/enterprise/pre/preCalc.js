// src/pages/enterprise/pre/preCalc.js — Kalkil finansye

function _tp(r, frekans) {
  switch (frekans) {
    case 'jounal':    return Math.pow(1 + r, 1/30)  - 1
    case 'semaine':   return Math.pow(1 + r, 7/30)  - 1
    case 'biweekly':  return Math.pow(1 + r, 14/30) - 1
    case 'mois':      return r
    case 'trimestre': return Math.pow(1 + r, 3)     - 1
    default:          return r
  }
}
const r2 = (n) => Math.round(n * 100) / 100

export function calcPreviewEcheances(kapital, tauxMwa, nbrPeman, frekans, tipKalkil = 'declining') {
  if (!kapital || !tauxMwa || !nbrPeman)
    return { pmtMwayèn: 0, pmt: 0, premyePeman: 0, dènyePeman: 0, totalDu: 0, totalInteret: 0 }

  const tp = _tp(tauxMwa / 100, frekans)
  const K = kapital, n = nbrPeman

  if (tipKalkil === 'flat') {
    const totalInteret = r2(K * tp * n)
    const totalDu      = r2(K + totalInteret)
    const pmt          = r2(totalDu / n)
    return { pmtMwayèn: pmt, pmt, premyePeman: pmt, dènyePeman: pmt, totalDu, totalInteret }
  }

  if (tipKalkil === 'constant') {
    const capFixe      = r2(K / n)
    const premyeEntere = r2(K * tp)
    const dènyeEntere  = r2(capFixe * tp)
    const totalInteret = r2(K * tp * (n + 1) / 2)
    const totalDu      = r2(K + totalInteret)
    const pmtMwayèn    = r2(totalDu / n)
    return { pmtMwayèn, pmt: pmtMwayèn, premyePeman: r2(capFixe + premyeEntere), dènyePeman: r2(capFixe + dènyeEntere), totalDu, totalInteret }
  }

  // declining
  const pmt          = tp === 0 ? r2(K / n) : r2(K * tp / (1 - Math.pow(1 + tp, -n)))
  const totalDu      = r2(pmt * n)
  const totalInteret = r2(totalDu - K)
  return { pmtMwayèn: pmt, pmt, premyePeman: pmt, dènyePeman: pmt, totalDu, totalInteret }
}

export function calcNbrPeman(dureeEnMois, frekans) {
  switch (frekans) {
    case 'jounal':    return Math.round(dureeEnMois * 30)
    case 'semaine':   return Math.round(dureeEnMois * 4.33)
    case 'biweekly':  return Math.round(dureeEnMois * 2.17)
    case 'mois':      return dureeEnMois
    case 'trimestre': return Math.ceil(dureeEnMois / 3)
    default:          return dureeEnMois
  }
}
