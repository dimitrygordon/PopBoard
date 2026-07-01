/* =========================================================================
   GROUNDED NATURAL FOODS — app.js
   Data is now backed live by Firebase Firestore (see the FIREBASE block
   below). The `db` object still holds the exact same shape as before and
   is what every render/UI function reads from — it's now a live local
   mirror of Firestore rather than a static mock. Any mutation anywhere in
   the app eventually funnels through scheduleSave(), which pushes the
   whole relevant collection back up to Firestore (debounced), and
   Firestore's onSnapshot listeners keep every open tab/device in sync.
   ========================================================================= */

/* ---------------------------- DATE HELPERS ---------------------------- */
const DOW = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_KEYS = ['MON','TUE','WED','THU','FRI','SAT']; // schedule days, Sunday added via toggle
const ALL_DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
function pad(n){ return n<10 ? '0'+n : ''+n; }
function isoDate(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function todayISO(){ return isoDate(new Date()); }
function startOfWeekMonday(d){
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate()+diff);
  date.setHours(0,0,0,0);
  return date;
}
function addDays(d,n){ const nd = new Date(d); nd.setDate(nd.getDate()+n); return nd; }
function fmtShort(d){ return `${d.getMonth()+1}/${d.getDate()}`; }
function formatTime12hr(t){
  if(!t) return '';
  const [h,m] = t.split(':').map(Number);
  const period = h>=12 ? 'PM' : 'AM';
  let h12 = h % 12; if(h12===0) h12 = 12;
  return `${pad(h12)}:${pad(m)} ${period}`;
}
function weekKeyOf(d){ return isoDate(startOfWeekMonday(d)); }
function fmtWeekRange(monday){
  const sat = addDays(monday,5);
  return `${MONTHS[monday.getMonth()].slice(0,3)} ${monday.getDate()} – ${MONTHS[sat.getMonth()].slice(0,3)} ${sat.getDate()}`;
}
function lastNMonthLabels(n){
  const out = [];
  const now = new Date();
  for(let i=n-1;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    out.push(MONTHS[d.getMonth()].slice(0,3));
  }
  return out;
}
// stats.added / stats.checked are a rolling 12-month window whose LAST index
// is always "this month" (matches lastNMonthLabels' ordering). Whenever real
// time has moved into a new month since this employee's stats were last
// touched, shift the window forward first so old months roll off correctly.
function ensureStatsCurrentMonth(emp){
  if(!emp.stats) emp.stats = { added:Array(12).fill(0), checked:Array(12).fill(0) };
  const nowKey = `${new Date().getFullYear()}-${pad(new Date().getMonth()+1)}`;
  if(emp.statsMonthKey !== nowKey){
    if(emp.statsMonthKey){
      const [oy,om] = emp.statsMonthKey.split('-').map(Number);
      const [ny,nm] = nowKey.split('-').map(Number);
      const monthsPassed = Math.max(0, Math.min((ny-oy)*12 + (nm-om), 12));
      for(let i=0;i<monthsPassed;i++){
        emp.stats.added.shift(); emp.stats.added.push(0);
        emp.stats.checked.shift(); emp.stats.checked.push(0);
      }
    }
    emp.statsMonthKey = nowKey;
  }
}
// Records one item-added or item-checked-off event against the currently
// logged-in employee (master actions aren't attributed to any employee).
function recordEmployeeStat(kind){
  if(!session || session.isMaster) return;
  const emp = db.employees.find(e=>e.id===session.employeeId);
  if(!emp) return;
  ensureStatsCurrentMonth(emp);
  emp.stats[kind][11] = (emp.stats[kind][11]||0) + 1;
}
// Re-renders destroy and recreate every input in portal-body, which drops focus
// after a single keystroke. Any live-filter input calls this right after
// renderPortalBody() to put focus (and the cursor position) right back where
// it was, so typing feels the same as the persistent top search box.
function reFocusInput(id, cursorPos){
  const el = document.getElementById(id);
  if(el){
    el.focus();
    if(typeof cursorPos === 'number'){
      try{ el.setSelectionRange(cursorPos, cursorPos); }catch(e){}
    }
  }
}
function escHtmlAttr(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }

/* ---------------------------- DATA LAYER (mock) ---------------------------- */
const db = {
  master: { username:'Gordon', password:'4byHisgrace' },

  settings: {
    showWeekendsSoup: false,   // customer + admin soup calendar: show Sat/Sun columns
    showSunSchedule: false     // scheduling grid: show Sunday column
  },

  // Master-managed list of employee roles. Fully custom — add as many as needed
  // from Add Employee or the employee detail page.
  roles: [],

  employees: [],

  categories: [],

  localUpcDb: {},

  expirationItems: [],

  soups: [],
  // Soup size/pricing tiers shown on the Weekly Deli Menu's Soups box.
  // Editable (add/rename sizes, edit price, delete) from the Soup Menu tab.
  soupSizes: [
    { id:'szsm', name:'Small', price:'' },
    { id:'szmd', name:'Medium', price:'' },
    { id:'szlg', name:'Large', price:'' }
  ],
  // soupMenu[monthKey][isoDate] = soupId   monthKey = 'YYYY-MM'
  soupMenu: {},

  // Deli boxes are dynamic — the master adds/renames/deactivates/deletes boxes
  // from the Deli Menu tab. Start blank; use "+ Add Box" to create the first one.
  deliBoxes: [],
  deliItemLists: {},

  // weeklyMenus[weekKey] = { [boxId]: {price, notes, items:[id..]} }
  weeklyMenus: {},

  produceDeals: [],

  // schedule[weekKey][employeeId][DAY] = {start,end}
  schedule: {},
  timeOffRequests: [],
  chatMessages: []
};

/* ============================================================
   FIREBASE — connected to the "GroundedMarket" project.
   ============================================================
   These values are safe to be public in client-side code — real security
   lives in Firestore/Storage Rules (see the rules provided separately),
   not in hiding these.
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyCYd08eJkPenGNUkVuRC2ozfe5nTfTye1I",
  authDomain: "groundedmarket-86e50.firebaseapp.com",
  projectId: "groundedmarket-86e50",
  storageBucket: "groundedmarket-86e50.firebasestorage.app",
  messagingSenderId: "518382046314",
  appId: "1:518382046314:web:4bd964d6bf2607cb7a8e13"
};
firebase.initializeApp(firebaseConfig);
const fsdb = firebase.firestore();
const storage = firebase.storage();

const FIRESTORE_COLLECTIONS = ['categories','expirations','employees','roles','soups','soupSizes','soupMenu','deli','produce','schedule','timeOffRequests','chat','settings'];
// CRITICAL SAFEGUARD: a collection is only "loaded" once we've successfully
// received real data from Firestore for it (or successfully created it, if
// it was genuinely brand new). Saves are hard-blocked until every single
// collection has loaded — this is what prevents a bug (or a quota/permission
// hiccup on the very first read) from ever pushing blank local defaults up
// and overwriting real data in Firestore. Do not remove this gate.
let loadedCollections = new Set();
function markLoaded(name){ loadedCollections.add(name); }
function allCollectionsLoaded(){ return FIRESTORE_COLLECTIONS.every(n=>loadedCollections.has(n)); }

// Guards against a save→listen→save feedback loop: while we're applying data
// that just arrived FROM Firestore, scheduleSave() below is a no-op.
let applyingRemoteUpdate = false;
let saveDebounceTimer = null;
function scheduleSave(){
  if(applyingRemoteUpdate) return;
  if(!allCollectionsLoaded()) return; // never write before every collection has loaded once
  clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(saveAllToFirestore, 500);
}
// Remembers the last JSON actually written/read for each collection, so we
// skip re-writing a document that hasn't changed — cuts write volume a lot,
// since scheduleSave() runs after nearly every render, not just real edits.
let lastKnownJSON = {};
function saveAllToFirestore(){
  const w = (name, payload) => {
    const json = JSON.stringify(payload);
    if(lastKnownJSON[name] === json) return;
    lastKnownJSON[name] = json;
    fsdb.collection('store').doc(name).set(payload).catch(err=>console.error('Firestore save failed:', name, err));
  };
  w('categories', { list: db.categories });
  w('expirations', { items: db.expirationItems, localUpcDb: db.localUpcDb });
  w('employees', { list: db.employees });
  w('roles', { list: db.roles });
  w('soups', { list: db.soups });
  w('soupSizes', { list: db.soupSizes });
  w('soupMenu', { data: db.soupMenu });
  w('deli', { boxes: db.deliBoxes, itemLists: db.deliItemLists, weeklyMenus: db.weeklyMenus });
  w('produce', { list: db.produceDeals });
  w('schedule', { data: db.schedule });
  w('timeOffRequests', { list: db.timeOffRequests });
  w('chat', { list: db.chatMessages });
  w('settings', db.settings);
}
// Live-syncs every collection. On a brand-new/empty Firestore project this
// seeds it blank; after that, every open tab/device shares the same live
// data, and edits show up everywhere within moments.
function bindDoc(name, applyFn, seedPayload){
  fsdb.collection('store').doc(name).onSnapshot(snap=>{
    if(snap.exists){
      applyFn(snap.data());
      lastKnownJSON[name] = JSON.stringify(snap.data());
      markLoaded(name);
      afterFirestoreUpdate();
    } else {
      fsdb.collection('store').doc(name).set(seedPayload)
        .then(()=>{ lastKnownJSON[name] = JSON.stringify(seedPayload); markLoaded(name); })
        .catch(err=>console.error('Firestore seed failed:', name, err));
    }
  }, err=>{
    // Do NOT mark this collection as loaded on error — that's what keeps
    // scheduleSave() blocked until a real read actually succeeds.
    console.error('Firestore listener failed:', name, err);
  });
}
function initFirebaseSync(){
  bindDoc('categories', d=>{ db.categories = d.list||[]; }, { list: db.categories });
  bindDoc('expirations', d=>{ db.expirationItems = d.items||[]; db.localUpcDb = d.localUpcDb||{}; }, { items: db.expirationItems, localUpcDb: db.localUpcDb });
  bindDoc('employees', d=>{ db.employees = d.list||[]; }, { list: db.employees });
  bindDoc('roles', d=>{ db.roles = d.list||[]; }, { list: db.roles });
  bindDoc('soups', d=>{ db.soups = d.list||[]; }, { list: db.soups });
  bindDoc('soupSizes', d=>{ db.soupSizes = d.list||[]; }, { list: db.soupSizes });
  bindDoc('soupMenu', d=>{ db.soupMenu = d.data||{}; }, { data: db.soupMenu });
  bindDoc('deli', d=>{ db.deliBoxes = d.boxes||[]; db.deliItemLists = d.itemLists||{}; db.weeklyMenus = d.weeklyMenus||{}; }, { boxes: db.deliBoxes, itemLists: db.deliItemLists, weeklyMenus: db.weeklyMenus });
  bindDoc('produce', d=>{ db.produceDeals = d.list||[]; }, { list: db.produceDeals });
  bindDoc('schedule', d=>{ db.schedule = d.data||{}; }, { data: db.schedule });
  bindDoc('timeOffRequests', d=>{ db.timeOffRequests = d.list||[]; }, { list: db.timeOffRequests });
  bindDoc('chat', d=>{ db.chatMessages = d.list||[]; }, { list: db.chatMessages });
  bindDoc('settings', d=>{ db.settings = { showWeekendsSoup: !!d.showWeekendsSoup, showSunSchedule: !!d.showSunSchedule }; }, db.settings);
}
// Re-renders whatever's currently on screen after data arrives from another
// device/tab. Restores the employee-detail sub-view instead of bouncing
// back to the list, if that's what was open.
function afterFirestoreUpdate(){
  applyingRemoteUpdate = true;
  if(!document.getElementById('view-public').classList.contains('hidden')){
    renderPublic();
  }
  if(session && !document.getElementById('view-portal').classList.contains('hidden')){
    if(activeTab==='Employees' && viewingEmployeeId){
      if(db.employees.find(e=>e.id===viewingEmployeeId)) openEmployeeDetail(viewingEmployeeId);
      else { viewingEmployeeId = null; renderPortalBody(); }
    } else {
      renderPortalBody();
    }
  }
  applyingRemoteUpdate = false;
}

function newId(prefix){ return prefix + Math.random().toString(36).slice(2,9); }

/* Role picker: a select of existing roles plus a "+ Add new role…" option that
   reveals a text field. Used identically on Add Employee and the employee
   detail page, so any custom role typed in either place is saved to
   db.roles and immediately available everywhere else. */
function roleSelectHTML(prefix, currentRole){
  const opts = db.roles.map(r=>`<option value="${r}" ${r===currentRole?'selected':''}>${r}</option>`).join('');
  const noRolesYet = db.roles.length === 0;
  return `<select id="${prefix}-role-select" onchange="toggleNewRoleInput('${prefix}')">${opts}<option value="__new__" ${noRolesYet?'selected':''}>+ Add new role…</option></select>
    <input type="text" id="${prefix}-role-new" class="${noRolesYet?'':'hidden'}" placeholder="New role name" style="margin-top:6px">`;
}
function toggleNewRoleInput(prefix){
  const sel = document.getElementById(`${prefix}-role-select`);
  const inp = document.getElementById(`${prefix}-role-new`);
  inp.classList.toggle('hidden', sel.value !== '__new__');
  if(sel.value === '__new__') inp.focus();
}
function resolveRole(prefix){
  const sel = document.getElementById(`${prefix}-role-select`);
  if(sel.value === '__new__'){
    const val = document.getElementById(`${prefix}-role-new`).value.trim();
    if(val && !db.roles.includes(val)) db.roles.push(val);
    return val || 'General';
  }
  return sel.value;
}

function blankMenuTemplate(){
  const t = {};
  db.deliBoxes.forEach(b=>{ t[b.id] = { price:'', notes:'', items:[] }; });
  return t;
}
function weeklyMenu(weekKey){
  if(!db.weeklyMenus[weekKey]){
    const keys = Object.keys(db.weeklyMenus).sort();
    const prev = keys.length ? db.weeklyMenus[keys[keys.length-1]] : null;
    const base = prev ? JSON.parse(JSON.stringify(prev)) : blankMenuTemplate();
    db.deliBoxes.forEach(b=>{ if(!base[b.id]) base[b.id] = { price:'', notes:'', items:[] }; });
    db.weeklyMenus[weekKey] = base;
  }
  return db.weeklyMenus[weekKey];
}
// When items are added/removed for a given week+box, every already-generated
// future week mirrors that change. Past weeks are never touched.
function cascadeDeliChangeForward(weekKey, boxId){
  const items = weeklyMenu(weekKey)[boxId].items.slice();
  Object.keys(db.weeklyMenus).filter(k=>k>weekKey).sort().forEach(k=>{
    if(db.weeklyMenus[k][boxId]) db.weeklyMenus[k][boxId].items = items.slice();
  });
}

function monthSoupMenu(monthKey){
  if(!db.soupMenu[monthKey]) db.soupMenu[monthKey] = {};
  return db.soupMenu[monthKey];
}

/* ---------------------------- SESSION ---------------------------- */
let session = null; // {isMaster, employeeId, name}
let activeTab = 'Expirations';
let expSubView = 'items'; // 'items' | 'categories' (master only)
let viewingEmployeeId = null; // set while an employee detail sub-view is open

/* expirations carousel state */
let catDayOffset = {};    // catId -> integer days from today
let catSearchTerm = {};   // catId -> string, used by the category search modal
let catDateFilter = {};   // catId -> ISO date string, used by the category search modal
let pastExpanded = false;
let pastDateFilter = '';
let soupListSearchTerm = '';

/* public + admin carousel offsets */
let publicDeliWeekOffset = 0;
let deliAdminWeekOffset = 0;
let publicSoupMonthOffset = 0;
let soupAdminMonthOffset = 0;
let scheduleWeekOffset = 0;

let activeScanReader = null;

/* ---------------------------- ROUTER ---------------------------- */
function showView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

/* ============================================================
   PUBLIC PAGE RENDER
   ============================================================ */
function renderPublic(){
  publicDeliWeekOffset = 0;
  publicSoupMonthOffset = 0;
  renderDeliPanel();
  renderSoupPanel();
  renderProduceList('produce-list', false);
}

function diettags(o){
  let out = '';
  if(o.df) out += '<span class="tag tag-df" title="Dairy Free"></span>';
  if(o.gf) out += '<span class="tag tag-gf" title="Gluten Free"></span>';
  if(o.v) out += '<span class="tag tag-v" title="Vegetarian"></span>';
  return out;
}
function soupSizePriceLabel(){
  const priced = (db.soupSizes||[]).filter(s=>s.price);
  return priced.length ? priced.map(s=>`${s.name} $${s.price}`).join(' · ') : '';
}

/* ---- Deli (public) ---- */
function renderDeliPanel(){
  const monday = addDays(startOfWeekMonday(new Date()), publicDeliWeekOffset*7);
  document.getElementById('deli-week-range').textContent = fmtWeekRange(monday);
  renderDeliGrid(monday);
}
function renderDeliGrid(monday){
  const weekKey = weekKeyOf(monday);
  const menu = weeklyMenu(weekKey);

  const soupRows = ['MON','TUE','WED','THU','FRI'].map((label,i)=>{
    const date = addDays(monday,i);
    const mk = `${date.getFullYear()}-${pad(date.getMonth()+1)}`;
    const mm = monthSoupMenu(mk);
    const sid = mm[isoDate(date)];
    const soup = db.soups.find(s=>s.id===sid);
    return `<div class="soup-day-row"><span class="dow">${label}</span><span>${soup ? soup.name+' '+diettags(soup) : '—'}</span></div>`;
  }).join('');

  function box(boxDef){
    const data = menu[boxDef.id];
    const list = db.deliItemLists[boxDef.id] || [];
    if(!data) return '';
    const items = data.items.map(id=>{
      const item = list.find(l=>l.id===id);
      if(!item) return '';
      return `<div class="deli-item"><div class="deli-item-name">${item.name} ${diettags(item)}</div><div class="deli-item-desc">${item.desc}</div></div>`;
    }).join('');
    return `<div class="deli-box"><h3>${boxDef.title} ${data.price?`<span class="price">$${data.price}</span>`:''}</h3>${items || '<p class="empty-note">Nothing on the menu this week.</p>'}${data.notes ? `<div class="deli-notes">${data.notes}</div>`:''}</div>`;
  }

  const activeBoxes = db.deliBoxes.filter(b=>b.active);
  const mid = Math.ceil(activeBoxes.length/2) || 1;
  const colA = activeBoxes.slice(0,mid), colB = activeBoxes.slice(mid);

  document.getElementById('deli-grid').innerHTML = `
    <div class="deli-col">
      <div class="deli-box"><h3>Soups ${soupSizePriceLabel() ? `<span class="price">${soupSizePriceLabel()}</span>` : ''}</h3>${soupRows}</div>
      ${colA.map(box).join('')}
    </div>
    <div class="deli-col">
      ${colB.map(box).join('')}
    </div>`;
}

/* ---- Soup (public) ---- */
function dowHeaderHTML(showWeekends){
  const days = showWeekends ? ['MON','TUE','WED','THU','FRI','SAT','SUN'] : ['MON','TUE','WED','THU','FRI'];
  return days.map(d=>`<span>${d}</span>`).join('');
}
function renderSoupPanel(){
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth()+publicSoupMonthOffset);
  const monthKey = `${base.getFullYear()}-${pad(base.getMonth()+1)}`;
  document.getElementById('soup-month-title').textContent = `${MONTHS[base.getMonth()]} Soups`;
  const sw = db.settings.showWeekendsSoup;
  const dowEl = document.getElementById('soup-cal-dow');
  dowEl.className = `soup-cal-dow cols-${sw?7:5}`;
  dowEl.innerHTML = dowHeaderHTML(sw);
  const calEl = document.getElementById('soup-cal');
  calEl.className = `soup-cal cols-${sw?7:5}`;
  calEl.innerHTML = buildSoupCalHTML(monthKey, sw, false); // never show Source publicly
}
// Downloadable .ics file for the month currently being viewed — one all-day
// event per scheduled soup. Both Apple Calendar and Google Calendar can
// import a standard .ics file directly, so one export covers either choice.
function escapeICS(str){
  return (str||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
}
function exportSoupMenuICS(){
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth()+publicSoupMonthOffset);
  const monthKey = `${base.getFullYear()}-${pad(base.getMonth()+1)}`;
  const mm = monthSoupMenu(monthKey);
  const dates = Object.keys(mm).sort();
  if(!dates.length){ alert('No soups are scheduled for this month yet.'); return; }
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}Z`;
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Grounded Natural Foods//Soup Menu//EN\r\nCALSCALE:GREGORIAN\r\n';
  dates.forEach(dateISO=>{
    const soup = db.soups.find(s=>s.id===mm[dateISO]);
    if(!soup) return;
    const dtstart = dateISO.replace(/-/g,'');
    const dtend = isoDate(addDays(new Date(dateISO+'T00:00'),1)).replace(/-/g,'');
    const tags = [soup.df?'Dairy Free':'', soup.gf?'Gluten Free':'', soup.v?'Vegetarian':''].filter(Boolean).join(', ');
    ics += 'BEGIN:VEVENT\r\n';
    ics += `UID:soup-${dateISO}@groundedmarket.com\r\n`;
    ics += `DTSTAMP:${stamp}\r\n`;
    ics += `DTSTART;VALUE=DATE:${dtstart}\r\n`;
    ics += `DTEND;VALUE=DATE:${dtend}\r\n`;
    ics += `SUMMARY:${escapeICS(soup.name + ' Soup')}\r\n`;
    if(tags) ics += `DESCRIPTION:${escapeICS(tags)}\r\n`;
    ics += `LOCATION:${escapeICS('Grounded Natural Foods, 435 S US HWY 231, Jasper IN')}\r\n`;
    ics += 'END:VEVENT\r\n';
  });
  ics += 'END:VCALENDAR\r\n';
  const blob = new Blob([ics], { type:'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grounded-soup-menu-${MONTHS[base.getMonth()].toLowerCase()}-${base.getFullYear()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
// canSeeSoupSource — Source is a master/Kitchen-staff-only detail, never shown
// to customers or to employees in other roles.
function canSeeSoupSource(){
  if(!session) return false;
  if(session.isMaster) return true;
  const emp = db.employees.find(e=>e.id===session.employeeId);
  return !!(emp && (emp.role==='Kitchen' || emp.role==='Kitchen & Floor'));
}
function buildSoupCalHTML(monthKey, showWeekends, showSource){
  const [y,m] = monthKey.split('-').map(Number);
  const last = new Date(y, m, 0);
  const mm = monthSoupMenu(monthKey);
  let cells = '';
  let leadingPlaced = false;
  for(let d=1; d<=last.getDate(); d++){
    const date = new Date(y,m-1,d);
    let dow = date.getDay(); dow = dow===0?6:dow-1; // 0=Mon..6=Sun
    if(!showWeekends && dow>=5) continue; // skip Sat/Sun entirely
    if(!leadingPlaced){
      for(let i=0;i<dow;i++) cells += `<div class="soup-cell empty"></div>`;
      leadingPlaced = true;
    }
    const iso = isoDate(date);
    const soup = db.soups.find(s=>s.id===mm[iso]);
    cells += `<div class="soup-cell" data-date="${iso}">
      <div class="d">${d}</div>
      ${soup ? `<div class="s-name">${soup.name}</div><div class="s-tags">${diettags(soup)}</div>${showSource && soup.source ? `<div class="s-source">${soup.source}</div>` : ''}` : ''}
    </div>`;
  }
  return cells;
}

function renderProduceList(targetId, editable){
  const wrap = document.getElementById(targetId);
  if(!db.produceDeals.length){ wrap.innerHTML = '<p class="empty-note">No current deals.</p>'; return; }
  wrap.innerHTML = db.produceDeals.map(p=>`
    <div class="produce-row">
      <div class="produce-left">
        <span class="produce-name">${p.name}</span>
        <span class="${p.organic?'produce-organic':'produce-conventional'}">${p.organic?'Organic':'Conventional'}</span>
      </div>
      <span class="price-tag">$${p.price} / ${p.unit}</span>
      ${p.img ? `<img class="produce-img" src="${p.img}" alt="${p.name}">` : (editable? '' : '<span></span>')}
      ${editable ? `<span><button class="btn small outline" onclick="editProduceDeal('${p.id}')">Edit</button> <button class="btn small danger" onclick="deleteProduceDeal('${p.id}')">Delete</button></span>` : ''}
    </div>`).join('');
}

/* ============================================================
   AUTH
   ============================================================ */
function attemptLogin(){
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  if(u===db.master.username && p===db.master.password){
    session = { isMaster:true, name:'Gordon (Master)' };
    errEl.classList.add('hidden');
    document.getElementById('login-form').reset();
    enterPortal();
    return;
  }
  const emp = db.employees.find(e=>e.username===u && e.password===p && e.active);
  if(emp){
    session = { isMaster:false, employeeId:emp.id, name:emp.name };
    errEl.classList.add('hidden');
    document.getElementById('login-form').reset();
    enterPortal();
    return;
  }
  errEl.classList.remove('hidden');
}
document.getElementById('login-form').addEventListener('submit', e=>{ e.preventDefault(); attemptLogin(); });
document.getElementById('login-submit-btn').addEventListener('click', e=>{ e.preventDefault(); attemptLogin(); });

function enterPortal(){
  activeTab = 'Expirations';
  expSubView = 'items';
  document.getElementById('portal-user').textContent = session.name;
  renderPortalTabs();
  updatePortalStickyState();
  renderPortalBody();
  showView('view-portal');
}

function logout(){ session = null; showView('view-public'); renderPublic(); }

/* ============================================================
   PORTAL SHELL
   ============================================================ */
function renderPortalTabs(){
  let tabs;
  if(session.isMaster){
    tabs = ['Expirations','Deli Menu','Soup Menu','Produce Deals','Employees','Scheduling','Chat'];
  } else {
    tabs = ['Expirations','Schedule','Chat'];
    const emp = db.employees.find(e=>e.id===session.employeeId);
    if(emp && (emp.role==='Kitchen' || emp.role==='Kitchen & Floor')) tabs.splice(1,0,'Soup Menu');
  }
  document.getElementById('portal-tabs').innerHTML = tabs.map(t=>
    `<button class="portal-tab ${t===activeTab?'active':''}" data-tab="${t}">${t}</button>`).join('');
}

function updatePortalStickyState(){
  const sub = document.getElementById('portal-exp-subheader');
  const catBtn = document.getElementById('categories-quick-btn');
  const importBtn = document.getElementById('bulk-import-btn');
  if(activeTab==='Expirations'){
    sub.classList.remove('hidden');
    catBtn.classList.toggle('hidden', !session.isMaster);
    catBtn.textContent = expSubView==='categories' ? '← Back to Items' : 'Categories';
    importBtn.classList.toggle('hidden', !session.isMaster);
  } else {
    sub.classList.add('hidden');
  }
}

function setTab(t){ activeTab = t; expSubView = 'items'; viewingEmployeeId = null; renderPortalTabs(); updatePortalStickyState(); renderPortalBody(); }

function renderPortalBody(){
  const el = document.getElementById('portal-body');
  updatePortalStickyState();
  switch(activeTab){
    case 'Expirations':
      el.innerHTML = (expSubView==='categories' && session.isMaster) ? categoriesHTML() : expirationsHTML();
      break;
    case 'Deli Menu': el.innerHTML = deliMenuAdminHTML(); break;
    case 'Soup Menu': el.innerHTML = soupMenuAdminHTML(); break;
    case 'Produce Deals': el.innerHTML = produceAdminHTML(); renderProduceList('produce-admin-list', true); break;
    case 'Employees': el.innerHTML = employeesHTML(); break;
    case 'Scheduling':
    case 'Schedule': el.innerHTML = scheduleHTML(); break;
    case 'Chat': el.innerHTML = chatHTML(); renderChatMessages(); break;
    default: el.innerHTML = '';
  }
  scheduleSave();
}

/* ============================================================
   MODALS
   ============================================================ */
function openModal(html){
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this) closeModal()">
      <div class="modal-box">
        <button class="modal-close" onclick="closeModal()">✕</button>
        ${html}
      </div>
    </div>`;
}
function closeModal(){ stopScan(); document.getElementById('modal-root').innerHTML=''; }

/* ============================================================
   EXPIRATION TRACKER
   ============================================================ */
function categoryItems(catId){
  return db.expirationItems.filter(i=>i.categoryId===catId).sort((a,b)=>a.date.localeCompare(b.date));
}
function expItemLabel(i){
  return `${i.brand} | ${i.description} | ${i.upc} <span class="pill">×${i.count}</span>`;
}

function expirationsHTML(){
  if(!db.categories.length){ return '<p class="empty-note">No categories yet.</p>' + pastSectionHTML(); }
  let html = db.categories.map(cat=>categoryBoxHTML(cat)).join('');
  html += markdownListHTML();
  html += pastSectionHTML();
  return html;
}

function pastSectionHTML(){
  const items = db.expirationItems.filter(i=>i.date < todayISO());
  const filtered = pastDateFilter ? items.filter(i=>i.date===pastDateFilter) : items;
  const sorted = filtered.slice().sort((a,b)=>b.date.localeCompare(a.date));
  return `<details class="past-section" ${pastExpanded?'open':''}>
    <summary>Past Expirations (${items.length})</summary>
    <div class="past-filter">
      <label style="font-family:var(--font-mono);font-size:11.5px;color:var(--ink-soft)">Filter by date</label>
      <input type="date" value="${pastDateFilter}" onchange="pastDateFilter=this.value;pastExpanded=true;renderPortalBody()">
      ${pastDateFilter?`<button class="btn small outline" onclick="pastDateFilter='';renderPortalBody()">Clear</button>`:''}
    </div>
    ${sorted.length ? sorted.map(i=>{
      const cat = db.categories.find(c=>c.id===i.categoryId);
      return `<div style="margin-bottom:4px"><span class="pill">${cat?cat.emoji:''} ${cat?cat.name:''}</span>${expItemRow(i, i.date<todayISO() && !i.done, true)}</div>`;
    }).join('') : '<p class="empty-note">No past expirations.</p>'}
  </details>`;
}

function categoryBoxHTML(cat){
  const items = categoryItems(cat.id);
  const overdue = items.filter(i=>i.date < todayISO() && !i.done);
  const offset = catDayOffset[cat.id] || 0;
  const viewDate = isoDate(addDays(new Date(), offset));
  const viewLabel = offset===0 ? 'Today' : new Date(viewDate+'T00:00').toDateString();

  let inner = '';
  if(overdue.length){
    inner += `<div class="day-group"><div class="day-label" style="color:var(--red-flag)">PAST DUE</div>${overdue.map(i=>expItemRow(i,true,true)).join('')}</div>`;
  }

  const dayItems = items.filter(i=>i.date===viewDate);
  inner += `<div class="cat-daynav">
    <button class="btn small outline" onclick="catDayOffset['${cat.id}']=(catDayOffset['${cat.id}']||0)-1;renderPortalBody()">← Prev Day</button>
    ${offset!==0?`<button class="btn small" onclick="catDayOffset['${cat.id}']=0;renderPortalBody()">Today</button>`:''}
    <span class="cat-date-label">${viewLabel}</span>
    <button class="btn small outline" onclick="catDayOffset['${cat.id}']=(catDayOffset['${cat.id}']||0)+1;renderPortalBody()">Next Day →</button>
  </div>`;
  inner += `<div class="day-group">${dayItems.length ? dayItems.map(i=>expItemRow(i,false)).join('') : '<p class="empty-note">Nothing expiring this day.</p>'}</div>`;

  return `<div class="category-box" data-cat="${cat.id}">
    <div class="category-head">
      <h3>${cat.emoji} ${cat.name}</h3>
      <span style="display:flex;align-items:center;gap:10px">
        <span class="exp-count">${items.length} tracked</span>
        <button class="search-icon-btn" title="Search this category" onclick="openCategorySearchModal('${cat.id}')"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.3" y1="15.3" x2="21" y2="21"/></svg></button>
      </span>
    </div>
    <div style="padding:4px 18px 14px">${inner}</div>
  </div>`;
}

// Focused search for one category — keyword and/or date, sorted newest-first.
// Replaces the old inline "Show more (full list)" toggle with a lighter popup.
function openCategorySearchModal(catId, term){
  if(term !== undefined) catSearchTerm[catId] = term;
  const cat = db.categories.find(c=>c.id===catId);
  const t = (catSearchTerm[catId]||'').toLowerCase();
  const dateVal = catDateFilter[catId] || '';
  const items = categoryItems(catId);
  const hasFilter = !!(t || dateVal);
  const filtered = hasFilter ? items.filter(i=>{
    const textOk = !t || (i.brand+' '+i.description+' '+i.upc).toLowerCase().includes(t);
    const dateOk = !dateVal || i.date === dateVal;
    return textOk && dateOk;
  }).sort((a,b)=>b.date.localeCompare(a.date)) : [];
  openModal(`<h3>Search ${cat ? cat.emoji+' '+cat.name : 'Category'}</h3>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <input type="text" id="cat-modal-search" style="flex:1;min-width:160px;margin:0;padding:9px 11px;border:1px solid var(--line);border-radius:8px;background:var(--cream)"
        placeholder="Search this category…" value="${escHtmlAttr(catSearchTerm[catId]||'')}"
        oninput="const pos=this.selectionStart; openCategorySearchModal('${catId}', this.value); reFocusInput('cat-modal-search', pos);">
      <input type="date" id="cat-modal-date" style="margin:0;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--cream)"
        value="${dateVal}" onchange="catDateFilter['${catId}']=this.value; openCategorySearchModal('${catId}');">
    </div>
    <div class="search-panel-list" style="max-height:360px">
      ${hasFilter
        ? (filtered.length ? filtered.map(i=>`<div class="search-panel-row" style="display:block">${expItemRow(i, i.date<todayISO() && !i.done, true)}</div>`).join('') : '<div class="search-panel-row">No matches.</div>')
        : '<div class="search-panel-row">Type a keyword or pick a date to search.</div>'}
    </div>`);
  setTimeout(()=>{ const el=document.getElementById('cat-modal-search'); if(el){ el.focus(); el.selectionStart=el.selectionEnd=el.value.length; } },0);
}

function expItemRow(item, overdue, showDate){
  const classes = ['exp-item'];
  if(item.done) classes.push('done');
  if(overdue && !item.done) classes.push('overdue');
  const flagSvg = `<svg class="flag-icon ${item.flagged?'flag-on':'flag-off'}" viewBox="0 0 24 24"><path d="M6 3v18h2v-7h9l-1.5-3.5L17 7H8V3z"/></svg>`;
  const dateLabel = showDate ? `<span class="exp-date-label">${item.date}</span>` : '';
  return `<div class="${classes.join(' ')}">
    <button class="link-chain" title="Search image" onclick="searchImage('${item.upc}','${escAttr(item.brand)}','${escAttr(item.description)}')">🔗</button>
    <span class="exp-text" onclick="toggleDone('${item.id}')">${dateLabel}${expItemLabel(item)}</span>
    <button class="icon-edit-btn" title="Edit item" onclick="event.stopPropagation();openEditExpItem('${item.id}')">✎</button>
    <button class="flag-btn" title="Markdown flag" onclick="toggleFlag('${item.id}')">${flagSvg}</button>
  </div>`;
}

function markdownListHTML(){
  const flagged = db.expirationItems.filter(i=>i.flagged);
  return `<div class="category-box"><div class="category-head"><h3>🏷️ Markdown</h3><span class="exp-count">${flagged.length} items</span></div>
    <div style="padding:4px 18px 14px">${flagged.length ? flagged.map(i=>expItemRow(i,i.date<todayISO(),true)).join('') : '<p class="empty-note">No markdown items.</p>'}</div></div>`;
}

function openEditExpItem(id){
  const i = db.expirationItems.find(x=>x.id===id);
  const catOptions = db.categories.map(c=>`<option value="${c.id}" ${c.id===i.categoryId?'selected':''}>${c.emoji} ${c.name}</option>`).join('');
  openModal(`<h3>Edit Item</h3>
    <div class="field"><label>Brand</label><input type="text" id="eex-brand" value="${escHtmlAttr(i.brand)}"></div>
    <div class="field"><label>Description</label><input type="text" id="eex-desc" value="${escHtmlAttr(i.description)}"></div>
    <div class="field"><label>UPC</label><input type="text" id="eex-upc" value="${escHtmlAttr(i.upc)}"></div>
    <div class="field"><label>Category</label><select id="eex-cat">${catOptions}</select></div>
    <div class="field"><label>Expiration date</label><input type="date" id="eex-date" value="${i.date}"></div>
    <div class="field"><label>Count on hand</label><input type="number" id="eex-count" min="1" value="${i.count}"></div>
    <div class="modal-actions">
      <button class="btn danger" onclick="deleteExpItem('${id}')">Delete</button>
      <button class="btn" onclick="saveEditExpItem('${id}')">Save</button>
    </div>`);
}
function saveEditExpItem(id){
  const i = db.expirationItems.find(x=>x.id===id);
  i.brand = document.getElementById('eex-brand').value.trim() || i.brand;
  i.description = document.getElementById('eex-desc').value.trim() || i.description;
  i.upc = document.getElementById('eex-upc').value.trim() || i.upc;
  i.categoryId = document.getElementById('eex-cat').value || i.categoryId;
  i.date = document.getElementById('eex-date').value || i.date;
  const count = parseInt(document.getElementById('eex-count').value,10);
  if(count>0) i.count = count;
  closeModal(); renderPortalBody();
}
function deleteExpItem(id){
  if(!confirm('Delete this expiration entry? This cannot be undone.')) return;
  db.expirationItems = db.expirationItems.filter(x=>x.id!==id);
  closeModal(); renderPortalBody();
}

function toggleDone(id){
  const i = db.expirationItems.find(x=>x.id===id);
  const wasDone = i.done;
  i.done = !i.done;
  if(!wasDone && i.done) recordEmployeeStat('checked');
  renderPortalBody();
}
function escAttr(s){ return (s||'').replace(/'/g,"\\'"); }
function searchImage(upc, brand, desc){
  const q = encodeURIComponent(`${upc} ${brand} ${desc}`);
  window.open(`https://www.google.com/search?tbm=isch&q=${q}`, '_blank');
}
function toggleFlag(id){
  const item = db.expirationItems.find(x=>x.id===id);
  if(!item.flagged){
    openModal(`<h3>Mark down: ${item.description}</h3><p>How much longer should this item run?</p>
      <div class="modal-actions">
        <button class="btn" onclick="applyMarkdown('${id}',14)">+14 Days</button>
        <button class="btn" onclick="applyMarkdown('${id}',30)">+30 Days</button>
      </div>
      <div class="field" style="margin-top:14px">
        <label>Or enter a custom number of days</label>
        <div style="display:flex;gap:8px">
          <input type="number" id="custom-md-days" min="1" placeholder="e.g. 21" style="flex:1">
          <button class="btn outline" onclick="applyCustomMarkdown('${id}')">+Custom</button>
        </div>
      </div>`);
  } else {
    item.flagged = false;
    renderPortalBody();
  }
}
function applyCustomMarkdown(id){
  const val = parseInt(document.getElementById('custom-md-days').value,10);
  if(!val || val<1) return;
  applyMarkdown(id, val);
}
function applyMarkdown(id, days){
  const item = db.expirationItems.find(x=>x.id===id);
  const base = new Date(item.date+'T00:00');
  item.date = isoDate(addDays(base, days));
  item.flagged = true;
  closeModal();
  renderPortalBody();
}

/* --- Add item flow (barcode scan via ZXing — works in Safari/iOS, unlike BarcodeDetector) --- */
function addItemFlow(){
  const catOptions = db.categories.map(c=>`<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('');
  openModal(`
    <h3>Add Item</h3>
    <div id="scan-area">
      <button class="btn" id="start-scan-btn" onclick="startScan()">📷 Scan UPC</button>
      <p style="font-size:12.5px;color:var(--ink-soft);margin-top:8px">Uses your device camera. Works in Safari/iOS. Otherwise, enter details manually below.</p>
    </div>
    <form id="add-item-form" onsubmit="submitAddItem(event)">
      <div class="field"><label>UPC</label><input type="text" id="ai-upc" required></div>
      <div class="field"><label>Brand</label><input type="text" id="ai-brand" required></div>
      <div class="field"><label>Description</label><input type="text" id="ai-desc" required></div>
      <div class="field"><label>Count on hand</label><input type="number" id="ai-count" min="1" value="1" required></div>
      <div class="field"><label>Expiration date</label><input type="date" id="ai-date" required></div>
      <div class="field"><label>Category</label><select id="ai-cat">${catOptions}</select></div>
      <div class="modal-actions"><button type="submit" class="btn">Add Item</button></div>
    </form>`);
  document.getElementById('ai-upc').addEventListener('change', lookupUpc);
}

function lookupUpc(){
  const upc = document.getElementById('ai-upc').value.trim();
  if(!upc) return;
  if(db.localUpcDb[upc]){
    document.getElementById('ai-brand').value = db.localUpcDb[upc].brand;
    document.getElementById('ai-desc').value = db.localUpcDb[upc].description;
    return;
  }
  fetch(`https://world.openfoodfacts.org/api/v2/product/${upc}.json`)
    .then(r=>r.json())
    .then(data=>{
      if(data && data.product){
        document.getElementById('ai-brand').value = data.product.brands || '';
        document.getElementById('ai-desc').value = data.product.product_name || '';
      }
    })
    .catch(()=>{ /* fall back silently to manual entry */ });
}

function startScan(){
  const area = document.getElementById('scan-area');
  if(typeof ZXing === 'undefined'){
    alert("Barcode scanner didn't load. Enter the UPC manually below.");
    return;
  }
  area.innerHTML = `<video id="scan-video" style="width:100%;border-radius:8px;background:#000" muted playsinline autoplay></video>
    <p style="font-size:12px;color:var(--ink-soft);margin-top:6px">Point the camera at a barcode…</p>`;
  const codeReader = new ZXing.BrowserMultiFormatReader();
  activeScanReader = codeReader;
  codeReader.decodeFromConstraints({ video:{ facingMode:'environment' } }, 'scan-video', (result, err)=>{
    if(result){
      const text = result.getText();
      stopScan();
      document.getElementById('ai-upc').value = text;
      lookupUpc();
      area.innerHTML = `<p style="color:var(--green-deep)">✓ UPC captured: ${text}</p>`;
    }
  }).catch(()=>{
    alert('Camera access was denied or unavailable. Enter the UPC manually.');
  });
}
function stopScan(){
  if(activeScanReader){ try{ activeScanReader.reset(); }catch(e){} activeScanReader = null; }
}

function submitAddItem(e){
  e.preventDefault();
  const upc = document.getElementById('ai-upc').value.trim();
  const brand = document.getElementById('ai-brand').value.trim();
  const desc = document.getElementById('ai-desc').value.trim();
  const count = parseInt(document.getElementById('ai-count').value,10);
  const date = document.getElementById('ai-date').value;
  const categoryId = document.getElementById('ai-cat').value;

  db.localUpcDb[upc] = { brand, description:desc }; // save for next time

  const dup = db.expirationItems.find(i=>i.upc===upc && i.date===date);
  if(dup){
    closeModal();
    setTimeout(()=>{
      openModal(`<h3>Possible duplicate</h3><p>${brand} — ${desc} already has an entry expiring ${date}. Add it anyway?</p>
        <div class="modal-actions"><button class="btn outline" onclick="closeModal()">Cancel</button>
        <button class="btn" onclick="finishAddItem('${upc}','${escAttr(brand)}','${escAttr(desc)}',${count},'${date}','${categoryId}')">Add Anyway</button></div>`);
    },50);
    return;
  }
  finishAddItem(upc,brand,desc,count,date,categoryId);
}
function finishAddItem(upc,brand,desc,count,date,categoryId){
  db.expirationItems.push({ id:newId('x'), categoryId, upc, brand, description:desc, count, date, done:false, flagged:false });
  recordEmployeeStat('added');
  closeModal();
  openModal(`<h3>✓ Added</h3><p>${brand} — ${desc} was added to expirations.</p><div class="modal-actions"><button class="btn" onclick="closeModal();renderPortalBody();">Done</button></div>`);
}

/* --- Bulk import: paste many lines at once, preview, then commit to Firestore ---
   Auto-detects, line by line, whichever of these three formats is present —
   you can even mix aisle exports that use different layouts in one paste:

   1) "Brand : Description (Count)" / UPC / Date  — three lines per item.

   2) "Description (Count)" / "Entered <entry date> <UPC>" / Date — three
      lines per item, no separator between brand and description, so the
      whole first line is kept as the Description (Brand left blank). The
      "Entered" date is ignored — only the UPC is pulled off that line.
      Handles a blank title line (just "(N)") and a missing count/date
      gracefully by still surfacing the row in the preview, flagged, rather
      than silently dropping it.

   3) A manually delimited single line: UPC | Brand | Description | Count | Date
      (pipe, tab, or comma separated) — handy if you're pasting from a
      spreadsheet instead.

   Any other stray line (report title, "Page X of Y" footer, etc.) is
   simply skipped. Exact duplicate UPC+date pairs within one paste are
   flagged and skipped rather than imported twice. */
function parseFlexibleDate(str){
  str = (str||'').trim();
  if(!str) return '';
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); // YYYY-MM-DD
  if(m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/); // MM/DD/YYYY, M-D-YY, etc.
  if(m){
    let yr = +m[3];
    if(yr < 100) yr += 2000;
    return `${yr}-${pad(+m[1])}-${pad(+m[2])}`;
  }
  return '';
}
// Pulls a date off the FRONT of a line even if extra text (like a footer
// timestamp, or "New Reminder") follows/replaces it — returns '' if nothing
// date-shaped is found at all.
function extractLeadingDate(str){
  const m = (str||'').match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if(!m) return '';
  let yr = +m[3];
  if(yr < 100) yr += 2000;
  return `${yr}-${pad(+m[1])}-${pad(+m[2])}`;
}
function looksLikeUpc(str){ return /^[A-Za-z0-9]{6,18}$/.test((str||'').trim()); }
function splitImportLine(line){
  if(line.includes('|')) return line.split('|').map(s=>s.trim());
  if(line.includes('\t')) return line.split('\t').map(s=>s.trim());
  return line.split(',').map(s=>s.trim());
}
function parseImportBlock(raw){
  const lines = raw.split('\n').map(l=>l.trim()).filter(Boolean);
  const records = [];
  const seen = new Set(); // dedupe exact UPC+date repeats within one paste
  let i = 0;
  while(i < lines.length){
    // Style 2: "Description (Count)" / "Entered <date> <UPC>" / Date.
    // Anchored on the "Entered " line, since that's present and unambiguous
    // even when the title line is blank, has no count, or has a stray colon.
    if(/^Entered\s+/i.test(lines[i+1]||'')){
      const titleLine = lines[i] || '';
      const enteredLine = lines[i+1] || '';
      const dateLine = lines[i+2] || '';
      const countMatch = titleLine.match(/^(.*?)\s*\((\d+)\)\s*$/);
      const description = (countMatch ? countMatch[1] : titleLine).trim() || 'Unlabeled item — please edit';
      const count = countMatch ? parseInt(countMatch[2],10) : 1;
      const enteredMatch = enteredLine.match(/^Entered\s+\S+\s+(\S+)$/i);
      const upc = enteredMatch ? enteredMatch[1].trim() : '';
      const date = extractLeadingDate(dateLine);
      const key = upc + '|' + date;
      const dup = !!(upc && date) && seen.has(key);
      const ok = !!(description && upc && date) && !dup;
      if(ok) seen.add(key);
      records.push({ brand:'', description, count, upc, date, ok, dup, raw: `${titleLine}  /  ${enteredLine}  /  ${dateLine}` });
      i += 3;
      continue;
    }
    // Style 1: "Brand : Description (Count)" header line followed by a UPC
    // line and a date line.
    const header = lines[i].match(/^(.+?)\s*:\s*(.+?)\s*\((\d+)\)\s*$/);
    if(header && looksLikeUpc(lines[i+1]) && extractLeadingDate(lines[i+2])){
      const upc = lines[i+1].trim();
      const date = extractLeadingDate(lines[i+2]);
      const key = upc + '|' + date;
      const dup = seen.has(key);
      if(!dup) seen.add(key);
      records.push({
        brand: header[1].trim(), description: header[2].trim(), count: parseInt(header[3],10),
        upc, date, ok: !dup, dup,
        raw: `${lines[i]}  /  ${lines[i+1]}  /  ${lines[i+2]}`
      });
      i += 3;
      continue;
    }
    // Style 3: single delimited line
    if(lines[i].includes('|') || lines[i].includes('\t') || (lines[i].match(/,/g)||[]).length>=4){
      const parts = splitImportLine(lines[i]);
      const upc=(parts[0]||'').trim(), brand=(parts[1]||'').trim(), description=(parts[2]||'').trim(), countRaw=(parts[3]||'').trim(), dateRaw=(parts[4]||'').trim();
      const date = parseFlexibleDate(dateRaw);
      const count = parseInt(countRaw,10);
      records.push({ upc, brand, description, count, date, ok: !!(upc && brand && description && count>0 && date), dup:false, raw:lines[i] });
      i += 1;
      continue;
    }
    // Unrecognized stray line (report title, page footer, etc.) — skip it silently.
    i += 1;
  }
  return records;
}
let bulkImportParsed = [];
function bulkImportFlow(){
  const catOptions = db.categories.map(c=>`<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('');
  openModal(`<h3>Bulk Import Expirations</h3>
    <p style="font-size:12.5px;color:var(--ink-soft)">Paste directly from your aisle PDF export — no reformatting needed. It auto-detects either 3-line layout: <strong>Brand : Description (Count)</strong> / UPC / Date, <em>or</em> <strong>Description (Count)</strong> / "Entered ‹date› ‹UPC›" / Date (brand and description get combined into the description field for this style). Report titles, footers, and duplicate entries are skipped automatically.<br><br>A spreadsheet-style single line also works: <strong>UPC | Brand | Description | Count | Date</strong>.</p>
    ${db.categories.length ? `<div class="field"><label>Assign all imported items to category</label><select id="bi-category">${catOptions}</select></div>` : `<p class="empty-note">Add at least one category first (Categories button) before importing.</p>`}
    <div class="field"><label>Paste data</label><textarea id="bi-text" style="min-height:200px" placeholder="Annie's Bunny Grahams Chocolate Chip (1)
Entered 4/1/26 013562000180
7/9/26"></textarea></div>
    <div class="modal-actions"><button class="btn outline" onclick="closeModal()">Cancel</button>${db.categories.length ? `<button class="btn" onclick="previewBulkImport()">Preview</button>` : ''}</div>`);
}
function previewBulkImport(){
  const raw = document.getElementById('bi-text').value;
  const categoryId = document.getElementById('bi-category').value;
  const records = parseImportBlock(raw);
  bulkImportParsed = records.filter(r=>r.ok).map(r=>({ upc:r.upc, brand:r.brand, description:r.description, count:r.count, date:r.date, categoryId }));
  const okCount = bulkImportParsed.length;
  openModal(`<h3>Preview: ${okCount} of ${records.length} items look good</h3>
    <div class="search-panel-list" style="max-height:320px">
      ${records.length ? records.map(r=>{
        const label = r.ok ? '✓ OK' : (r.dup ? '⚠ duplicate — skipped' : '⚠ needs attention — add manually');
        return `<div class="search-panel-row" style="display:block;${r.ok?'':'background:#F3DACB'}">
        <div style="font-family:var(--font-mono);font-size:11px;color:${r.ok?'var(--green-moss)':'var(--red-flag)'}">${label}</div>
        <div style="font-size:13px">${r.ok ? `${r.upc} — ${r.brand?r.brand+': ':''}${r.description} (×${r.count}) — exp ${r.date}` : (r.raw||'')}</div>
      </div>`;
      }).join('') : '<div class="search-panel-row">No lines found — go back and paste some data.</div>'}
    </div>
    <div class="modal-actions">
      <button class="btn outline" onclick="bulkImportFlow()">← Edit</button>
      <button class="btn" ${okCount===0?'disabled':''} onclick="commitBulkImport()">Import ${okCount} Item${okCount===1?'':'s'}</button>
    </div>`);
}
function commitBulkImport(){
  bulkImportParsed.forEach(row=>{
    db.expirationItems.push({ id:newId('x'), categoryId:row.categoryId, upc:row.upc, brand:row.brand, description:row.description, count:row.count, date:row.date, done:false, flagged:false });
    if(row.upc) db.localUpcDb[row.upc] = { brand:row.brand, description:row.description };
    recordEmployeeStat('added');
  });
  const count = bulkImportParsed.length;
  bulkImportParsed = [];
  closeModal();
  openModal(`<h3>✓ Imported</h3><p>${count} item${count===1?'':'s'} added to expirations.</p><div class="modal-actions"><button class="btn" onclick="closeModal();renderPortalBody();">Done</button></div>`);
}

function portalSearch(){
  const term = document.getElementById('portal-search').value.trim().toLowerCase();
  const dateVal = document.getElementById('portal-search-date').value;
  if(!term && !dateVal){ renderPortalBody(); return; }
  const matches = db.expirationItems.filter(i=>{
    const cat = db.categories.find(c=>c.id===i.categoryId);
    const catName = cat ? cat.name.toLowerCase() : '';
    const textOk = !term || i.brand.toLowerCase().includes(term) || i.description.toLowerCase().includes(term) || i.upc.includes(term) || catName.includes(term);
    const dateOk = !dateVal || i.date === dateVal;
    return textOk && dateOk;
  }).sort((a,b)=>b.date.localeCompare(a.date));
  activeTab = 'Expirations'; expSubView = 'items';
  renderPortalTabs(); updatePortalStickyState();
  const label = term && dateVal ? `"${term}" on ${dateVal}` : term ? `"${term}"` : `expiring ${dateVal}`;
  const el = document.getElementById('portal-body');
  el.innerHTML = `<h2 class="section-title">Search results for ${label}</h2>` +
    (matches.length ? matches.map(i=>`<div class="card">${expItemRow(i, i.date<todayISO() && !i.done, true)}</div>`).join('') : '<p class="empty-note">No matches.</p>');
}

/* ============================================================
   CATEGORIES (master only — nested inside Expirations tab)
   ============================================================ */
function categoriesHTML(){
  return `<h2 class="section-title">Categories <button class="btn" onclick="addCategoryFlow()">+ Add Category</button></h2>
    ${db.categories.map(c=>`<div class="card" style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:18px">${c.emoji} ${c.name}</span>
      <span><button class="btn small outline" onclick="editCategory('${c.id}')">Rename</button> <button class="btn small danger" onclick="deleteCategory('${c.id}')">Delete</button></span>
    </div>`).join('')}`;
}
function addCategoryFlow(){
  openModal(`<h3>Add Category</h3>
    <div class="field"><label>Emoji</label><input type="text" id="cat-emoji" maxlength="4" placeholder="🥫"></div>
    <div class="field"><label>Name</label><input type="text" id="cat-name" placeholder="Aisle 5 — Snacks"></div>
    <div class="modal-actions"><button class="btn" onclick="saveCategory()">Save</button></div>`);
}
function saveCategory(){
  const emoji = document.getElementById('cat-emoji').value.trim() || '📦';
  const name = document.getElementById('cat-name').value.trim();
  if(!name) return;
  db.categories.push({ id:newId('c'), emoji, name });
  closeModal(); renderPortalBody();
}
function editCategory(id){
  const c = db.categories.find(x=>x.id===id);
  openModal(`<h3>Edit Category</h3>
    <div class="field"><label>Emoji</label><input type="text" id="cat-emoji" maxlength="4" value="${c.emoji}"></div>
    <div class="field"><label>Name</label><input type="text" id="cat-name" value="${c.name}"></div>
    <div class="modal-actions"><button class="btn" onclick="updateCategory('${id}')">Save</button></div>`);
}
function updateCategory(id){
  const c = db.categories.find(x=>x.id===id);
  c.emoji = document.getElementById('cat-emoji').value.trim() || c.emoji;
  c.name = document.getElementById('cat-name').value.trim() || c.name;
  closeModal(); renderPortalBody();
}
function deleteCategory(id){
  if(!confirm('Delete this category and unassign its items?')) return;
  db.categories = db.categories.filter(c=>c.id!==id);
  renderPortalBody();
}

/* ============================================================
   DELI MENU ADMIN (master only)
   ============================================================ */
function deliMenuAdminHTML(){
  const monday = addDays(startOfWeekMonday(new Date()), deliAdminWeekOffset*7);
  const weekKey = weekKeyOf(monday);
  weeklyMenu(weekKey); // ensure it exists

  const boxes = db.deliBoxes;
  const mid = Math.ceil(boxes.length/2) || 1;
  const colA = boxes.slice(0,mid), colB = boxes.slice(mid);

  return `<h2 class="section-title">Deli Menu
      <span class="panel-nav">
        <button class="btn small outline" onclick="deliAdminWeekOffset--;renderPortalBody()">← Prev</button>
        ${deliAdminWeekOffset!==0?`<button class="btn small" onclick="deliAdminWeekOffset=0;renderPortalBody()">Today</button>`:''}
        <span class="week-range">${fmtWeekRange(monday)}</span>
        <button class="btn small outline" onclick="deliAdminWeekOffset++;renderPortalBody()">Next →</button>
        <button class="btn small" onclick="addDeliBoxFlow()">+ Add Box</button>
      </span></h2>
    <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px">Adding or removing an item from a week's menu automatically carries that change forward into every future week you've already generated. Past weeks are never changed.</p>
    <div class="deli-grid">
      <div class="deli-col">${colA.map(b=>editorBox(weekKey,b.id)).join('')}</div>
      <div class="deli-col">${colB.map(b=>editorBox(weekKey,b.id)).join('')}</div>
    </div>`;
}

function editorBox(weekKey, boxId){
  const boxDef = db.deliBoxes.find(b=>b.id===boxId);
  const list = db.deliItemLists[boxId] || [];
  const data = weeklyMenu(weekKey)[boxId];
  if(!boxDef || !data) return '';
  return `<div class="card ${boxDef.active?'':'box-inactive'}">
      <h4>${boxDef.title}${boxDef.active?'':' (inactive)'} <span class="price">$<input type="text" style="width:60px" value="${data.price}" onchange="updatePrice('${weekKey}','${boxId}',this.value)"></span></h4>
      ${data.items.map(id=>{
        const item = list.find(l=>l.id===id);
        return item ? `<div class="deli-item"><div class="deli-item-name">${item.name} ${diettags(item)} <button class="btn small danger" style="margin-left:auto" onclick="removeMenuItem('${weekKey}','${boxId}','${id}')">Delete</button></div><div class="deli-item-desc">${item.desc}</div></div>` : '';
      }).join('')}
      <div style="margin-top:8px">
        <button class="btn small" onclick="openDeliItemPicker('${weekKey}','${boxId}')">+ Add Item (search)</button>
        <button class="btn small outline" onclick="manageDeliItemsFlow('${boxId}')">Manage Items</button>
      </div>
      <div class="field" style="margin-top:10px"><label>Notes shown to customers</label><textarea onchange="updateNotes('${weekKey}','${boxId}',this.value)">${data.notes}</textarea></div>
      <div class="box-admin-row" style="margin-top:10px;border-top:1px dashed var(--line);padding-top:10px">
        <button class="btn small outline" onclick="renameDeliBox('${boxId}')">Rename</button>
        <button class="btn small outline" onclick="toggleDeliBoxActive('${boxId}')">${boxDef.active?'Deactivate':'Reactivate'}</button>
        <button class="btn small danger" onclick="deleteDeliBox('${boxId}')">Delete Box</button>
      </div>
    </div>`;
}
function updatePrice(weekKey,boxId,val){ weeklyMenu(weekKey)[boxId].price = val; scheduleSave(); }
function updateNotes(weekKey,boxId,val){ weeklyMenu(weekKey)[boxId].notes = val; scheduleSave(); }

function openDeliItemPicker(weekKey, boxId){ renderDeliPickerModal(weekKey, boxId, ''); }
function renderDeliPickerModal(weekKey, boxId, term){
  const list = db.deliItemLists[boxId] || [];
  const data = weeklyMenu(weekKey)[boxId];
  const t = term.toLowerCase();
  const options = list.filter(i=> !data.items.includes(i.id) && (!t || i.name.toLowerCase().includes(t)));
  openModal(`<h3>Add item to ${db.deliBoxes.find(b=>b.id===boxId).title}</h3>
    <div class="field"><input type="text" id="deli-pick-search" placeholder="Search items…" value="${escAttr(term)}" oninput="renderDeliPickerModal('${weekKey}','${boxId}', this.value)"></div>
    <div class="search-panel-list">${options.length? options.map(i=>`<div class="search-panel-row" onclick="pickDeliItem('${weekKey}','${boxId}','${i.id}')"><span>${i.name}</span>${diettags(i)}</div>`).join('') : '<div class="search-panel-row">No matches.</div>'}</div>
    <div class="modal-actions"><button class="btn outline" onclick="newListItemFlow('${boxId}','${weekKey}')">+ New Item</button></div>`);
  setTimeout(()=>{ const el=document.getElementById('deli-pick-search'); if(el){ el.focus(); el.selectionStart=el.selectionEnd=el.value.length; } },0);
}
function pickDeliItem(weekKey, boxId, itemId){
  const data = weeklyMenu(weekKey)[boxId];
  if(!data.items.includes(itemId)) data.items.push(itemId);
  cascadeDeliChangeForward(weekKey, boxId);
  closeModal();
  renderPortalBody();
}
function removeMenuItem(weekKey,boxId,id){
  const data = weeklyMenu(weekKey)[boxId];
  data.items = data.items.filter(x=>x!==id);
  cascadeDeliChangeForward(weekKey, boxId);
  renderPortalBody();
}
function newListItemFlow(boxId, weekKey){
  openModal(`<h3>New item</h3>
    <div class="field"><label>Name</label><input type="text" id="ni-name"></div>
    <div class="field"><label>Description</label><textarea id="ni-desc"></textarea></div>
    <div class="toggle-row">
      <label><input type="checkbox" id="ni-df"> Dairy Free</label>
      <label><input type="checkbox" id="ni-gf"> Gluten Free</label>
      <label><input type="checkbox" id="ni-v"> Vegetarian</label>
    </div>
    <div class="modal-actions"><button class="btn" onclick="saveNewListItem('${boxId}','${weekKey||''}')">Save</button></div>`);
}
function saveNewListItem(boxId, weekKey){
  const name = document.getElementById('ni-name').value.trim();
  if(!name) return;
  const item = { id:newId('i'), name, desc:document.getElementById('ni-desc').value.trim(),
    df:document.getElementById('ni-df').checked, gf:document.getElementById('ni-gf').checked, v:document.getElementById('ni-v').checked, img:'' };
  if(!db.deliItemLists[boxId]) db.deliItemLists[boxId] = [];
  db.deliItemLists[boxId].push(item);
  if(weekKey){
    const data = weeklyMenu(weekKey)[boxId];
    data.items.push(item.id);
    cascadeDeliChangeForward(weekKey, boxId);
  }
  closeModal(); renderPortalBody();
}

// Manage the master item list for a box directly — edit or permanently
// delete items, independent of any single week's menu.
function manageDeliItemsFlow(boxId){
  const list = db.deliItemLists[boxId] || [];
  const boxTitle = (db.deliBoxes.find(b=>b.id===boxId)||{}).title || '';
  openModal(`<h3>Manage ${boxTitle} Items</h3>
    <div class="search-panel-list" style="max-height:320px">
      ${list.length ? list.map(item=>`<div class="search-panel-row" style="display:flex;justify-content:space-between;align-items:center">
        <span>${item.name} ${diettags(item)}</span>
        <span><button class="btn small outline" onclick="editDeliListItem('${boxId}','${item.id}')">Edit</button> <button class="btn small danger" onclick="deleteDeliListItem('${boxId}','${item.id}')">Delete</button></span>
      </div>`).join('') : '<div class="search-panel-row">No items yet.</div>'}
    </div>
    <div class="modal-actions"><button class="btn outline" onclick="closeModal()">Close</button><button class="btn" onclick="newListItemFlow('${boxId}','')">+ New Item</button></div>`);
}
function editDeliListItem(boxId, itemId){
  const item = (db.deliItemLists[boxId]||[]).find(i=>i.id===itemId);
  if(!item) return;
  openModal(`<h3>Edit Item</h3>
    <div class="field"><label>Name</label><input type="text" id="edi-name" value="${escHtmlAttr(item.name)}"></div>
    <div class="field"><label>Description</label><textarea id="edi-desc">${item.desc||''}</textarea></div>
    <div class="toggle-row">
      <label><input type="checkbox" id="edi-df" ${item.df?'checked':''}> Dairy Free</label>
      <label><input type="checkbox" id="edi-gf" ${item.gf?'checked':''}> Gluten Free</label>
      <label><input type="checkbox" id="edi-v" ${item.v?'checked':''}> Vegetarian</label>
    </div>
    <div class="modal-actions">
      <button class="btn danger" onclick="deleteDeliListItem('${boxId}','${itemId}')">Delete</button>
      <button class="btn" onclick="saveDeliListItem('${boxId}','${itemId}')">Save</button>
    </div>`);
}
function saveDeliListItem(boxId, itemId){
  const item = (db.deliItemLists[boxId]||[]).find(i=>i.id===itemId);
  if(!item) return;
  item.name = document.getElementById('edi-name').value.trim() || item.name;
  item.desc = document.getElementById('edi-desc').value;
  item.df = document.getElementById('edi-df').checked;
  item.gf = document.getElementById('edi-gf').checked;
  item.v = document.getElementById('edi-v').checked;
  closeModal(); renderPortalBody();
}
function deleteDeliListItem(boxId, itemId){
  if(!confirm("Delete this item entirely? It will be removed from every week's menu that uses it.")) return;
  db.deliItemLists[boxId] = (db.deliItemLists[boxId]||[]).filter(i=>i.id!==itemId);
  Object.keys(db.weeklyMenus).forEach(wk=>{
    const data = db.weeklyMenus[wk][boxId];
    if(data) data.items = data.items.filter(id=>id!==itemId);
  });
  closeModal(); renderPortalBody();
}

function addDeliBoxFlow(){
  openModal(`<h3>Add Deli Box</h3>
    <div class="field"><label>Box title</label><input type="text" id="box-new-title" placeholder="e.g. Smoothies"></div>
    <div class="modal-actions"><button class="btn" onclick="saveAddDeliBox()">Create</button></div>`);
}
function saveAddDeliBox(){
  const title = document.getElementById('box-new-title').value.trim();
  if(!title) return;
  const id = newId('box');
  db.deliBoxes.push({ id, title, active:true });
  db.deliItemLists[id] = [];
  Object.keys(db.weeklyMenus).forEach(k=>{ db.weeklyMenus[k][id] = { price:'', notes:'', items:[] }; });
  closeModal(); renderPortalBody();
}
function renameDeliBox(id){
  const b = db.deliBoxes.find(x=>x.id===id);
  openModal(`<h3>Rename Box</h3><div class="field"><input type="text" id="box-rename" value="${b.title}"></div>
    <div class="modal-actions"><button class="btn" onclick="saveRenameDeliBox('${id}')">Save</button></div>`);
}
function saveRenameDeliBox(id){
  const b = db.deliBoxes.find(x=>x.id===id);
  const v = document.getElementById('box-rename').value.trim();
  if(v) b.title = v;
  closeModal(); renderPortalBody();
}
function toggleDeliBoxActive(id){ const b = db.deliBoxes.find(x=>x.id===id); b.active = !b.active; renderPortalBody(); }
function deleteDeliBox(id){
  if(!confirm('Delete this box and all its menu data? This cannot be undone.')) return;
  db.deliBoxes = db.deliBoxes.filter(b=>b.id!==id);
  delete db.deliItemLists[id];
  Object.keys(db.weeklyMenus).forEach(k=>{ delete db.weeklyMenus[k][id]; });
  renderPortalBody();
}

/* ============================================================
   SOUP MENU ADMIN (master edits; Kitchen / Kitchen & Floor employees view only)
   ============================================================ */
function soupMenuAdminHTML(){
  const editable = session.isMaster;
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth()+soupAdminMonthOffset);
  const monthKey = `${base.getFullYear()}-${pad(base.getMonth()+1)}`;
  const sw = db.settings.showWeekendsSoup;
  return `<h2 class="section-title">Soup Menu Calendar
      <span class="panel-nav">
        <button class="btn small outline" onclick="soupAdminMonthOffset--;renderPortalBody()">← Prev</button>
        ${soupAdminMonthOffset!==0?`<button class="btn small" onclick="soupAdminMonthOffset=0;renderPortalBody()">Today</button>`:''}
        <span class="week-range">${MONTHS[base.getMonth()]} ${base.getFullYear()}</span>
        <button class="btn small outline" onclick="soupAdminMonthOffset++;renderPortalBody()">Next →</button>
      </span></h2>
    ${editable ? `<label class="weekend-toggle"><input type="checkbox" ${sw?'checked':''} onchange="db.settings.showWeekendsSoup=this.checked;renderPortalBody()"> Show Weekends (Sat &amp; Sun)</label>` : ''}
    <div class="soup-cal-wrap">
      <div class="soup-cal-dow cols-${sw?7:5}">${dowHeaderHTML(sw)}</div>
      <div class="soup-cal cols-${sw?7:5}" id="soup-admin-cal">${buildSoupCalHTML(monthKey, sw, canSeeSoupSource())}</div>
    </div>
    ${editable ? `<p style="font-size:12.5px;color:var(--ink-soft);margin-top:10px">Click any day to set its soup.</p>` : `<p style="font-size:12.5px;color:var(--ink-soft);margin-top:10px">View only.</p>`}

    <h2 class="section-title" style="margin-top:26px">Soup List ${editable ? `<button class="btn" onclick="addSoupFlow()">+ Add Soup</button>` : ''}</h2>
    <input type="text" id="soup-list-search" class="cat-search" style="margin:0 0 12px" placeholder="Search soups…"
      value="${escHtmlAttr(soupListSearchTerm)}"
      oninput="const pos=this.selectionStart; soupListSearchTerm=this.value; renderPortalBody(); reFocusInput('soup-list-search', pos);">
    ${db.soups.filter(s=> !soupListSearchTerm || s.name.toLowerCase().includes(soupListSearchTerm.toLowerCase())).map(s=>`<div class="card" style="display:flex;justify-content:space-between;align-items:center">
      <span>${s.name} ${diettags(s)}</span>
      ${editable ? `<span><button class="btn small outline" onclick="editSoup('${s.id}')">Edit</button> <button class="btn small danger" onclick="deleteSoup('${s.id}')">Delete</button></span>` : ''}
    </div>`).join('') || '<p class="empty-note">No soups match that search.</p>'}
    ${editable ? soupSizesAdminHTML() : ''}`;
}
function soupSizesAdminHTML(){
  return `<h2 class="section-title" style="margin-top:26px">Soup Sizes &amp; Pricing <button class="btn" onclick="addSoupSizeFlow()">+ Add Size</button></h2>
    <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px">Shown on the Weekly Deli Menu's Soups box.</p>
    ${db.soupSizes.length ? db.soupSizes.map(s=>`<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:10px">
      <span>${s.name}</span>
      <span style="display:flex;align-items:center;gap:6px">$<input type="text" style="width:70px" value="${s.price}" onchange="updateSoupSizePrice('${s.id}',this.value)">
      <button class="btn small danger" onclick="deleteSoupSize('${s.id}')">Delete</button></span>
    </div>`).join('') : '<p class="empty-note">No sizes yet.</p>'}`;
}
function addSoupSizeFlow(){
  openModal(`<h3>Add Soup Size</h3>
    <div class="field"><label>Size name</label><input type="text" id="ss-name" placeholder="e.g. Extra Large"></div>
    <div class="field"><label>Price</label><input type="text" id="ss-price" placeholder="6.00"></div>
    <div class="modal-actions"><button class="btn" onclick="saveSoupSize()">Save</button></div>`);
}
function saveSoupSize(){
  const name = document.getElementById('ss-name').value.trim();
  if(!name) return;
  db.soupSizes.push({ id:newId('sz'), name, price:document.getElementById('ss-price').value.trim() });
  closeModal(); renderPortalBody();
}
function updateSoupSizePrice(id,val){ const s=db.soupSizes.find(x=>x.id===id); if(s){ s.price=val; scheduleSave(); } }
function deleteSoupSize(id){ if(!confirm('Delete this size?')) return; db.soupSizes = db.soupSizes.filter(s=>s.id!==id); renderPortalBody(); }
function sourceDatalistHTML(){
  const sources = [...new Set(db.soups.map(s=>s.source).filter(Boolean))];
  return `<datalist id="soup-source-list">${sources.map(s=>`<option value="${escHtmlAttr(s)}">`).join('')}</datalist>`;
}
function addSoupFlow(){
  openModal(`<h3>Add Soup</h3>
    <div class="field"><label>Name</label><input type="text" id="sp-name"></div>
    <div class="toggle-row">
      <label><input type="checkbox" id="sp-df"> Dairy Free</label>
      <label><input type="checkbox" id="sp-gf"> Gluten Free</label>
      <label><input type="checkbox" id="sp-v"> Vegetarian</label>
    </div>
    <div class="field"><label>Source (optional)</label><input type="text" id="sp-source" list="soup-source-list">${sourceDatalistHTML()}</div>
    <div class="field"><label>Notes</label><textarea id="sp-notes"></textarea></div>
    <div class="modal-actions"><button class="btn" onclick="saveSoup()">Save</button></div>`);
}
function saveSoup(){
  const name = document.getElementById('sp-name').value.trim();
  if(!name) return;
  db.soups.push({ id:newId('s'), name, df:document.getElementById('sp-df').checked, gf:document.getElementById('sp-gf').checked, v:document.getElementById('sp-v').checked, source:document.getElementById('sp-source').value.trim(), notes:document.getElementById('sp-notes').value });
  closeModal(); renderPortalBody();
}
function editSoup(id){
  const s = db.soups.find(x=>x.id===id);
  openModal(`<h3>Edit Soup</h3>
    <div class="field"><label>Name</label><input type="text" id="sp-name" value="${s.name}"></div>
    <div class="toggle-row">
      <label><input type="checkbox" id="sp-df" ${s.df?'checked':''}> Dairy Free</label>
      <label><input type="checkbox" id="sp-gf" ${s.gf?'checked':''}> Gluten Free</label>
      <label><input type="checkbox" id="sp-v" ${s.v?'checked':''}> Vegetarian</label>
    </div>
    <div class="field"><label>Source (optional)</label><input type="text" id="sp-source" list="soup-source-list" value="${escHtmlAttr(s.source||'')}">${sourceDatalistHTML()}</div>
    <div class="field"><label>Notes</label><textarea id="sp-notes">${s.notes||''}</textarea></div>
    <div class="modal-actions"><button class="btn" onclick="updateSoup('${id}')">Save</button></div>`);
}
function updateSoup(id){
  const s = db.soups.find(x=>x.id===id);
  s.name = document.getElementById('sp-name').value.trim() || s.name;
  s.df = document.getElementById('sp-df').checked; s.gf = document.getElementById('sp-gf').checked; s.v = document.getElementById('sp-v').checked;
  s.source = document.getElementById('sp-source').value.trim();
  s.notes = document.getElementById('sp-notes').value;
  closeModal(); renderPortalBody();
}
function deleteSoup(id){ if(!confirm('Delete this soup?')) return; db.soups = db.soups.filter(s=>s.id!==id); renderPortalBody(); }

document.getElementById('portal-body').addEventListener('click', e=>{
  const cell = e.target.closest('#soup-admin-cal .soup-cell');
  if(cell && cell.dataset.date && session.isMaster) openSoupDayPicker(cell.dataset.date);
});
function dateISOHasSoup(dateISO){ return !!monthSoupMenu(dateISO.slice(0,7))[dateISO]; }
function openSoupDayPicker(dateISO, term){
  term = term || '';
  const t = term.toLowerCase();
  const options = db.soups.filter(s=> !t || s.name.toLowerCase().includes(t));
  openModal(`<h3>Soup for ${dateISO}</h3>
    <div class="field"><input type="text" id="soup-filter" placeholder="Search soups…" value="${escAttr(term)}" oninput="openSoupDayPicker('${dateISO}', this.value)"></div>
    <div class="search-panel-list">
      ${options.length ? options.map(s=>`<div class="search-panel-row" onclick="setSoupDay('${dateISO}','${s.id}')"><span>${s.name}</span>${diettags(s)}</div>`).join('') : '<div class="search-panel-row">No matches.</div>'}
      ${dateISOHasSoup(dateISO) ? `<div class="search-panel-row" style="color:var(--red-flag)" onclick="clearSoupDay('${dateISO}')">✕ Clear this day</div>` : ''}
    </div>`);
  setTimeout(()=>{ const el=document.getElementById('soup-filter'); if(el){ el.focus(); el.selectionStart=el.selectionEnd=el.value.length; } },0);
}
function setSoupDay(dateISO, soupId){
  monthSoupMenu(dateISO.slice(0,7))[dateISO] = soupId;
  closeModal(); renderPortalBody();
}
function clearSoupDay(dateISO){
  delete monthSoupMenu(dateISO.slice(0,7))[dateISO];
  closeModal(); renderPortalBody();
}

/* ============================================================
   PRODUCE DEALS ADMIN (master only)
   ============================================================ */
function produceAdminHTML(){
  return `<h2 class="section-title">Produce Deals <button class="btn" onclick="addProduceFlow()">+ Add Deal</button></h2>
    <div id="produce-admin-list"></div>`;
}
function uploadProduceImage(inputEl){
  return new Promise(resolve=>{
    const file = inputEl && inputEl.files && inputEl.files[0];
    if(!file){ resolve(''); return; }
    const path = 'produce/' + Date.now() + '-' + file.name.replace(/[^a-z0-9.]+/gi,'_');
    const ref = storage.ref().child(path);
    ref.put(file)
      .then(snap=>snap.ref.getDownloadURL())
      .then(url=>resolve(url))
      .catch(err=>{ console.error('Image upload failed:', err); alert('Photo upload failed — the deal will save without a photo. Check your connection and Storage Rules.'); resolve(''); });
  });
}
function addProduceFlow(){
  openModal(`<h3>Add Produce Deal</h3>
    <div class="field"><label>Produce name</label><input type="text" id="pd-name"></div>
    <div class="field"><label>Price</label><input type="text" id="pd-price" placeholder="2.49"></div>
    <div class="field"><label>Unit</label><input type="text" id="pd-unit" placeholder="lb, pk, ea."></div>
    <div class="toggle-row"><label><input type="checkbox" id="pd-organic"> Organic (unchecked = Conventional)</label></div>
    <div class="field"><label>Photo (optional)</label><input type="file" accept="image/*" id="pd-img-file"></div>
    <div class="modal-actions"><button class="btn" onclick="saveProduce()">Save</button></div>`);
}
async function saveProduce(){
  const name = document.getElementById('pd-name').value.trim();
  if(!name) return;
  const img = await uploadProduceImage(document.getElementById('pd-img-file'));
  db.produceDeals.push({ id:newId('p'), name, price:document.getElementById('pd-price').value.trim(), unit:document.getElementById('pd-unit').value.trim(), organic:document.getElementById('pd-organic').checked, img });
  closeModal(); renderPortalBody();
}
function editProduceDeal(id){
  const p = db.produceDeals.find(x=>x.id===id);
  window.__clearProduceImg = false;
  openModal(`<h3>Edit Deal</h3>
    <div class="field"><label>Produce name</label><input type="text" id="pd-name" value="${p.name}"></div>
    <div class="field"><label>Price</label><input type="text" id="pd-price" value="${p.price}"></div>
    <div class="field"><label>Unit</label><input type="text" id="pd-unit" value="${p.unit}"></div>
    <div class="toggle-row"><label><input type="checkbox" id="pd-organic" ${p.organic?'checked':''}> Organic (unchecked = Conventional)</label></div>
    ${p.img?`<img src="${p.img}" class="produce-img" style="margin-bottom:8px" id="pd-img-preview">`:''}
    <div class="field"><label>Replace photo (optional)</label><input type="file" accept="image/*" id="pd-img-file"></div>
    <div class="modal-actions">
      ${p.img?`<button class="btn outline" onclick="window.__clearProduceImg=true;const el=document.getElementById('pd-img-preview');if(el)el.remove();">Remove Photo</button>`:''}
      <button class="btn" onclick="updateProduce('${id}')">Save</button>
    </div>`);
}
async function updateProduce(id){
  const p = db.produceDeals.find(x=>x.id===id);
  p.name = document.getElementById('pd-name').value.trim()||p.name;
  p.price = document.getElementById('pd-price').value.trim();
  p.unit = document.getElementById('pd-unit').value.trim();
  p.organic = document.getElementById('pd-organic').checked;
  const fileEl = document.getElementById('pd-img-file');
  if(fileEl.files && fileEl.files[0]){
    p.img = await uploadProduceImage(fileEl);
  } else if(window.__clearProduceImg){
    p.img = '';
  }
  window.__clearProduceImg = false;
  closeModal(); renderPortalBody();
}
function deleteProduceDeal(id){ if(!confirm('Delete this deal?')) return; db.produceDeals = db.produceDeals.filter(p=>p.id!==id); renderPortalBody(); }

/* ============================================================
   EMPLOYEES (master only)
   ============================================================ */
function employeesHTML(){
  return `<h2 class="section-title">Employees <button class="btn" onclick="addEmployeeFlow()">+ Add Employee</button></h2>
    ${db.employees.map(e=>`<div class="card">
      <h4>${e.keyholder?'🔑 ':''}${e.name} ${!e.active?'<span class="pill inactive">Inactive</span>':''}</h4>
      <p class="pill">${e.role}</p><p style="font-size:13px;color:var(--ink-soft)">${e.phone||'No phone on file'}</p>
      <button class="btn small outline" onclick="openEmployeeDetail('${e.id}')">View Details</button>
      <button class="btn small ${e.active?'danger':''}" onclick="toggleEmployeeActive('${e.id}')">${e.active?'Deactivate':'Reactivate'}</button>
      <button class="btn small danger" onclick="deleteEmployee('${e.id}')">Delete</button>
    </div>`).join('')}`;
}
function addEmployeeFlow(){
  openModal(`<h3>Add Employee</h3>
    <div class="field"><label>Name</label><input type="text" id="em-name"></div>
    <div class="field"><label>Username</label><input type="text" id="em-user"></div>
    <div class="field"><label>Password</label><input type="text" id="em-pass"></div>
    <div class="field"><label>Role</label>${roleSelectHTML('em', db.roles[0])}</div>
    <div class="field"><label>Phone</label><input type="text" id="em-phone"></div>
    <div class="toggle-row"><label><input type="checkbox" id="em-key"> 🔑 Keyholder</label></div>
    <div class="field"><label>Notes</label><textarea id="em-notes"></textarea></div>
    <div class="modal-actions"><button class="btn" onclick="saveEmployee()">Save</button></div>`);
}
function saveEmployee(){
  const name = document.getElementById('em-name').value.trim();
  const username = document.getElementById('em-user').value.trim();
  if(!name || !username) return;
  db.employees.push({ id:newId('e'), name, username, password:document.getElementById('em-pass').value||'changeme',
    role:resolveRole('em'), keyholder:document.getElementById('em-key').checked,
    phone:document.getElementById('em-phone').value.trim(), notes:document.getElementById('em-notes').value, active:true,
    typicalSchedule:{}, stats:{added:Array(12).fill(0), checked:Array(12).fill(0)}, statsMonthKey:`${new Date().getFullYear()}-${pad(new Date().getMonth()+1)}`, createdAt:todayISO() });
  closeModal(); renderPortalBody();
}
function toggleEmployeeActive(id){ const e = db.employees.find(x=>x.id===id); e.active=!e.active; renderPortalBody(); }
function deleteEmployee(id){ if(!confirm('Delete this employee account?')) return; db.employees = db.employees.filter(e=>e.id!==id); renderPortalBody(); }

function employeeInfoEditHTML(e){
  return `<div class="card">
    <h4>Account Info</h4>
    <div class="field"><label>Name</label><input type="text" value="${e.name}" onchange="updateEmployeeField('${e.id}','name',this.value)"></div>
    <div class="field"><label>Username</label><input type="text" value="${e.username}" onchange="updateEmployeeField('${e.id}','username',this.value)"></div>
    <div class="field"><label>Password</label><input type="text" value="${e.password}" onchange="updateEmployeeField('${e.id}','password',this.value)"></div>
    <div class="field"><label>Role</label>${roleSelectHTML('ei', e.role)}
      <button class="btn small outline" style="margin-top:8px" onclick="saveEmployeeRole('${e.id}')">Update Role</button></div>
    <div class="field"><label>Phone</label><input type="text" value="${e.phone||''}" onchange="updateEmployeeField('${e.id}','phone',this.value)"></div>
    <div class="toggle-row"><label><input type="checkbox" ${e.keyholder?'checked':''} onchange="updateEmployeeField('${e.id}','keyholder',this.checked)"> 🔑 Keyholder</label></div>
    <div class="field"><label>Notes</label><textarea onchange="updateEmployeeField('${e.id}','notes',this.value)">${e.notes||''}</textarea></div>
  </div>`;
}
function saveEmployeeRole(id){
  updateEmployeeField(id, 'role', resolveRole('ei'));
  openEmployeeDetail(id);
}
function updateEmployeeField(id, field, value){
  const e = db.employees.find(x=>x.id===id);
  e[field] = value;
  const title = document.getElementById('emp-detail-title');
  if(title) title.textContent = `${e.keyholder?'🔑 ':''}${e.name}`;
  scheduleSave();
}

function typicalScheduleGridHTML(emp){
  return `<div class="sched-grid with-sun" style="grid-template-columns:110px repeat(7,1fr);min-width:560px">
    <div class="sched-head">Day</div>${ALL_DAYS.map(d=>`<div class="sched-head">${d}</div>`).join('')}
    <div class="sched-name">Hours</div>
    ${ALL_DAYS.map(d=>{
      const t = emp.typicalSchedule[d];
      return `<div class="sched-cell" onclick="editTypicalCell('${emp.id}','${d}')">${t?`${t.start}-${t.end}`:''}</div>`;
    }).join('')}
  </div>`;
}
function editTypicalCell(empId, dayKey){
  const emp = db.employees.find(e=>e.id===empId);
  const cur = emp.typicalSchedule[dayKey];
  openModal(`<h3>${emp.name} — Typical ${dayKey}</h3>
    <div class="field"><label>Start</label><input type="time" id="tc-start" value="${cur?cur.start:'09:00'}"></div>
    <div class="field"><label>End</label><input type="time" id="tc-end" value="${cur?cur.end:'17:00'}"></div>
    <div class="modal-actions">
      ${cur?`<button class="btn danger" onclick="clearTypicalCell('${empId}','${dayKey}')">Clear</button>`:''}
      <button class="btn" onclick="saveTypicalCell('${empId}','${dayKey}')">Save</button>
    </div>`);
}
function saveTypicalCell(empId,dayKey){
  const emp = db.employees.find(e=>e.id===empId);
  emp.typicalSchedule[dayKey] = { start:document.getElementById('tc-start').value, end:document.getElementById('tc-end').value };
  closeModal(); openEmployeeDetail(empId);
}
function clearTypicalCell(empId,dayKey){
  const emp = db.employees.find(e=>e.id===empId);
  delete emp.typicalSchedule[dayKey];
  closeModal(); openEmployeeDetail(empId);
}

function statChartHTML(values, color){
  const total = values.reduce((a,b)=>a+b,0);
  const monthLabels = lastNMonthLabels(12);
  const max = Math.max(1,...values);
  return `<div style="font-family:var(--font-mono);font-size:12px;color:var(--brown-light);margin-bottom:6px">Total: <strong style="color:var(--ink);font-size:14px">${total}</strong></div>
    <div class="chart-wrap">
      ${values.map((v,i)=>`<div class="chart-col"><div class="chart-bar" style="height:${(v/max*50)+4}px;background:${color}" title="${v}"></div><div class="chart-bar-label">${monthLabels[i]} · ${v}</div></div>`).join('')}
    </div>`;
}

function chatCommentsHTML(e){
  const comments = db.chatMessages.filter(m=>m.empId===e.id).slice().sort((a,b)=>a.ts-b.ts);
  return comments.length ? comments.map(c=>`<p style="font-size:13.5px">${new Date(c.ts).toLocaleDateString()} — "${c.text}"</p>`).join('') : '<p class="empty-note">No comments yet.</p>';
}

function openEmployeeDetail(id){
  viewingEmployeeId = id;
  const e = db.employees.find(x=>x.id===id);
  const daysSince = Math.max(1, Math.round((Date.now()-new Date(e.createdAt))/86400000));
  const requests = db.timeOffRequests.filter(r=>r.employeeId===id);
  const daysRequested = requests.length;
  const pct = ((daysRequested/daysSince)*100).toFixed(1);
  const approved = requests.filter(r=>r.status==='approved').length;
  const denied = requests.filter(r=>r.status==='denied').length;
  const totalDecided = approved+denied || 1;

  const el = document.getElementById('portal-body');
  el.innerHTML = `
    <button class="btn small outline" onclick="viewingEmployeeId=null;renderPortalBody()">← Back to Employees</button>
    <h2 class="section-title" id="emp-detail-title" style="margin-top:14px">${e.keyholder?'🔑 ':''}${e.name}</h2>
    ${employeeInfoEditHTML(e)}
    <div class="card">
      <h4>Typical Schedule</h4>
      <p style="font-size:12.5px;color:var(--ink-soft)">Click a day to set or clear this employee's usual hours. The 🪄 wand on the Scheduling tab fills a week from this.</p>
      <div style="overflow-x:auto">${typicalScheduleGridHTML(e)}</div>
    </div>
    <div class="card">
      <h4>Items Added (last 12 months)</h4>
      ${statChartHTML(e.stats.added, 'var(--green-moss)')}
      <h4 style="margin-top:16px">Items Checked Off (last 12 months)</h4>
      ${statChartHTML(e.stats.checked, 'var(--terracotta)')}
    </div>
    <div class="card stat-row">
      <div class="stat-block"><div class="stat-num">${daysRequested}</div><div class="stat-label">TIME OFF REQUESTS · ${pct}% OF DAYS SINCE HIRE</div></div>
      <div class="stat-block">
        <div class="stat-num" style="color:var(--green-moss)">${approved} <span style="color:var(--red-flag);font-size:20px">/ ${denied}</span></div>
        <div class="stat-label">APPROVED / DENIED</div>
        <div class="bar"><div class="approved" style="width:${approved/totalDecided*100}%"></div><div class="denied" style="width:${denied/totalDecided*100}%"></div></div>
      </div>
    </div>
    <div class="card">
      <h4>Chat Comments</h4>
      ${chatCommentsHTML(e)}
    </div>
    <div class="card">
      <h4>Time Off Requests</h4>
      ${requests.length ? requests.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<p style="opacity:${new Date(r.date)<new Date()?0.55:1}">${r.date} ${formatTime12hr(r.start)} - ${formatTime12hr(r.end)} — <strong>${r.status}</strong> ${r.responseComment?`<br><span style="font-size:12.5px;color:var(--ink-soft)">${r.responseComment}</span>`:''}</p>`).join('') : '<p class="empty-note">No requests yet.</p>'}
    </div>`;
  scheduleSave();
}

/* ============================================================
   SCHEDULING
   ============================================================ */
function weekSchedule(weekKey){ if(!db.schedule[weekKey]) db.schedule[weekKey] = {}; return db.schedule[weekKey]; }
function scheduleDayKeys(){ return db.settings.showSunSchedule ? [...DAY_KEYS,'SUN'] : DAY_KEYS; }

function scheduleHTML(){
  const pending = db.timeOffRequests.filter(r=>r.status==='pending');
  let html = '';
  if(session.isMaster){
    html += `<h2 class="section-title">Time Off Requests</h2>`;
    html += pending.length ? pending.map(r=>{
      const emp = db.employees.find(e=>e.id===r.employeeId);
      return `<div class="card"><strong>${emp?emp.name:'—'}</strong> — ${r.date} ${formatTime12hr(r.start)} - ${formatTime12hr(r.end)}
        ${r.comment?`<br><span style="font-size:12.5px;color:var(--ink-soft)">${r.comment}</span>`:''}
        <div class="modal-actions" style="justify-content:flex-start;margin-top:8px">
          <button class="btn small" onclick="respondRequest('${r.id}','approved')">Approve</button>
          <button class="btn small danger" onclick="respondRequest('${r.id}','denied')">Deny</button>
        </div></div>`;
    }).join('') : '<p class="empty-note">No pending requests.</p>';
    const past = db.timeOffRequests.filter(r=>r.status!=='pending');
    if(past.length) html += `<details><summary style="cursor:pointer;font-size:13px;color:var(--brown-light)">Past requests (${past.length})</summary>${past.map(r=>{
      const emp = db.employees.find(e=>e.id===r.employeeId);
      return `<div class="card" style="opacity:.7"><strong>${emp?emp.name:'—'}</strong> — ${r.date} ${formatTime12hr(r.start)} - ${formatTime12hr(r.end)} — ${r.status}</div>`;
    }).join('')}</details>`;
    html += `<label class="weekend-toggle"><input type="checkbox" ${db.settings.showSunSchedule?'checked':''} onchange="db.settings.showSunSchedule=this.checked;renderPortalBody()"> Show SUN (Sundays)</label>`;
  } else {
    html += myTimeOffListHTML();
    html += `<h2 class="section-title" style="margin-top:10px">My Schedule <button class="btn small" onclick="requestTimeOffFlow()">Time Off Request</button></h2>`;
    html += myUpcomingScheduleHTML();
  }

  const monday = addDays(startOfWeekMonday(new Date()), scheduleWeekOffset*7);
  const weekKey = weekKeyOf(monday);
  html += `<h2 class="section-title" style="margin-top:22px">Weekly Schedule
    <span class="panel-nav">
      <button class="btn small outline" onclick="scheduleWeekOffset--;renderPortalBody()">← Prev Week</button>
      <span class="week-range">${fmtWeekRange(monday)}</span>
      <button class="btn small outline" onclick="scheduleWeekOffset++;renderPortalBody()">Next Week →</button>
      ${scheduleWeekOffset!==0?`<button class="btn small" onclick="scheduleWeekOffset=0;renderPortalBody()">Today</button>`:''}
    </span></h2>`;
  html += weekBoxHTML(weekKey, monday);
  return html;
}

// Lists the logged-in employee's own shifts (today onward) across the
// current + next week, in "DAY | DATE | START to END | Notes" form.
function myUpcomingScheduleHTML(){
  const rows = [];
  for(let w=0; w<2; w++){
    const monday = addDays(startOfWeekMonday(new Date()), w*7);
    const weekKey = weekKeyOf(monday);
    const mySched = (weekSchedule(weekKey)[session.employeeId]) || {};
    scheduleDayKeys().forEach((dk,i)=>{
      const date = addDays(monday,i);
      const iso = isoDate(date);
      if(iso < todayISO()) return;
      const shift = mySched[dk];
      if(shift) rows.push({ date, iso, dk, shift });
    });
  }
  rows.sort((a,b)=>a.iso.localeCompare(b.iso));
  return `<div class="card">
    <h4>My Upcoming Shifts (next 2 weeks)</h4>
    ${rows.length ? rows.map(r=>`<p style="font-size:13.5px;margin:6px 0">${r.dk} | ${fmtShort(r.date)} | ${formatTime12hr(r.shift.start)} to ${formatTime12hr(r.shift.end)}${r.shift.notes?` | ${r.shift.notes}`:''}</p>`).join('') : '<p class="empty-note">No upcoming shifts scheduled.</p>'}
  </div>`;
}

function myTimeOffListHTML(){
  const mine = db.timeOffRequests.filter(r=>r.employeeId===session.employeeId);
  const upcoming = mine.filter(r=>r.date>=todayISO()).sort((a,b)=>a.date.localeCompare(b.date));
  const past = mine.filter(r=>r.date<todayISO()).sort((a,b)=>b.date.localeCompare(a.date));
  return `<h2 class="section-title">My Time Off Requests</h2>
    ${upcoming.length ? upcoming.map(timeOffRowHTML).join('') : '<p class="empty-note">No upcoming requests.</p>'}
    ${past.length ? `<details style="margin-top:8px"><summary style="cursor:pointer;font-size:13px;color:var(--brown-light)">Past requests (${past.length})</summary>${past.map(timeOffRowHTML).join('')}</details>` : ''}`;
}
function timeOffRowHTML(r){
  return `<div class="timeoff-list-item">${r.date} ${formatTime12hr(r.start)} - ${formatTime12hr(r.end)} <span class="timeoff-status ${r.status}">${r.status}</span>
    ${r.comment?`<br><span style="font-size:12px;color:var(--ink-soft)">Reason: ${r.comment}</span>`:''}
    ${r.responseComment?`<br><span style="font-size:12px;color:var(--ink-soft)">Manager: ${r.responseComment}</span>`:''}</div>`;
}

function weekBoxHTML(weekKey, monday){
  const sched = weekSchedule(weekKey);
  const days = scheduleDayKeys();
  const roles = [...new Set(db.employees.filter(e=>e.active).map(e=>e.role))];
  let rows = '';
  roles.forEach(role=>{
    rows += `<div class="sched-role-row">${role}</div>`;
    db.employees.filter(e=>e.active && e.role===role).forEach(emp=>{
      const canEditRow = session.isMaster || (!session.isMaster && session.employeeId===emp.id);
      const isSelf = !session.isMaster && session.employeeId===emp.id;
      const selfClass = isSelf ? ' own-row' : '';
      rows += `<div class="sched-name${selfClass}">${session.isMaster?`<button class="magic-btn" title="Fill typical schedule" onclick="magicFill('${weekKey}','${emp.id}')">🪄</button>`:''}${emp.keyholder?'🔑 ':''}<span style="cursor:pointer" onclick="showProfile('${emp.id}')">${emp.name}</span></div>`;
      days.forEach((dk,i)=>{
        const cellData = (sched[emp.id]||{})[dk];
        const date = addDays(monday,i);
        const req = db.timeOffRequests.find(r=>r.employeeId===emp.id && r.date===isoDate(date) && r.status!=='denied');
        const isReq = !!req;
        const label = isReq ? `Off${req.status==='pending'?' ?':''}` : (cellData ? `${formatTime12hr(cellData.start)} - ${formatTime12hr(cellData.end)}` : '');
        const clickable = session.isMaster ? `onclick="editCell('${weekKey}','${emp.id}','${dk}','${isoDate(date)}')"` :
          (canEditRow ? `onclick="employeeCellClick('${weekKey}','${emp.id}','${dk}','${isoDate(date)}')"` : '');
        const noteBtn = (!isReq && cellData && cellData.notes) ? `<button class="sched-note-btn" title="View note" onclick="event.stopPropagation();viewShiftNote('${escAttr(cellData.notes)}')"><svg viewBox="0 0 24 24"><path d="M6 3h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v5h5" fill="none" stroke-width="1.3"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="15.5" x2="16" y2="15.5"/></svg></button>` : '';
        rows += `<div class="sched-cell ${isReq?'request':''}${isSelf?' own-row':''}" ${clickable}>${label}${noteBtn}</div>`;
      });
    });
  });
  const gridClass = days.length===7 ? 'sched-grid with-sun' : 'sched-grid';
  return `<div class="week-box"><div class="week-label">${fmtWeekRange(monday)}</div>
    <div class="${gridClass}">
      <div class="sched-head">Employee</div>${days.map((d,i)=>`<div class="sched-head">${d} ${fmtShort(addDays(monday,i))}</div>`).join('')}
      ${rows}
    </div></div>`;
}
function viewShiftNote(note){
  openModal(`<h3>Shift Note</h3><p style="white-space:pre-wrap">${note}</p><div class="modal-actions"><button class="btn" onclick="closeModal()">Close</button></div>`);
}

function showProfile(empId){
  const e = db.employees.find(x=>x.id===empId);
  openModal(`<div class="profile-pop"><h3>${e.keyholder?'🔑 ':''}${e.name}</h3><p>${e.phone||'No phone on file'}</p><p class="pill">${e.role}</p></div>`);
}

function editCell(weekKey, empId, dayKey, dateISO){
  const emp = db.employees.find(e=>e.id===empId);
  const typical = emp.typicalSchedule[dayKey];
  const current = (weekSchedule(weekKey)[empId]||{})[dayKey];
  openModal(`<h3>${emp.name} — ${dayKey} ${dateISO}</h3>
    ${typical ? `<button class="btn small outline" onclick="applyTypical('${weekKey}','${empId}','${dayKey}')">Use typical: ${formatTime12hr(typical.start)} - ${formatTime12hr(typical.end)}</button><br><br>` : ''}
    <div class="field"><label>Start</label><input type="time" id="cell-start" value="${current?current.start:(typical?typical.start:'09:00')}"></div>
    <div class="field"><label>End</label><input type="time" id="cell-end" value="${current?current.end:(typical?typical.end:'17:00')}"></div>
    <div class="field"><label>Note (optional)</label><textarea id="cell-notes" placeholder="e.g. Covering for Dana, closing shift…">${current&&current.notes?escHtmlAttr(current.notes):''}</textarea></div>
    <div class="modal-actions">
      ${current?`<button class="btn danger" onclick="clearCell('${weekKey}','${empId}','${dayKey}')">Clear</button>`:''}
      <button class="btn" onclick="saveCell('${weekKey}','${empId}','${dayKey}')">Save</button>
    </div>`);
}
function saveCell(weekKey,empId,dayKey){
  const sched = weekSchedule(weekKey);
  if(!sched[empId]) sched[empId] = {};
  const notes = document.getElementById('cell-notes').value.trim();
  sched[empId][dayKey] = { start:document.getElementById('cell-start').value, end:document.getElementById('cell-end').value, notes };
  closeModal(); renderPortalBody();
}
function clearCell(weekKey,empId,dayKey){ delete weekSchedule(weekKey)[empId][dayKey]; closeModal(); renderPortalBody(); }
function applyTypical(weekKey,empId,dayKey){
  const emp = db.employees.find(e=>e.id===empId);
  document.getElementById('cell-start').value = emp.typicalSchedule[dayKey].start;
  document.getElementById('cell-end').value = emp.typicalSchedule[dayKey].end;
}
function magicFill(weekKey, empId){
  const emp = db.employees.find(e=>e.id===empId);
  const sched = weekSchedule(weekKey);
  if(!sched[empId]) sched[empId] = {};
  Object.entries(emp.typicalSchedule).forEach(([day,val])=>{ sched[empId][day] = {...val}; });
  renderPortalBody();
}
function employeeCellClick(weekKey, empId, dayKey, dateISO){
  openModal(`<h3>${dayKey} ${dateISO}</h3>
    <div class="modal-actions" style="justify-content:flex-start"><button class="btn" onclick="requestTimeOffFlow('${dateISO}')">Request Time Off</button></div>`);
}
function requestTimeOffFlow(prefillDate){
  openModal(`<h3>Request Time Off</h3>
    <div class="field"><label>Date</label><input type="date" id="to-date" value="${prefillDate||''}"></div>
    <div class="field"><label>Start</label><input type="time" id="to-start" value="09:00"></div>
    <div class="field"><label>End</label><input type="time" id="to-end" value="17:00"></div>
    <div class="field"><label>Comments</label><textarea id="to-comment" placeholder="Reason for request…"></textarea></div>
    <div class="modal-actions"><button class="btn" onclick="submitTimeOff()">Submit Request</button></div>`);
}
function submitTimeOff(){
  const date = document.getElementById('to-date').value;
  if(!date) return;
  db.timeOffRequests.push({ id:newId('r'), employeeId:session.employeeId, date, start:document.getElementById('to-start').value, end:document.getElementById('to-end').value, comment:document.getElementById('to-comment').value, status:'pending', responseComment:'' });
  closeModal(); renderPortalBody();
}
function respondRequest(id, status){
  const r = db.timeOffRequests.find(x=>x.id===id);
  const comment = prompt(`Add a comment for this ${status==='approved'?'approval':'denial'} (optional):`) || '';
  r.status = status; r.responseComment = comment;
  renderPortalBody();
}

/* ============================================================
   CHAT
   ============================================================ */
function chatHTML(){
  return `<h2 class="section-title">Chat</h2>
    <div class="chat-box">
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-input-row">
        <input type="text" id="chat-input" placeholder="Write a message…" onkeydown="if(event.key==='Enter') sendChat()">
        <button class="btn" onclick="sendChat()">Send</button>
      </div>
    </div>`;
}
function renderChatMessages(){
  const el = document.getElementById('chat-messages');
  if(!el) return;
  el.innerHTML = db.chatMessages.map(m=>{
    return `<div class="chat-msg"><div class="who">${m.empId ? `<button onclick="showProfile('${m.empId}')">${m.who}</button>` : m.who} · ${new Date(m.ts).toLocaleString()}</div><div>${m.text}</div></div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
  scheduleSave();
}
function sendChat(){
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if(!text) return;
  db.chatMessages.push({ id:newId('m'), who:session.name.replace(' (Master)',''), empId: session.isMaster?null:session.employeeId, text, ts:Date.now() });
  input.value='';
  renderChatMessages();
}

/* ============================================================
   GLOBAL EVENT WIRING
   ============================================================ */
document.body.addEventListener('click', e=>{
  const actionEl = e.target.closest('[data-action]');
  if(actionEl){
    const action = actionEl.dataset.action;
    if(action==='login') showView('view-login');
    if(action==='back-public') showView('view-public');
    if(action==='logout') logout();
    if(action==='toggle-dark') toggleDarkMode();
    if(action==='add-item') addItemFlow();
    if(action==='bulk-import') bulkImportFlow();
    if(action==='toggle-categories'){ expSubView = expSubView==='categories' ? 'items' : 'categories'; renderPortalBody(); }
    if(action==='deli-prev'){ publicDeliWeekOffset--; renderDeliPanel(); }
    if(action==='deli-today'){ publicDeliWeekOffset=0; renderDeliPanel(); }
    if(action==='deli-next'){ publicDeliWeekOffset++; renderDeliPanel(); }
    if(action==='soup-prev'){ publicSoupMonthOffset--; renderSoupPanel(); }
    if(action==='soup-today'){ publicSoupMonthOffset=0; renderSoupPanel(); }
    if(action==='soup-next'){ publicSoupMonthOffset++; renderSoupPanel(); }
    if(action==='soup-export') exportSoupMenuICS();
  }
  const tabEl = e.target.closest('.portal-tab');
  if(tabEl) setTab(tabEl.dataset.tab);
});
document.getElementById('portal-search').addEventListener('input', ()=>portalSearch());
document.getElementById('portal-search-date').addEventListener('input', ()=>portalSearch());

/* ---------------------------- DARK MODE ---------------------------- */
// Sun/moon icon-only toggle, available to everyone (public + portal).
// Preference is remembered per-browser via localStorage.
const SUN_ICON = '<svg viewBox="0 0 24 24"><path d="M12 4a1 1 0 011 1v1a1 1 0 11-2 0V5a1 1 0 011-1zm0 14a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm8-6a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM6 12a1 1 0 01-1 1H4a1 1 0 110-2h1a1 1 0 011 1zm11.66 6.66a1 1 0 01-1.42 0l-.7-.71a1 1 0 111.42-1.41l.7.7a1 1 0 010 1.42zM7.46 7.46a1 1 0 01-1.42 0l-.7-.71A1 1 0 016.75 5.34l.71.7a1 1 0 010 1.42zm10.2-1.42a1 1 0 010 1.42l-.7.7a1 1 0 11-1.42-1.41l.7-.7a1 1 0 011.42 0zM6.75 18.66a1 1 0 010-1.42l.71-.7a1 1 0 111.41 1.41l-.7.71a1 1 0 01-1.42 0zM12 7a5 5 0 100 10 5 5 0 000-10z"/></svg>';
const MOON_ICON = '<svg viewBox="0 0 24 24"><path d="M20.7 15.5A8.7 8.7 0 019.5 3.3a1 1 0 00-1.2-1.3A10.7 10.7 0 1022 16.7a1 1 0 00-1.3-1.2z"/></svg>';
function updateDarkModeIcons(){
  const isDark = document.body.classList.contains('dark-mode');
  document.querySelectorAll('.dark-toggle-icon').forEach(el=>{ el.innerHTML = isDark ? SUN_ICON : MOON_ICON; });
}
function toggleDarkMode(){
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('groundedDarkMode', document.body.classList.contains('dark-mode') ? '1' : '0');
  updateDarkModeIcons();
}
function initDarkMode(){
  if(localStorage.getItem('groundedDarkMode') === '1') document.body.classList.add('dark-mode');
  updateDarkModeIcons();
}

/* ---------------------------- INIT ---------------------------- */
// Paint immediately with the local seed defaults so the page is never blank,
// then let Firestore's listeners take over the moment real/synced data loads.
initFirebaseSync();
initDarkMode();
renderPublic();
showView('view-public');
