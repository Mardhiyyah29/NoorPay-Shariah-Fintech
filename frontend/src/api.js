/**
 * NoorPay API Service
 * All calls route through Django backend — API key never exposed
 */

// In local dev, Vite's proxy (see vite.config.js) forwards '/api' to your
// local Django server. In production on Vercel, there's no such proxy, so
// VITE_API_URL must be set (Vercel → Project → Settings → Environment
// Variables) to your deployed Render backend, e.g.:
//   VITE_API_URL=https://noorpay-backend.onrender.com/api
const BASE = import.meta.env.VITE_API_URL || '/api';

import axiosClient from './axiosClient';

let _access  = null;
let _refresh = null;

const getAccessToken = () => _access || localStorage.getItem('np_access');
const getRefreshToken = () => _refresh || localStorage.getItem('np_refresh');

// Persist tokens to localStorage so Axios interceptors can read them
export const setTokens  = (access, refresh) => {
  _access = access; _refresh = refresh;
  if (access) localStorage.setItem('np_access', access);
  if (refresh) localStorage.setItem('np_refresh', refresh);
};
export const clearTokens = () => {
  _access = null; _refresh = null;
  localStorage.removeItem('np_access');
  localStorage.removeItem('np_refresh');
};
export const isLoggedIn  = () => !!getAccessToken();

export const formatNaira = (amount) =>
  `₦${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const request = async (path, options = {}) => {
  try {
    const method = (options.method || 'GET').toLowerCase();
    const data = options.body ? JSON.parse(options.body) : undefined;
    const res = await axiosClient.request({ url: path, method, data, headers: options.headers });
    return res.data;
  } catch (err) {
    if (err.response && err.response.data) throw err.response.data;
    throw { detail: err.message || 'Network error' };
  }
};

// ── AUTH ──────────────────────────────────────────────────────────
export const auth = {
  registerStep1:    (d)  => request('/auth/register/step1/', { method: 'POST', body: JSON.stringify(d) }),
  verifyOTP:        (d)  => request('/auth/register/otp/',   { method: 'POST', body: JSON.stringify(d) }),
  resendOTP:        (email) => request('/auth/register/otp/resend/', { method: 'POST', body: JSON.stringify({ email }) }),
  completeRegister: async (d)  => {
    const data = await request('/auth/register/complete/', { method: 'POST', body: JSON.stringify(d) });
    setTokens(data.access, data.refresh);
    return data;
  },
  forgotPassword: async (email) => {
    return request('/auth/forgot-password/', { method: 'POST', body: JSON.stringify({ email }) });
  },
  resetPassword: async (d) => {
    return request('/auth/reset-password/', { method: 'POST', body: JSON.stringify(d) });
  },

  login: async (email, password) => {
    const data = await request('/auth/login/', { method: 'POST', body: JSON.stringify({ email, password }) });
    setTokens(data.access, data.refresh);
    return data;
  },
  logout: async () => {
    try { await request('/auth/logout/', { method: 'POST', body: JSON.stringify({ refresh: getRefreshToken() }) }); }
    finally { clearTokens(); }
  },

  getProfile:    () => request('/auth/profile/'),
  updateProfile: (d) => request('/auth/profile/', { method: 'PATCH', body: JSON.stringify(d) }),
  changePin:     (d) => request('/auth/pin/change/', { method: 'POST', body: JSON.stringify(d) }),
  toggleBiometric: () => request('/auth/biometric/', { method: 'POST' }),
  freezeAccount:   () => request('/auth/freeze/',    { method: 'POST' }),
  getSessions:     () => request('/auth/sessions/'),
  endSession:    (id) => request(`/auth/sessions/${id}/end/`, { method: 'DELETE' }),
  endAllSessions:  () => request('/auth/sessions/end-all/', { method: 'DELETE' }),
};

// ── WALLET ────────────────────────────────────────────────────────
export const wallet = {
  get:               () => request('/wallet/'),
  getBeneficiaries:  () => request('/wallet/beneficiaries/'),
  addBeneficiary:   (d) => request('/wallet/beneficiaries/', { method: 'POST', body: JSON.stringify(d) }),
  deleteBeneficiary:(id) => request(`/wallet/beneficiaries/${id}/`, { method: 'DELETE' }),
  toggleFavourite:  (id) => request(`/wallet/beneficiaries/${id}/favourite/`, { method: 'POST' }),
};

// ── TRANSACTIONS ─────────────────────────────────────────────────
export const transactions = {
  getAll:      (params = {}) => request(`/transactions/?${new URLSearchParams(params)}`),
  getOne:      (id)  => request(`/transactions/${id}/`),
  sendInternal:(d)   => request('/transactions/transfer/internal/', { method: 'POST', body: JSON.stringify(d) }),
  buyAirtime:  (d)   => request('/transactions/airtime/', { method: 'POST', body: JSON.stringify(d) }),
  buyData:     (d)   => request('/transactions/data/',    { method: 'POST', body: JSON.stringify(d) }),
};

// ── BUDGETS ──────────────────────────────────────────────────────
export const budgets = {
  getAll:    (m, y) => request(`/budgets/?month=${m}&year=${y}`),
  create:    (d)    => request('/budgets/', { method: 'POST', body: JSON.stringify(d) }),
  update:    (id,d) => request(`/budgets/${id}/`, { method: 'PATCH', body: JSON.stringify(d) }),
  delete:    (id)   => request(`/budgets/${id}/`, { method: 'DELETE' }),
  getSummary:(m, y) => request(`/budgets/summary/?month=${m}&year=${y}`),
  getIncome: (m, y) => request(`/budgets/income/?month=${m}&year=${y}`),
  addIncome: (d)    => request('/budgets/income/', { method: 'POST', body: JSON.stringify(d) }),
};

// ── SAVINGS ──────────────────────────────────────────────────────
export const savings = {
  getAll:    () => request('/savings/'),
  getSummary:() => request('/savings/summary/'),
  create:    (d) => request('/savings/', { method: 'POST', body: JSON.stringify(d) }),
  update:   (id,d)=> request(`/savings/${id}/`, { method: 'PATCH', body: JSON.stringify(d) }),
  delete:    (id) => request(`/savings/${id}/`, { method: 'DELETE' }),
  deposit:  (id,d)=> request(`/savings/${id}/deposit/`, { method: 'POST', body: JSON.stringify(d) }),
  withdraw: (id,d)=> request(`/savings/${id}/withdraw/`, { method: 'POST', body: JSON.stringify(d) }),
};

// ── ISLAMIC FINANCE ──────────────────────────────────────────────
export const islamicFinance = {
  calculateZakat: (d)    => request('/islamic-finance/zakat/calculate/', { method: 'POST', body: JSON.stringify(d) }),
  payZakat:       (d)    => request('/islamic-finance/zakat/pay/',       { method: 'POST', body: JSON.stringify(d) }),
  getCampaigns:   ()     => request('/islamic-finance/sadaqah/campaigns/'),
  donate:         (d)    => request('/islamic-finance/sadaqah/donate/',  { method: 'POST', body: JSON.stringify(d) }),
  getLoans:       ()     => request('/islamic-finance/qard/'),
  requestLoan:    (d)    => request('/islamic-finance/qard/',            { method: 'POST', body: JSON.stringify(d) }),
  repayLoan:      (id,d) => request(`/islamic-finance/qard/${id}/repay/`,{ method: 'POST', body: JSON.stringify(d) }),
};

// ── SCHOLARSHIP ──────────────────────────────────────────────────
export const scholarship = {
  getAll:  ()    => request('/scholarship/'),
  create:  (d)   => request('/scholarship/', { method: 'POST', body: JSON.stringify(d) }),
  update:  (id,d)=> request(`/scholarship/${id}/`, { method: 'PATCH', body: JSON.stringify(d) }),
  delete:  (id)  => request(`/scholarship/${id}/`, { method: 'DELETE' }),
};

// ── STUDENT FINANCE ──────────────────────────────────────────────
export const studentFinance = {
  getExpenses:  (m,y) => request(`/student-finance/?month=${m}&year=${y}`),
  addExpense:   (d)   => request('/student-finance/', { method: 'POST', body: JSON.stringify(d) }),
  getSummary:   (m,y) => request(`/student-finance/summary/?month=${m}&year=${y}`),
  getAllowance:  ()    => request('/student-finance/allowance/'),
  addAllowance: (d)   => request('/student-finance/allowance/', { method: 'POST', body: JSON.stringify(d) }),
};

// ── NOTIFICATIONS ─────────────────────────────────────────────────
export const notifications = {
  getAll:      (unread) => request(`/notifications/${unread ? '?unread=1' : ''}`),
  getUnreadCount: ()    => request('/notifications/unread-count/'),
  markRead:     (id)    => request(`/notifications/${id}/read/`, { method: 'PATCH' }),
  markAllRead:  ()      => request('/notifications/mark-all-read/', { method: 'POST' }),
  delete:       (id)    => request(`/notifications/${id}/delete/`, { method: 'DELETE' }),
};

// ── REPORTS & AI ─────────────────────────────────────────────────
export const reports = {
  getMonthly: (m,y)     => request(`/reports/monthly/?month=${m}&year=${y}`),
  chatWithAI: (messages) => request('/reports/ai/chat/', { method: 'POST', body: JSON.stringify({ messages }) }),
  getAIPrompts:()        => request('/reports/ai/prompts/'),
};
