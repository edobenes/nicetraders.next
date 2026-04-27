/**
 * NICE Traders — Mobile PWA App
 * Single-page application orchestrating all screens.
 * Business domains: Auth · Trades · Messages · Referrals · Rewards · Security
 */

'use strict';

/* ══════════════════════════════════════════════════════════
   1. STATE STORE
   ══════════════════════════════════════════════════════════ */
const Store = (() => {
  let _state = {
    user: null,           // { id, firstName, lastName, email, phone, affiliateId, ... }
    sessionId: null,
    trades: [],           // active user's trade searches
    matches: [],          // trade matches
    messages: {},         // { tradeMatchId: [ msgObj, ... ] }
    notifications: [],    // notification objects
    unreadCount: 0,
    currentScreen: 'home',
    activeTradeId: null,
    activeChatId: null,
    referralStats: { invited: 0, active: 0, earnings: 0, tier: 'bronze' },
    rates: {},            // { 'USD/EUR': 0.92 }
    isOnline: navigator.onLine,
    appReady: false,
  };

  const _listeners = {};

  return {
    get(key) { return _state[key]; },
    set(key, val) {
      _state[key] = val;
      (_listeners[key] || []).forEach(fn => fn(val, _state));
      (_listeners['*'] || []).forEach(fn => fn(key, val, _state));
    },
    patch(obj) { Object.keys(obj).forEach(k => this.set(k, obj[k])); },
    on(key, fn) {
      if (!_listeners[key]) _listeners[key] = [];
      _listeners[key].push(fn);
      return () => { _listeners[key] = _listeners[key].filter(f => f !== fn); };
    },
    snapshot() { return { ..._state }; },
  };
})();

/* ══════════════════════════════════════════════════════════
   2. COOKIE UTILITIES
   ══════════════════════════════════════════════════════════ */
const Cookie = {
  get(name) {
    const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m[2]) : null;
  },
  set(name, val, days = 365) {
    const exp = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(val)};expires=${exp};path=/;SameSite=Lax`;
  },
  remove(name) { document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`; },
};

/* ══════════════════════════════════════════════════════════
   3. API CLIENT
   ══════════════════════════════════════════════════════════ */
const API = (() => {
  const BASE = '';   // same origin

  async function request(method, path, body, auth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && Store.get('sessionId')) {
      headers['Authorization'] = 'Bearer ' + Store.get('sessionId');
    }
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + path, opts);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json?.error?.message || 'Request failed');
      err.code = json?.error?.code;
      err.status = res.status;
      throw err;
    }
    return json;
  }

  return {
    get:    (path)        => request('GET',    path),
    post:   (path, body)  => request('POST',   path, body),
    put:    (path, body)  => request('PUT',    path, body),
    delete: (path)        => request('DELETE', path),

    // Legacy command interface (for /q endpoint)
    cmd(object, method, data) {
      const command = { object, method, data };
      return fetch(BASE + '/q', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      }).then(r => r.json());
    },

    // Auth
    register: (d)     => request('POST', '/api/auth/register', d, false),
    login:    (d)     => request('POST', '/api/auth/login',    d, false),
    me:       ()      => request('GET',  '/api/auth/me'),
    logout:   ()      => request('POST', '/api/auth/logout', { sessionId: Store.get('sessionId') }),
  };
})();

/* ══════════════════════════════════════════════════════════
   4. ROUTER
   ══════════════════════════════════════════════════════════ */
const Router = (() => {
  const PROTECTED = ['dashboard', 'trade', 'messages', 'referrals', 'profile', 'notifications'];
  const PUBLIC    = ['home', 'login', 'register', 'forgot'];
  let _current = null;

  return {
    init() {
      const hash = location.hash.replace('#', '') || 'home';
      this.go(hash, true);
      window.addEventListener('hashchange', () => {
        const h = location.hash.replace('#', '') || 'home';
        this.go(h, true);
      });
    },
    go(screen, fromHash = false) {
      if (!fromHash) {
        location.hash = screen;
        return;   // hashchange event will call back
      }

      // Auth guard
      const isLoggedIn = !!Store.get('sessionId');
      // Redirect unauthenticated users away from protected screens
      if (PROTECTED.includes(screen) && !isLoggedIn) {
        location.hash = 'login';
        return;
      }
      // Redirect authenticated users away from auth screens (except home)
      if ((screen === 'login' || screen === 'register') && isLoggedIn) {
        location.hash = 'dashboard';
        return;
      }
      // Redirect authenticated users from home to dashboard
      if (screen === 'home' && isLoggedIn) {
        location.hash = 'dashboard';
        return;
      }

      _current = screen;
      Store.set('currentScreen', screen);
      App.renderScreen(screen);
    },
    current() { return _current; },
  };
})();

/* ══════════════════════════════════════════════════════════
   5. TOAST NOTIFICATIONS
   ══════════════════════════════════════════════════════════ */
const Toast = (() => {
  const ICONS = {
    success: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info:    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };

  function show(msg, type = 'info', duration = 3500) {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `${ICONS[type] || ''}<span>${msg}</span><span class="toast-close" onclick="this.parentElement.remove()">✕</span>`;
    c.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  return {
    success: (m, d) => show(m, 'success', d),
    error:   (m, d) => show(m, 'error', d),
    info:    (m, d) => show(m, 'info', d),
  };
})();

/* ══════════════════════════════════════════════════════════
   6. CURRENCY DATA & RATES
   ══════════════════════════════════════════════════════════ */
const Currencies = {
  data: [
    { code: 'USD', name: 'US Dollar',       flag: '🇺🇸', symbol: '$'  },
    { code: 'EUR', name: 'Euro',             flag: '🇪🇺', symbol: '€'  },
    { code: 'GBP', name: 'British Pound',   flag: '🇬🇧', symbol: '£'  },
    { code: 'JPY', name: 'Japanese Yen',    flag: '🇯🇵', symbol: '¥'  },
    { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar',flag:'🇦🇺', symbol: 'A$' },
    { code: 'CHF', name: 'Swiss Franc',     flag: '🇨🇭', symbol: 'Fr' },
    { code: 'CNY', name: 'Chinese Yuan',    flag: '🇨🇳', symbol: '¥'  },
    { code: 'MXN', name: 'Mexican Peso',    flag: '🇲🇽', symbol: '$'  },
    { code: 'BRL', name: 'Brazilian Real',  flag: '🇧🇷', symbol: 'R$' },
    { code: 'INR', name: 'Indian Rupee',    flag: '🇮🇳', symbol: '₹'  },
    { code: 'KRW', name: 'Korean Won',      flag: '🇰🇷', symbol: '₩'  },
    { code: 'SGD', name: 'Singapore Dollar',flag:'🇸🇬', symbol: 'S$' },
    { code: 'HKD', name: 'Hong Kong Dollar',flag:'🇭🇰', symbol: 'HK$'},
    { code: 'SEK', name: 'Swedish Krona',   flag: '🇸🇪', symbol: 'kr' },
    { code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴', symbol: 'kr' },
    { code: 'NZD', name: 'New Zealand Dollar',flag:'🇳🇿',symbol: 'NZ$'},
    { code: 'ZAR', name: 'South African Rand',flag:'🇿🇦',symbol: 'R' },
    { code: 'AED', name: 'UAE Dirham',      flag: '🇦🇪', symbol: 'د.إ'},
    { code: 'PLN', name: 'Polish Zloty',    flag: '🇵🇱', symbol: 'zł' },
  ],
  find(code) { return this.data.find(c => c.code === code); },
  options() {
    return this.data.map(c => `<option value="${c.code}">${c.flag} ${c.code} — ${c.name}</option>`).join('');
  },
};

/* ══════════════════════════════════════════════════════════
   7. MOCK DATA (stubbed — replaced by real backend later)
   ══════════════════════════════════════════════════════════ */
const MockData = {
  trades: [
    { tradeSearchId: 'ts_001', type: 'sell', have: 'USD', want: 'EUR', amountHave: 500, status: 'searching', createdAt: new Date(Date.now() - 3600000).toISOString(), lat: 38.91, lng: -77.04, distanceWillingToTravel: 10 },
    { tradeSearchId: 'ts_002', type: 'buy',  have: 'EUR', want: 'GBP', amountHave: 300, status: 'matched',   createdAt: new Date(Date.now() - 7200000).toISOString(), lat: 38.92, lng: -77.03, distanceWillingToTravel: 5 },
  ],
  matches: [
    { tradeMatchId: 'tm_001', tradeSearchId: 'ts_002', sellerFirstName: 'Marcus', buyerFirstName: 'Alex', distance: 2.3, trustScore: 4.8, sellAmount: 350, sellCurrency: 'EUR', buyAmount: 300, buyCurrency: 'GBP', status: 'confirmed', meetupDate: new Date(Date.now() + 86400000).toISOString(), meetupLocation: 'Central Park Cafe, Washington DC' },
  ],
  recentActivity: [
    { id: 1, type: 'match',   icon: '🎯', name: 'New match found', desc: 'EUR → GBP with Marcus S.', time: '2h ago',  read: false },
    { id: 2, type: 'trade',   icon: '✅', name: 'Trade completed', desc: '$500 USD → €460 EUR',       time: '3d ago',  read: true  },
    { id: 3, type: 'referral',icon: '🎁', name: 'Referral reward', desc: '+$10 credit from Jordan',   time: '1w ago',  read: true  },
    { id: 4, type: 'system',  icon: '🔔', name: 'ID Verification',  desc: 'Your account is verified', time: '2w ago',  read: true  },
  ],
  messages: {
    'tm_001': [
      { id: 'm1', fromUserId: 'other', firstName: 'Marcus', message: 'Hey! Ready to meet tomorrow at 10am?', dateAdded: new Date(Date.now() - 3600000).toISOString() },
      { id: 'm2', fromUserId: 'me',    firstName: 'Me',     message: 'Sounds great! Central Park Cafe works for me.', dateAdded: new Date(Date.now() - 1800000).toISOString() },
      { id: 'm3', fromUserId: 'other', firstName: 'Marcus', message: 'Perfect, see you then! I\'ll have the €350 ready.', dateAdded: new Date(Date.now() - 900000).toISOString() },
    ],
  },
  referralStats: { invited: 12, active: 7, earnings: 87.50, tier: 'silver', nextTier: 'gold', nextTierReq: 20 },
  referralHistory: [
    { name: 'Jordan M.',  date: '3 days ago', reward: 10.00, status: 'paid'    },
    { name: 'Sarah K.',   date: '1 week ago', reward: 10.00, status: 'paid'    },
    { name: 'Chris T.',   date: '2 weeks ago',reward: 10.00, status: 'pending' },
  ],
};

/* ══════════════════════════════════════════════════════════
   8. ICON SVG LIBRARY
   ══════════════════════════════════════════════════════════ */
const Icon = {
  home:        '<svg viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  search:      '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  trade:       '<svg viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  messages:    '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  bell:        '<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  user:        '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  gift:        '<svg viewBox="0 0 24 24"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
  shield:      '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  check:       '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
  arrowRight:  '<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  arrowLeft:   '<svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  chevRight:   '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',
  chevDown:    '<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>',
  mapPin:      '<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  star:        '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  send:        '<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  plus:        '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  x:           '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  eye:         '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff:      '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  mail:        '<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  lock:        '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  phone:       '<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.62 2 2 0 0 1 3.58 1.44h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  copy:        '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  share:       '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
  settings:    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  logout:      '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  trending:    '<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  zap:         '<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  calendar:    '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  fingerprint: '<svg viewBox="0 0 24 24"><path d="M12 22a10 10 0 0 1 0-20"/><path d="M12 10a2 2 0 0 1 0 4"/><path d="M12 6a6 6 0 0 1 6 6c0 4-3 9-6 10"/><path d="M5.6 9A6 6 0 0 0 12 18"/></svg>',
};

/* ══════════════════════════════════════════════════════════
   9. VIEW HELPERS
   ══════════════════════════════════════════════════════════ */
const View = {
  initials(user) {
    if (!user) return '?';
    return ((user.firstName || '')[0] || '') + ((user.lastName || '')[0] || '');
  },
  timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)   return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },
  formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  },
  currencyFlag(code) {
    const c = Currencies.find(code);
    return c ? c.flag : '💱';
  },
  amount(num, code) {
    const c = Currencies.find(code);
    return (c ? c.symbol : '') + Number(num).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  },
};

/* ══════════════════════════════════════════════════════════
   10. SCREEN RENDERERS
   ══════════════════════════════════════════════════════════ */

/* ── 10.1 HOME (marketing / landing) ────────────────────── */
function renderHome() {
  return `
    <div class="screen active" id="screen-home">
      <!-- Hero -->
      <div style="background:linear-gradient(160deg,var(--dark-0) 0%,var(--brand-700) 60%,var(--brand-600) 100%);padding:64px 24px 48px;text-align:center;position:relative;overflow:hidden;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse 80% 50% at 50% 0%,rgba(26,86,219,.4) 0%,transparent 70%);pointer-events:none;"></div>

        <div style="position:relative;z-index:1;width:100%;max-width:560px;margin:0 auto;">
          <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:9999px;padding:6px 16px;font-size:.72rem;font-weight:700;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:.12em;margin-bottom:24px;">
            <span style="width:6px;height:6px;background:var(--green-400);border-radius:50%;animation:pulse 2s infinite;"></span>
            Peer-to-peer · Secure · Local
          </div>

          <h1 style="font-size:clamp(2rem,6vw,3.2rem);font-weight:900;color:white;letter-spacing:-.04em;line-height:1.1;margin-bottom:16px;">
            Exchange Currency<br><span style="background:linear-gradient(135deg,var(--brand-300),var(--green-400));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">with Neighbors</span>
          </h1>
          <p style="font-size:1rem;color:rgba(255,255,255,.7);max-width:400px;margin:0 auto 36px;line-height:1.6;">
            Trade foreign currency directly with trusted people nearby. No bank fees. No middleman. Just fair rates between real people.
          </p>

          <div style="display:flex;flex-direction:column;gap:12px;align-items:center;">
            <button class="btn btn-primary btn-lg btn-full" style="max-width:320px;" onclick="Router.go('register')">
              ${Icon.zap} Get Started Free
            </button>
            <button class="btn btn-glass" onclick="Router.go('login')">
              I already have an account
            </button>
          </div>

          <!-- Trust badges -->
          <div style="display:flex;gap:24px;justify-content:center;margin-top:40px;flex-wrap:wrap;">
            ${['🔒 Bank-level encryption','🌍 30+ currencies','⚡ Match in minutes','🤝 500K+ trades'].map(t => `
              <div style="font-size:.72rem;color:rgba(255,255,255,.55);font-weight:600;letter-spacing:.04em;">${t}</div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- How it works -->
      <div class="page-container" style="padding-top:40px;">
        <div class="section-heading">
          <h2 class="section-title">How it works</h2>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px;">
          ${[
            { step: '1', icon: '🔍', title: 'Post your trade',      desc: 'Tell us what currency you have and what you want. Set your amount and distance preference.' },
            { step: '2', icon: '🎯', title: 'Get matched',          desc: 'Our algorithm finds nearby traders with matching needs. Review profiles and trust scores.' },
            { step: '3', icon: '📅', title: 'Schedule a meetup',    desc: 'Choose a safe public location and time. Meet your trading partner in person or at a drop point.' },
            { step: '4', icon: '✅', title: 'Complete & review',    desc: 'Exchange currency, confirm the trade in-app, and leave a review to build your trust score.' },
          ].map(s => `
            <div class="card" style="display:flex;gap:16px;padding:16px;align-items:flex-start;">
              <div style="width:36px;height:36px;border-radius:50%;background:var(--brand-500);color:white;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:800;flex-shrink:0;">${s.step}</div>
              <div>
                <div style="font-size:1.2rem;margin-bottom:4px;">${s.icon}</div>
                <div style="font-weight:700;color:var(--text-900);margin-bottom:4px;">${s.title}</div>
                <div style="font-size:.85rem;color:var(--text-500);line-height:1.5;">${s.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Security section -->
        <div style="margin-top:32px;padding:24px;background:linear-gradient(135deg,var(--dark-1),var(--dark-2));border-radius:var(--radius-xl);color:white;">
          <h3 style="font-size:1.1rem;font-weight:800;margin-bottom:16px;">🛡️ Built for trust & safety</h3>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${[
              ['ID Verification', 'All users verified via government ID'],
              ['Trust Score System', 'Ratings from every completed trade'],
              ['In-app messaging', 'Secure, encrypted communication'],
              ['Dispute Resolution', '24/7 support for any issues'],
              ['Public meetups', 'Always exchange in safe locations'],
              ['Transaction limits', 'Tiered limits based on trust score'],
            ].map(([t,d]) => `
              <div style="display:flex;gap:10px;align-items:flex-start;">
                <div style="color:var(--green-400);flex-shrink:0;margin-top:1px;">${Icon.check}</div>
                <div>
                  <span style="font-weight:600;font-size:.88rem;">${t}</span>
                  <span style="color:rgba(255,255,255,.5);font-size:.82rem;"> — ${d}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Referral teaser -->
        <div style="margin-top:24px;" class="referral-hero">
          <div class="referral-hero-content">
            <div style="font-size:1.8rem;margin-bottom:8px;">🎁</div>
            <div class="referral-title">Earn $10 per referral</div>
            <div class="referral-desc">Invite friends and earn rewards for every trade they complete. No limit on earnings!</div>
            <button class="btn btn-glass" onclick="Router.go('register')">Join & Start Earning</button>
          </div>
        </div>

        <div style="height:40px;"></div>
      </div>
    </div>`;
}

/* ── 10.2 LOGIN ──────────────────────────────────────────── */
function renderLogin() {
  return `
    <div class="screen active" id="screen-login">
      <div class="auth-screen">
        <div class="auth-logo">
          <img src="/img/NICE-TRADERS-LOGO.png" alt="NICE Traders" onerror="this.style.display='none'">
          <div style="font-size:1.8rem;font-weight:900;color:white;letter-spacing:-.04em;">NICE Traders</div>
          <div class="auth-tagline">Neighborhood Currency Exchange</div>
        </div>

        <div class="auth-card scale-in">
          <div class="auth-title">Welcome back</div>
          <div class="auth-subtitle">Sign in to your account</div>

          <div id="login-error" class="form-error light" style="display:none;margin-bottom:12px;"></div>

          <form id="loginForm" onsubmit="Auth.login(event)">
            <div class="form-group">
              <label class="form-label light">Email address</label>
              <div class="form-input-wrap">
                <span class="input-icon">${Icon.mail}</span>
                <input type="email" id="login-email" class="form-input glass" placeholder="you@example.com" autocomplete="email" required>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label light">Password</label>
              <div class="form-input-wrap">
                <span class="input-icon">${Icon.lock}</span>
                <input type="password" id="login-password" class="form-input glass" placeholder="Your password" autocomplete="current-password" required>
                <span class="input-action" onclick="Auth.togglePassword('login-password', this)">${Icon.eye}</span>
              </div>
            </div>
            <div style="text-align:right;margin-bottom:16px;">
              <a href="#forgot" style="font-size:.82rem;color:var(--brand-300);font-weight:600;">Forgot password?</a>
            </div>
            <button type="submit" class="btn btn-primary btn-lg btn-full" id="loginBtn">
              ${Icon.arrowRight} Sign in
            </button>
          </form>
        </div>

        <div class="auth-footer-link">
          Don't have an account? <a href="#register">Create one free</a>
        </div>

        <div class="trust-badges">
          <div class="trust-badge">${Icon.shield}<span>Encrypted</span></div>
          <div class="trust-badge">${Icon.fingerprint}<span>Secure</span></div>
          <div class="trust-badge">${Icon.check}<span>Verified</span></div>
        </div>
      </div>
    </div>`;
}

/* ── 10.3 REGISTER ───────────────────────────────────────── */
function renderRegister() {
  return `
    <div class="screen active" id="screen-register">
      <div class="auth-screen" style="justify-content:flex-start;padding-top:40px;">
        <div class="auth-logo" style="margin-bottom:24px;">
          <div style="font-size:1.6rem;font-weight:900;color:white;letter-spacing:-.04em;">Join NICE Traders</div>
          <div class="auth-tagline">Free forever · No hidden fees</div>
        </div>

        <div class="auth-card scale-in" style="width:100%;max-width:440px;">
          <!-- Onboarding dots -->
          <div class="onboarding-dots" style="margin-bottom:20px;">
            <div class="onboarding-dot active"></div>
            <div class="onboarding-dot"></div>
            <div class="onboarding-dot"></div>
          </div>

          <div class="auth-title">Create your account</div>
          <div class="auth-subtitle">Step 1 of 3 — Basic info</div>

          <div id="register-error" class="form-error light" style="display:none;margin-bottom:12px;"></div>

          <form id="registerForm" onsubmit="Auth.register(event)">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label light">First name</label>
                <input type="text" id="register-firstName" class="form-input glass" placeholder="Alex" autocomplete="given-name" required>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label light">Last name</label>
                <input type="text" id="register-lastName" class="form-input glass" placeholder="Smith" autocomplete="family-name">
              </div>
            </div>
            <div class="form-group" style="margin-top:12px;">
              <label class="form-label light">Email address</label>
              <div class="form-input-wrap">
                <span class="input-icon">${Icon.mail}</span>
                <input type="email" id="register-email" class="form-input glass" placeholder="you@example.com" autocomplete="email" required>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label light">Phone number</label>
              <div class="form-input-wrap">
                <span class="input-icon">${Icon.phone}</span>
                <input type="tel" id="register-phone" class="form-input glass" placeholder="+1 (555) 000-0000" autocomplete="tel">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label light">Password</label>
              <div class="form-input-wrap">
                <span class="input-icon">${Icon.lock}</span>
                <input type="password" id="register-password" class="form-input glass" placeholder="Min. 8 characters" autocomplete="new-password" required minlength="8">
                <span class="input-action" onclick="Auth.togglePassword('register-password', this)">${Icon.eye}</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label light">Confirm password</label>
              <div class="form-input-wrap">
                <span class="input-icon">${Icon.lock}</span>
                <input type="password" id="register-confirm" class="form-input glass" placeholder="Repeat password" autocomplete="new-password" required>
              </div>
            </div>

            <div style="font-size:.75rem;color:rgba(255,255,255,.5);margin-bottom:16px;line-height:1.5;">
              By creating an account you agree to our <a href="#terms" style="color:var(--brand-300);">Terms of Service</a> and <a href="#privacy" style="color:var(--brand-300);">Privacy Policy</a>.
            </div>

            <button type="submit" class="btn btn-primary btn-lg btn-full" id="registerBtn">
              ${Icon.arrowRight} Create Account
            </button>
          </form>
        </div>

        <div class="auth-footer-link" style="margin-top:16px;">
          Already have an account? <a href="#login">Sign in</a>
        </div>
      </div>
    </div>`;
}

/* ── 10.4 FORGOT PASSWORD ────────────────────────────────── */
function renderForgot() {
  return `
    <div class="screen active" id="screen-forgot">
      <div class="auth-screen">
        <div class="auth-logo">
          <div style="font-size:1.6rem;font-weight:900;color:white;letter-spacing:-.04em;">Reset Password</div>
          <div class="auth-tagline">We'll send you a recovery link</div>
        </div>
        <div class="auth-card scale-in">
          <div class="auth-title">Forgot your password?</div>
          <div class="auth-subtitle">Enter your email and we'll send a reset link</div>
          <div id="forgot-msg" style="display:none;padding:12px 14px;border-radius:var(--radius-md);font-size:.85rem;margin-bottom:16px;"></div>
          <form id="forgotForm" onsubmit="Auth.forgotPassword(event)">
            <div class="form-group">
              <label class="form-label light">Email address</label>
              <div class="form-input-wrap">
                <span class="input-icon">${Icon.mail}</span>
                <input type="email" id="forgot-email" class="form-input glass" placeholder="you@example.com" required>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-full">Send reset link</button>
          </form>
        </div>
        <div class="auth-footer-link"><a href="#login">Back to sign in</a></div>
      </div>
    </div>`;
}

/* ── 10.5 DASHBOARD ──────────────────────────────────────── */
function renderDashboard() {
  const user = Store.get('user') || {};
  const trades = Store.get('trades') || MockData.trades;
  const activity = MockData.recentActivity;

  return `
    <div class="screen active" id="screen-dashboard">
      <div class="page-container">

        <!-- Greeting -->
        <div style="padding:20px 0 16px;">
          <div style="font-size:.85rem;color:var(--text-500);font-weight:500;margin-bottom:2px;">Good ${greeting()},</div>
          <div style="font-size:1.5rem;font-weight:800;color:var(--text-900);letter-spacing:-.03em;">${user.firstName || 'Trader'} 👋</div>
        </div>

        <!-- Quick stats -->
        <div class="stats-grid mb-20">
          <div class="stat-card">
            <div class="stat-label">Active Trades</div>
            <div class="stat-value">${trades.length}</div>
            <div class="stat-delta up">↑ All active</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Trust Score</div>
            <div class="stat-value">4.8</div>
            <div class="stat-delta" style="color:var(--gold-600);">★ Top 10%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Referral Earn.</div>
            <div class="stat-value">$87</div>
            <div class="stat-delta up">↑ +$10 this week</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Trades Done</div>
            <div class="stat-value">23</div>
            <div class="stat-delta up">↑ 5 this month</div>
          </div>
        </div>

        <!-- Active trades -->
        <div class="section-heading">
          <div class="section-title">Your trades</div>
          <div class="section-action" onclick="Router.go('trade')">+ New trade</div>
        </div>

        ${trades.length === 0 ? `
          <div class="card mb-20">
            <div class="empty-state">
              <div class="empty-state-icon">💱</div>
              <div class="empty-state-title">No active trades</div>
              <div class="empty-state-desc">Post your first currency exchange to find a match nearby.</div>
              <button class="btn btn-primary mt-12" onclick="Router.go('trade')">Start trading</button>
            </div>
          </div>
        ` : `
          <div class="feed-list mb-20">
            ${trades.map(t => renderTradeListItem(t)).join('')}
          </div>
        `}

        <!-- Recent activity -->
        <div class="section-heading">
          <div class="section-title">Recent activity</div>
          <div class="section-action" onclick="Router.go('notifications')">See all</div>
        </div>
        <div class="card mb-20" style="overflow:hidden;padding:0;">
          ${activity.map(a => `
            <div class="notif-item ${a.read ? '' : 'unread'}">
              <div class="notif-icon" style="background:var(--surface-2);">${a.icon}</div>
              <div class="notif-content">
                <div class="notif-text"><strong>${a.name}</strong> — ${a.desc}</div>
                <div class="notif-time">${a.time}</div>
              </div>
              ${!a.read ? '<div class="notif-unread-dot"></div>' : ''}
            </div>
          `).join('')}
        </div>

        <!-- Match alert if exists -->
        ${MockData.matches.length > 0 ? `
          <div class="section-heading">
            <div class="section-title">🎯 Your matches</div>
          </div>
          ${MockData.matches.map(m => renderMatchCard(m)).join('')}
        ` : ''}

      </div>
    </div>`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function renderTradeListItem(t) {
  const haveC = Currencies.find(t.have);
  const wantC = Currencies.find(t.want);
  return `
    <div class="feed-item" onclick="App.viewTrade('${t.tradeSearchId}')">
      <div class="feed-avatar" style="font-size:1.2rem;background:var(--${t.type === 'sell' ? 'brand' : 'green'}-100);color:var(--${t.type === 'sell' ? 'brand' : 'green'}-600);">
        ${t.type === 'sell' ? '↗' : '↙'}
      </div>
      <div class="feed-content">
        <div class="feed-name">${haveC ? haveC.flag : ''} ${t.have} → ${wantC ? wantC.flag : ''} ${t.want}</div>
        <div class="feed-meta">
          <span>${t.type === 'sell' ? 'Selling' : 'Buying'} ${View.amount(t.amountHave, t.have)}</span>
          <span class="dot">Within ${t.distanceWillingToTravel} miles</span>
        </div>
      </div>
      <div class="feed-right">
        <span class="badge ${t.status === 'matched' ? 'badge-success' : t.status === 'searching' ? 'badge-warning' : 'badge-neutral'} badge-dot">${t.status}</span>
        <div class="feed-time">${View.timeAgo(t.createdAt)}</div>
      </div>
    </div>`;
}

function renderMatchCard(m) {
  return `
    <div class="match-card mb-20" onclick="App.viewMatch('${m.tradeMatchId}')">
      <div class="match-card-header">
        <div class="header-avatar" style="background:var(--brand-300);color:var(--brand-800);font-weight:800;">${m.sellerFirstName[0]}</div>
        <div class="match-user-info">
          <div class="match-user-name">${m.sellerFirstName}</div>
          <div class="match-user-dist">${Icon.mapPin} ${m.distance} miles away</div>
        </div>
        <div class="match-trust-score">${Icon.star} ${m.trustScore}</div>
      </div>
      <div class="match-card-body">
        <div class="match-rate-row">
          <div class="match-amount">
            <div class="amount-num">${View.amount(m.sellAmount, m.sellCurrency)}</div>
            <div class="amount-cur">${m.sellCurrency}</div>
          </div>
          <div class="match-arrow">${Icon.arrowRight}</div>
          <div class="match-amount">
            <div class="amount-num">${View.amount(m.buyAmount, m.buyCurrency)}</div>
            <div class="amount-cur">${m.buyCurrency}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
          <div style="font-size:.75rem;color:var(--text-500);">
            ${Icon.calendar} <span style="vertical-align:middle;">${View.formatDate(m.meetupDate)}</span>
          </div>
          <span class="badge badge-success badge-dot">${m.status}</span>
        </div>
        <div style="font-size:.78rem;color:var(--text-500);margin-top:6px;display:flex;align-items:center;gap:4px;">
          ${Icon.mapPin} ${m.meetupLocation}
        </div>
        <button class="btn btn-primary btn-full mt-12" onclick="event.stopPropagation();Router.go('messages')">
          ${Icon.messages} Open chat
        </button>
      </div>
    </div>`;
}

/* ── 10.6 TRADE WIZARD ───────────────────────────────────── */
function renderTrade(step = 1) {
  const steps = [
    { n: 1, label: 'Type'     },
    { n: 2, label: 'Currency' },
    { n: 3, label: 'Amount'   },
    { n: 4, label: 'Location' },
    { n: 5, label: 'Review'   },
  ];

  const stepperHtml = `
    <div class="stepper">
      ${steps.map((s, i) => `
        ${i > 0 ? `<div class="step-connector ${s.n < step ? 'done' : ''}"></div>` : ''}
        <div class="step-item ${s.n < step ? 'done' : s.n === step ? 'active' : ''}">
          <div class="step-circle">${s.n < step ? Icon.check : s.n}</div>
          <div class="step-label">${s.label}</div>
        </div>
      `).join('')}
    </div>`;

  let stepContent = '';

  if (step === 1) {
    stepContent = `
      <div class="page-container">
        <div style="padding:8px 0 20px;">
          <h2 style="font-size:1.2rem;font-weight:800;margin-bottom:6px;">What would you like to do?</h2>
          <p style="font-size:.85rem;color:var(--text-500);">Choose whether you're selling or buying foreign currency.</p>
        </div>
        <div class="trade-type-selector">
          <div class="trade-type-option selected" id="type-sell" onclick="Trade.selectType('sell')">
            <div class="type-icon">↗️</div>
            <div class="type-label">Sell</div>
            <div class="type-desc">I have foreign currency to sell</div>
          </div>
          <div class="trade-type-option" id="type-buy" onclick="Trade.selectType('buy')">
            <div class="type-icon">↙️</div>
            <div class="type-label">Buy</div>
            <div class="type-desc">I want to buy foreign currency</div>
          </div>
        </div>

        <div class="card" style="padding:16px;margin-bottom:20px;">
          <div class="section-title mb-12">How it works</div>
          ${[
            ['1', 'Post your trade search'],
            ['2', 'Get matched with nearby traders'],
            ['3', 'Schedule a safe meetup'],
            ['4', 'Exchange and confirm'],
          ].map(([n, t]) => `
            <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--surface-2);">
              <div style="width:24px;height:24px;border-radius:50%;background:var(--brand-500);color:white;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:800;flex-shrink:0;">${n}</div>
              <span style="font-size:.88rem;font-weight:600;color:var(--text-700);">${t}</span>
            </div>
          `).join('')}
        </div>

        <button class="btn btn-primary btn-lg btn-full" onclick="Trade.nextStep(2)">
          Continue ${Icon.arrowRight}
        </button>
      </div>`;

  } else if (step === 2) {
    stepContent = `
      <div class="page-container">
        <div style="padding:8px 0 20px;">
          <h2 style="font-size:1.2rem;font-weight:800;margin-bottom:6px;">Select currencies</h2>
          <p style="font-size:.85rem;color:var(--text-500);">Choose the currency you have and what you want.</p>
        </div>

        <div class="form-group">
          <label class="form-label">I have (selling)</label>
          <div class="form-input-wrap">
            <span class="input-icon" id="have-flag" style="font-size:1.2rem;">🇺🇸</span>
            <select class="form-input" id="currency-have" onchange="Trade.updateFlag('have')">
              ${Currencies.options()}
            </select>
          </div>
        </div>

        <div style="text-align:center;margin:8px 0;">
          <button onclick="Trade.swapCurrencies()" style="background:var(--surface-2);border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;font-size:1.2rem;display:inline-flex;align-items:center;justify-content:center;">⇅</button>
        </div>

        <div class="form-group">
          <label class="form-label">I want (receiving)</label>
          <div class="form-input-wrap">
            <span class="input-icon" id="want-flag" style="font-size:1.2rem;">🇪🇺</span>
            <select class="form-input" id="currency-want" onchange="Trade.updateFlag('want')">
              ${Currencies.options()}
            </select>
          </div>
        </div>

        <div class="currency-pair" style="margin-bottom:20px;">
          <div>
            <div class="currency-code" id="pair-have">USD</div>
            <div class="currency-name">US Dollar</div>
          </div>
          <div class="pair-arrow">${Icon.arrowRight}</div>
          <div style="text-align:right;">
            <div class="currency-code" id="pair-want">EUR</div>
            <div class="currency-name">Euro</div>
          </div>
        </div>

        <div style="display:flex;gap:10px;">
          <button class="btn btn-outline btn-full" onclick="Trade.nextStep(1)">${Icon.arrowLeft} Back</button>
          <button class="btn btn-primary btn-full" onclick="Trade.nextStep(3)">Continue ${Icon.arrowRight}</button>
        </div>
      </div>`;

  } else if (step === 3) {
    stepContent = `
      <div class="page-container">
        <div style="padding:8px 0 20px;">
          <h2 style="font-size:1.2rem;font-weight:800;margin-bottom:6px;">Enter amount</h2>
          <p style="font-size:.85rem;color:var(--text-500);">How much would you like to exchange?</p>
        </div>

        <div class="form-group">
          <label class="form-label">Amount I have</label>
          <div class="form-input-wrap">
            <span class="input-icon" style="font-size:.85rem;font-weight:700;color:var(--text-500);">$</span>
            <input type="number" id="amount-have" class="form-input" placeholder="500.00" min="1" step="0.01" oninput="Trade.calcEstimate()">
          </div>
        </div>

        <div class="card" style="padding:14px 16px;margin-bottom:20px;background:var(--brand-100);border-color:var(--brand-200);">
          <div style="font-size:.75rem;font-weight:600;color:var(--brand-600);margin-bottom:4px;">Estimated you'll receive</div>
          <div style="font-size:1.4rem;font-weight:800;color:var(--brand-700);" id="estimate-out">—</div>
          <div style="font-size:.72rem;color:var(--text-500);margin-top:4px;">*Rate is indicative. Exact rate agreed between traders.</div>
        </div>

        <div class="form-group">
          <label class="form-label">Distance willing to travel</label>
          <div style="display:flex;align-items:center;gap:12px;">
            <input type="range" class="range-slider flex-1" id="distance-range" min="1" max="50" value="10" oninput="Trade.updateDistance()">
            <span class="range-value" id="distance-val">10 mi</span>
          </div>
        </div>

        <div style="display:flex;gap:10px;">
          <button class="btn btn-outline btn-full" onclick="Trade.nextStep(2)">${Icon.arrowLeft} Back</button>
          <button class="btn btn-primary btn-full" onclick="Trade.nextStep(4)">Continue ${Icon.arrowRight}</button>
        </div>
      </div>`;

  } else if (step === 4) {
    stepContent = `
      <div class="page-container">
        <div style="padding:8px 0 20px;">
          <h2 style="font-size:1.2rem;font-weight:800;margin-bottom:6px;">Your location</h2>
          <p style="font-size:.85rem;color:var(--text-500);">Set your area so we can find nearby traders.</p>
        </div>

        <div class="form-group">
          <label class="form-label">City or ZIP code</label>
          <div class="form-input-wrap">
            <span class="input-icon">${Icon.mapPin}</span>
            <input type="text" id="location-input" class="form-input" placeholder="e.g. Washington DC or 20001">
          </div>
        </div>

        <div class="map-placeholder mb-20">
          ${Icon.mapPin}
          <span>Map — location preview</span>
        </div>

        <div style="display:flex;gap:10px;">
          <button class="btn btn-outline btn-full" onclick="Trade.nextStep(3)">${Icon.arrowLeft} Back</button>
          <button class="btn btn-primary btn-full" onclick="Trade.nextStep(5)">Continue ${Icon.arrowRight}</button>
        </div>
      </div>`;

  } else if (step === 5) {
    stepContent = `
      <div class="page-container">
        <div style="padding:8px 0 20px;">
          <h2 style="font-size:1.2rem;font-weight:800;margin-bottom:6px;">Review & post</h2>
          <p style="font-size:.85rem;color:var(--text-500);">Confirm your trade details before posting.</p>
        </div>

        <div class="card mb-20">
          <div class="card-body">
            <div class="section-title mb-12">Trade summary</div>
            ${[
              ['Type',     'Selling USD → EUR'],
              ['Amount',   '$500.00 USD'],
              ['Receive',  '~€460 EUR'],
              ['Location', 'Washington DC'],
              ['Distance', 'Within 10 miles'],
            ].map(([l, v]) => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--surface-2);">
                <span style="font-size:.85rem;color:var(--text-500);">${l}</span>
                <span style="font-size:.88rem;font-weight:600;color:var(--text-900);">${v}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card mb-20" style="padding:14px 16px;background:var(--gold-100);border-color:var(--gold-400);">
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <span style="font-size:1.2rem;">⚠️</span>
            <div style="font-size:.82rem;color:var(--gold-600);line-height:1.5;">
              Always meet in a safe, public location. Never exchange in private. Report suspicious behavior immediately.
            </div>
          </div>
        </div>

        <div style="display:flex;gap:10px;">
          <button class="btn btn-outline btn-full" onclick="Trade.nextStep(4)">${Icon.arrowLeft} Back</button>
          <button class="btn btn-success btn-full" onclick="Trade.submit()">
            ${Icon.check} Post Trade
          </button>
        </div>
      </div>`;
  }

  return `
    <div class="screen active" id="screen-trade">
      ${stepperHtml}
      ${stepContent}
    </div>`;
}

/* ── 10.7 MESSAGES ───────────────────────────────────────── */
function renderMessages() {
  const matches = MockData.matches;
  const user = Store.get('user') || {};

  if (Store.get('activeChatId')) {
    return renderChat(Store.get('activeChatId'));
  }

  return `
    <div class="screen active" id="screen-messages">
      <div class="tab-bar">
        <div class="tab-item active">Active</div>
        <div class="tab-item">Completed</div>
        <div class="tab-item">Archived</div>
      </div>

      <div class="page-container">
        ${matches.length === 0 ? `
          <div class="empty-state" style="padding-top:60px;">
            <div class="empty-state-icon">💬</div>
            <div class="empty-state-title">No messages yet</div>
            <div class="empty-state-desc">When you match with a trader, your conversation will appear here.</div>
            <button class="btn btn-primary mt-12" onclick="Router.go('trade')">Find a trade</button>
          </div>
        ` : matches.map(m => `
          <div class="feed-item" onclick="App.openChat('${m.tradeMatchId}')">
            <div class="feed-avatar" style="font-size:1rem;font-weight:800;background:var(--brand-100);color:var(--brand-600);">
              ${m.sellerFirstName[0]}
            </div>
            <div class="feed-content">
              <div class="feed-name">${m.sellerFirstName}</div>
              <div class="feed-meta">
                <span>${m.sellCurrency} → ${m.buyCurrency}</span>
                <span class="dot">$${m.sellAmount}</span>
              </div>
              <div style="font-size:.78rem;color:var(--text-500);margin-top:4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">
                Perfect, see you then! I'll have the €350 ready.
              </div>
            </div>
            <div class="feed-right">
              <div class="feed-time">15m ago</div>
              <span class="badge badge-success">active</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function renderChat(matchId) {
  const msgs = MockData.messages[matchId] || [];
  const myId = Store.get('user')?.id || 'me';
  const match = MockData.matches.find(m => m.tradeMatchId === matchId) || {};

  return `
    <div class="screen active" id="screen-messages">
      <div class="chat-container">
        <div class="chat-header">
          <button class="header-btn" onclick="App.closeChat()">${Icon.arrowLeft}</button>
          <div class="header-avatar">${(match.sellerFirstName || '?')[0]}</div>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:.95rem;">${match.sellerFirstName || 'Trader'}</div>
            <div style="font-size:.72rem;color:var(--green-600);font-weight:600;">● Online</div>
          </div>
          <div class="match-trust-score">${Icon.star} ${match.trustScore || '4.8'}</div>
        </div>

        <!-- Trade info banner -->
        <div style="background:var(--brand-100);padding:10px 16px;font-size:.78rem;color:var(--brand-700);display:flex;justify-content:space-between;border-bottom:1px solid var(--brand-200);">
          <span>${match.sellCurrency || '?'} → ${match.buyCurrency || '?'} · ${match.sellAmount || '?'}</span>
          <a onclick="App.viewMatch('${matchId}')" style="color:var(--brand-500);font-weight:600;cursor:pointer;">Trade details</a>
        </div>

        <div class="chat-messages" id="chat-messages">
          ${msgs.map(msg => {
            const isMine = msg.fromUserId === myId || msg.fromUserId === 'me';
            return `
              <div class="message-bubble ${isMine ? 'mine' : 'theirs'}">
                <div class="bubble-text">${escapeHtml(msg.message)}</div>
                <div class="bubble-time">${View.timeAgo(msg.dateAdded)}</div>
              </div>`;
          }).join('')}
        </div>

        <div class="chat-input-wrap">
          <textarea class="chat-input" id="chat-text" placeholder="Message..." rows="1"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();Chat.send('${matchId}');}"></textarea>
          <button class="btn btn-primary" style="width:44px;height:44px;padding:0;border-radius:50%;flex-shrink:0;" onclick="Chat.send('${matchId}')">
            ${Icon.send}
          </button>
        </div>
      </div>
    </div>`;
}

/* ── 10.8 REFERRALS ──────────────────────────────────────── */
function renderReferrals() {
  const user = Store.get('user') || {};
  const stats = MockData.referralStats;
  const history = MockData.referralHistory;
  const link = `${location.origin}#register?affiliateId=${user.affiliateId || user.id || 'ref123'}`;
  const tierColors = { bronze: '#cd7f32', silver: '#94a3b8', gold: '#f59e0b', platinum: '#94a3b8' };
  const tierEmoji = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };

  return `
    <div class="screen active" id="screen-referrals">
      <div class="page-container">

        <!-- Hero -->
        <div class="referral-hero">
          <div class="referral-hero-content">
            <div style="font-size:2rem;margin-bottom:8px;">🎁</div>
            <div class="referral-title">Earn rewards, grow together</div>
            <div class="referral-desc">Get <strong>$10 credit</strong> for every friend who completes their first trade. No limit!</div>
            <div class="referral-link-box">
              <div class="referral-link-text" id="ref-link-text">${link}</div>
              <button class="referral-copy-btn" id="ref-copy-btn" onclick="Referral.copyLink('${escapeHtml(link)}')">
                Copy
              </button>
            </div>
            <div style="display:flex;gap:10px;margin-top:12px;">
              <button class="btn btn-glass btn-sm" onclick="Referral.share('${escapeHtml(link)}')">
                ${Icon.share} Share link
              </button>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats-grid mb-20">
          <div class="stat-card">
            <div class="stat-label">Invited</div>
            <div class="stat-value">${stats.invited}</div>
            <div class="stat-delta">friends</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Active</div>
            <div class="stat-value">${stats.active}</div>
            <div class="stat-delta up">trading</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Earned</div>
            <div class="stat-value">$${stats.earnings}</div>
            <div class="stat-delta up">total</div>
          </div>
        </div>

        <!-- Tier progress -->
        <div class="card mb-20">
          <div class="card-body">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
              <div style="font-size:2rem;">${tierEmoji[stats.tier]}</div>
              <div>
                <div style="font-size:1rem;font-weight:800;color:var(--text-900);text-transform:capitalize;">${stats.tier} Tier</div>
                <div style="font-size:.78rem;color:var(--text-500);">${stats.nextTierReq - stats.invited} more referrals to reach ${stats.nextTier}</div>
              </div>
            </div>
            <div style="background:var(--surface-2);border-radius:9999px;height:8px;overflow:hidden;">
              <div style="background:linear-gradient(90deg,var(--brand-500),var(--brand-400));height:100%;border-radius:9999px;width:${Math.min(100, (stats.invited / stats.nextTierReq) * 100)}%;transition:width .6s var(--ease-out);"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:.72rem;color:var(--text-500);">
              <span>${stats.invited} referrals</span>
              <span>${stats.nextTierReq} needed for ${stats.nextTier}</span>
            </div>
          </div>
        </div>

        <!-- Reward tiers -->
        <div class="section-heading"><div class="section-title">Reward tiers</div></div>
        <div class="reward-tiers mb-20">
          ${[
            { icon: '🥉', name: 'Bronze',   desc: '1–9 referrals',  reward: '$10 each', color: '#e9d5a0' },
            { icon: '🥈', name: 'Silver',   desc: '10–24 referrals',reward: '$12 each + 5% bonus', color: '#e2e8f0' },
            { icon: '🥇', name: 'Gold',     desc: '25–49 referrals',reward: '$15 each + 10% bonus', color: '#fef3c7' },
            { icon: '💎', name: 'Platinum', desc: '50+ referrals',  reward: '$20 each + 20% bonus', color: '#ede9fe' },
          ].map(t => `
            <div class="reward-tier">
              <div class="reward-tier-icon" style="background:${t.color};">${t.icon}</div>
              <div class="reward-tier-info">
                <div class="reward-tier-name">${t.name}</div>
                <div class="reward-tier-desc">${t.desc}</div>
              </div>
              <div class="reward-tier-value">${t.reward}</div>
            </div>
          `).join('')}
        </div>

        <!-- Referral history -->
        <div class="section-heading"><div class="section-title">Your referrals</div></div>
        <div class="card mb-20" style="overflow:hidden;padding:0;">
          ${history.map(r => `
            <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--surface-2);">
              <div class="feed-avatar" style="font-size:.9rem;font-weight:800;">${r.name[0]}</div>
              <div style="flex:1;">
                <div style="font-weight:600;font-size:.9rem;">${r.name}</div>
                <div style="font-size:.75rem;color:var(--text-500);">${r.date}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-weight:700;color:var(--green-600);">+$${r.reward.toFixed(2)}</div>
                <span class="badge ${r.status === 'paid' ? 'badge-success' : 'badge-warning'} badge-dot">${r.status}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- How referrals work -->
        <div class="card mb-20" style="padding:20px;">
          <div class="section-title mb-12">How referrals work</div>
          ${[
            ['1', 'Share your unique link', 'Send to friends, post on social media, or embed in your bio.'],
            ['2', 'Friend signs up', 'They create a free account using your link.'],
            ['3', 'They complete a trade', 'Once their first trade is done, you both get rewarded.'],
            ['4', 'Earn & redeem', 'Credits apply to your account balance automatically.'],
          ].map(([n, t, d]) => `
            <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--surface-2);">
              <div style="width:26px;height:26px;border-radius:50%;background:var(--brand-500);color:white;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:800;flex-shrink:0;margin-top:2px;">${n}</div>
              <div>
                <div style="font-weight:700;font-size:.88rem;margin-bottom:2px;">${t}</div>
                <div style="font-size:.78rem;color:var(--text-500);">${d}</div>
              </div>
            </div>
          `).join('')}
        </div>

      </div>
    </div>`;
}

/* ── 10.9 PROFILE & SETTINGS ─────────────────────────────── */
function renderProfile() {
  const user = Store.get('user') || {};
  const initials = View.initials(user);

  return `
    <div class="screen active" id="screen-profile">
      <!-- Profile header -->
      <div class="profile-header">
        <div class="profile-avatar-lg">${initials || '?'}</div>
        <div class="profile-name">${user.firstName || ''} ${user.lastName || ''}</div>
        <div class="profile-member-since">Member since ${user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'today'}</div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <span class="badge" style="background:rgba(255,255,255,.15);color:white;">🥈 Silver Trader</span>
          <span class="badge verified-check" style="background:rgba(16,185,129,.2);color:var(--green-400);">${Icon.check} Verified</span>
        </div>
      </div>

      <!-- Trust / security score -->
      <div class="page-container">
        <div class="card mb-20">
          <div class="card-body">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
              <div class="section-title">Trust score</div>
              <div style="font-size:1.5rem;font-weight:800;color:var(--gold-600);">4.8 ⭐</div>
            </div>
            <div style="display:flex;gap:4px;margin-bottom:8px;">
              ${[1,2,3,4,5].map(i => `
                <div style="flex:1;height:6px;border-radius:3px;background:${i <= 4 ? 'var(--gold-500)' : 'var(--surface-2)'};"></div>
              `).join('')}
            </div>
            <div style="font-size:.78rem;color:var(--text-500);">Based on 23 completed trades and 21 reviews</div>
          </div>
        </div>

        <!-- Security checklist -->
        <div class="card mb-20">
          <div class="card-header">
            <div class="card-title">Security & verification</div>
          </div>
          <div class="card-body" style="padding:0;">
            ${[
              { icon: Icon.mail,        label: 'Email verified',    sub: user.email || 'your@email.com', status: 'verified',  color: 'var(--green-500)' },
              { icon: Icon.phone,       label: 'Phone verified',    sub: user.phone || 'Add phone number', status: user.phone ? 'verified' : 'pending', color: user.phone ? 'var(--green-500)' : 'var(--gold-500)' },
              { icon: Icon.fingerprint, label: 'ID verification',   sub: 'Government ID required',      status: 'pending',   color: 'var(--gold-500)' },
              { icon: Icon.shield,      label: '2FA enabled',       sub: 'Authenticator app',            status: 'not set',   color: 'var(--red-500)' },
            ].map(item => `
              <div class="trust-row" style="padding:12px 16px;">
                <div class="trust-row-icon">${item.icon}</div>
                <div class="trust-row-text">
                  <div class="trust-row-label">${item.label}</div>
                  <div class="trust-row-sub">${item.sub}</div>
                </div>
                <div class="trust-row-status" style="color:${item.color};font-size:.72rem;font-weight:700;text-transform:uppercase;">${item.status}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Settings groups -->
        <div class="settings-section-label">Account</div>
        <div class="card mb-4" style="border-radius:var(--radius-md);overflow:hidden;">
          ${[
            { icon: Icon.user,      label: 'Edit profile',        sub: 'Name, email, phone',    color: 'var(--brand-100)',  iconColor: 'var(--brand-500)',  action: "App.openEditProfile()" },
            { icon: Icon.lock,      label: 'Change password',     sub: 'Update your password',   color: 'var(--brand-100)',  iconColor: 'var(--brand-500)',  action: "App.openChangePassword()" },
            { icon: Icon.shield,    label: 'Two-factor auth',     sub: 'Strongly recommended',   color: 'var(--red-100)',    iconColor: 'var(--red-500)',    action: "Toast.info('Coming soon')" },
          ].map(item => `
            <div class="settings-item" onclick="${item.action}">
              <div class="settings-item-icon" style="background:${item.color};color:${item.iconColor};">${item.icon}</div>
              <div class="settings-item-text">
                <div class="settings-item-label">${item.label}</div>
                <div class="settings-item-sub">${item.sub}</div>
              </div>
              <div class="settings-item-right settings-chevron">${Icon.chevRight}</div>
            </div>
          `).join('')}
        </div>

        <div class="settings-section-label">Trading</div>
        <div class="card mb-4" style="border-radius:var(--radius-md);overflow:hidden;">
          ${[
            { icon: Icon.mapPin,    label: 'Saved addresses',     sub: 'Manage your locations',  color: 'var(--green-100)', iconColor: 'var(--green-600)', action: "Toast.info('Coming soon')" },
            { icon: Icon.gift,      label: 'Referral program',    sub: 'Earn for every invite',  color: 'var(--gold-100)',  iconColor: 'var(--gold-600)',  action: "Router.go('referrals')" },
            { icon: Icon.trending,  label: 'Transaction history', sub: 'Past trades & earnings', color: 'var(--brand-100)', iconColor: 'var(--brand-500)', action: "Toast.info('Coming soon')" },
          ].map(item => `
            <div class="settings-item" onclick="${item.action}">
              <div class="settings-item-icon" style="background:${item.color};color:${item.iconColor};">${item.icon}</div>
              <div class="settings-item-text">
                <div class="settings-item-label">${item.label}</div>
                <div class="settings-item-sub">${item.sub}</div>
              </div>
              <div class="settings-item-right settings-chevron">${Icon.chevRight}</div>
            </div>
          `).join('')}
        </div>

        <div class="settings-section-label">Support</div>
        <div class="card mb-20" style="border-radius:var(--radius-md);overflow:hidden;">
          ${[
            { icon: Icon.shield, label: 'Help & Safety',      sub: 'Rules, disputes, safety tips', color: 'var(--brand-100)', iconColor: 'var(--brand-500)', action: "Toast.info('Coming soon')" },
            { icon: Icon.logout, label: 'Sign out',           sub: '',                              color: 'var(--red-100)',   iconColor: 'var(--red-500)',   action: "Auth.logout()" },
          ].map(item => `
            <div class="settings-item" onclick="${item.action}">
              <div class="settings-item-icon" style="background:${item.color};color:${item.iconColor};">${item.icon}</div>
              <div class="settings-item-text">
                <div class="settings-item-label">${item.label}</div>
                ${item.sub ? `<div class="settings-item-sub">${item.sub}</div>` : ''}
              </div>
              ${item.sub ? `<div class="settings-item-right settings-chevron">${Icon.chevRight}</div>` : ''}
            </div>
          `).join('')}
        </div>

        <div style="text-align:center;padding:16px;font-size:.72rem;color:var(--text-300);">
          NICE Traders v2.0 · <a href="#terms" style="color:var(--text-300);">Terms</a> · <a href="#privacy" style="color:var(--text-300);">Privacy</a>
        </div>
      </div>
    </div>`;
}

/* ── 10.10 NOTIFICATIONS ─────────────────────────────────── */
function renderNotifications() {
  const activity = MockData.recentActivity;
  return `
    <div class="screen active" id="screen-notifications">
      <div class="tab-bar">
        <div class="tab-item active">All</div>
        <div class="tab-item">Trades</div>
        <div class="tab-item">Rewards</div>
      </div>
      ${activity.map(a => `
        <div class="notif-item ${a.read ? '' : 'unread'}">
          <div class="notif-icon" style="background:var(--surface-2);font-size:1.3rem;">${a.icon}</div>
          <div class="notif-content">
            <div class="notif-text"><strong>${a.name}</strong> — ${a.desc}</div>
            <div class="notif-time">${a.time}</div>
          </div>
          ${!a.read ? '<div class="notif-unread-dot"></div>' : ''}
        </div>
      `).join('')}
      ${activity.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">🔔</div>
          <div class="empty-state-title">No notifications</div>
          <div class="empty-state-desc">You're all caught up!</div>
        </div>
      ` : ''}
    </div>`;
}

/* ══════════════════════════════════════════════════════════
   11. AUTH CONTROLLER
   ══════════════════════════════════════════════════════════ */
const Auth = {
  async login(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const errEl = document.getElementById('login-error');
    btn.classList.add('loading');
    errEl.style.display = 'none';

    try {
      const data = await API.login({
        email:    document.getElementById('login-email').value,
        password: document.getElementById('login-password').value,
      });
      Cookie.set('sessionId', data.sessionId);
      Store.patch({ sessionId: data.sessionId, user: data.user });
      App.onLoggedIn();
    } catch (err) {
      errEl.style.display = 'flex';
      errEl.textContent = err.message || 'Invalid email or password';
    } finally {
      btn.classList.remove('loading');
    }
  },

  async register(e) {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    const errEl = document.getElementById('register-error');
    const pwd = document.getElementById('register-password').value;
    const pwd2 = document.getElementById('register-confirm').value;

    if (pwd !== pwd2) {
      errEl.style.display = 'flex';
      errEl.textContent = 'Passwords do not match';
      return;
    }

    btn.classList.add('loading');
    errEl.style.display = 'none';

    try {
      const affiliateId = Cookie.get('affiliateId') || '';
      const data = await API.register({
        firstName: document.getElementById('register-firstName').value,
        lastName:  document.getElementById('register-lastName').value,
        email:     document.getElementById('register-email').value,
        phone:     document.getElementById('register-phone').value,
        password:  pwd,
        affiliateId,
      });
      Cookie.set('sessionId', data.sessionId);
      Store.patch({ sessionId: data.sessionId, user: data.user });
      App.onLoggedIn();
      Toast.success('Welcome to NICE Traders! 🎉');
    } catch (err) {
      errEl.style.display = 'flex';
      errEl.textContent = err.message || 'Registration failed';
    } finally {
      btn.classList.remove('loading');
    }
  },

  async forgotPassword(e) {
    e.preventDefault();
    const msgEl = document.getElementById('forgot-msg');
    msgEl.style.display = 'block';
    msgEl.style.background = 'rgba(26,86,219,.15)';
    msgEl.style.color = 'var(--brand-300)';
    msgEl.textContent = 'If an account exists with that email, a reset link will be sent.';
    Toast.info('Reset link sent (check your email)');
  },

  async logout() {
    try { await API.logout(); } catch (_) {}
    Cookie.remove('sessionId');
    Store.patch({ sessionId: null, user: null, trades: [], matches: [] });
    Toast.info('Signed out');
    Router.go('home');
  },

  togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.innerHTML = isPassword ? Icon.eyeOff : Icon.eye;
  },
};

/* ══════════════════════════════════════════════════════════
   12. TRADE CONTROLLER
   ══════════════════════════════════════════════════════════ */
const Trade = {
  _state: { type: 'sell', have: 'USD', want: 'EUR', amount: 0, distance: 10 },

  selectType(type) {
    this._state.type = type;
    document.getElementById('type-sell')?.classList.toggle('selected', type === 'sell');
    document.getElementById('type-buy')?.classList.toggle('selected', type === 'buy');
  },

  nextStep(step) {
    App.renderScreen('trade', step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  updateFlag(which) {
    const sel = document.getElementById(`currency-${which}`);
    const flagEl = document.getElementById(`${which}-flag`);
    if (!sel || !flagEl) return;
    const code = sel.value;
    const c = Currencies.find(code);
    if (c) {
      flagEl.textContent = c.flag;
      this._state[which] = code;
      const pairEl = document.getElementById(`pair-${which}`);
      if (pairEl) pairEl.textContent = code;
    }
  },

  swapCurrencies() {
    const haveEl = document.getElementById('currency-have');
    const wantEl = document.getElementById('currency-want');
    if (!haveEl || !wantEl) return;
    const tmp = haveEl.value;
    haveEl.value = wantEl.value;
    wantEl.value = tmp;
    this.updateFlag('have');
    this.updateFlag('want');
  },

  calcEstimate() {
    const amt = parseFloat(document.getElementById('amount-have')?.value) || 0;
    const rate = 0.92; // indicative
    const est = (amt * rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const el = document.getElementById('estimate-out');
    if (el) el.textContent = `€${est} EUR (indicative)`;
  },

  updateDistance() {
    const val = document.getElementById('distance-range')?.value || 10;
    const el = document.getElementById('distance-val');
    if (el) el.textContent = `${val} mi`;
    this._state.distance = parseInt(val);
  },

  async submit() {
    Toast.success('Trade posted! Finding matches nearby… 🎯');
    setTimeout(() => Router.go('dashboard'), 1200);
  },
};

/* ══════════════════════════════════════════════════════════
   13. CHAT CONTROLLER
   ══════════════════════════════════════════════════════════ */
const Chat = {
  send(matchId) {
    const input = document.getElementById('chat-text');
    const text = input?.value?.trim();
    if (!text) return;
    input.value = '';

    const msg = {
      id: 'm_' + Date.now(),
      fromUserId: 'me',
      firstName: Store.get('user')?.firstName || 'Me',
      message: text,
      dateAdded: new Date().toISOString(),
    };

    if (!MockData.messages[matchId]) MockData.messages[matchId] = [];
    MockData.messages[matchId].push(msg);

    const container = document.getElementById('chat-messages');
    if (container) {
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble mine';
      bubble.innerHTML = `<div class="bubble-text">${escapeHtml(text)}</div><div class="bubble-time">just now</div>`;
      container.appendChild(bubble);
      container.scrollTop = container.scrollHeight;
    }
  },
};

/* ══════════════════════════════════════════════════════════
   14. REFERRAL CONTROLLER
   ══════════════════════════════════════════════════════════ */
const Referral = {
  copyLink(link) {
    navigator.clipboard?.writeText(link).then(() => {
      const btn = document.getElementById('ref-copy-btn');
      if (btn) { btn.textContent = '✓ Copied!'; btn.classList.add('copied'); }
      Toast.success('Link copied to clipboard!');
      setTimeout(() => {
        if (btn) { btn.textContent = 'Copy'; btn.classList.remove('copied'); }
      }, 2000);
    }).catch(() => Toast.error('Could not copy. Please copy manually.'));
  },

  share(link) {
    if (navigator.share) {
      navigator.share({
        title: 'Join NICE Traders',
        text: 'Trade currency safely with neighbors near you!',
        url: link,
      }).catch(() => {});
    } else {
      this.copyLink(link);
    }
  },
};

/* ══════════════════════════════════════════════════════════
   15. MAIN APP ORCHESTRATOR
   ══════════════════════════════════════════════════════════ */
const App = {
  _tradeStep: 1,

  async init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Capture affiliate ID from URL
    const params = new URLSearchParams(location.search);
    const affiliateId = params.get('affiliateId') || new URLSearchParams(location.hash.split('?')[1] || '').get('affiliateId');
    if (affiliateId) Cookie.set('affiliateId', affiliateId);

    // Online/offline indicator
    window.addEventListener('online',  () => { Store.set('isOnline', true);  Toast.success('Back online'); });
    window.addEventListener('offline', () => { Store.set('isOnline', false); Toast.info('You are offline'); });

    // Scroll header shadow
    document.getElementById('app-main')?.addEventListener('scroll', () => {
      const header = document.getElementById('app-header');
      const scrolled = document.getElementById('app-main').scrollTop > 10;
      header?.classList.toggle('scrolled', scrolled);
    });

    // Restore session
    const savedSession = Cookie.get('sessionId');
    if (savedSession) {
      Store.set('sessionId', savedSession);
      try {
        const data = await API.me();
        Store.set('user', data.user);
        Store.set('sessionId', data.sessionId);
      } catch (_) {
        Cookie.remove('sessionId');
        Store.set('sessionId', null);
      }
    }

    this.updateNavState();
    Router.init();
    // Signal loading splash to remove (after router renders first screen)
    setTimeout(function() {
      Store.set('appReady', true);
      if (window._removeLoader) window._removeLoader();
    }, 100);
  },

  onLoggedIn() {
    this.updateNavState();
    Router.go('dashboard');
  },

  updateNavState() {
    const isLoggedIn = !!Store.get('sessionId');
    const user = Store.get('user');
    const authNav = document.getElementById('header-auth-nav');
    const appNav  = document.getElementById('header-app-nav');
    const bottomNav = document.getElementById('bottom-nav');
    const sideNav   = document.getElementById('side-nav');
    const header    = document.getElementById('app-header');

    if (authNav)  authNav.style.display  = isLoggedIn ? 'none'  : 'flex';
    if (appNav)   appNav.style.display   = isLoggedIn ? 'flex'  : 'none';
    if (bottomNav) bottomNav.style.display = isLoggedIn ? 'flex' : 'none';
    if (header)    header.style.display    = isLoggedIn ? 'flex' : 'none';
    // Side nav: visibility is controlled via CSS media query for md+, but only when logged in
    if (sideNav) {
      if (isLoggedIn) {
        sideNav.removeAttribute('style');  // let CSS media query control
      } else {
        sideNav.style.display = 'none';
      }
    }

    // Update avatar initials
    const avatarEls = document.querySelectorAll('.user-avatar-text');
    avatarEls.forEach(el => { el.textContent = user ? View.initials(user) : '?'; });
  },

  renderScreen(screen, step) {
    const main = document.getElementById('app-main');
    if (!main) return;

    // Determine if we need the app chrome (header/nav) or full-screen auth
    const isAuth = ['home', 'login', 'register', 'forgot'].includes(screen);
    main.classList.toggle('no-nav-offset', isAuth);
    this.updateNavState();
    // Auth screens override header visibility regardless of login state
    if (isAuth) {
      const headerEl = document.getElementById('app-header');
      if (headerEl) headerEl.style.display = 'none';
      const bottomNavEl = document.getElementById('bottom-nav');
      if (bottomNavEl) bottomNavEl.style.display = 'none';
      const sideNavEl = document.getElementById('side-nav');
      if (sideNavEl) sideNavEl.style.display = 'none';
    }

    // Mark bottom / side nav items active
    document.querySelectorAll('.bnav-item[data-screen], .side-nav-item[data-screen]').forEach(el => {
      el.classList.toggle('active', el.dataset.screen === screen);
    });

    let html = '';
    this._tradeStep = step || 1;

    switch (screen) {
      case 'home':           html = renderHome();         break;
      case 'login':          html = renderLogin();        break;
      case 'register':       html = renderRegister();     break;
      case 'forgot':         html = renderForgot();       break;
      case 'dashboard':      html = renderDashboard();    break;
      case 'trade':          html = renderTrade(step||1); break;
      case 'messages':       html = renderMessages();     break;
      case 'referrals':      html = renderReferrals();    break;
      case 'profile':        html = renderProfile();      break;
      case 'notifications':  html = renderNotifications();break;
      default:
        html = `<div class="page-container"><div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Page not found</div><button class="btn btn-primary mt-12" onclick="Router.go('dashboard')">Go home</button></div></div>`;
    }

    main.innerHTML = html;
    main.scrollTop = 0;
  },

  viewTrade(id) {
    Store.set('activeTradeId', id);
    Toast.info('Trade details — coming soon');
  },

  viewMatch(id) {
    Store.set('activeChatId', id);
    Router.go('messages');
  },

  openChat(matchId) {
    Store.set('activeChatId', matchId);
    const main = document.getElementById('app-main');
    if (main) {
      main.innerHTML = renderChat(matchId);
      main.scrollTop = 9999;
    }
  },

  closeChat() {
    Store.set('activeChatId', null);
    Router.go('messages');
  },

  openEditProfile() {
    const user = Store.get('user') || {};
    const backdropEl = document.getElementById('modal-backdrop');
    const sheetEl = document.getElementById('modal-sheet');
    if (!backdropEl || !sheetEl) return;

    sheetEl.innerHTML = `
      <div class="modal-handle"></div>
      <div class="modal-title">Edit Profile</div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">First name</label>
            <input type="text" id="edit-firstName" class="form-input" value="${escapeHtml(user.firstName || '')}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Last name</label>
            <input type="text" id="edit-lastName" class="form-input" value="${escapeHtml(user.lastName || '')}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="edit-email" class="form-input" value="${escapeHtml(user.email || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input type="tel" id="edit-phone" class="form-input" value="${escapeHtml(user.phone || '')}">
        </div>
        <button class="btn btn-primary btn-full mt-12" onclick="App.saveProfile()">Save Changes</button>
      </div>`;

    backdropEl.classList.add('open');
    backdropEl.onclick = (e) => { if (e.target === backdropEl) App.closeModal(); };
  },

  openChangePassword() {
    const backdropEl = document.getElementById('modal-backdrop');
    const sheetEl = document.getElementById('modal-sheet');
    if (!backdropEl || !sheetEl) return;

    sheetEl.innerHTML = `
      <div class="modal-handle"></div>
      <div class="modal-title">Change Password</div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Current password</label>
          <input type="password" id="chpwd-current" class="form-input" placeholder="Enter current password">
        </div>
        <div class="form-group">
          <label class="form-label">New password</label>
          <input type="password" id="chpwd-new" class="form-input" placeholder="Min. 8 characters">
        </div>
        <div class="form-group">
          <label class="form-label">Confirm new password</label>
          <input type="password" id="chpwd-confirm" class="form-input" placeholder="Repeat new password">
        </div>
        <button class="btn btn-primary btn-full mt-12" onclick="App.savePassword()">Update Password</button>
      </div>`;

    backdropEl.classList.add('open');
    backdropEl.onclick = (e) => { if (e.target === backdropEl) App.closeModal(); };
  },

  saveProfile() {
    const user = Store.get('user') || {};
    const updated = {
      ...user,
      firstName: document.getElementById('edit-firstName')?.value || user.firstName,
      lastName:  document.getElementById('edit-lastName')?.value  || user.lastName,
      email:     document.getElementById('edit-email')?.value     || user.email,
      phone:     document.getElementById('edit-phone')?.value     || user.phone,
    };
    Store.set('user', updated);
    this.closeModal();
    Toast.success('Profile updated!');
    this.renderScreen('profile');
  },

  savePassword() {
    const n1 = document.getElementById('chpwd-new')?.value;
    const n2 = document.getElementById('chpwd-confirm')?.value;
    if (!n1 || n1 !== n2) { Toast.error('Passwords do not match'); return; }
    if (n1.length < 8)    { Toast.error('Password must be at least 8 characters'); return; }
    this.closeModal();
    Toast.success('Password updated!');
  },

  closeModal() {
    document.getElementById('modal-backdrop')?.classList.remove('open');
  },
};

/* ══════════════════════════════════════════════════════════
   16. UTILITIES
   ══════════════════════════════════════════════════════════ */
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ══════════════════════════════════════════════════════════
   17. BOOT
   ══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => App.init());
