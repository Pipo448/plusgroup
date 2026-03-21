// backend/src/jobs/scheduler.js
// ✅ Anrejistre tout cron jobs nan app la
// Enpòte sa nan index.js: require('./jobs/scheduler')

const cron = require('node-cron')
const { sendDailyReminders } = require('./sabotay-reminder.job')

function startScheduler() {
  console.log('[Scheduler] 🕐 Cron jobs ap kòmanse...')

  // ✅ Avètisman Sabotay Sol — chak jou a 2:30PM Haiti (7:30PM UTC)
  // Cron syntax: minute heure jour mwa joursemèn
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Scheduler] ⏰ Sabotay reminder — ap kouri...')
    try {
      const result = await sendDailyReminders()
      console.log('[Scheduler] ✅ Sabotay reminder fini:', result)
    } catch (err) {
      console.error('[Scheduler] ❌ Sabotay reminder echwe:', err.message)
    }
  }, {
    timezone: 'UTC'
  })
  console.log('[Scheduler] ✅ Cron jobs anrejistre:')
  console.log('  • Sabotay Sol reminders — chak jou 2:30PM Haiti')
}

module.exports = { startScheduler }
