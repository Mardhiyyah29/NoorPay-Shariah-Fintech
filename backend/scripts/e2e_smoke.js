const BASE = 'http://127.0.0.1:8000';
const EMAIL = 'ci.tester+2@example.com';
const PASSWORD = 'StrongPass123';

async function login(){
  const res = await fetch(`${BASE}/api/auth/login/`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:EMAIL,password:PASSWORD})});
  return res.json();
}

async function call(url, token, opts={}){
  opts.headers = opts.headers || {};
  opts.headers['Content-Type']='application/json';
  if(token) opts.headers['Authorization'] = 'Bearer '+token;
  const res = await fetch(url, opts);
  let text = await res.text();
  let body;
  try{ body = JSON.parse(text);}catch(e){ body = text; }
  return {status: res.status, body};
}

(async ()=>{
  console.log('E2E SMOKE START');
  const js = await login();
  if(!js.access){ console.error('LOGIN FAILED', js); process.exit(1); }
  const token = js.access;
  console.log('LOGIN OK');

  const endpoints = [
    {name:'wallet', url:`${BASE}/api/wallet/`},
    {name:'transactions', url:`${BASE}/api/transactions/`},
    {name:'rewards', url:`${BASE}/api/rewards/`}
  ];

  for(const e of endpoints){
    const r = await call(e.url, token, {method:'GET'});
    console.log(e.name.toUpperCase(), r.status, typeof r.body==='object'? JSON.stringify(r.body).slice(0,200): String(r.body).slice(0,200));
  }

  // perform transfer, airtime, data (if possible)
  const transferPayload = {amount:1500, pin:'1234', recipient_account:'8033485894', note:'E2E test'};
  const tr = await call(`${BASE}/api/transactions/transfer/internal/`, token, {method:'POST', body: JSON.stringify(transferPayload)});
  console.log('TRANSFER', tr.status, tr.body);

  const airtimePayload = {amount:200, pin:'1234', phone:'08012345678', network:'mtn'};
  const ar = await call(`${BASE}/api/transactions/airtime/`, token, {method:'POST', body: JSON.stringify(airtimePayload)});
  console.log('AIRTIME', ar.status, ar.body);

  const dataPayload = {amount:300, pin:'1234', phone:'08012345678', network:'mtn', bundle_name:'1GB'};
  const dr = await call(`${BASE}/api/transactions/data/`, token, {method:'POST', body: JSON.stringify(dataPayload)});
  console.log('DATA', dr.status, dr.body);

  // include Authorization header on logout to satisfy IsAuthenticated permission
  const logoutRes = await call(`${BASE}/api/auth/logout/`, token, { method: 'POST', body: JSON.stringify({ refresh: js.refresh }) });
  console.log('LOGOUT', logoutRes.status, logoutRes.body);

  console.log('E2E SMOKE COMPLETE');
})();
