// src/services/agentApi.js
import axios from 'axios'

export const agentApi = axios.create({
  baseURL: 'https://plusgroup-backend.onrender.com/api/v1',
  timeout: 45000
})

agentApi.interceptors.request.use((config) => {
  try {
    const { token } = JSON.parse(localStorage.getItem('pg-agent') || '{}')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

// ✅ Sèlman redirect sou yon vrè 401 — pa sou timeout/network error (cold start Render)
agentApi.interceptors.response.use(r => r, err => {
  const status = err.response?.status
  if (status === 401) {
    localStorage.removeItem('pg-agent')
    window.location.href = '/agent'
  }
  return Promise.reject(err)
})

export const getAgent = () => {
  try { return JSON.parse(localStorage.getItem('pg-agent') || '{}') } catch { return {} }
}

export const setAgent = (token, agent) => {
  localStorage.setItem('pg-agent', JSON.stringify({ token, agent }))
}

export const clearAgent = () => {
  localStorage.removeItem('pg-agent')
}
