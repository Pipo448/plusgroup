// backend/src/jobs/sabotay-reminder.job.js
// ✅ Cron job — kouri chak jou a 2:30PM Haiti pou avètisman peman Sol
// Haiti = UTC-5 → 2:30PM Haiti = 7:30PM UTC = 19:30 UTC

const prisma      = require('../config/prisma')
const solPushSvc  = require('../modules/sabotay/sol-push.service')

// ── Haiti timezone helper ─────────────────────────────────────
function getTodayHaiti() {
  const now  = new Date()
  const yyyy = now.toLocaleString('en-US', { timeZone: 'America/Port-au-Prince', year:  'numeric' })
  const mm   = now.toLocaleString('en-US', { timeZone: 'America/Port-au-Prince', month: '2-digit' })
  const dd   = now.toLocaleString('en-US', { timeZone: 'America/Port-au-Prince', day:   '2-digit' })
  return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`
}

// ── Voye avètisman pou manm ki dwe peye jodi a ───────────────
async function sendDailyReminders() {
  const todayStr  = getTodayHaiti()
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`)
  const nextDay   = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000)

  console.log(`[SabotayReminder] 🔔 Kouri pou dat: ${todayStr}`)

  try {
    // ── Jwenn tout plan aktif yo ──────────────────────────────
    const activePlans = await prisma.sabotayPlan.findMany({
      where:  { status: 'active' },
      select: {
        id: true, name: true, amount: true,
        frequency: true, dueTime: true,
        warningDelayDays: true, tenantId: true,
      }
    })

    let totalPush = 0
    let totalWA   = 0

    for (const plan of activePlans) {
      // ── Jwenn manm ki dwe peye jodi a (dueDate = jodi) ───────
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

      // ── Filtre manm ki pa fin peye jodi a ─────────────────────
      const memberIds = membersDueToday.map(m => m.id)

      const alreadyPaid = await prisma.sabotayPayment.findMany({
        where: {
          planId:   plan.id,
          memberId: { in: memberIds },
          dueDate:  { gte: todayDate, lt: nextDay },
        },
        select: { memberId: true }
      })

      const paidMemberIds = new Set(alreadyPaid.map(p => p.memberId))

      // ── Sèlman manm ki pa fin peye ────────────────────────────
      const unpaidMembers = membersDueToday.filter(m => !paidMemberIds.has(m.id))

      if (!unpaidMembers.length) {
        console.log(`[SabotayReminder] ✅ ${plan.name} — tout manm fin peye jodi a`)
        continue
      }

      console.log(`[SabotayReminder] 📋 ${plan.name} — ${unpaidMembers.length} manm pa fin peye`)

      const dueTime  = plan.dueTime || '15:00'
      const amount   = Number(plan.amount).toLocaleString('fr-HT')

      for (const member of unpaidMembers) {
        const pushPayload = {
          title: `⏰ Sabotay Sol — ${plan.name}`,
          body:  `${member.name}, jodi a se dat peman ou a! ${amount} HTG anvan ${dueTime}`,
          icon:  '/logo.png',
          badge: '/logo.png',
          tag:   `sabotay-reminder-${plan.id}-${member.id}`,
          requireInteraction: true,  // ✅ Notifikasyon pa disparèt otomatikman
          data:  { url: '/sol/dashboard' },
        }

        // ── Eseye Push premye ─────────────────────────────────
        const pushResult = await solPushSvc.sendToSolMember(member.id, pushPayload)

        if (pushResult.sent > 0) {
          totalPush++
          console.log(`[SabotayReminder] 📱 Push voye → ${member.name}`)
        } else {
          // ── Si pa gen push subscription — voye WhatsApp ──────
          if (member.phone) {
            await sendWhatsAppReminder(member, plan, amount, dueTime)
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

// ── WhatsApp fallback via API ─────────────────────────────────
async function sendWhatsAppReminder(member, plan, amount, dueTime) {
  try {
    // ✅ Fonmate nimewo telefòn Haiti (+509)
    let phone = member.phone.replace(/\s/g, '').replace(/[^0-9+]/g, '')
    if (!phone.startsWith('+')) {
      phone = phone.startsWith('509') ? `+${phone}` : `+509${phone}`
    }

    const message = `⏰ *Sabotay Sol — ${plan.name}*\n\n` +
      `Bonjou ${member.name}! 👋\n\n` +
      `Jodi a se dat peman ou a. Tanpri peye *${amount} HTG* anvan *${dueTime}*.\n\n` +
      `Mèsi paske ou respekte angajman ou! 🙏\n` +
      `_— Plus Group_`

    // ✅ Itilize WhatsApp API ou a — chanje URL la selon sistèm ou itilize
    // Si ou gen MonCash/NatCash API oswa yon WhatsApp Business API
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
