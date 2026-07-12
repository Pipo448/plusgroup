// src/services/offlineAuth.js
// ══════════════════════════════════════════════════════════════
// PLUS GROUP — Login OFFLINE
//
// Chak fwa yon moun konekte AVÈK SIKSÈ pandan yo an liy, nou sove yon
// "anprint" (hash) modpas la lokalman — JANM modpas an klè. Si moun nan
// eseye konekte pandan PA gen entènèt, nou konpare ak anprint sa a epi
// restore dènye sesyon valid la (menm token) san kontakte backend la.
//
// ⚠️ Sa PA yon nouvo sesyon "reyèl" kote backend la — se yon RESTORATION
// lokal. Lè entènèt tounen, senkwonizasyon vant yo ap mande yon nouvo
// login AN LIY sèlman si backend rejte token an (li ekspire).
// ══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'plusgroup-offline-auth'

function getStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function setStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (e) { /* ignore quota errors */ }
}

function makeKey(slug, email) {
  return `${String(slug).toLowerCase().trim()}::${String(email).toLowerCase().trim()}`
}

function generateSalt() {
  const arr = new Uint8Array(16)
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(arr)
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ✅ Hash modpas ak Web Crypto (SHA-256) + sèl (salt) — jamè sove modpas an klè
async function hashPassword(password, salt) {
  const str = `${salt}:${password}`

  if (window.crypto?.subtle) {
    try {
      const enc  = new TextEncoder()
      const data = enc.encode(str)
      const buf  = await window.crypto.subtle.digest('SHA-256', data)
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
    } catch (e) {
      // repli anba a si Web Crypto echwe pou nenpòt rezon
    }
  }

  // ✅ Repli — pou aparèy ki pa sipòte Web Crypto (WebView trè ansyen).
  // Pa kriptografik, men ase pou objektif sa a (aksè lokal sèlman).
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return 'fb-' + Math.abs(hash).toString(16)
}

/**
 * Sove enfòmasyon koneksyon an lokalman apre yon login REYISI an liy.
 * Sa pèmèt menm moun nan "konekte offline" pita si backend pa aksesib.
 */
export async function saveOfflineCredentials({ slug, email, password, token, user, tenant }) {
  const salt         = generateSalt()
  const passwordHash = await hashPassword(password, salt)
  const store        = getStore()

  store[makeKey(slug, email)] = {
    salt,
    passwordHash,
    token,
    user,
    tenant,
    cachedAt: new Date().toISOString(),
  }
  setStore(store)
}

/**
 * Eseye konekte OFFLINE — konpare modpas ak anprint sove a.
 * Retounen { success: true, token, user, tenant, cachedAt } si ok,
 * sinon { success: false, reason }
 */
export async function tryOfflineLogin({ slug, email, password }) {
  const store = getStore()
  const entry = store[makeKey(slug, email)]

  if (!entry) {
    return { success: false, reason: 'no-cache' }
  }

  const candidateHash = await hashPassword(password, entry.salt)
  if (candidateHash !== entry.passwordHash) {
    return { success: false, reason: 'wrong-password' }
  }

  return {
    success:  true,
    token:    entry.token,
    user:     entry.user,
    tenant:   entry.tenant,
    cachedAt: entry.cachedAt,
  }
}

/**
 * Efase sesyon offline sove pou yon kont espesifik.
 */
export function clearOfflineCredentials(slug, email) {
  const store = getStore()
  delete store[makeKey(slug, email)]
  setStore(store)
}

/**
 * Efase TOUT sesyon offline sove sou aparèy sa a.
 */
export function clearAllOfflineCredentials() {
  localStorage.removeItem(STORAGE_KEY)
}
