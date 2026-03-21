// backend/src/jobs/sabotay-reminder.job.js
const prisma     = require('../config/prisma')
const solPushSvc = require('../modules/sabotay/sol-push.service')

// ── Haiti timezone helper ─────────────────────────────────────
function getTodayHaiti() {
  const now  = new Date()
  const yyyy = now.toLocaleString('en-US', { timeZone: 'America/Port-au-Prince', year:  'numeric' })
  const mm   = now.toLocaleString('en-US', { timeZone: 'America/Port-au-Prince', month: '2-digit' })
  const dd   = now.toLocaleString('en-US', { timeZone: 'America/Port-au-Prince', day:   '2-digit' })
  return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`
}

function getNowMinutesHaiti() {
  const now = new Date(Date.now() - 5 * 60 * 60 * 1000)
  return now.getUTCHours() * 60 + now.getUTCMinutes()
}

// ── Voye avètisman pou manm ki dwe peye jodi a ───────────────
async function sendDailyReminders() {
  const todayStr  = getTodayHaiti()
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`)
  const nextDay   = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000)
  const nowMins   = getNowMinutesHaiti()

  console.log(`[SabotayReminder] 🔔 Kouri pou dat: ${todayStr} — lè: ${Math.floor(nowMins/60)}h${String(nowMins%60).padStart(2,'0')}`)

  try {
    const activePlans = await prisma.sabotayPlan.findMany({
      where:  { status: 'open' },
      select: {
        id: true, name: true, amount: true,
        frequency: true, dueTime: true, dueTimeEnd: true,
        warningDelayDays: true, tenantId: true,
      }
    })

    let totalPush = 0
    let totalWA   = 0

    for (const plan of activePlans) {

      // ✅ Verifye si se 30 minit avan lè limit la pou plan sa a
      const [endH, endM] = (plan.dueTimeEnd || '15:00').split(':').map(Number)
      const endMins = endH * 60 + endM
      const diff    = endMins - nowMins

      // Sèlman si se ant 28 ak 33 minit avan limit la
      if (diff < 28 || diff > 33) {
        console.log(`[SabotayReminder] ⏭ ${plan.name} — pa lè reminder (diff: ${diff}min)`)
        continue
      }

      console.log(`[SabotayReminder] ⏰ ${plan.name} — 30min avan ${plan.dueTimeEnd || '15:00'}`)

      // Jwenn manm ki dwe peye jodi a
      const membersDueToday = await prisma.sabotayMember.findMany({
        where: {
          planId:   plan.id,
          isActive: true,
          status:   { not: 'blocked' },
          dueDate:  { gte: todayDate, lt: nextDay },
        },
        select: {
          id: true, name: true, phone: true,
          position: true, dueDate: true,
        }
      })

      if (!membersDueToday.length) continue

      // Filtre manm ki deja peye
      const memberIds    = membersDueToday.map(m => m.id)
      const alreadyPaid  = await prisma.sabotayPayment.findMany({
        where: {
          planId:   plan.id,
          memberId: { in: memberIds },
          dueDate:  { gte: todayDate, lt: nextDay },
        },
        select: { memberId: true }
      })

      const paidMemberIds = new Set(alreadyPaid.map(p => p.memberId))
      const unpaidMembers = membersDueToday.filter(m => !paidMemberIds.has(m.id))

      if (!unpaidMembers.length) {
        console.log(`[SabotayReminder] ✅ ${plan.name} — tout manm fin peye jodi a`)
        continue
      }

      console.log(`[SabotayReminder] 📋 ${plan.name} — ${unpaidMembers.length} manm pa fin peye`)

      const dueTimeEnd = plan.dueTimeEnd || '15:00'
      const amount     = Number(plan.amount).toLocaleString('fr-HT')

      for (const member of unpaidMembers) {
        const pushPayload = {
          title: `⏰ Aten — Lè peman ap fini!`,
          body:  `${member.name}, ou gen 30 minit pou peye ${amount} HTG — Limit: ${dueTimeEnd}`,
          icon:  '/logo.png',
          badge: '/logo.png',
          tag:   `sabotay-reminder-${plan.id}-${member.id}`,
          requireInteraction: true,
          data:  { url: '/app/sol/dashboard' },
        }

        const pushResult = await solPushSvc.sendToSolMember(member.id, pushPayload)

        if (pushResult.sent > 0) {
          totalPush++
          console.log(`[SabotayReminder] 📱 Push voye → ${member.name}`)
        } else {
          if (member.phone) {
            await sendWhatsAppReminder(member, plan, amount, dueTimeEnd)
            totalWA++
            console.log(`[SabotayReminder] 💬 WhatsApp voye → ${member.phone}`)
          }
        }
      }
    }

    console.log(`[SabotayReminder] ✅ Fini — Push: ${totalPush} | WhatsApp: ${totalWA}`)
    return { totalPush, totalWA }

  } catch (err) {
    console.error('[SabotayReminder] ❌ Erè:', err.message)
    throw err
  }
}

// ── WhatsApp fallback ─────────────────────────────────────────
async function sendWhatsAppReminder(member, plan, amount, dueTimeEnd) {
  try {
    let phone = member.phone.replace(/\s/g, '').replace(/[^0-9+]/g, '')
    if (!phone.startsWith('+')) {
      phone = phone.startsWith('509') ? `+${phone}` : `+509${phone}`
    }

    const message =
      `⏰ *Sabotay Sol — ${plan.name}*\n\n` +
      `Bonjou ${member.name}! 👋\n\n` +
      `Ou gen *30 minit* pou peye *${amount} HTG* anvan *${dueTimeEnd}*.\n\n` +
      `Peye kounye a pou evite penalite! 🙏\n` +
      `_— Plus Group_`

    const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL
    const WHATSAPP_TOKEN   = process.env.WHATSAPP_TOKEN

    if (!WHATSAPP_API_URL || !WHATSAPP_TOKEN) {
      console.warn(`[WhatsApp] API pa konfigire — skip ${phone}`)
      return false
    }

    const fetch = require('node-fetch')
    const res   = await fetch(WHATSAPP_API_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify({ phone, message }),
    })

    return res.ok
  } catch (err) {
    console.warn('[WhatsApp] Echwe:', err.message)
    return false
  }
}

module.exports = { sendDailyReminders }