// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ✅ brand = alias pou royal (tout kòd ki itilize brand-* ap travay)
        brand: {
          50:'#eff6ff', 100:'#dbeafe', 200:'#bfdbfe', 300:'#93c5fd',
          400:'#3b82f6', 500:'#1a56db', 600:'#1340b8', 700:'#0e2d8a',
          800:'#0a1f63', 900:'#06123d',
        },
        royal: {
          50:'#eff6ff', 100:'#dbeafe', 200:'#bfdbfe', 300:'#93c5fd',
          400:'#3b82f6', 500:'#1a56db', 600:'#1340b8', 700:'#0e2d8a',
          800:'#0a1f63', 900:'#06123d',
        },
        gold: {
          50:'#fffbeb', 100:'#fef3c7', 200:'#fde68a', 300:'#fcd34d',
          400:'#f5c518', 500:'#d4a017', 600:'#b8860b', 700:'#92690a',
          800:'#6b4d08', 900:'#453106',
        },
        salmon: {
          50:'#fff5f5', 100:'#ffe4e1', 200:'#ffc9c0', 300:'#ffa394',
          400:'#fa8072', 500:'#f0614f', 600:'#d94535', 700:'#b53325',
        },
        rouge: {
          50:'#fef2f2', 100:'#fee2e2', 200:'#fecaca', 300:'#f87171',
          400:'#ef4444', 500:'#dc2626', 600:'#b91c1c', 700:'#991b1b',
        },
        surface: {
          DEFAULT:'#06123d', 50:'#f8faff', 100:'#eef2ff',
          200:'#dce6ff', 800:'#0e2050', 900:'#06123d',
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body:    ['"Plus Jakarta Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card:        '0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.04)',
        'card-hover':'0 8px 24px 0 rgba(14,45,138,.12)',
        gold:        '0 0 20px rgba(245,197,24,0.3)',
        royal:       '0 0 24px rgba(26,86,219,0.25)',
        luxury:      '0 4px 32px rgba(14,45,138,0.18)',
      },
      animation: {
        'fade-in':  'fadeIn .3s ease-out',
        'slide-up': 'slideUp .35s cubic-bezier(.16,1,.3,1)',
        'slide-in': 'slideIn .3s cubic-bezier(.16,1,.3,1)',
      },
      keyframes: {
        fadeIn:  { from:{opacity:0}, to:{opacity:1} },
        slideUp: { from:{opacity:0,transform:'translateY(16px)'}, to:{opacity:1,transform:'translateY(0)'} },
        slideIn: { from:{opacity:0,transform:'translateX(-16px)'}, to:{opacity:1,transform:'translateX(0)'} },
      },
      backgroundImage: {
        'royal-gradient':  'linear-gradient(135deg, #0e2d8a 0%, #1a56db 50%, #1340b8 100%)',
        'gold-gradient':   'linear-gradient(135deg, #b8860b 0%, #f5c518 50%, #d4a017 100%)',
        'luxury-gradient': 'linear-gradient(160deg, #06123d 0%, #0e2d8a 60%, #1a56db 100%)',
        'salmon-gradient': 'linear-gradient(135deg, #fa8072 0%, #f0614f 100%)',
      }
    }
  },
  plugins: []
}
