// src/pages/enterprise/pre/preConstants.js
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import React from 'react'

export const STATUTS = {
  actif:   { label: 'Aktif',   color: '#27ae60', bg: 'rgba(39,174,96,0.12)',   icon: React.createElement(CheckCircle, {size:11}) },
  reta:    { label: 'An Reta', color: '#e74c3c', bg: 'rgba(231,76,60,0.12)',   icon: React.createElement(AlertCircle, {size:11}) },
  attente: { label: 'Antant',  color: '#f39c12', bg: 'rgba(243,156,18,0.12)',  icon: React.createElement(Clock, {size:11}) },
  cloture: { label: 'Klotire', color: '#6b7a99', bg: 'rgba(107,122,153,0.1)',  icon: React.createElement(XCircle, {size:11}) },
}

export const STATUT_ECH = {
  paye:    { label: 'Peye',   color: '#27ae60', bg: 'rgba(39,174,96,0.12)',  icon: React.createElement(CheckCircle, {size:10}) },
  partiel: { label: 'Pasyèl', color: '#f39c12', bg: 'rgba(243,156,18,0.12)',icon: React.createElement(Clock, {size:10}) },
  reta:    { label: 'Reta',   color: '#e74c3c', bg: 'rgba(231,76,60,0.12)', icon: React.createElement(AlertCircle, {size:10}) },
  attente: { label: 'Antant', color: '#6b7a99', bg: 'rgba(107,122,153,0.1)',icon: React.createElement(Clock, {size:10}) },
}

export const PERIODES = [
  { value: 'jounal',    label: 'Chak Jou' },
  { value: 'semaine',   label: 'Semèn'    },
  { value: 'biweekly',  label: '2 Semèn'  },
  { value: 'mois',      label: 'Mwa'      },
  { value: 'trimestre', label: 'Trimès'   },
]

export const TIP_KALKIL = [
  { value: 'flat',        label: 'Flat (Pwogresif)',       desc: 'Enterè kalkile sou kapital total. Peman yo egal tout tan.',              color: '#3B82F6', emoji: '📊' },
  { value: 'declining',   label: 'Degressif (Declining)',  desc: 'Enterè kalkile sou rès kapital ki rete. Peman egal, enterè diminye.',    color: '#C9A84C', emoji: '📉' },
  { value: 'constant',    label: 'Amortissement Constant', desc: 'Kapital egal chak peman. Total peman diminye chak fwa.',                  color: '#27ae60', emoji: '📐' },
  { value: 'bous_soleil', label: 'Bous Solèy (Joualye)',   desc: 'Kliyan peye yon montan fiks chak jou pou nombre jou fiks.',              color: '#F59E0B', emoji: '☀️' },
]

export const PRE_STYLES = `
  .pre-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .pre-row:hover   { background: rgba(201,168,76,0.06) !important; }
  .pre-badge       { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px; font-size: 10px; font-weight: 700; }
  .pre-kane-item:hover { background: rgba(201,168,76,0.08) !important; }
  .pre-ech-row:hover   { background: rgba(255,255,255,0.03) !important; }
  @media (min-width: 600px) { .pre-detail-grid { grid-template-columns: repeat(3, 1fr); } }
`
