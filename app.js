const KEY = 'san-cau-data-v1',
  $ = id => document.getElementById(id),
  localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
  today = () => localDate(),
  fmt = n => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' ₫',
  parseDate = s => new Date(s + 'T12:00:00'),
  viDate = s => parseDate(s).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }),
  shortDate = s => parseDate(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
  monthKey = s => (s || today()).slice(0, 7),
  monthLabel = s => parseDate(s + '-01').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }),
  id = () => Math.random().toString(36).slice(2, 10),
  esc = (x = '') => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function newState() {
  return {
    version: 2,
    fees: { male: 45000, female: 40000 },
    opening: 0,
    openingDate: today(),
    courtRate: 75000,
    courts: [{ id: 'court-default', name: 'Sân số 1', address: '', number: '1' }],
    members: [],
    sessions: [],
    expenses: [],
    monthlyReceipts: [],
    teamName: 'Team Thứ 3 & Thứ 5',
    scheduleHint: 'Lịch đánh định kỳ thứ 3 & thứ 5 hàng tuần',
    activeMode: 'team',
    activeTeamId: 'team-default',
    teams: [],
    casualMatches: []
  };
}

// 1. Load & Safeguard Existing Data (Zero Data Loss Guarantee)
let state;
try {
  const raw = localStorage.getItem(KEY);
  if (raw && !localStorage.getItem('san-cau-backup-v1-safe')) {
    localStorage.setItem('san-cau-backup-v1-safe', raw);
  }
  state = raw ? JSON.parse(raw) : newState();
} catch (error) {
  alert('Không đọc được dữ liệu trên máy. App đã dừng để tránh ghi đè dữ liệu.');
  throw error;
}

// 2. Preserve All Legacy Data Normalizations
state.courtRate = Number(state.courtRate || 75000);
state.courts = Array.isArray(state.courts) ? state.courts : [];
state.courts = state.courts
  .map(c => typeof c === 'string'
    ? { id: id(), name: c.trim(), address: '', number: '' }
    : { ...c, id: c.id || id(), name: String(c.name || 'Sân số 1').trim(), address: String(c.address || '').trim(), number: String(c.number || '').trim() })
  .filter(c => c.name && c.name !== '__add__' && c.name !== 'Sân __add__');

if (!state.courts.some(c => c.id === 'court-default')) {
  const legacyDefault = state.courts.find(c => c.name === 'Sân số 1');
  if (legacyDefault) legacyDefault.id = 'court-default';
  else state.courts.unshift({ id: 'court-default', name: 'Sân số 1', address: '', number: '1' });
}

state.members = Array.isArray(state.members) ? state.members : [];
state.sessions = Array.isArray(state.sessions) ? state.sessions : [];
state.expenses = Array.isArray(state.expenses) ? state.expenses : [];
state.monthlyReceipts = Array.isArray(state.monthlyReceipts) ? state.monthlyReceipts : [];

for (const s of state.sessions) {
  const rawVenue = String(s.courtName || s.note || '').trim(),
    venue = rawVenue === '__add__' || rawVenue === 'Sân __add__' ? 'Sân số 1' : rawVenue || 'Sân số 1';
  let court = state.courts.find(c => c.id === s.courtId) || state.courts.find(c => c.name.toLocaleLowerCase() === venue.toLocaleLowerCase());
  if (!court) {
    court = { id: id(), name: venue, address: '', number: '' };
    state.courts.push(court);
  }
  s.courtId = court.id;
  s.courtName = court.name;
  s.courtAddress = court.address;
  s.courtNumber = court.number;
}

if (!state.sessions.length && !localStorage.getItem(KEY)) {
  let d = new Date();
  d.setHours(12, 0, 0, 0);
  while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
  for (let i = 0; i < 8; i++) {
    const date = new Date(d);
    date.setDate(d.getDate() + Math.floor(i / 2) * 7 + (i % 2 ? 2 : 0));
    const iso = localDate(date);
    state.sessions.push({ id: id(), date: iso, start: '17:30', end: '19:30', note: '', courtCost: 150000, attendees: [] });
  }
}

state.fees = state.fees || { male: 45000, female: 40000 };
function normalizeTeamSessions(sessions, members, fees) {
  const f = fees || { male: 45000, female: 40000 };
  const mems = Array.isArray(members) ? members : [];
  for (const s of sessions || []) {
    for (const attendee of s.attendees || []) {
      const defaultFee = Number(f[attendee.gender === 'female' ? 'female' : 'male'] || (attendee.gender === 'female' ? 40000 : 45000));
      if (!attendee.feeAmount || Number(attendee.feeAmount) <= 0) {
        attendee.feeAmount = Number(attendee.paidAmount) > 0 ? Number(attendee.paidAmount) : defaultFee;
      }
      const memberObj = mems.find(m => m.id === attendee.memberId);
      const isMonthly = !attendee.guest && Boolean(attendee.monthlyPayment || memberObj?.paymentMode === 'monthly');
      if (!attendee.guest && attendee.presence !== 'present') {
        attendee.paid = false;
        attendee.paidAmount = 0;
        attendee.paidDate = null;
      } else if (isMonthly) {
        attendee.monthlyPayment = true;
        attendee.paid = false;
        attendee.paidAmount = 0;
        attendee.paidDate = null;
      } else if (attendee.paid && (!attendee.paidAmount || Number(attendee.paidAmount) <= 0)) {
        attendee.paidAmount = Number(attendee.feeAmount) || defaultFee;
      }
    }
  }
}
normalizeTeamSessions(state.sessions, state.members, state.fees);
state.monthlyLedgerVersion = 2;

// 3. Multi-Team & Casual Match Non-Destructive Schema Setup
state.teamName = state.teamName || 'Team Thứ 3 & Thứ 5';
state.scheduleHint = state.scheduleHint || 'Lịch đánh định kỳ thứ 3 & thứ 5 hàng tuần';
state.activeMode = state.activeMode === 'casual' ? 'casual' : 'team';
state.activeTeamId = state.activeTeamId || 'team-default';
state.teams = Array.isArray(state.teams) ? state.teams : [];
state.teams.forEach(t => normalizeTeamSessions(t.sessions, t.members, t.fees));
state.casualMatches = Array.isArray(state.casualMatches) ? state.casualMatches : [];

function syncActiveTeamToRegistry() {
  const activeId = state.activeTeamId || 'team-default';
  const snapshot = {
    id: activeId,
    name: state.teamName || 'Team Thứ 3 & Thứ 5',
    scheduleHint: state.scheduleHint || 'Lịch đánh định kỳ hàng tuần',
    fees: JSON.parse(JSON.stringify(state.fees || { male: 45000, female: 40000 })),
    opening: Number(state.opening || 0),
    openingDate: state.openingDate || today(),
    courtRate: Number(state.courtRate || 75000),
    members: JSON.parse(JSON.stringify(state.members || [])),
    sessions: JSON.parse(JSON.stringify(state.sessions || [])),
    expenses: JSON.parse(JSON.stringify(state.expenses || [])),
    monthlyReceipts: JSON.parse(JSON.stringify(state.monthlyReceipts || []))
  };
  const idx = state.teams.findIndex(t => t.id === activeId);
  if (idx >= 0) state.teams[idx] = snapshot;
  else state.teams.unshift(snapshot);
}
syncActiveTeamToRegistry();

// 4. Core Financial & Session Functions
function feeFor(gender, fees = state.fees) {
  const f = fees || state.fees || { male: 45000, female: 40000 };
  return Number(f[gender === 'female' ? 'female' : 'male']);
}
function recordedFee(a, fees = state.fees) {
  if (Number(a.feeAmount) > 0) return Number(a.feeAmount);
  if (a.paid && Number(a.paidAmount) > 0) return Number(a.paidAmount);
  return feeFor(a.gender, fees);
}
function charge(a, fees = state.fees) {
  const chargeable = a.guest ? (a.presence === 'present' || a.presence === 'absent' || !a.presence) : a.presence === 'present';
  if (!chargeable) return 0;
  return recordedFee(a, fees);
}
function isMonthlyAttendee(a, members = state.members) {
  if (a.guest) return false;
  const m = (members || []).find(x => x.id === a.memberId);
  return Boolean(a.monthlyPayment || m?.paymentMode === 'monthly');
}
function attendeePaidAmount(a, members = state.members, fees = state.fees) {
  if (!a.paid) return 0;
  if (!a.guest && a.presence !== 'present') return 0;
  if (isMonthlyAttendee(a, members)) return 0;
  const c = charge(a, fees);
  if (c <= 0) return 0;
  return Number(a.paidAmount) > 0 ? Number(a.paidAmount) : c;
}

function computeTeamBalance(teamObj) {
  const fees = teamObj.fees || { male: 45000, female: 40000 };
  const members = teamObj.members || [];
  const inc = (teamObj.sessions || []).reduce((n, s) =>
    n + (s.status === 'passed'
      ? Number(s.passAmount || 0)
      : (s.attendees || []).reduce((sum, a) => sum + attendeePaidAmount(a, members, fees), 0)), 0);
  const mRec = (teamObj.monthlyReceipts || []).reduce((n, r) => n + Number(r.amount || 0), 0);
  const exp = (teamObj.expenses || []).reduce((n, e) => n + Number(e.amount || 0), 0);
  return Number(teamObj.opening || 0) + inc + mRec - exp;
}

function switchTeam(targetTeamId) {
  syncActiveTeamToRegistry();
  const target = state.teams.find(t => t.id === targetTeamId);
  if (!target) return;
  state.activeTeamId = target.id;
  state.activeMode = 'team';
  state.teamName = target.name || 'Team cố định';
  state.scheduleHint = target.scheduleHint || 'Lịch đánh định kỳ hàng tuần';
  state.fees = JSON.parse(JSON.stringify(target.fees || { male: 45000, female: 40000 }));
  state.opening = Number(target.opening || 0);
  state.openingDate = target.openingDate || today();
  state.courtRate = Number(target.courtRate || 75000);
  state.members = JSON.parse(JSON.stringify(target.members || []));
  state.sessions = JSON.parse(JSON.stringify(target.sessions || []));
  state.expenses = JSON.parse(JSON.stringify(target.expenses || []));
  state.monthlyReceipts = JSON.parse(JSON.stringify(target.monthlyReceipts || []));
  normalizeTeamSessions(state.sessions, state.members, state.fees);
  save();
  setView('dashboard');
  showToast('Đã chuyển sang ' + state.teamName);
}

function monthlyDue(memberId, month) {
  return state.sessions
    .filter(s => s.status !== 'passed' && monthKey(s.date) === month)
    .reduce((sum, s) => sum + (s.attendees || [])
      .filter(a => a.memberId === memberId && !a.guest && a.presence === 'present' && isMonthlyAttendee(a) && !a.paid)
      .reduce((n, a) => n + charge(a), 0), 0);
}
function monthlyReceived(memberId, month) {
  return state.monthlyReceipts
    .filter(r => r.memberId === memberId && r.month === month)
    .reduce((n, r) => n + Number(r.amount || 0), 0);
}
function renderMonthlySummary() {
  const mid = $('monthlyMember').value, month = $('monthlyMonth').value;
  if (!mid || !month) {
    $('monthlySummary').textContent = 'Chọn thành viên và tháng cần thu';
    return;
  }
  const due = monthlyDue(mid, month), received = monthlyReceived(mid, month);
  $('monthlySummary').textContent = 'Tổng phí ' + fmt(due) + ' · Đã nhận ' + fmt(received) + ' · Còn thu ' + fmt(Math.max(0, due - received));
  $('monthlyAmount').removeAttribute('max');
  $('monthlyAmount').value = Math.max(0, due - received);
}
function openMonthlyCollection() {
  const members = state.members.filter(m => m.paymentMode === 'monthly' || state.sessions.some(s => (s.attendees || []).some(a => a.memberId === m.id && a.monthlyPayment)));
  if (!members.length) {
    showToast('Chưa có thành viên nào đăng ký hình thức Đóng cuối tháng');
    return;
  }
  $('monthlyMember').innerHTML = members.map(m => '<option value="' + esc(m.id) + '">' + esc(m.name) + '</option>').join('');
  $('monthlyMember').value = members[0]?.id || '';
  $('monthlyMonth').value = monthKey(today());
  $('monthlyDate').value = today();
  renderMonthlySummary();
  $('monthlyDialog').showModal();
}
function saveMonthlyCollection(e) {
  e.preventDefault();
  const memberId = $('monthlyMember').value,
    month = $('monthlyMonth').value,
    date = $('monthlyDate').value,
    amount = Number($('monthlyAmount').value);
  if (!memberId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !date || date > today() || !Number.isSafeInteger(amount) || amount <= 0) {
    showToast('Nhập số tiền thực nhận là số nguyên dương và ngày nhận không ở tương lai');
    return;
  }
  state.monthlyReceipts.push({
    id: id(),
    memberId,
    name: state.members.find(m => m.id === memberId)?.name || 'Thành viên',
    month,
    date,
    amount
  });
  $('monthlyDialog').close();
  save();
  showToast('Đã ghi nhận tiền thực nhận vào quỹ');
}
function setFeeEditor(open) {
  if (!$('feeSettingsFields')) return;
  $('feeSettingsFields').hidden = !open;
  $('toggleFees')?.setAttribute('aria-expanded', String(open));
  if ($('toggleFees')) $('toggleFees').textContent = open ? 'Đóng điều chỉnh' : 'Điều chỉnh phí';
  $('maleFee').value = state.fees.male;
  $('femaleFee').value = state.fees.female;
  $('maleFee').disabled = !open;
  $('femaleFee').disabled = !open;
}
window.setFeeEditor = setFeeEditor;

function saveFees(e) {
  e.preventDefault();
  const male = Number($('maleFee').value), female = Number($('femaleFee').value);
  if (!$('maleFee').value || !$('femaleFee').value || !Number.isSafeInteger(male) || !Number.isSafeInteger(female) || male < 0 || female < 0) {
    showToast('Nhập phí nam và nữ là số tiền hợp lệ, từ 0đ');
    return;
  }
  state.fees = { male, female };
  setFeeEditor(false);
  save();
  showToast('Đã lưu phí cho các lần điểm danh mới');
}

function save() {
  syncActiveTeamToRegistry();
  localStorage.setItem(KEY, JSON.stringify(state));
  render();
  window.dispatchEvent(new Event('san-cau-saved'));
}
function showToast(msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => t.classList.remove('show'), 2400);
}

function sessionCollected(s) {
  if (s.status === 'passed') return Number(s.passAmount || 0);
  return (s.attendees || []).reduce((sum, a) => sum + attendeePaidAmount(a), 0);
}
function sessionExpected(s) {
  if (s.status === 'passed') return Number(s.passAmount || 0);
  return (s.attendees || []).reduce((sum, a) => {
    if (isMonthlyAttendee(a)) return sum;
    return sum + charge(a);
  }, 0);
}
function collectedInMonth(mk) {
  return state.monthlyReceipts.filter(r => monthKey(r.date) === mk).reduce((n, r) => n + Number(r.amount || 0), 0) +
    state.sessions.reduce((n, s) =>
      n + (s.status === 'passed' && monthKey(s.passDate || s.date) === mk ? Number(s.passAmount || 0) : 0) +
      (s.status !== 'passed'
        ? (s.attendees || []).reduce((x, a) => x + (monthKey(a.paidDate || s.date) === mk ? attendeePaidAmount(a) : 0), 0)
        : 0), 0);
}
function expenseTotal() {
  return state.expenses.reduce((n, e) => n + Number(e.amount || 0), 0);
}
function monthlyReceiptsTotal() {
  return state.monthlyReceipts.reduce((n, r) => n + Number(r.amount || 0), 0);
}
function incomeTotal() {
  return state.sessions.reduce((n, s) =>
    n + (s.status === 'passed'
      ? Number(s.passAmount || 0)
      : (s.attendees || []).reduce((sum, a) => sum + attendeePaidAmount(a), 0)), 0);
}
function balance() {
  return Number(state.opening || 0) + incomeTotal() + monthlyReceiptsTotal() - expenseTotal();
}
function memberName(a) {
  return a.name || state.members.find(m => m.id === a.memberId)?.name || 'Khách';
}
function attendeesCount(s) {
  return (s.attendees || []).filter(a => a.presence === 'present').length;
}
function chargeableCount(s) {
  return (s.attendees || []).filter(a => charge(a) > 0).length;
}

const COURT_HOURS = [1, 1.5, 2, 2.5, 3];
function sessionHours(s) {
  const [sh, sm] = (s.start || '17:30').split(':').map(Number),
    [eh, em] = (s.end || '19:30').split(':').map(Number);
  return ((eh * 60 + em - sh * 60 - sm) + 1440) % 1440 / 60;
}
function sessionCost(s) {
  return Math.round(Number(s.courtHours ?? sessionHours(s)) * Number(s.courtRate ?? state.courtRate));
}
function isValidTimeFormat(val) {
  return typeof val === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(val.trim());
}

function updateCourtCost() {
  const hours = Number($('courtHours').value), rate = Number($('courtHourlyRate').value);
  $('courtCost').value = Number.isFinite(rate) ? Math.round(hours * rate) : 0;
  const startVal = $('sessionStart').value || '17:30';
  const parts = startVal.split(':').map(Number);
  const h = Number.isFinite(parts[0]) && parts[0] >= 0 && parts[0] <= 23 ? parts[0] : 17;
  const m = Number.isFinite(parts[1]) && parts[1] >= 0 && parts[1] <= 59 ? parts[1] : 30;
  const end = (h * 60 + m + Math.round(hours * 60)) % 1440;
  if (Number.isFinite(end)) {
    $('sessionEnd').value = String(Math.floor(end / 60)).padStart(2, '0') + ':' + String(end % 60).padStart(2, '0');
  }
  $('sessionCostHint').textContent = $('sessionStatus').value === 'passed'
    ? 'Buổi nhường sân không tính tiền sân team; tiền thu sẽ cộng vào quỹ.'
    : hours + ' giờ × ' + fmt(rate) + '/giờ = ' + fmt(Number($('courtCost').value)) + ' · Trả cuối tháng, chưa trừ quỹ.';
}

function courtLabel(c) {
  const name = String(c.name || '').replace(/^Sân\s+/i, '');
  return `Sân ${name}`;
}

// 5. Session Card Renderer (Strict 70% Neutral White Card + 20% Primary CTA + 5% Secondary/Functional)
function makeSessionCard(s) {
  const attendees = s.attendees || [],
    fixedCount = attendees.filter(a => !a.guest && a.presence === 'present').length,
    guestCount = attendees.filter(a => a.guest && (a.presence === 'present' || a.presence === 'absent')).length,
    totalPresent = fixedCount + guestCount,
    done = Boolean(s.attendanceSaved || attendees.some(a => a.presence === 'present' || a.presence === 'absent')),
    passed = s.status === 'passed',
    dObj = parseDate(s.date),
    weekday = dObj.toLocaleDateString('vi-VN', { weekday: 'short' }).toUpperCase(),
    dayNum = String(dObj.getDate()).padStart(2, '0'),
    monthShort = 'Th' + (dObj.getMonth() + 1),
    costAmount = passed ? Number(s.passAmount || 0) : Number(s.courtCost || sessionCost(s)),
    court = state.courts.find(c => c.id === s.courtId) || state.courts.find(c => c.name === s.courtName),
    venueTitle = court ? courtLabel(court) : (s.courtName || s.note || 'Sân số 1'),
    courtNo = s.courtNumber || court?.number ? ` · Sân số ${s.courtNumber || court.number}` : '',
    collected = sessionCollected(s),
    expected = sessionExpected(s),
    pct = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : (done ? 100 : 0);

  if (passed) {
    return `
      <div class="session-card-wrap">
        <article class="session-card session-passed-card">
          <div class="session-row">
            <div class="date-chip neutral-chip">
              <span class="chip-weekday">${esc(weekday)}</span>
              <b>${esc(dayNum)}</b>
              <small>${esc(monthShort)}</small>
            </div>
            <div class="session-info">
              <div class="session-title-line">
                <strong>${esc(s.start)} – ${esc(s.end)}</strong>
                <span class="status-pill warning">Đã nhường sân</span>
              </div>
              <div class="session-location">
                <b>📍 ${esc(venueTitle)}${esc(courtNo)}</b>
              </div>
              <div class="passed-income-box">
                <span>🤝 Thu tiền nhường sân: <b>+${fmt(costAmount)}</b></span>
                <span class="status-pill success">Đã cộng quỹ</span>
              </div>
            </div>
            <button type="button" class="session-chev" data-edit-session="${esc(s.id)}" aria-label="Sửa buổi">⋯</button>
          </div>
        </article>
      </div>`;
  }

  const slotRemaining = Math.max(0, 8 - totalPresent);
  return `
    <div class="session-card-wrap">
      <article class="session-card">
        <div class="session-row">
          <div class="date-chip">
            <span class="chip-weekday">${esc(weekday)}</span>
            <b>${esc(dayNum)}</b>
            <small>${esc(monthShort)}</small>
          </div>
          <div class="session-info">
            <div class="session-title-line">
              <strong>${esc(s.start)} – ${esc(s.end)}</strong>
              <span class="status-pill success">Buổi của team</span>
            </div>
            <div class="session-location">
              <b>📍 ${esc(venueTitle)}${esc(courtNo)}</b>
              ${(s.courtAddress || court?.address) ? `<span>${esc(s.courtAddress || court.address)}</span>` : ''}
            </div>
          </div>
          <button type="button" class="session-chev" data-edit-session="${esc(s.id)}" aria-label="Sửa buổi">⋯</button>
        </div>

        <div class="session-financial-box">
          <div class="fin-top-row">
            <span>Đã thu tại sân:</span>
            <strong><b class="text-primary">${fmt(collected)}</b> <span class="text-muted">/ ${fmt(expected)}</span></strong>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="fin-sub-row">
            <span>Chi phí sân (trả cuối tháng):</span>
            <strong>${fmt(costAmount)}</strong>
          </div>
        </div>

        <div class="session-bottom">
          <div class="attendee-meta-col">
            <span class="attendee-badge-blue">👥 <b>${totalPresent}/8 người</b> (${fixedCount} cố định, ${guestCount} khách)</span>
            ${slotRemaining > 0 && slotRemaining < 8 ? `<small class="slot-warning-dot">● Còn trống ${slotRemaining} suất đánh</small>` : ''}
          </div>
          <div class="session-actions">
            <button type="button" class="mini-btn" data-attendance="${esc(s.id)}">
              ${done ? '✓ Điểm danh & Thu tiền' : 'Điểm danh & Thu tiền'}
            </button>
          </div>
        </div>
      </article>
    </div>`;
}

let memberMonth = monthKey(today());
function memberAttendanceCount(memberId, mk) {
  return state.sessions.filter(s =>
    s.status !== 'passed' &&
    s.date <= today() &&
    monthKey(s.date) === mk &&
    (s.attendees || []).some(a => !a.guest && a.memberId === memberId && a.presence === 'present')
  ).length;
}

let transactionFilter = 'all';
let activeFilter = 'upcoming';
let casualFilter = 'all';
let financeCursor = new Date();
financeCursor.setDate(1);

// 6. Main Render Function
function render() {
  const now = today(), thisMonth = monthKey(now);

  // Topbar Mode & Context Label
  const isCasual = state.activeMode === 'casual';
  if ($('topbarModeEyebrow')) {
    $('topbarModeEyebrow').textContent = isCasual ? 'CHẾ ĐỘ KÈO LẺ PHÁT SINH' : 'SÂN CẦU CỐ ĐỊNH';
    $('topbarModeEyebrow').className = isCasual ? 'topbar-eyebrow casual-eyebrow' : 'topbar-eyebrow';
  }
  if ($('contextSwitcherIcon')) $('contextSwitcherIcon').textContent = isCasual ? '⚡' : '🏸';
  if ($('contextSwitcherLabel')) $('contextSwitcherLabel').textContent = isCasual ? 'Kèo Vãng Lai' : (state.teamName || 'Team T3 – T5');
  if ($('topbarCreateCasualBtn')) $('topbarCreateCasualBtn').hidden = !isCasual;
  if ($('mainTabbar')) $('mainTabbar').hidden = isCasual;

  if (isCasual) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    $('casualView')?.classList.add('active');
    renderCasualHub();
    return;
  } else if ($('casualView')?.classList.contains('active')) {
    $('casualView').classList.remove('active');
    $('dashboardView')?.classList.add('active');
  }

  // Dashboard Tab
  $('todayLabel').textContent = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
  if ($('heroTeamName')) $('heroTeamName').textContent = state.teamName || 'Team Thứ 3 & Thứ 5';
  if ($('dashboardScheduleHint')) $('dashboardScheduleHint').textContent = state.scheduleHint || 'Lịch đánh định kỳ hàng tuần';

  // Avatar stack on Hero Card
  if ($('heroAvatarStack')) {
    const previewMembers = state.members.slice(0, 4);
    const extra = Math.max(0, state.members.length - previewMembers.length);
    $('heroAvatarStack').innerHTML = previewMembers.map(m => {
      const initials = m.name.trim().split(/\s+/).slice(-2).map(w => w[0] || '').join('').toUpperCase();
      return `<span class="stack-avatar ${m.gender === 'female' ? 'female' : ''}" title="${esc(m.name)}">${esc(initials || 'TV')}</span>`;
    }).join('') + (extra > 0 ? `<span class="stack-avatar more">+${extra}</span>` : '');
  }
  if ($('heroMemberCount')) $('heroMemberCount').textContent = `${state.members.length} thành viên`;

  const curBalance = balance();
  $('balanceValue').textContent = fmt(curBalance);
  $('financeBalance').textContent = fmt(curBalance);
  $('monthSummary').textContent = monthLabel(thisMonth);

  const totalInc = incomeTotal() + monthlyReceiptsTotal();
  const totalExp = expenseTotal();
  $('monthIncome').textContent = '+' + fmt(totalInc);
  $('monthExpense').textContent = '−' + fmt(totalExp);

  // Unpaid List on Dashboard
  const unpaid = [];
  for (const s of state.sessions) {
    if (s.status === 'passed') continue;
    for (const a of s.attendees || []) {
      if (charge(a) > 0 && !a.paid && !isMonthlyAttendee(a)) {
        unpaid.push({ a, s, index: s.attendees.indexOf(a) });
      }
    }
  }
  if ($('unpaidCountTitle')) $('unpaidCountTitle').textContent = `(${unpaid.length})`;
  if ($('unpaidBadge')) {
    $('unpaidBadge').textContent = unpaid.length ? `${unpaid.length} chưa đóng` : 'Đã thu đủ';
    $('unpaidBadge').className = unpaid.length ? 'status-pill error' : 'status-pill success';
  }
  $('unpaidList').innerHTML = unpaid.length
    ? unpaid.slice(0, 6).map(({ a, s, index }) => `
      <div class="unpaid-row">
        <label class="unpaid-check-label">
          <input type="checkbox" class="quick-paid" data-session="${esc(s.id)}" data-attendee-index="${index}" aria-label="Đã thanh toán: ${esc(memberName(a))} · ${shortDate(s.date)}">
          <div class="person">
            <div class="person-avatar ${a.gender === 'female' ? 'female' : ''}">${a.gender === 'female' ? '♀' : '♂'}</div>
            <div>
              <strong>${esc(memberName(a))}</strong>
              <small>${viDate(s.date)} · ${a.guest ? 'Khách vãng lai' : 'Thành viên'}</small>
            </div>
          </div>
        </label>
        <div class="unpaid-payment">
          <span class="amount text-error">${fmt(charge(a))}</span>
        </div>
      </div>`).join('')
    : '<div class="empty">Tuyệt vời! Chưa có khoản phí nào tồn đọng 🎉</div>';

  // Upcoming Sessions on Dashboard
  const future = [...state.sessions].filter(s => s.date >= now).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  $('nextSessions').innerHTML = future.length
    ? future.map(makeSessionCard).join('')
    : '<div class="empty">Chưa có buổi sắp tới. Vào tab Buổi chơi để tạo lịch mới nhé.</div>';

  // All Sessions on Tab 2
  const sorted = [...state.sessions].sort((a, b) => a.date.localeCompare(b.date));
  const shown = sorted.filter(s => activeFilter === 'all' || (activeFilter === 'past' ? s.date < now : s.date >= now));
  $('allSessions').innerHTML = shown.length
    ? shown.map(makeSessionCard).join('')
    : '<div class="empty">Không có buổi chơi trong mục này.</div>';

  // Members Tab (Tab 3)
  $('memberMonth').value = memberMonth;
  $('memberAttendanceHint').textContent = 'ℹ️ Số buổi thực tế có mặt trên sân trong ' + monthLabel(memberMonth) + ' (không tính đăng ký nhưng vắng)';
  $('memberCount').textContent = `${state.members.length} cố định`;
  if ($('memberCountHeading')) $('memberCountHeading').textContent = `(${state.members.length})`;

  // Monthly attendance analytics
  const occurredInMonth = state.sessions.filter(s => s.status !== 'passed' && s.date <= now && monthKey(s.date) === memberMonth);
  const totalTurns = state.members.reduce((sum, m) => sum + memberAttendanceCount(m.id, memberMonth), 0);
  const avgTurns = occurredInMonth.length ? (totalTurns / occurredInMonth.length).toFixed(1) : '0.0';
  const maxPossible = occurredInMonth.length * Math.max(1, Math.min(8, state.members.length));
  const attRate = occurredInMonth.length ? Math.min(100, Math.round((totalTurns / maxPossible) * 100)) : 100;
  if ($('statTotalTurns')) $('statTotalTurns').textContent = String(totalTurns);
  if ($('statAvgPerSession')) $('statAvgPerSession').textContent = avgTurns;
  if ($('statAttendanceRate')) $('statAttendanceRate').textContent = `${attRate}%`;

  $('membersList').innerHTML = state.members.length
    ? state.members.map(m => {
        const count = memberAttendanceCount(m.id, memberMonth);
        const isMonthly = m.paymentMode === 'monthly';
        return `
          <div class="member-row" data-edit-member="${esc(m.id)}">
            <div class="person">
              <div class="person-avatar ${m.gender === 'female' ? 'female' : ''}">${m.gender === 'female' ? '♀' : '♂'}</div>
              <div class="member-info-stack">
                <strong>${esc(m.name)}</strong>
                <small>${m.phone ? esc(m.phone) : 'Thành viên cố định'}</small>
                <div class="member-badges-row">
                  <span class="status-pill success">${count} buổi tham gia</span>
                  <span class="status-pill ${isMonthly ? 'secondary' : 'neutral'}">${isMonthly ? 'Đóng cuối tháng' : 'Đóng từng buổi'}</span>
                </div>
              </div>
            </div>
            <div class="member-right">
              <span class="gender-tag ${m.gender === 'female' ? 'female' : ''}">${m.gender === 'female' ? 'Nữ' : 'Nam'}</span>
              <span class="session-chev">⋮</span>
            </div>
          </div>`;
      }).join('')
    : '<div class="empty">Danh bạ đang trống. Hãy bấm "+ Thêm" hoặc dùng khung Nhập nhanh bên dưới.</div>';

  renderFinance();
}

function monthlyCourtEstimate(month) {
  if (month === '2026-10') {
    let count = 0;
    for (let day = 1; day <= 31; day++) {
      const weekday = new Date(2026, 9, day, 12).getDay();
      if (weekday === 2 || weekday === 4) count++;
    }
    return { count, hours: count * 2, amount: count * 2 * 75000, fixed: true };
  }
  const sessions = state.sessions.filter(s => monthKey(s.date) === month);
  return {
    count: sessions.length,
    hours: sessions.reduce((n, s) => n + Number(s.courtHours ?? sessionHours(s)), 0),
    amount: sessions.reduce((n, s) => n + (s.courtRate != null ? sessionCost(s) : Number(s.courtCost ?? sessionCost(s))), 0)
  };
}

function renderFinance() {
  if ($('maleFee')) $('maleFee').value = state.fees.male;
  if ($('femaleFee')) $('femaleFee').value = state.fees.female;
  const mk = monthKey(localDate(financeCursor));
  $('financeMonth').textContent = monthLabel(mk);

  const courtEstimate = monthlyCourtEstimate(mk);
  $('courtEstimateTitle').textContent = 'Tiền sân tạm tính · ' + monthLabel(mk);
  $('courtEstimateAmount').textContent = fmt(courtEstimate.amount);
  $('courtEstimateDetail').textContent = 'ℹ️ ' + courtEstimate.count + ' buổi · ' + courtEstimate.hours.toLocaleString('vi-VN') + ' giờ · ' +
    (courtEstimate.fixed ? 'Tất cả thứ 3 và thứ 5, 2 giờ/buổi × 75.000 ₫/giờ. ' : 'Theo lịch trong tháng. ') +
    'Sẵn sàng trích quỹ trả chủ sân cuối tháng.';

  $('openingSummary').textContent = `Số dư đầu kỳ: ${fmt(state.opening)}`;

  const ins = incomeTotal() + monthlyReceiptsTotal();
  const outs = expenseTotal();
  $('financeIncome').textContent = '+' + fmt(ins);
  $('financeExpense').textContent = '−' + fmt(outs);

  let trans = state.monthlyReceipts
    .map(r => ({ date: r.date || today(), label: 'Thu phí cuối tháng · ' + r.name, detail: monthLabel(r.month), amount: Number(r.amount || 0), badge: 'ĐÃ NHẬN VÍ' }));

  for (const s of state.sessions) {
    if (s.status === 'passed' && Number(s.passAmount || 0) > 0) {
      trans.push({ date: s.passDate || s.date, label: 'Thu tiền nhường sân', detail: `Buổi ${shortDate(s.date)}`, amount: Number(s.passAmount), badge: 'CHUYỂN KHOẢN' });
    } else if (s.status !== 'passed') {
      for (const a of s.attendees || []) {
        const amt = attendeePaidAmount(a);
        if (amt > 0) {
          trans.push({
            date: a.paidDate || s.date,
            label: `Phí · ${memberName(a)}`,
            detail: `Buổi ${shortDate(s.date)}${a.guest ? ' · Khách' : ''}`,
            amount: amt,
            badge: 'ĐÃ THU'
          });
        }
      }
    }
  }
  for (const e of state.expenses) {
    if (Number(e.amount || 0) > 0) {
      trans.push({
        date: e.date || today(),
        label: e.type === 'shuttle' ? (e.note || 'Mua cầu') : e.type === 'court' ? (e.note || 'Tiền sân') : (e.note || 'Khoản chi'),
        detail: e.type === 'shuttle' ? 'Chi phí cầu' : e.type === 'court' ? 'Thanh toán sân' : 'Chi phí team',
        amount: -Number(e.amount),
        type: e.type,
        badge: 'ĐÃ THANH TOÁN'
      });
    }
  }

  trans = trans.filter(t => transactionFilter === 'all' || (transactionFilter === 'income' ? t.amount > 0 : t.amount < 0));
  trans.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  $('transactions').innerHTML = trans.length
    ? trans.map(t => `
      <div class="transaction-row">
        <div class="transaction-icon ${t.amount < 0 ? 'out' : ''}">
          ${t.type === 'shuttle'
            ? '<img class="figma-icon" src="icons/badminton.svg" alt="">'
            : t.amount < 0
              ? '<img class="figma-icon" src="icons/wallet.svg" alt="">'
              : '<img class="figma-icon" src="icons/cash-multiple.svg" alt="">'}
        </div>
        <div class="transaction-label">
          <strong>${esc(t.label)}</strong>
          <small>${shortDate(t.date)} · ${esc(t.detail)}</small>
        </div>
        <div class="transaction-right-col">
          <span class="transaction-amount ${t.amount < 0 ? 'out' : ''}">${t.amount < 0 ? '−' : '+'}${fmt(Math.abs(t.amount))}</span>
          <small class="tx-sub-badge ${t.amount < 0 ? 'out' : 'in'}">${esc(t.badge || '')}</small>
        </div>
      </div>`).join('')
    : '<div class="empty">Chưa có giao dịch nào được ghi nhận.</div>';
}

function setView(name) {
  if (name === 'casual') {
    state.activeMode = 'casual';
    save();
    window.scrollTo(0, 0);
    return;
  }
  state.activeMode = 'team';
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $(name + 'View')?.classList.add('active');
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
  document.getElementById('openSettings')?.setAttribute('aria-pressed', String(name === 'settings'));
  render();
  window.scrollTo(0, 0);
}

// 7. Context Switcher Bottom Sheet (Screen 02: Multi-Team + Casual Mode)
function openContextSwitcher() {
  syncActiveTeamToRegistry();
  const isCasual = state.activeMode === 'casual';
  if ($('contextTeamCountLabel')) $('contextTeamCountLabel').textContent = `${state.teams.length} CLB`;

  $('contextTeamList').innerHTML = state.teams.map(t => {
    const active = !isCasual && t.id === state.activeTeamId;
    const teamBal = t.id === state.activeTeamId ? balance() : computeTeamBalance(t);
    const memCount = (t.id === state.activeTeamId ? state.members : (t.members || [])).length;
    return `
      <button type="button" class="context-team-card ${active ? 'active' : ''}" data-switch-team="${esc(t.id)}">
        <div class="context-card-icon ${active ? 'green' : 'neutral'}">🏸</div>
        <div class="context-card-body">
          <div class="context-card-title-wrap">
            <strong>${esc(t.name)}</strong>
            ${active ? '<span class="status-pill primary-solid">HIỆN TẠI</span>' : ''}
          </div>
          <p>${memCount} thành viên · Quỹ: <b class="text-primary">${fmt(teamBal)}</b></p>
        </div>
        <span class="context-check-circle ${active ? 'checked' : ''}">${active ? '✓' : ''}</span>
      </button>`;
  }).join('');

  $('switchCasualModeBtn')?.classList.toggle('active-casual', isCasual);
  $('contextDialog')?.showModal();
}

$('contextSwitcherBtn')?.addEventListener('click', openContextSwitcher);
$('heroSwitchTeamBtn')?.addEventListener('click', openContextSwitcher);

$('contextTeamList')?.addEventListener('click', e => {
  const btn = e.target.closest('[data-switch-team]');
  if (!btn) return;
  $('contextDialog')?.close();
  switchTeam(btn.dataset.switchTeam);
});

$('switchCasualModeBtn')?.addEventListener('click', () => {
  $('contextDialog')?.close();
  state.activeMode = 'casual';
  save();
  showToast('Đã chuyển sang Chế độ Kèo Vãng Lai (Độc lập 0đ dư)');
});

$('openCreateTeamBtn')?.addEventListener('click', () => {
  $('contextDialog')?.close();
  $('teamForm')?.reset();
  $('newTeamMaleFee').value = 45000;
  $('newTeamFemaleFee').value = 40000;
  $('newTeamOpening').value = 0;
  $('teamDialog')?.showModal();
});

$('teamForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const name = $('newTeamName').value.trim();
  if (!name) return;
  syncActiveTeamToRegistry();
  const newId = 'team-' + id();
  const newTeam = {
    id: newId,
    name,
    scheduleHint: $('newTeamSchedule').value.trim() || 'Lịch sinh hoạt cố định hàng tuần',
    fees: {
      male: Number($('newTeamMaleFee').value) || 45000,
      female: Number($('newTeamFemaleFee').value) || 40000
    },
    opening: Number($('newTeamOpening').value) || 0,
    openingDate: today(),
    courtRate: 75000,
    members: [],
    sessions: [],
    expenses: [],
    monthlyReceipts: []
  };
  state.teams.push(newTeam);
  $('teamDialog')?.close();
  switchTeam(newId);
});

// 8. Courts & Sessions CRUD
function updateSessionStatusFields() {
  const passed = $('sessionStatus').value === 'passed';
  $('passAmountField').hidden = !passed;
  $('courtHours').disabled = passed;
  $('courtHourlyRate').disabled = passed;
  updateCourtCost();
}
function renderCourtOptions(selected = 'court-default') {
  const select = $('sessionCourt');
  select.innerHTML = state.courts.map(c => `<option value="${esc(c.id)}">${esc(courtLabel(c))}</option>`).join('') + '<option value="__add__">＋ Thêm sân</option>';
  select.value = state.courts.some(c => c.id === selected) ? selected : (state.courts.find(c => c.name === (selected || ''))?.id || 'court-default');
  select.dataset.previous = select.value;
}
function openCourt(court = null) {
  $('courtForm').reset();
  $('courtId').value = court?.id || '';
  $('courtDialogTitle').textContent = court ? 'Sửa thông tin sân' : 'Thêm sân mới';
  $('saveCourt').textContent = court ? 'Lưu thông tin sân' : 'Thêm sân';
  $('courtName').value = court?.name || '';
  $('courtAddress').value = court?.address || '';
  $('courtNumber').value = court?.number || '';
  $('courtDialog').showModal();
}
function saveCourt(e) {
  e.preventDefault();
  const courtId = $('courtId').value,
    name = $('courtName').value.trim(),
    address = $('courtAddress').value.trim(),
    number = $('courtNumber').value.trim();
  if (!name || !address || !number) {
    showToast('Hãy nhập tên, địa chỉ và số sân');
    return;
  }
  const existing = state.courts.find(c =>
    c.id !== courtId &&
    c.name.toLocaleLowerCase() === name.toLocaleLowerCase() &&
    c.address.toLocaleLowerCase() === address.toLocaleLowerCase() &&
    c.number.toLocaleLowerCase() === number.toLocaleLowerCase()
  );
  if (existing) {
    if (courtId) {
      showToast('Thông tin trùng với sân đã có');
      return;
    }
    $('courtDialog').close();
    renderCourtOptions(existing.id);
    showToast('Sân này đã có trong danh sách');
    return;
  }
  let court;
  if (courtId) {
    court = state.courts.find(c => c.id === courtId);
    if (!court) return;
    Object.assign(court, { name, address, number });
    for (const s of state.sessions) {
      if (s.courtId === courtId) {
        s.courtName = name;
        s.courtAddress = address;
        s.courtNumber = number;
      }
    }
  } else {
    court = { id: id(), name, address, number };
    state.courts.push(court);
  }
  $('courtDialog').close();
  save();
  renderCourtOptions(court.id);
  showToast(courtId ? 'Đã cập nhật thông tin sân' : 'Đã thêm sân');
}
function openSession(s = null) {
  $('sessionForm').reset();
  renderCourtOptions(s?.courtId || s?.courtName || s?.note || 'court-default');
  $('sessionId').value = s?.id || '';
  $('sessionDialogTitle').textContent = s ? 'Sửa buổi chơi' : 'Tạo buổi chơi';
  $('sessionDate').value = s?.date || today();
  $('sessionStart').value = s?.start || '17:30';
  $('sessionEnd').value = s?.end || '19:30';
  $('sessionStatus').value = s?.status || 'played';
  $('passAmount').value = s?.passAmount || 0;
  const duration = s ? Number(s.courtHours ?? sessionHours(s)) : 2,
    hours = COURT_HOURS.includes(duration) ? duration : 2;
  $('courtHours').value = String(hours);
  $('courtHourlyRate').value = s?.courtRate ?? (s?.courtCost != null ? s.courtCost / hours : state.courtRate);
  $('deleteSession').hidden = !s;
  updateSessionStatusFields();
  $('sessionDialog').showModal();
}

// 9. Screen 03: Unified Attendance & On-Court Payment Collection
let attendanceActiveTab = 'fixed';
function openAttendance(s) {
  $('attendanceDialog').dataset.session = s.id;
  $('attendanceTitle').textContent = viDate(s.date);
  const court = state.courts.find(c => c.id === s.courtId) || state.courts.find(c => c.name === s.courtName);
  const courtText = court ? `${courtLabel(court)}${court.number ? ` (Sân ${court.number})` : ''}` : (s.courtName || 'Sân số 1');
  $('attendanceMeta').innerHTML = `
    <div class="meta-line-1">🕒 ${esc(s.start)} – ${esc(s.end)} &nbsp;•&nbsp; 📍 ${esc(courtText)}</div>
    <div class="meta-line-2">👥 Tối đa 8 người</div>
  `;
  $('attendanceRows').innerHTML = '';
  attendanceActiveTab = 'fixed';
  document.querySelectorAll('.attendance-tab').forEach(tab => {
    const selected = tab.dataset.attendanceTab === 'fixed';
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
  });

  let records = Array.isArray(s.attendees)
    ? s.attendees.map(a => ({
        ...a,
        presence: a.guest ? 'present' : (a.presence === 'none' || !a.presence ? 'not_attending' : a.presence),
        paid: a.guest ? a.paid !== false : Boolean(a.paid && a.presence === 'present')
      }))
    : [];
  const ids = new Set(records.filter(a => !a.guest).map(a => a.memberId));
  for (const m of state.members) {
    if (!ids.has(m.id)) {
      records.push({
        memberId: m.id,
        name: m.name,
        gender: m.gender,
        guest: false,
        presence: 'not_attending',
        paid: false,
        monthlyPayment: m.paymentMode === 'monthly'
      });
    }
  }
  $('attendanceDialog').dataset.rows = JSON.stringify(records);
  renderAttendanceRows(records);
  updateAttendance();
  $('attendanceDialog').showModal();
}

function renderAttendanceRows(records) {
  const visible = records.map((a, i) => ({ a, i })).filter(({ a }) => attendanceActiveTab === 'guest' ? a.guest : !a.guest);
  $('attendanceRows').innerHTML = '';
  if (attendanceActiveTab === 'guest') {
    $('attendanceRows').insertAdjacentHTML('beforeend', '<button type="button" class="attendance-add-row" id="addGuest">＋ Thêm khách vãng lai</button>');
  }
  if (!visible.length) {
    $('attendanceRows').insertAdjacentHTML('beforeend', `<div class="attendance-empty">${attendanceActiveTab === 'guest' ? 'Chưa có khách vãng lai trong buổi này.' : 'Không có thành viên cố định.'}</div>`);
    return;
  }

  visible.forEach(({ a, i }) => {
    const memberObj = state.members.find(m => m.id === a.memberId);
    const isMonthly = Boolean(!a.guest && (a.monthlyPayment || memberObj?.paymentMode === 'monthly'));
    const feeVal = recordedFee(a);
    const isPresent = a.presence === 'present';
    const isAbsentExcused = a.presence === 'absent';

    let paymentSubRow = '';
    if (a.guest) {
      paymentSubRow = `
        <div class="player-card-foot">
          <span>Tiền khách chuyển trước</span>
          <label class="paid-toggle-pill ${a.paid !== false ? 'paid' : 'unpaid'}">
            <input type="checkbox" class="att-paid-check" data-paid-index="${i}" ${a.paid !== false ? 'checked' : ''}>
            <span>${a.paid !== false ? '✓ Đã thu' : 'Chưa thu'}</span>
          </label>
        </div>`;
    } else if (!isPresent) {
      paymentSubRow = `
        <div class="player-card-foot muted-foot">
          <span>${isAbsentExcused ? 'Vắng có báo · Miễn thu hôm nay' : 'Không tham gia buổi này'}</span>
          <strong>0 ₫</strong>
        </div>`;
    } else if (isMonthly) {
      paymentSubRow = `
        <div class="player-card-foot">
          <span>Hình thức thanh toán</span>
          <span class="status-pill secondary">🏢 Ghi sổ tháng</span>
        </div>`;
    } else {
      paymentSubRow = `
        <div class="player-card-foot">
          <span>Trạng thái phí sân</span>
          <label class="paid-toggle-pill ${a.paid ? 'paid' : 'unpaid'}">
            <input type="checkbox" class="att-paid-check" data-paid-index="${i}" ${a.paid ? 'checked' : ''}>
            <span>${a.paid ? '✓ Đã đóng' : '⏳ Chưa đóng'}</span>
          </label>
        </div>`;
    }

    $('attendanceRows').insertAdjacentHTML('beforeend', `
      <div class="attendance-player-card attendance-row ${!isPresent && !a.guest ? 'is-absent' : ''}" data-index="${i}">
        <div class="player-card-main">
          <div class="person">
            <div class="person-avatar ${a.gender === 'female' ? 'female' : ''}">${a.gender === 'female' ? '♀' : '♂'}</div>
            <div class="attendance-name">
              <div class="player-name-row">
                <strong>${esc(memberName(a))}</strong>
                ${a.guest ? '<span class="status-pill secondary">Vãng lai</span>' : ''}
              </div>
              <small>
                <b class="${a.gender === 'female' ? 'text-female' : 'text-secondary'}">${a.gender === 'female' ? 'Nữ' : 'Nam'}</b>
                &nbsp;•&nbsp; ${isMonthly ? '<i>Đóng cuối tháng</i>' : `<b>${fmt(feeVal)}</b>`}
                ${a.guest ? ' &nbsp;•&nbsp; <b class="text-success">Thu trước</b>' : ''}
              </small>
            </div>
          </div>
          ${a.guest
            ? `<button type="button" class="guest-remove-btn" data-remove-guest="${i}" title="Xóa khách">×</button>`
            : `<select class="presence-select ${isPresent ? 'present-active' : ''}" aria-label="Điểm danh">
                <option value="present" ${a.presence === 'present' ? 'selected' : ''}>Có mặt</option>
                <option value="not_attending" ${a.presence === 'not_attending' ? 'selected' : ''}>Không tham gia</option>
                <option value="absent" ${a.presence === 'absent' ? 'selected' : ''}>Vắng có báo</option>
              </select>`}
        </div>
        ${paymentSubRow}
      </div>
    `);
  });
}

function readRows() {
  return JSON.parse($('attendanceDialog').dataset.rows || '[]');
}

function updateAttendance(rerenderList = false) {
  const rows = readRows();
  document.querySelectorAll('#attendanceRows .attendance-row').forEach(r => {
    const i = Number(r.dataset.index),
      control = r.querySelector('.presence-select'),
      paidCheck = r.querySelector('.att-paid-check');
    if (rows[i] && control) {
      const prev = rows[i].presence;
      rows[i].presence = control.value;
      if (prev !== control.value) rerenderList = true;
    }
    if (rows[i] && paidCheck) {
      const prevPaid = Boolean(rows[i].paid);
      rows[i].paid = paidCheck.checked;
      if (prevPaid !== paidCheck.checked) rerenderList = true;
    }
    if (rows[i] && !rows[i].guest && rows[i].presence !== 'present') {
      rows[i].paid = false;
      rows[i].paidAmount = 0;
      rows[i].paidDate = null;
    }
  });
  $('attendanceDialog').dataset.rows = JSON.stringify(rows);
  if (rerenderList) {
    renderAttendanceRows(rows);
  }

  const present = rows.filter(a => a.guest || a.presence === 'present');
  const women = present.filter(a => a.gender === 'female').length;
  const registered = present,
    fixedCount = present.filter(a => !a.guest).length,
    guestCount = present.filter(a => a.guest).length;

  $('fixedTabCount').textContent = rows.filter(a => !a.guest).length;
  $('guestTabCount').textContent = rows.filter(a => a.guest).length;
  if ($('attendancePresentBadge')) $('attendancePresentBadge').textContent = `${present.length}/8`;
  $('markAllPresent').hidden = attendanceActiveTab === 'guest';
  $('genderWarning').hidden = women === 0 || women % 2 === 0;

  const expectedNow = rows.reduce((sum, a) => {
    if (isMonthlyAttendee(a)) return sum;
    return sum + charge(a);
  }, 0);

  const collectedNow = rows.reduce((sum, a) => sum + attendeePaidAmount(a), 0);

  const pct = expectedNow > 0 ? Math.min(100, Math.round((collectedNow / expectedNow) * 100)) : 0;

  $('attendanceTotal').innerHTML = `
    <div class="att-summary-row">
      <span>Sĩ số buổi cầu</span>
      <strong><b>${present.length}/8 người</b> (${fixedCount} cố định, ${guestCount} khách)</strong>
    </div>
    <div class="att-summary-row">
      <span>Đã thu tại sân</span>
      <strong><b class="text-primary">${fmt(collectedNow)}</b> <span class="text-muted">/ ${fmt(expectedNow)}</span></strong>
    </div>
    <div class="progress-track">
      <div class="progress-fill" style="width:${pct}%"></div>
    </div>
  `;

  const reserved = registered.length;
  document.querySelectorAll('#attendanceRows .presence-select').forEach(sel => {
    const i = Number(sel.closest('.attendance-row').dataset.index);
    Array.from(sel.options).forEach(opt => {
      if (opt.value === 'present') {
        opt.disabled = reserved >= 8 && rows[i].presence !== 'present';
      }
    });
  });
}

$('editSessionFromAttendanceBtn')?.addEventListener('click', () => {
  const sid = $('attendanceDialog').dataset.session;
  const s = state.sessions.find(x => x.id === sid);
  $('attendanceDialog').close();
  if (s) openSession(s);
});

// Keep Legacy Payment Dialog working seamlessly if invoked
function openPayment(s) {
  openAttendance(s);
}

// 10. Members & Bulk Add (Inline + Modal)
function openMember(m = null) {
  $('memberForm').reset();
  $('memberId').value = m?.id || '';
  $('memberDialogTitle').textContent = m ? 'Sửa thành viên' : 'Thêm thành viên';
  $('memberName').value = m?.name || '';
  $('memberGender').value = m?.gender || 'male';
  $('memberPhone').value = m?.phone || '';
  $('memberPaymentMode').value = m?.paymentMode || 'per_session';
  $('deleteMember').hidden = !m;
  $('memberDialog').showModal();
}

function parseBulkLines(rawText) {
  const normalizeName = x => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLocaleLowerCase().trim();
  const existing = new Set(state.members.map(m => normalizeName(m.name))),
    seen = new Set(),
    valid = [],
    duplicates = [],
    invalid = [];
  for (const [index, line] of (rawText || '').split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const fields = line.split(/[|,;\t]/).map(x => x.trim()),
      name = fields[0] || '',
      rawGender = (fields[1] || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase(),
      gender = ['nu', 'female', 'f'].includes(rawGender) ? 'female' : ['nam', 'male', 'm'].includes(rawGender) ? 'male' : null;
    if (!name || !gender) {
      invalid.push({ line: index + 1, text: line.trim() });
      continue;
    }
    const key = normalizeName(name);
    if (existing.has(key) || seen.has(key)) {
      duplicates.push({ line: index + 1, text: name });
      continue;
    }
    seen.add(key);
    valid.push({ name, gender, phone: fields[2] || '' });
  }
  return { valid, duplicates, invalid };
}

function bulkMemberPlan() {
  return parseBulkLines($('bulkMembersInput').value);
}

function updateBulkMembersPreview() {
  const plan = bulkMemberPlan();
  const notes = [
    `Sẽ thêm ${plan.valid.length} · Trùng tên bỏ qua ${plan.duplicates.length} · Dòng cần sửa ${plan.invalid.length}`,
    ...plan.invalid.slice(0, 4).map(x => `Dòng ${x.line}: cần tên và giới tính Nam/Nữ`),
    ...plan.duplicates.slice(0, 4).map(x => `Dòng ${x.line}: ${x.text} đã có trong danh bạ hoặc bị lặp`)
  ];
  $('bulkMembersPreview').textContent = notes.join('\n');
  $('saveBulkMembers').disabled = !plan.valid.length;
}

// Inline Bulk Add on Members Tab
$('inlineBulkInput')?.addEventListener('input', () => {
  const plan = parseBulkLines($('inlineBulkInput').value);
  if ($('inlineBulkStatus')) {
    $('inlineBulkStatus').textContent = `Sẽ thêm ${plan.valid.length} · Trùng bỏ qua ${plan.duplicates.length}`;
  }
});
$('fillSampleBulkBtn')?.addEventListener('click', () => {
  if (!$('inlineBulkInput')) return;
  $('inlineBulkInput').value = 'Hoàng Đức Huy | Nam | 0933221455\nĐỗ Thùy Trang | Nữ | 0918889001\nVũ Tuấn Kiệt | Nam | 0903555777';
  $('inlineBulkInput').dispatchEvent(new Event('input'));
});
$('inlineBulkSubmitBtn')?.addEventListener('click', () => {
  const plan = parseBulkLines($('inlineBulkInput')?.value || '');
  if (!plan.valid.length) {
    showToast('Hãy nhập ít nhất 1 dòng hợp lệ theo cú pháp: Tên | Nam/Nữ | SĐT');
    return;
  }
  for (const row of plan.valid) {
    state.members.push({ id: id(), name: row.name, gender: row.gender, phone: row.phone, paymentMode: 'per_session' });
  }
  $('inlineBulkInput').value = '';
  $('inlineBulkInput').dispatchEvent(new Event('input'));
  save();
  showToast(`Đã thêm nhanh ${plan.valid.length} thành viên vào danh bạ`);
});
$('openBulkModalLink')?.addEventListener('click', () => $('addMembersBulk')?.click());

// 11. Casual Match Mode (Screens 05, 06, 07 — 100% Standalone 0đ Surplus)
function parseMoney(val) {
  if (val == null) return 0;
  if (typeof val === 'number') {
    return val > 0 && val < 1000 ? val * 1000 : val;
  }
  let str = String(val).trim().toLowerCase().replace(/[đ₫]/g, '');
  if (str.endsWith('k')) {
    const n = parseFloat(str.slice(0, -1).replace(/[.,\s]/g, ''));
    return (n || 0) * 1000;
  }
  const digitsOnly = str.replace(/[^\d]/g, '');
  const num = Number(digitsOnly) || 0;
  return num > 0 && num < 1000 ? num * 1000 : num;
}

function fmtInputMoney(n) {
  const num = parseMoney(n);
  return num ? new Intl.NumberFormat('vi-VN').format(num) : '0';
}

function casualPlayerName(p, idx) {
  if (p && p.name && p.name.trim()) return p.name.trim();
  if (idx === 0) return 'Người chơi 1 (Bạn)';
  return `Người chơi ${idx != null ? idx + 1 : ''}`.trim();
}

function generateCasualRemind(m) {
  if (!m) return '';
  const d = parseDate(m.date || today());
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const weekday = dayNames[d.getDay()] || 'CN';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dateStr = `${weekday} ${day}/${month}`;

  let court = String(m.courtName || '').trim();
  if (court && !court.toLowerCase().startsWith('sân')) {
    court = 'sân ' + court;
  }
  court = court || 'sân cầu lông';

  let addr = String(m.courtAddress || '').trim();

  let num = String(m.courtNumber || '').trim();
  if (num) {
    if (!num.toLowerCase().startsWith('sân')) {
      num = 'sân số ' + num;
    }
  }

  const parts = [];
  if (m.timeRange && m.timeRange.trim()) {
    parts.push(m.timeRange.trim());
  }
  parts.push(dateStr);
  parts.push(court);
  if (addr) parts.push(addr);
  if (num) parts.push(num);

  return parts.join(', ') + ' nha mn';
}

function generateCasualZaloBill(m) {
  const calc = calcCasualSplit(m);
  const shortK = v => {
    const num = Number(v) || 0;
    return num >= 1000 ? `${Math.round(num / 1000)}k` : `${Math.round(num)}đ`;
  };
  const costParts = [
    `Tiền sân: ${shortK(calc.courtCost)}`,
    `tiền cầu: ${shortK(calc.shuttleCost)}`
  ];
  if (calc.extraCost > 0) {
    costParts.push(`phụ phí: ${shortK(calc.extraCost)}`);
  }
  const splitLine = m.splitMode === 'equal'
    ? `Mỗi người ${shortK(calc.equalPerPerson)} nha`
    : `Mỗi người: Nam ${shortK(calc.maleFee)}, Nữ ${shortK(calc.femaleFee)} nha`;
  const lines = [
    costParts.join(', '),
    splitLine
  ];
  if (m.bankInfo && m.bankInfo.trim()) {
    lines.push(`CK: ${m.bankInfo.trim()}`);
  }
  return lines.join('\n');
}

function calcCasualSplit(match) {
  const courtCost = Math.round((Number(match.hours) || 0) * parseMoney(match.courtRate || 0));
  const shuttleCost = Math.round((Number(match.shuttleCount) || 0) * parseMoney(match.shuttlePrice || 0));
  const extraCost = Math.round(parseMoney(match.extraCost || 0));
  const totalCost = courtCost + shuttleCost + extraCost;

  const players = Array.isArray(match.players) ? match.players : [];
  const totalPlayers = players.length || 1;
  const maleCount = players.filter(p => p.gender !== 'female').length;
  const femaleCount = players.filter(p => p.gender === 'female').length;
  const discount = parseMoney(match.femaleDiscount ?? 15000);

  // Equal split rounded to nearest 1,000đ
  const equalPerPerson = Math.ceil((totalCost / totalPlayers) / 1000) * 1000;

  // Gender split (Females pay `discount` less than Males)
  let maleFee = equalPerPerson, femaleFee = equalPerPerson;
  if (maleCount > 0 && femaleCount > 0) {
    const rawMale = (totalCost + femaleCount * discount) / totalPlayers;
    maleFee = Math.ceil(rawMale / 1000) * 1000;
    femaleFee = Math.max(0, Math.round((totalCost - maleCount * maleFee) / femaleCount / 1000) * 1000);
  } else if (femaleCount > 0 && maleCount === 0) {
    femaleFee = equalPerPerson;
  }

  const mode = match.splitMode || 'equal';
  const customMale = parseMoney(match.customMale || 50000);
  const customFemale = parseMoney(match.customFemale || 35000);

  const feeForPlayer = p => {
    if (mode === 'equal') return equalPerPerson;
    if (mode === 'custom') return p.gender === 'female' ? customFemale : customMale;
    return p.gender === 'female' ? femaleFee : maleFee;
  };

  const expectedCollected = players.reduce((s, p) => s + feeForPlayer(p), 0);
  const actualCollected = players.filter(p => p.paid).reduce((s, p) => s + feeForPlayer(p), 0);

  return {
    courtCost,
    shuttleCost,
    extraCost,
    totalCost,
    maleCount,
    femaleCount,
    equalPerPerson,
    maleFee: mode === 'equal' ? equalPerPerson : mode === 'custom' ? customMale : maleFee,
    femaleFee: mode === 'equal' ? equalPerPerson : mode === 'custom' ? customFemale : femaleFee,
    feeForPlayer,
    expectedCollected,
    actualCollected
  };
}

function formatCasualVenue(m) {
  if (!m) return 'Sân cầu lông';
  const name = String(m.courtName || '').trim();
  const num = String(m.courtNumber || '').trim();
  if (name && num) {
    const formattedNum = num.toLowerCase().startsWith('sân') ? num : `Sân ${num}`;
    return `${name} · ${formattedNum}`;
  }
  if (name) return name;
  return m.venue || 'Sân cầu lông';
}

function renderCasualHub() {
  const all = [...state.casualMatches].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const openMatches = all.filter(m => m.status !== 'settled');
  const settledMatches = all.filter(m => m.status === 'settled');

  if ($('casualCountAll')) $('casualCountAll').textContent = String(all.length);
  if ($('casualCountOpen')) $('casualCountOpen').textContent = String(openMatches.length);
  if ($('casualCountSettled')) $('casualCountSettled').textContent = String(settledMatches.length);
  if ($('casualPastBadge')) $('casualPastBadge').textContent = `${settledMatches.length} trận`;

  const showOpen = casualFilter === 'all' || casualFilter === 'open';
  const showSettled = casualFilter === 'all' || casualFilter === 'settled';

  $('casualActiveList').hidden = !showOpen;
  $('casualPastHead').hidden = !showSettled;
  $('casualPastList').hidden = !showSettled;

  if (showOpen) {
    $('casualActiveList').innerHTML = openMatches.length
      ? openMatches.map(m => {
          const calc = calcCasualSplit(m);
          const paidCount = (m.players || []).filter(p => p.paid).length;
          const totalCount = (m.players || []).length;
          const pct = calc.totalCost > 0 ? Math.min(100, Math.round((calc.actualCollected / calc.totalCost) * 100)) : 0;
          const remaining = Math.max(0, calc.totalCost - calc.actualCollected);
          const avatars = (m.players || []).slice(0, 5).map((p, pIdx) =>
            `<span class="stack-avatar ${p.gender === 'female' ? 'female' : ''}">${esc((casualPlayerName(p, pIdx)[0] || 'K').toUpperCase())}</span>`
          ).join('') + (totalCount > 5 ? `<span class="stack-avatar more">+${totalCount - 5}</span>` : '');

          return `
            <article class="session-card casual-active-card">
              <div class="casual-card-top">
                <span class="status-pill secondary">● KÈO ĐANG MỞ</span>
                <span class="casual-time-label">🕒 ${esc(shortDate(m.date))} · ${esc(m.timeRange || '18:00 - 20:00')}</span>
              </div>
              <h3 class="casual-card-title">${esc(m.title)}</h3>
              <p class="casual-card-venue">📍 ${esc(formatCasualVenue(m))} &nbsp;•&nbsp; <b class="text-secondary">${totalCount} tay vợt tham gia</b></p>
              ${m.courtAddress ? `<p class="casual-card-address"><small>📍 ${esc(m.courtAddress)}</small></p>` : ''}

              <div class="casual-cost-mini-grid">
                <div><span>Tiền sân</span><strong>${fmt(calc.courtCost)}</strong></div>
                <div><span>Tiền cầu (${m.shuttleCount || 0}q)</span><strong>${fmt(calc.shuttleCost)}</strong></div>
                <div><span>Nước / Phụ phí</span><strong>${fmt(calc.extraCost)}</strong></div>
              </div>

              <div class="casual-progress-block">
                <div class="fin-top-row">
                  <span>Tiến độ thu: <b>${fmt(calc.actualCollected)}</b> / ${fmt(calc.totalCost)}</span>
                  <strong class="text-secondary">${paidCount}/${totalCount} người (${pct}%)</strong>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" style="width:${pct}%"></div>
                </div>
                <div class="casual-avatars-row">
                  <div class="avatar-stack">${avatars}</div>
                  <small class="${remaining > 0 ? 'text-warning' : 'text-success'}">
                    ${remaining > 0 ? `Còn thiếu ${fmt(remaining)}` : '✓ Đã thu đủ 100%'}
                  </small>
                </div>
              </div>

              <div class="casual-card-actions">
                <button type="button" class="secondary-blue" data-copy-remind="${esc(m.id)}">💬 Copy lời nhắc</button>
                <button type="button" class="primary" data-casual-collect="${esc(m.id)}">🏸 Ghi số cầu &amp; Thu tiền →</button>
                <button type="button" class="secondary small" data-casual-split="${esc(m.id)}" title="Sửa kèo">✏️</button>
                <button type="button" class="secondary small text-error" data-casual-delete="${esc(m.id)}" title="Xóa kèo">🗑️</button>
              </div>
            </article>`;
        }).join('')
      : `<div class="empty">
          <p>Chưa có kèo vãng lai nào đang mở.</p>
          <button type="button" class="primary small" id="emptyCreateCasualBtn">＋ Tạo kèo vãng lai mới</button>
        </div>`;
  }

  if (showSettled) {
    $('casualPastList').innerHTML = settledMatches.length
      ? settledMatches.map(m => {
          const calc = calcCasualSplit(m);
          const totalCount = (m.players || []).length;
          return `
            <article class="session-card casual-past-card" data-casual-collect="${esc(m.id)}">
              <div class="casual-past-head">
                <strong>${esc(m.title)} (${esc(shortDate(m.date))})</strong>
                <span class="status-pill success">✓ Đã tất toán (0đ dư)</span>
              </div>
              <p class="casual-past-meta">${esc(formatCasualVenue(m))} • ${totalCount} người • <b>Tổng ${fmt(calc.totalCost)}</b></p>
              ${m.courtAddress ? `<p class="casual-past-address"><small>📍 ${esc(m.courtAddress)}</small></p>` : ''}
              <div class="casual-past-foot">
                <span>💵 Nam: ${fmt(calc.maleFee)} · Nữ: ${fmt(calc.femaleFee)}</span>
                <span class="text-secondary">Chi tiết ›</span>
              </div>
            </article>`;
        }).join('')
      : '<div class="empty">Chưa có kèo vãng lai nào đã tất toán.</div>';
  }
}

function parseCasualTimeRange(str) {
  if (typeof str !== 'string' || !str.includes('-')) {
    return { start: '18:00', end: '20:00' };
  }
  const parts = str.split('-').map(s => s.trim());
  const start = isValidTimeFormat(parts[0]) ? parts[0] : '18:00';
  let end = isValidTimeFormat(parts[1]) ? parts[1] : '';
  if (!end) {
    const [sh, sm] = start.split(':').map(Number);
    const endMin = (sh * 60 + sm + 120) % 1440;
    end = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
  }
  return { start, end };
}

function calcHoursBetween(startStr, endStr) {
  if (!isValidTimeFormat(startStr) || !isValidTimeFormat(endStr)) return 2;
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 1440;
  const hours = Math.round((diff / 60) * 10) / 10;
  return hours > 0 && hours <= 24 ? hours : 2;
}

function addHoursToTimeString(startStr, hours) {
  if (!isValidTimeFormat(startStr)) startStr = '18:00';
  const [sh, sm] = startStr.split(':').map(Number);
  const dur = Number(hours) || 2;
  const totalMin = (sh * 60 + sm + Math.round(dur * 60)) % 1440;
  return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
}

const CASUAL_PRESET_COURTS = [
  { name: 'Sân cầu lông Quân Khu 5', address: '07 Duy Tân, phường Hòa Cường, quận Hải Châu' },
  { name: 'Sân cầu lông BetaEra', address: '273-275 Nguyễn Tri Phương, phường Hòa Cường, quận Hải Châu' },
  { name: 'Trung tâm Thể dục Thể thao quận Hải Châu', address: 'Số 49 Tân An 3, phường Hòa Cường Bắc, quận Hải Châu' },
  { name: 'Sân cầu lông 458 Nguyễn Tri Phương', address: '458 Nguyễn Tri Phương, phường Hòa Thuận Nam, quận Hải Châu' },
  { name: 'Sân cầu lông Đa Phước', address: 'Đường Ông Ích Khiêm, Khu đô thị Đa Phước, quận Hải Châu' },
  { name: 'Sân cầu lông số 4 Lê Duẩn', address: 'Số 04 Lê Duẩn, quận Hải Châu' },
  { name: 'Sân cầu lông Bưu Điện', address: '50B Nguyễn Du, phường Thạch Thang, quận Hải Châu' },
  { name: 'CLB Thể thao Phan Chu Trinh', address: '407 Phan Châu Trinh, phường Bình Thuận, quận Hải Châu' },
  { name: 'Sân cầu lông Cung Thiếu Nhi Đà Nẵng (Cung thể thao Tiên Sơn)', address: '02A Phan Đăng Lưu, phường Hòa Cường Bắc, quận Hải Châu' },
  { name: 'Lớp cầu lông Thầy Tùng', address: 'Khu vực phường Hòa Cường, quận Hải Châu' },
  { name: 'Sân cầu lông Aurora Sport', address: 'Đường số 6, KCN An Đồn, phường An Hải, quận Sơn Trà' },
  { name: 'Sân cầu lông PINPON SPORT 24/7', address: 'Đường số 6, KCN An Đồn, phường An Hải, quận Sơn Trà' },
  { name: 'Trung tâm Thể dục Thể thao Sơn Trà', address: '242 Trần Nhân Tông, phường An Hải, quận Sơn Trà' },
  { name: 'Sân cầu lông An Đồn 5.5', address: 'Đường số 5, phường An Hải, quận Sơn Trà' },
  { name: 'Sân cầu lông Wings Badminton', address: '132 Tô Hiến Thành, phường Phước Mỹ, quận Sơn Trà' },
  { name: 'Sân cầu lông Nguyễn Chí Thanh', address: '36 Trần Duy Chiến, phường Mân Thái, quận Sơn Trà' },
  { name: 'Sân cầu lông 34 Hồ Nghinh', address: 'Số 34 Hồ Nghinh, quận Sơn Trà' },
  { name: 'Sân cầu lông Trường Cao đẳng Lương Thực - Thực Phẩm', address: 'Đường Nguyễn Thiếp, phường An Hải Bắc, quận Sơn Trà' },
  { name: 'Sân cầu lông trong Nhà thi đấu THPT Chuyên Lê Quý Đôn', address: '01 Vũ Văn Dũng, phường An Hải Đông, quận Sơn Trà' },
  { name: 'Arena.02', address: '25 Hồ Hán Thương' },
  { name: 'Trung Tâm Thể Thao Quận Thanh Khê (Sân Trì Sport)', address: '21 Hồ Tương, phường An Khê, quận Thanh Khê' },
  { name: 'Sân cầu lông Kỳ Đồng', address: 'Đường Kỳ Đồng, phường Xuân Hà, quận Thanh Khê' },
  { name: 'Sân cầu lông Tin Sport', address: '107 Trường Chinh, phường Thanh Khê Đông, quận Thanh Khê' },
  { name: 'Sân cầu lông Trường Đại học Thể dục Thể thao', address: '44 Dũng Sĩ Thanh Khê, quận Thanh Khê' },
  { name: 'Sân cầu lông Thanh Khê Đông', address: '34 Đỗ Ngọc Du, phường Thanh Khê Đông, quận Thanh Khê' },
  { name: 'Sân cầu lông Trọng Nghĩa (Trong Nghia Badminton Court)', address: '194 Bế Văn Đàn, phường Chính Gián, quận Thanh Khê' },
  { name: 'Sân cầu lông trong Nhà thi đấu đa năng Thanh Khê', address: 'Đường Đinh Núp, phường An Khê, quận Thanh Khê' },
  { name: 'ICON BADMINTON', address: '122 Tôn Đản, phường An Khê, quận Thanh Khê' },
  { name: 'CLB cầu lông Hoa Cam', address: '02 Trường Sơn, quận Cẩm Lệ' },
  { name: 'Sân cầu lông Công an Quận Cẩm Lệ', address: '298 Cách Mạng Tháng Tám, phường Hòa Thọ Đông, quận Cẩm Lệ' },
  { name: 'Sân cầu lông Dương Gia', address: '207 Quách Thị Trang, quận Cẩm Lệ' },
  { name: 'Sân cầu lông KingSport', address: '85 Tôn Thất Dương Kỵ, phường Hòa Xuân, quận Cẩm Lệ' },
  { name: 'Sân cầu lông Đỗ Quỳ', address: '172-182 Đỗ Quỳ, phường Hòa Xuân, quận Cẩm Lệ' },
  { name: 'Sân cầu lông Phúc Đăng', address: '39 Thanh Lương 19, phường Hòa Xuân, quận Cẩm Lệ' },
  { name: 'Sân cầu lông Dacinco', address: '456 Nguyễn Hữu Thọ, phường Khuê Trung, quận Cẩm Lệ' },
  { name: 'Sân cầu lông IndexSport 1', address: '448 Mẹ Thứ, phường Hòa Xuân, quận Cẩm Lệ' },
  { name: 'Sân cầu lông Sao Vàng Club', address: '187 Lê Trọng Tấn, phường Hòa Phát, quận Cẩm Lệ' },
  { name: 'Nhà Tập Luyện Hòa Xuân (Trung tâm Huấn luyện & Đào tạo VĐV TDTT)', address: '01A Dương Loan, phường Hòa Xuân, quận Cẩm Lệ' },
  { name: 'Sân cầu lông Trung tâm Văn Hóa Thể Thao Quận Cẩm Lệ', address: 'Đường Trường Sơn, quận Cẩm Lệ' },
  { name: 'Câu lạc bộ cầu lông Hunter', address: '459 Tôn Đức Thắng, phường Hoà Khánh Nam, quận Liên Chiểu' },
  { name: 'Sân cầu lông Win Win', address: '208 Nguyễn Lương Bằng, quận Liên Chiểu' },
  { name: 'Sân cầu lông Lâm Gia', address: '17 Bàu Năng 11, phường Hòa Minh, quận Liên Chiểu' },
  { name: 'ACE BADMINTON', address: '2A Hòa Nam 6, phường Hòa Minh, quận Liên Chiểu' },
  { name: 'Sân cầu lông Win Win (Cơ sở 2)', address: '642 Tôn Đức Thắng, phường Hòa Khánh Nam, quận Liên Chiểu' },
  { name: 'Liên Chiểu Sports Center', address: 'K151 Âu Cơ, quận Liên Chiểu' },
  { name: 'Sân cầu lông Nhà thi đấu Đại học Bách Khoa Đà Nẵng', address: '54 Nguyễn Lương Bằng, quận Liên Chiểu' },
  { name: 'Sân cầu lông Arena.01', address: '40 Hoàng Văn Thái' },
  { name: 'Sân cầu lông Arena.03', address: '38 Hoàng Văn Thái' },
  { name: 'Sân Cầu Lông Ngũ Hành Badminton', address: 'Cuối Đường Phạm Hữu Nhật, phường Hòa Hải, quận Ngũ Hành Sơn' },
  { name: 'Sân cầu lông Mỹ An', address: '382 Ngũ Hành Sơn, phường Mỹ An, quận Ngũ Hành Sơn' },
  { name: 'Sân cầu lông IndexSport 2', address: '81C Lê Văn Hiến, quận Ngũ Hành Sơn' },
  { name: 'CLB Cầu lông Ngũ Hành Sơn (Trung tâm Văn hoá Thể Thao)', address: '01B Trần Văn Đán, quận Ngũ Hành Sơn' },
  { name: 'Sân cầu lông Khu thể thao Đại học Kinh Tế Đà Nẵng', address: '71 Ngũ Hành Sơn, phường Mỹ An, quận Ngũ Hành Sơn' },
  { name: 'Sân cầu lông Hoà Liên', address: 'Tân Ninh, xã Hòa Liên, Huyện Hòa Vang' }
];

function normalizeVi(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

function getAllCasualCourtsCatalog() {
  const seen = new Set();
  const list = [];
  const pushCourt = (name, address) => {
    const cleanName = String(name || '').trim();
    if (!cleanName || cleanName === '__add__' || cleanName === 'Sân __add__' || cleanName === 'Sân số 1') return;
    const key = normalizeVi(cleanName);
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ name: cleanName, address: String(address || '').trim() });
  };
  CASUAL_PRESET_COURTS.forEach(c => pushCourt(c.name, c.address));
  (state.courts || []).forEach(c => {
    if (c && c.name) pushCourt(c.name, c.address);
  });
  return list;
}

let currentCourtSuggestions = [];
let activeCourtSuggestIdx = -1;

function renderCasualCourtSuggestions(rawQuery) {
  const box = $('casualCourtSuggestList');
  if (!box) return;
  const q = normalizeVi(rawQuery);
  if (!q) {
    box.hidden = true;
    box.innerHTML = '';
    currentCourtSuggestions = [];
    activeCourtSuggestIdx = -1;
    return;
  }
  const catalog = getAllCasualCourtsCatalog();
  const nameMatches = [];
  const addrMatches = [];
  for (const c of catalog) {
    const nName = normalizeVi(c.name);
    const nAddr = normalizeVi(c.address);
    if (nName.includes(q)) nameMatches.push(c);
    else if (nAddr.includes(q)) addrMatches.push(c);
  }
  currentCourtSuggestions = [...nameMatches, ...addrMatches];
  activeCourtSuggestIdx = -1;

  if (!currentCourtSuggestions.length) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }

  box.innerHTML = currentCourtSuggestions.map((c, idx) => `
    <button type="button" class="court-suggest-item" role="option" data-suggest-idx="${idx}">
      <span class="court-suggest-name">${esc(c.name)}</span>
      ${c.address ? `<span class="court-suggest-addr">📍 ${esc(c.address)}</span>` : ''}
    </button>
  `).join('');
  box.hidden = false;
}

function selectCasualCourtSuggestion(idx) {
  const chosen = currentCourtSuggestions[idx];
  if (!chosen) return;
  if ($('casualCourtName')) $('casualCourtName').value = chosen.name;
  if ($('casualCourtAddress') && chosen.address) {
    $('casualCourtAddress').value = chosen.address;
    $('casualCourtAddress').dataset.autofilled = 'true';
  }
  if ($('casualCourtSuggestList')) {
    $('casualCourtSuggestList').hidden = true;
    $('casualCourtSuggestList').innerHTML = '';
  }
  currentCourtSuggestions = [];
  activeCourtSuggestIdx = -1;
  updateCasualSplitPreview();
}

let draftCasualPlayers = [];
function openCasualSplitModal(matchId = null) {
  let m = state.casualMatches.find(x => x.id === matchId);
  const isNew = !m;
  if (isNew) {
    m = {
      id: '',
      title: 'Kèo Giao Lưu',
      date: today(),
      timeRange: '18:00 - 20:00',
      courtName: '',
      courtAddress: '',
      courtNumber: '',
      venue: '',
      hours: 2,
      courtRate: 80000,
      shuttleCount: 0,
      shuttlePrice: 25000,
      extraCost: 0,
      splitMode: 'equal',
      femaleDiscount: 15000,
      customMale: 50000,
      customFemale: 35000,
      bankInfo: '1903948271011 - Techcombank (CHU KEO)',
      status: 'open',
      players: Array.from({ length: 7 }, () => ({
        id: id(),
        name: '',
        gender: 'male',
        paid: false,
        method: 'transfer'
      }))
    };
  }

  $('casualMatchId').value = m.id || '';
  $('casualTitle').value = m.title || 'Kèo Giao Lưu';
  $('casualDate').value = m.date || today();
  const parsedTime = parseCasualTimeRange(m.timeRange || '18:00 - 20:00');
  if ($('casualStartTime')) $('casualStartTime').value = parsedTime.start;
  if ($('casualEndTime')) $('casualEndTime').value = parsedTime.end;
  $('casualTimeRange').value = `${parsedTime.start} - ${parsedTime.end}`;

  if ($('casualCourtSuggestList')) {
    $('casualCourtSuggestList').hidden = true;
    $('casualCourtSuggestList').innerHTML = '';
  }

  let courtName = m.courtName || '';
  let courtAddress = m.courtAddress || '';
  let courtNumber = m.courtNumber || '';

  if (!courtName && m.venue) {
    if (m.venue.includes('·')) {
      const parts = m.venue.split('·').map(s => s.trim());
      courtName = parts[0] || '';
      courtNumber = parts[1] || '';
    } else if (m.venue.includes('-')) {
      const parts = m.venue.split('-').map(s => s.trim());
      courtName = parts[0] || '';
      courtNumber = parts[1] || '';
    } else {
      courtName = m.venue;
    }
  }

  if ($('casualCourtName')) $('casualCourtName').value = courtName;
  if ($('casualCourtAddress')) $('casualCourtAddress').value = courtAddress;
  if ($('casualCourtNumber')) $('casualCourtNumber').value = courtNumber;
  if ($('casualVenue')) $('casualVenue').value = formatCasualVenue(m);

  $('casualHours').value = m.hours ?? calcHoursBetween(parsedTime.start, parsedTime.end);
  $('casualCourtRate').value = fmtInputMoney(m.courtRate ?? 80000);
  $('casualShuttlePrice').value = fmtInputMoney(m.shuttlePrice ?? 25000);
  if ($('casualShuttleCount')) $('casualShuttleCount').value = m.shuttleCount ?? 0;
  if ($('casualExtraCost')) $('casualExtraCost').value = fmtInputMoney(m.extraCost ?? 0);
  if ($('casualBankInfo')) $('casualBankInfo').value = m.bankInfo || '';

  if ($('casualSplitModalTitle')) {
    $('casualSplitModalTitle').textContent = isNew ? 'Tạo Kèo Vãng Lai' : 'Chỉnh Sửa Kèo';
  }

  draftCasualPlayers = JSON.parse(JSON.stringify(m.players || []));
  if (!draftCasualPlayers.length) {
    draftCasualPlayers = Array.from({ length: 7 }, () => ({
      id: id(),
      name: '',
      gender: 'male',
      paid: false,
      method: 'transfer'
    }));
  }
  renderCasualPlayersEditor();
  updateCasualSplitPreview();
  $('casualSplitDialog')?.showModal();
}

function renderCasualPlayersEditor() {
  if ($('casualPlayerCountLabel')) $('casualPlayerCountLabel').textContent = String(draftCasualPlayers.length);
  document.querySelectorAll('.btn-quick-count').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.pcount) === draftCasualPlayers.length);
  });
  $('casualPlayersEditor').innerHTML = draftCasualPlayers.map((p, idx) => `
    <div class="casual-player-edit-row" data-pidx="${idx}">
      <span class="cp-idx">${idx + 1}</span>
      <input type="text" class="cp-name-input" value="${esc(p.name)}" placeholder="Người chơi ${idx + 1}${idx === 0 ? ' (Bạn)' : ''}">
      <select class="cp-gender-select">
        <option value="male" ${p.gender !== 'female' ? 'selected' : ''}>Nam</option>
        <option value="female" ${p.gender === 'female' ? 'selected' : ''}>Nữ</option>
      </select>
      <button type="button" class="cp-del-btn" data-del-cp="${idx}" aria-label="Xóa">×</button>
    </div>
  `).join('');
}

function syncDraftCasualPlayersFromDOM() {
  document.querySelectorAll('#casualPlayersEditor .casual-player-edit-row').forEach(row => {
    const idx = Number(row.dataset.pidx);
    if (!draftCasualPlayers[idx]) return;
    draftCasualPlayers[idx].name = row.querySelector('.cp-name-input')?.value.trim() || '';
    draftCasualPlayers[idx].gender = row.querySelector('.cp-gender-select')?.value || 'male';
  });
}

function readDraftCasualMatch() {
  syncDraftCasualPlayersFromDOM();
  const start = isValidTimeFormat($('casualStartTime')?.value) ? $('casualStartTime').value : '18:00';
  const end = isValidTimeFormat($('casualEndTime')?.value) ? $('casualEndTime').value : '20:00';
  const timeRange = `${start} - ${end}`;
  if ($('casualTimeRange')) $('casualTimeRange').value = timeRange;

  const courtName = $('casualCourtName')?.value.trim() || '';
  const courtAddress = $('casualCourtAddress')?.value.trim() || '';
  const courtNumber = $('casualCourtNumber')?.value.trim() || '';
  const venue = formatCasualVenue({ courtName, courtNumber, venue: $('casualVenue')?.value.trim() });
  if ($('casualVenue')) $('casualVenue').value = venue;

  return {
    id: $('casualMatchId').value || '',
    title: $('casualTitle').value.trim() || 'Kèo Vãng Lai',
    date: $('casualDate').value || today(),
    timeRange,
    courtName,
    courtAddress,
    courtNumber,
    venue,
    hours: Number($('casualHours').value) || 2,
    courtRate: parseMoney($('casualCourtRate').value) || 80000,
    shuttleCount: Number($('casualShuttleCount')?.value) || 0,
    shuttlePrice: parseMoney($('casualShuttlePrice').value) || 25000,
    extraCost: parseMoney($('casualExtraCost')?.value) || 0,
    splitMode: 'equal',
    femaleDiscount: 15000,
    customMale: 50000,
    customFemale: 35000,
    bankInfo: $('casualBankInfo')?.value?.trim() || '',
    players: draftCasualPlayers
  };
}

function updateCasualSplitPreview() {
  const draft = readDraftCasualMatch();
  const calc = calcCasualSplit(draft);

  $('casualCourtSubtotal').textContent = fmt(calc.courtCost);

  // Generate Remind Message for Zalo
  const remindText = generateCasualRemind(draft);
  if ($('casualRemindPreviewText')) {
    $('casualRemindPreviewText').textContent = remindText;
  }
}

$('addCasualPlayerRowBtn')?.addEventListener('click', () => {
  syncDraftCasualPlayersFromDOM();
  draftCasualPlayers.push({ id: id(), name: '', gender: 'male', paid: false, method: 'transfer' });
  renderCasualPlayersEditor();
  updateCasualSplitPreview();
});

$('casualPlayersEditor')?.addEventListener('click', e => {
  const del = e.target.closest('[data-del-cp]');
  if (!del) return;
  syncDraftCasualPlayersFromDOM();
  if (draftCasualPlayers.length <= 1) {
    showToast('Cần ít nhất 1 người chơi trong kèo');
    return;
  }
  draftCasualPlayers.splice(Number(del.dataset.delCp), 1);
  renderCasualPlayersEditor();
  updateCasualSplitPreview();
});

$('casualPlayersEditor')?.addEventListener('input', updateCasualSplitPreview);
$('casualPlayersEditor')?.addEventListener('change', updateCasualSplitPreview);

$('casualStartTime')?.addEventListener('change', () => {
  const start = $('casualStartTime').value;
  if (!isValidTimeFormat(start)) return;
  const hours = Number($('casualHours').value) || 2;
  const newEnd = addHoursToTimeString(start, hours);
  if ($('casualEndTime')) $('casualEndTime').value = newEnd;
  if ($('casualTimeRange')) $('casualTimeRange').value = `${start} - ${newEnd}`;
  updateCasualSplitPreview();
});

$('casualEndTime')?.addEventListener('change', () => {
  const start = $('casualStartTime')?.value || '18:00';
  const end = $('casualEndTime').value;
  if (!isValidTimeFormat(start) || !isValidTimeFormat(end)) return;
  const diffHours = calcHoursBetween(start, end);
  if ($('casualHours')) $('casualHours').value = diffHours;
  if ($('casualTimeRange')) $('casualTimeRange').value = `${start} - ${end}`;
  updateCasualSplitPreview();
});

$('casualHours')?.addEventListener('input', () => {
  const hours = Number($('casualHours').value);
  if (Number.isFinite(hours) && hours > 0 && hours <= 24) {
    const start = $('casualStartTime')?.value || '18:00';
    const newEnd = addHoursToTimeString(start, hours);
    if ($('casualEndTime')) $('casualEndTime').value = newEnd;
    if ($('casualTimeRange')) $('casualTimeRange').value = `${start} - ${newEnd}`;
  }
  updateCasualSplitPreview();
});

$('casualCourtName')?.addEventListener('input', () => {
  const rawVal = $('casualCourtName').value;
  renderCasualCourtSuggestions(rawVal);
  const normVal = normalizeVi(rawVal);
  const matched = getAllCasualCourtsCatalog().find(c => normalizeVi(c.name) === normVal);
  if (matched && matched.address) {
    $('casualCourtAddress').value = matched.address;
    $('casualCourtAddress').dataset.autofilled = 'true';
  }
  updateCasualSplitPreview();
});

$('casualCourtName')?.addEventListener('focus', () => {
  if ($('casualCourtName').value.trim()) {
    renderCasualCourtSuggestions($('casualCourtName').value);
  }
});

$('casualCourtName')?.addEventListener('blur', () => {
  setTimeout(() => {
    if ($('casualCourtSuggestList')) $('casualCourtSuggestList').hidden = true;
  }, 160);
});

$('casualCourtName')?.addEventListener('keydown', e => {
  const box = $('casualCourtSuggestList');
  if (!box || box.hidden || !currentCourtSuggestions.length) return;
  const items = box.querySelectorAll('.court-suggest-item');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeCourtSuggestIdx = (activeCourtSuggestIdx + 1) % currentCourtSuggestions.length;
    items.forEach((el, i) => el.classList.toggle('active', i === activeCourtSuggestIdx));
    items[activeCourtSuggestIdx]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeCourtSuggestIdx = (activeCourtSuggestIdx - 1 + currentCourtSuggestions.length) % currentCourtSuggestions.length;
    items.forEach((el, i) => el.classList.toggle('active', i === activeCourtSuggestIdx));
    items[activeCourtSuggestIdx]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && activeCourtSuggestIdx >= 0) {
    e.preventDefault();
    selectCasualCourtSuggestion(activeCourtSuggestIdx);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    box.hidden = true;
  }
});

$('casualCourtSuggestList')?.addEventListener('mousedown', e => {
  const btn = e.target.closest('[data-suggest-idx]');
  if (!btn) return;
  e.preventDefault();
  selectCasualCourtSuggestion(Number(btn.dataset.suggestIdx));
});

$('casualCourtSuggestList')?.addEventListener('click', e => {
  const btn = e.target.closest('[data-suggest-idx]');
  if (!btn) return;
  selectCasualCourtSuggestion(Number(btn.dataset.suggestIdx));
});

$('casualCourtAddress')?.addEventListener('input', () => {
  delete $('casualCourtAddress').dataset.autofilled;
});

['casualCourtRate', 'casualShuttlePrice'].forEach(fid => {
  const el = $(fid);
  if (!el) return;
  el.addEventListener('blur', () => {
    const val = parseMoney(el.value);
    el.value = fmtInputMoney(val);
    updateCasualSplitPreview();
  });
});

['casualTitle', 'casualDate', 'casualStartTime', 'casualEndTime', 'casualTimeRange', 'casualVenue', 'casualCourtName', 'casualCourtAddress', 'casualCourtNumber', 'casualHours', 'casualCourtRate', 'casualShuttlePrice'].forEach(fid => {
  $(fid)?.addEventListener('input', updateCasualSplitPreview);
  $(fid)?.addEventListener('change', updateCasualSplitPreview);
});

$('copyCasualRemindBtn')?.addEventListener('click', async () => {
  const text = $('casualRemindPreviewText')?.textContent || '';
  try {
    await navigator.clipboard.writeText(text);
    showToast('Đã copy tin nhắn nhắc kèo Zalo!');
  } catch {
    showToast('Đã tạo tin nhắn nhắc kèo');
  }
});

$('casualSplitForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const start = $('casualStartTime')?.value;
  const end = $('casualEndTime')?.value;
  if (!isValidTimeFormat(start) || !isValidTimeFormat(end)) {
    showToast('Khung giờ không hợp lệ! Vui lòng chọn giờ bắt đầu và kết thúc chuẩn.');
    return;
  }
  const hours = Number($('casualHours').value);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    showToast('Số giờ sân không hợp lệ (từ 0.5 đến 24 giờ)!');
    return;
  }
  const draft = readDraftCasualMatch();
  const existingIdx = state.casualMatches.findIndex(x => x.id === draft.id);
  let savedMatch;
  if (existingIdx >= 0) {
    savedMatch = { ...state.casualMatches[existingIdx], ...draft };
    state.casualMatches[existingIdx] = savedMatch;
  } else {
    savedMatch = { ...draft, id: 'casual-' + id(), status: 'open' };
    state.casualMatches.unshift(savedMatch);
  }
  $('casualSplitDialog')?.close();
  save();
  const remindText = generateCasualRemind(savedMatch);
  try {
    navigator.clipboard.writeText(remindText);
    showToast('Đã tạo kèo thành công! Đã copy lời nhắc gửi Zalo.');
  } catch {
    showToast('Đã tạo kèo thành công!');
  }
});

// Screen 07: On-Court Casual Collection & 0đ Surplus Settlement
function openCasualCollectModal(matchId) {
  const m = state.casualMatches.find(x => x.id === matchId);
  if (!m) return;
  $('casualCollectDialog').dataset.matchId = m.id;
  renderCasualCollectModal(m);
  $('casualCollectDialog')?.showModal();
}

function renderCasualCollectModal(m) {
  const calc = calcCasualSplit(m);
  const players = m.players || [];
  const paidCount = players.filter(p => p.paid).length;
  const pct = calc.totalCost > 0 ? Math.min(100, Math.round((calc.actualCollected / calc.totalCost) * 100)) : 100;
  const diff = calc.actualCollected - calc.totalCost;

  if ($('collectMatchInfoBox')) {
    const venueStr = formatCasualVenue(m);
    $('collectMatchInfoBox').textContent = `🕒 ${m.timeRange || '18:00 - 20:00'} · 📍 ${venueStr}${m.courtAddress ? ` (${m.courtAddress})` : ''}`;
  }

  if ($('collectShuttleCount')) $('collectShuttleCount').value = m.shuttleCount ?? 5;
  if ($('collectShuttleUnitHint')) $('collectShuttleUnitHint').textContent = `${fmt(m.shuttlePrice || 25000)} / quả`;
  if ($('collectShuttleFormulaText')) $('collectShuttleFormulaText').textContent = `Tổng tiền cầu (${m.shuttleCount ?? 5} quả × ${fmt(m.shuttlePrice || 25000)}):`;
  if ($('collectShuttleSubtotal')) $('collectShuttleSubtotal').textContent = fmt(calc.shuttleCost);
  if ($('collectExtraCost')) $('collectExtraCost').value = fmtInputMoney(m.extraCost || 0);
  if ($('collectCostBreakdownText')) $('collectCostBreakdownText').textContent = `Sân ${fmt(calc.courtCost)} + Cầu ${fmt(calc.shuttleCost)}${calc.extraCost ? ` + Phụ phí ${fmt(calc.extraCost)}` : ''}`;
  if ($('collectTotalCostDisplay')) $('collectTotalCostDisplay').textContent = fmt(calc.totalCost);

  document.querySelectorAll('input[name="collectSplitMode"]').forEach(r => {
    r.checked = r.value === (m.splitMode || 'equal');
  });
  document.querySelectorAll('[data-collect-split-card]').forEach(card => {
    card.classList.toggle('active', card.dataset.collectSplitCard === (m.splitMode || 'equal'));
  });

  if ($('collectPerPersonSummary')) {
    $('collectPerPersonSummary').textContent = m.splitMode === 'equal'
      ? `${fmt(calc.equalPerPerson)} / người`
      : `Nam ${fmt(calc.maleFee)} · Nữ ${fmt(calc.femaleFee)}`;
  }
  if ($('collectEqualSummaryRight')) {
    $('collectEqualSummaryRight').textContent = `${fmt(calc.equalPerPerson)} / người`;
  }
  if ($('collectEqualFormulaText')) {
    $('collectEqualFormulaText').textContent = `${players.length} người × ${fmt(calc.equalPerPerson)}/người`;
  }
  if ($('collectGenderFormulaText')) {
    $('collectGenderFormulaText').textContent = `${calc.maleCount} Nam × ${fmt(calc.maleFee)} + ${calc.femaleCount} Nữ × ${fmt(calc.femaleFee)}`;
  }
  if ($('collectFemaleDiscount') && document.activeElement !== $('collectFemaleDiscount')) {
    $('collectFemaleDiscount').value = fmtInputMoney(m.femaleDiscount ?? 15000);
  }

  if ($('collectZaloPreviewText')) {
    $('collectZaloPreviewText').textContent = generateCasualZaloBill(m);
  }

  $('casualCollectedBig').textContent = fmt(calc.actualCollected);
  $('casualTargetSmall').textContent = `/ ${fmt(calc.totalCost)}`;
  $('casualCollectProgressBar').style.width = `${pct}%`;
  $('casualCollectStatusPill').textContent = paidCount === players.length && players.length > 0 ? '🎉 Đạt 100% — Đủ tiền trả sân' : `Đang thu (${paidCount}/${players.length})`;
  $('casualMetricTotal').textContent = fmt(calc.totalCost);
  $('casualMetricPaid').textContent = fmt(calc.actualCollected);
  $('casualMetricDiff').textContent = diff === 0 ? '0 ₫' : (diff > 0 ? `+${fmt(diff)}` : `−${fmt(Math.abs(diff))}`);
  $('casualPaidCountBadge').textContent = `${paidCount}/${players.length} người`;
  $('casualSettlementMatchText').textContent = paidCount === players.length ? 'Khớp 100% thu chi (0đ dư)' : `Đã thu ${paidCount}/${players.length} người`;

  const allPaid = players.length > 0 && players.every(p => p.paid);
  const markBtn = $('markAllCasualPaidBtn');
  if (markBtn) {
    if (allPaid) {
      markBtn.textContent = '↺ Bỏ đánh dấu tất cả';
      markBtn.className = 'pill-action-gray';
      markBtn.title = 'Bấm để hoàn tác và chuyển tất cả về Chưa đóng';
    } else {
      markBtn.textContent = '✓ Tất cả đã đóng';
      markBtn.className = 'pill-action-green';
      markBtn.title = 'Bấm để đánh dấu tất cả người chơi đã đóng tiền';
    }
  }

  $('casualCollectPlayerList').innerHTML = players.map((p, idx) => {
    const fee = calc.feeForPlayer(p);
    const isFemale = p.gender === 'female';
    const methodLabel = p.method === 'cash' ? '• Tiền mặt' : '• Đã chuyển khoản';
    const pName = casualPlayerName(p, idx);
    return `
      <div class="attendance-player-card casual-collect-row" data-cplayer-idx="${idx}">
        <div class="player-card-main">
          <label class="casual-check-person">
            <input type="checkbox" class="casual-player-paid-check" data-toggle-cpaid="${idx}" ${p.paid ? 'checked' : ''}>
            <div class="person">
              <div class="person-avatar ${isFemale ? 'female' : ''}">${isFemale ? '♀' : '♂'}</div>
              <div>
                <strong>${esc(pName)}</strong>
                <small class="${isFemale ? 'text-female' : 'text-secondary'}">${isFemale ? 'Nữ • Mức phí Nữ' : 'Nam • Mức phí Nam'}</small>
              </div>
            </div>
          </label>
          <div class="casual-player-right">
            <strong>${fmt(fee)}</strong>
            <button type="button" class="status-pill ${p.paid ? 'success' : 'error'} casual-method-btn" data-cycle-method="${idx}">
              ${p.paid ? methodLabel : '⏳ Chưa đóng'}
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

$('collectShuttleMinusBtn')?.addEventListener('click', () => {
  const m = state.casualMatches.find(x => x.id === $('casualCollectDialog').dataset.matchId);
  if (!m) return;
  m.shuttleCount = Math.max(0, (m.shuttleCount || 0) - 1);
  save();
  renderCasualCollectModal(m);
});

$('collectShuttlePlusBtn')?.addEventListener('click', () => {
  const m = state.casualMatches.find(x => x.id === $('casualCollectDialog').dataset.matchId);
  if (!m) return;
  m.shuttleCount = (m.shuttleCount || 0) + 1;
  save();
  renderCasualCollectModal(m);
});

$('collectShuttleCount')?.addEventListener('input', () => {
  const m = state.casualMatches.find(x => x.id === $('casualCollectDialog').dataset.matchId);
  if (!m) return;
  m.shuttleCount = Math.max(0, Number($('collectShuttleCount').value) || 0);
  save();
  renderCasualCollectModal(m);
});

$('collectExtraCost')?.addEventListener('input', () => {
  const m = state.casualMatches.find(x => x.id === $('casualCollectDialog').dataset.matchId);
  if (!m) return;
  m.extraCost = parseMoney($('collectExtraCost').value);
  save();
  renderCasualCollectModal(m);
});

$('collectExtraCost')?.addEventListener('blur', () => {
  const m = state.casualMatches.find(x => x.id === $('casualCollectDialog').dataset.matchId);
  if (!m) return;
  $('collectExtraCost').value = fmtInputMoney(m.extraCost || 0);
});

$('collectFemaleDiscount')?.addEventListener('input', () => {
  const m = state.casualMatches.find(x => x.id === $('casualCollectDialog').dataset.matchId);
  if (!m) return;
  m.femaleDiscount = parseMoney($('collectFemaleDiscount').value);
  save();
  renderCasualCollectModal(m);
});

$('collectFemaleDiscount')?.addEventListener('blur', () => {
  const m = state.casualMatches.find(x => x.id === $('casualCollectDialog').dataset.matchId);
  if (!m) return;
  $('collectFemaleDiscount').value = fmtInputMoney(m.femaleDiscount ?? 15000);
});

document.querySelectorAll('input[name="collectSplitMode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const m = state.casualMatches.find(x => x.id === $('casualCollectDialog').dataset.matchId);
    if (!m) return;
    m.splitMode = radio.value;
    save();
    renderCasualCollectModal(m);
  });
});

$('collectCopyZaloBtn')?.addEventListener('click', async () => {
  const text = $('collectZaloPreviewText')?.textContent || '';
  try {
    await navigator.clipboard.writeText(text);
    showToast('Đã copy tin nhắn Zalo thu tiền!');
  } catch {
    showToast('Đã tạo tin nhắn Zalo thu tiền');
  }
});

$('casualCollectPlayerList')?.addEventListener('change', e => {
  const chk = e.target.closest('[data-toggle-cpaid]');
  if (!chk) return;
  const m = state.casualMatches.find(x => x.id === $('casualCollectDialog').dataset.matchId);
  if (!m) return;
  const idx = Number(chk.dataset.toggleCpaid);
  if (m.players[idx]) {
    m.players[idx].paid = chk.checked;
    save();
    renderCasualCollectModal(m);
  }
});

$('casualCollectPlayerList')?.addEventListener('click', e => {
  const btn = e.target.closest('[data-cycle-method]');
  if (!btn) return;
  const m = state.casualMatches.find(x => x.id === $('casualCollectDialog').dataset.matchId);
  if (!m) return;
  const idx = Number(btn.dataset.cycleMethod);
  const p = m.players[idx];
  if (!p) return;
  if (!p.paid) {
    p.paid = true;
    p.method = 'transfer';
  } else if (p.method === 'transfer') {
    p.method = 'cash';
  } else {
    p.paid = false;
  }
  save();
  renderCasualCollectModal(m);
});

$('markAllCasualPaidBtn')?.addEventListener('click', () => {
  const m = state.casualMatches.find(x => x.id === $('casualCollectDialog').dataset.matchId);
  if (!m || !m.players || !m.players.length) return;
  const allPaid = m.players.every(p => p.paid);
  if (allPaid) {
    m.players.forEach(p => { p.paid = false; });
    save();
    renderCasualCollectModal(m);
    showToast('Đã bỏ đánh dấu: chuyển tất cả về Chưa đóng');
  } else {
    m.players.forEach(p => { p.paid = true; });
    save();
    renderCasualCollectModal(m);
    showToast('Đã đánh dấu đóng đủ 100% người chơi');
  }
});

$('editCasualFromCollectBtn')?.addEventListener('click', () => {
  const mid = $('casualCollectDialog').dataset.matchId;
  $('casualCollectDialog')?.close();
  openCasualSplitModal(mid);
});

$('settleCasualMatchBtn')?.addEventListener('click', () => {
  const m = state.casualMatches.find(x => x.id === $('casualCollectDialog').dataset.matchId);
  if (!m) return;
  (m.players || []).forEach(p => { p.paid = true; });
  m.status = 'settled';
  m.settledAt = today();
  $('casualCollectDialog')?.close();
  save();
  showToast('Đã tất toán 0đ dư & đóng kèo thành công (Không ảnh hưởng quỹ Team)');
});

// 12. Event Listeners & Global Bindings
$('memberMonth').addEventListener('change', () => {
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test($('memberMonth').value)) {
    memberMonth = $('memberMonth').value;
    render();
  } else {
    $('memberMonth').value = memberMonth;
  }
});

document.querySelectorAll('.tab').forEach(b => b.onclick = () => setView(b.dataset.view));
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => setView(b.dataset.go));
$('toFinance').onclick = () => setView('finance');
$('addSessionTop').onclick = () => openSession();
$('topbarCreateCasualBtn').onclick = () => openCasualSplitModal(null);
$('addMember').onclick = () => openMember();
$('addMembersBulk').onclick = () => {
  $('bulkMembersInput').value = '';
  updateBulkMembersPreview();
  $('bulkMembersDialog').showModal();
};
$('cancelBulkMembers').onclick = () => $('bulkMembersDialog').close();
$('bulkMembersInput').addEventListener('input', updateBulkMembersPreview);
$('bulkMembersForm').addEventListener('submit', e => {
  e.preventDefault();
  const plan = bulkMemberPlan();
  if (!plan.valid.length) {
    updateBulkMembersPreview();
    return;
  }
  for (const row of plan.valid) {
    state.members.push({ id: id(), name: row.name, gender: row.gender, phone: row.phone, paymentMode: 'per_session' });
  }
  $('bulkMembersDialog').close();
  save();
  const skipped = plan.duplicates.length + plan.invalid.length;
  showToast(`Đã thêm ${plan.valid.length} thành viên${skipped ? ` · bỏ qua ${skipped} dòng` : ''}`);
});

$('addExpense').onclick = () => {
  $('expenseForm').reset();
  $('expenseDate').value = today();
  $('expenseDialog').showModal();
};

// Court Owner Settlement 1-Click Pre-fill
$('settleCourtOwnerBtn')?.addEventListener('click', () => {
  const mk = monthKey(localDate(financeCursor));
  const est = monthlyCourtEstimate(mk);
  $('expenseForm').reset();
  $('expenseType').value = 'court';
  $('expenseAmount').value = est.amount || 150000;
  $('expenseDate').value = today();
  $('expenseNote').value = 'Tất toán tiền sân ' + monthLabel(mk);
  $('expenseDialog').showModal();
});

document.querySelectorAll('.filter[data-filter]').forEach(b => b.onclick = () => {
  activeFilter = b.dataset.filter;
  document.querySelectorAll('.filter[data-filter]').forEach(x => x.classList.toggle('active', x === b));
  render();
});

document.querySelectorAll('.filter[data-casual-filter]').forEach(b => b.onclick = () => {
  casualFilter = b.dataset.casualFilter;
  document.querySelectorAll('.filter[data-casual-filter]').forEach(x => x.classList.toggle('active', x === b));
  renderCasualHub();
});

document.querySelectorAll('.transaction-filters button').forEach(button => button.onclick = () => {
  transactionFilter = button.dataset.transactionFilter;
  document.querySelectorAll('.transaction-filters button').forEach(item => {
    item.classList.toggle('active', item === button);
    item.setAttribute('aria-pressed', String(item === button));
  });
  renderFinance();
});

document.addEventListener('change', e => {
  const checkbox = e.target.closest('.quick-paid');
  if (!checkbox || !checkbox.checked) return;
  const session = state.sessions.find(s => s.id === checkbox.dataset.session),
    attendee = session?.attendees?.[Number(checkbox.dataset.attendeeIndex)];
  if (!attendee || attendee.paid || attendee.monthlyPayment || charge(attendee) <= 0) return;
  attendee.paid = true;
  attendee.paidAmount = charge(attendee);
  attendee.paidDate = today();
  save();
  showToast('Đã ghi nhận thanh toán của ' + memberName(attendee));
});

document.addEventListener('click', e => {
  const att = e.target.closest('[data-attendance]');
  if (att) {
    const s = state.sessions.find(x => x.id === att.dataset.attendance);
    if (s) openAttendance(s);
  }
  const pay = e.target.closest('[data-payment]');
  if (pay) {
    const s = state.sessions.find(x => x.id === pay.dataset.payment);
    if (s) openPayment(s);
  }
  const edit = e.target.closest('[data-edit-session]');
  if (edit) {
    const s = state.sessions.find(x => x.id === edit.dataset.editSession);
    if (s) openSession(s);
  }
  const mem = e.target.closest('[data-edit-member]');
  if (mem) openMember(state.members.find(m => m.id === mem.dataset.editMember));

  const cSplit = e.target.closest('[data-casual-split]');
  if (cSplit) openCasualSplitModal(cSplit.dataset.casualSplit);

  const cCollect = e.target.closest('[data-casual-collect]');
  if (cCollect) openCasualCollectModal(cCollect.dataset.casualCollect);

  const pCountBtn = e.target.closest('[data-pcount]');
  if (pCountBtn) {
    const target = Number(pCountBtn.dataset.pcount);
    if (target && target > 0) {
      syncDraftCasualPlayersFromDOM();
      if (draftCasualPlayers.length < target) {
        while (draftCasualPlayers.length < target) {
          draftCasualPlayers.push({ id: id(), name: '', gender: 'male', paid: false, method: 'transfer' });
        }
      } else if (draftCasualPlayers.length > target) {
        draftCasualPlayers = draftCasualPlayers.slice(0, target);
      }
      renderCasualPlayersEditor();
      updateCasualSplitPreview();
    }
  }

  const copyRemindBtn = e.target.closest('[data-copy-remind]');
  if (copyRemindBtn) {
    const mid = copyRemindBtn.dataset.copyRemind;
    const m = state.casualMatches.find(x => x.id === mid);
    if (m) {
      const text = generateCasualRemind(m);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          showToast('Đã copy tin nhắn nhắc kèo Zalo!');
        }).catch(() => {
          showToast('Đã tạo tin nhắn nhắc kèo');
        });
      } else {
        showToast('Đã tạo tin nhắn nhắc kèo');
      }
    }
  }

  const delCasual = e.target.closest('[data-casual-delete]');
  if (delCasual) {
    const mid = delCasual.dataset.casualDelete;
    if (confirm('Xóa kèo vãng lai này?')) {
      state.casualMatches = state.casualMatches.filter(x => x.id !== mid);
      save();
      showToast('Đã xóa kèo vãng lai');
    }
  }

  if (e.target.closest('#emptyCreateCasualBtn')) {
    openCasualSplitModal(null);
  }
});

$('sessionForm').addEventListener('submit', e => {
  e.preventDefault();
  if ($('sessionCourt').value === '__add__') {
    renderCourtOptions($('sessionCourt').dataset.previous || 'court-default');
    showToast('Hãy thêm sân hoặc chọn sân trong danh sách');
    return;
  }
  const startTime = $('sessionStart').value;
  const endTime = $('sessionEnd').value;
  if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
    showToast('Giờ bắt đầu hoặc kết thúc không hợp lệ!');
    return;
  }
  const sid = $('sessionId').value,
    status = $('sessionStatus').value,
    old = state.sessions.find(s => s.id === sid),
    court = state.courts.find(c => c.id === $('sessionCourt').value);
  const item = {
    id: sid || id(),
    date: $('sessionDate').value,
    start: $('sessionStart').value,
    end: $('sessionEnd').value,
    note: '',
    courtId: court?.id,
    courtName: court?.name || 'Sân số 1',
    courtAddress: court?.address || '',
    courtNumber: court?.number || '',
    status,
    courtHours: Number($('courtHours').value),
    courtRate: Number($('courtHourlyRate').value),
    courtCost: sessionCost({ courtHours: Number($('courtHours').value), courtRate: Number($('courtHourlyRate').value) }),
    passAmount: status === 'passed' ? Number($('passAmount').value) || 0 : 0,
    passDate: status === 'passed' ? old?.passDate || today() : null,
    attendees: status === 'passed' ? [] : (old?.attendees || [])
  };
  const ix = state.sessions.findIndex(s => s.id === sid);
  if (ix >= 0) state.sessions[ix] = item;
  else state.sessions.push(item);
  $('sessionDialog').close();
  save();
  showToast(status === 'passed' ? 'Đã ghi nhận nhường sân và tiền thu' : 'Đã lưu buổi chơi');
});

$('sessionCourt').addEventListener('change', () => {
  if ($('sessionCourt').value !== '__add__') return;
  const previous = $('sessionCourt').dataset.previous || 'court-default';
  $('sessionCourt').value = previous;
  openCourt();
});
$('courtForm').addEventListener('submit', saveCourt);
$('editCourt').onclick = () => {
  const court = state.courts.find(c => c.id === $('sessionCourt').value);
  if (court) openCourt(court);
};
$('cancelCourt').onclick = () => $('courtDialog').close();
$('sessionCourt').addEventListener('focus', () => { $('sessionCourt').dataset.previous = $('sessionCourt').value; });
$('sessionCourt').addEventListener('change', () => {
  if ($('sessionCourt').value !== '__add__') $('sessionCourt').dataset.previous = $('sessionCourt').value;
});
$('sessionStatus').addEventListener('change', updateSessionStatusFields);
$('sessionStart').addEventListener('change', updateCourtCost);
$('courtHours').addEventListener('change', updateCourtCost);
$('courtHourlyRate').addEventListener('input', updateCourtCost);
$('deleteSession').onclick = () => {
  const sid = $('sessionId').value;
  if (confirm('Xóa buổi chơi này và các ghi nhận liên quan?')) {
    state.sessions = state.sessions.filter(s => s.id !== sid);
    $('sessionDialog').close();
    save();
    showToast('Đã xóa buổi chơi');
  }
};

$('attendanceRows').addEventListener('change', () => updateAttendance(true));
document.querySelectorAll('.attendance-tab').forEach(button => button.onclick = () => {
  attendanceActiveTab = button.dataset.attendanceTab;
  document.querySelectorAll('.attendance-tab').forEach(tab => {
    const selected = tab === button;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
  });
  renderAttendanceRows(readRows());
  updateAttendance();
});

$('attendanceRows').addEventListener('click', e => {
  const remGuest = e.target.closest('[data-remove-guest]');
  if (remGuest) {
    const rows = readRows();
    rows.splice(Number(remGuest.dataset.removeGuest), 1);
    $('attendanceDialog').dataset.rows = JSON.stringify(rows);
    renderAttendanceRows(rows);
    updateAttendance();
    return;
  }
  if (!e.target.closest('#addGuest')) return;
  const rows = readRows();
  if (rows.filter(a => a.guest || a.presence === 'present').length >= 8) {
    showToast('Buổi đã đủ 8 người');
    return;
  }
  const nums = rows.filter(a => a.guest).map(a => Number((a.name || '').match(/^Vãng lai (\d+)$/i)?.[1] || 0));
  $('guestAutoName').textContent = `Tên tự động nếu để trống: Vãng lai ${Math.max(0, ...nums) + 1}`;
  if ($('guestCustomName')) $('guestCustomName').value = '';
  $('guestGender').value = 'male';
  $('guestDialog').showModal();
});

$('guestForm').addEventListener('submit', e => {
  e.preventDefault();
  const rows = readRows();
  if (rows.filter(a => a.guest || a.presence === 'present').length >= 8) {
    $('guestDialog').close();
    showToast('Buổi đã đủ 8 người');
    return;
  }
  const nums = rows.filter(a => a.guest).map(a => Number((a.name || '').match(/^Vãng lai (\d+)$/i)?.[1] || 0)),
    customName = $('guestCustomName')?.value.trim(),
    name = customName || `Vãng lai ${Math.max(0, ...nums) + 1}`,
    gender = $('guestGender').value;
  rows.push({
    id: id(),
    name,
    gender,
    guest: true,
    presence: 'present',
    paid: true,
    feeAmount: feeFor(gender),
    paidAmount: feeFor(gender),
    paidDate: today()
  });
  $('attendanceDialog').dataset.rows = JSON.stringify(rows);
  attendanceActiveTab = 'guest';
  document.querySelectorAll('.attendance-tab').forEach(tab => {
    const selected = tab.dataset.attendanceTab === 'guest';
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
  });
  renderAttendanceRows(rows);
  updateAttendance();
  $('guestDialog').close();
  showToast(`${name} đã được thêm · đã thu phí trước`);
});

$('markAllPresent').onclick = () => {
  const rows = readRows();
  let count = rows.filter(r => r.guest || r.presence === 'present').length;
  rows.forEach(r => {
    if (!r.guest && r.presence !== 'present' && count < 8) {
      r.presence = 'present';
      count++;
    }
  });
  $('attendanceDialog').dataset.rows = JSON.stringify(rows);
  renderAttendanceRows(rows);
  updateAttendance();
};

$('attendanceForm').addEventListener('submit', e => {
  e.preventDefault();
  const s = state.sessions.find(x => x.id === $('attendanceDialog').dataset.session);
  if (!s) return;
  const rows = readRows();
  if (rows.filter(a => a.guest || a.presence === 'present').length > 8) {
    showToast('Tối đa 8 người trong một buổi');
    return;
  }
  rows.forEach(a => {
    if ((!a.feeAmount || Number(a.feeAmount) <= 0) && (a.guest || a.presence === 'present')) a.feeAmount = recordedFee(a);
    const isMonthly = isMonthlyAttendee(a);
    if (a.guest) {
      a.paid = a.paid !== false;
      a.paidAmount = a.paid ? (Number(a.paidAmount) > 0 ? Number(a.paidAmount) : recordedFee(a)) : 0;
      a.paidDate = a.paid ? (a.paidDate || s.date || today()) : null;
    } else if (a.presence !== 'present') {
      a.paid = false;
      a.paidAmount = 0;
      a.paidDate = null;
    } else if (isMonthly) {
      a.monthlyPayment = true;
      a.paid = false;
      a.paidAmount = 0;
      a.paidDate = null;
    } else if (a.paid) {
      a.paidAmount = Number(a.paidAmount) > 0 ? Number(a.paidAmount) : charge(a);
      a.paidDate = a.paidDate || s.date || today();
    } else {
      a.paidAmount = 0;
      a.paidDate = null;
    }
  });
  s.attendees = rows;
  s.attendanceSaved = true;
  $('attendanceDialog').close();
  save();
  showToast('Đã lưu điểm danh & trạng thái thu tiền!');
});

$('memberForm').addEventListener('submit', e => {
  e.preventDefault();
  const mid = $('memberId').value,
    m = {
      id: mid || id(),
      name: $('memberName').value.trim(),
      gender: $('memberGender').value,
      phone: $('memberPhone').value.trim(),
      paymentMode: $('memberPaymentMode').value
    };
  if (mid) {
    const old = state.members.find(x => x.id === mid);
    if (old) Object.assign(old, m);
    state.sessions.forEach(s => (s.attendees || []).forEach(a => {
      if (a.memberId === mid) {
        a.name = m.name;
        a.gender = m.gender;
        a.monthlyPayment = m.paymentMode === 'monthly';
        if (a.monthlyPayment) {
          a.paid = false;
          a.paidAmount = 0;
          a.paidDate = null;
        }
      }
    }));
  } else {
    state.members.push(m);
  }
  $('memberDialog').close();
  save();
  showToast('Đã lưu thành viên');
});

$('deleteMember').onclick = () => {
  const mid = $('memberId').value;
  if (confirm('Xóa thành viên khỏi danh bạ? Lịch sử buổi chơi được giữ lại.')) {
    state.members = state.members.filter(m => m.id !== mid);
    $('memberDialog').close();
    save();
    showToast('Đã xóa thành viên');
  }
};

$('collectMonthly').onclick = openMonthlyCollection;
$('monthlyMember').addEventListener('change', renderMonthlySummary);
$('monthlyMonth').addEventListener('change', renderMonthlySummary);
$('monthlyForm').addEventListener('submit', saveMonthlyCollection);

setFeeEditor(false);
if ($('toggleFees')) $('toggleFees').onclick = () => setFeeEditor($('feeSettingsFields').hidden);
$('feeSettingsForm').addEventListener('submit', saveFees);

$('expenseForm').addEventListener('submit', e => {
  e.preventDefault();
  state.expenses.push({
    id: id(),
    type: $('expenseType').value,
    amount: Number($('expenseAmount').value),
    date: $('expenseDate').value,
    note: $('expenseNote').value.trim()
  });
  $('expenseDialog').close();
  save();
  showToast('Đã ghi khoản chi');
});

$('editOpening').onclick = () => {
  $('openingAmount').value = state.opening || 0;
  $('openingDate').value = state.openingDate || today();
  $('openingDialog').showModal();
};
$('openingForm').addEventListener('submit', e => {
  e.preventDefault();
  state.opening = Number($('openingAmount').value) || 0;
  state.openingDate = $('openingDate').value || today();
  $('openingDialog').close();
  save();
  showToast('Đã lưu số dư đầu kỳ');
});
$('prevMonth').onclick = () => {
  financeCursor.setMonth(financeCursor.getMonth() - 1);
  renderFinance();
};
$('nextMonth').onclick = () => {
  financeCursor.setMonth(financeCursor.getMonth() + 1);
  renderFinance();
};

// 13. Backup File Restore (.json)
$('importBackupBtn')?.addEventListener('click', () => $('importBackupInput')?.click());
$('importBackupInput')?.addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    if (!imported || !Array.isArray(imported.members) || !Array.isArray(imported.sessions) || !Array.isArray(imported.expenses)) {
      showToast('File sao lưu không đúng định dạng của Sân Cầu');
      return;
    }
    if (!confirm(`Khôi phục dữ liệu từ file "${file.name}" (${imported.members.length} thành viên, ${imported.sessions.length} buổi chơi)? Dữ liệu hiện tại vẫn được giữ bản dự phòng.`)) {
      e.target.value = '';
      return;
    }
    localStorage.setItem('san-cau-before-import', localStorage.getItem(KEY) || JSON.stringify(state));
    localStorage.setItem(KEY, JSON.stringify(imported));
    location.reload();
  } catch {
    showToast('Không đọc được file JSON. Vui lòng kiểm tra lại file sao lưu.');
  }
});

document.querySelectorAll('dialog .close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog:not(.settings-drawer)').forEach(d => d.addEventListener('click', e => {
  if (e.target === d) d.close();
}));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
render();
