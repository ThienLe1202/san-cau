const KEY = 'san-cau-data-v1',
  $ = id => document.getElementById(id),
  localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
  today = () => localDate(),
  fmt = n => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' ₫',
  parseDate = s => new Date(s + 'T12:00:00'),
  viDate = s => parseDate(s).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }),
  shortDate = s => parseDate(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
  txDate = s => parseDate(s).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' }),
  monthKey = s => (s || today()).slice(0, 7),
  monthLabel = s => parseDate(s + '-01').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }),
  id = () => Math.random().toString(36).slice(2, 10),
  esc = (x = '') => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function parseMoneyK(val) {
  if (val == null) return 0;
  const s = String(val).trim().toLowerCase().replace(/\s+/g, '').replace(/[kđ₫]/g, '').replace(',', '.');
  if (!s) return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 1000);
}

function fmtMoneyK(vnd) {
  const n = Number(vnd);
  if (!Number.isFinite(n) || n <= 0) return '0';
  const k = Math.round(n) / 1000;
  return Number.isInteger(k) ? String(k) : String(Number(k.toFixed(3)));
}

function syncMoneyKBox(input) {
  if (!input) return;
  const wrap = input.closest('.money-k-wrap');
  const sizer = input.closest('.money-k-sizer');
  const suffix = wrap?.querySelector('.money-k-suffix');
  if (!wrap || !sizer || !suffix) return;
  const raw = String(input.value ?? '');
  const isEmpty = raw.trim() === '';
  sizer.dataset.value = isEmpty ? (input.placeholder || '0') : raw;
  wrap.classList.toggle('is-empty', isEmpty);
  const hasDecimal = !isEmpty && /[.,]/.test(raw);
  wrap.classList.toggle('is-decimal', hasDecimal);
  if (hasDecimal) {
    const vnd = parseMoneyK(raw);
    suffix.textContent = Number.isFinite(vnd) ? `(= ${fmt(vnd)})` : '.000₫';
  } else {
    suffix.textContent = '.000₫';
  }
}

function selectAllMoneyK(input) {
  if (!input || input.disabled || !input.value) return;
  try {
    input.setSelectionRange(0, input.value.length);
  } catch {
    input.select();
  }
}

function focusSelectMoneyK(input) {
  if (!input || input.disabled) return;
  input.focus();
  selectAllMoneyK(input);
  requestAnimationFrame(() => {
    if (document.activeElement === input) selectAllMoneyK(input);
  });
}

(function initMoneyKInputs() {
  const valueDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  document.querySelectorAll('.money-k-wrap').forEach(wrap => {
    const input = wrap.querySelector('input');
    if (!input || input.closest('.money-k-sizer')) return;
    const sizer = document.createElement('span');
    sizer.className = 'money-k-sizer';
    input.before(sizer);
    sizer.append(input);

    if (valueDesc && valueDesc.get && valueDesc.set) {
      Object.defineProperty(input, 'value', {
        configurable: true,
        get() { return valueDesc.get.call(this); },
        set(v) {
          valueDesc.set.call(this, v);
          syncMoneyKBox(this);
        }
      });
    }

    let justFocused = false;
    let replaceReady = false;
    let replacePrevVal = '';

    const setReplaceReady = on => {
      replaceReady = Boolean(on && input.value && !input.disabled);
      replacePrevVal = replaceReady ? input.value : '';
      wrap.classList.toggle('is-replace-ready', replaceReady);
    };

    input.addEventListener('beforeinput', ev => {
      if (!replaceReady) return;
      if (ev.inputType === 'insertText' && ev.data) {
        ev.preventDefault();
        setReplaceReady(false);
        input.value = ev.data;
        try { input.setSelectionRange(input.value.length, input.value.length); } catch {}
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (ev.inputType === 'deleteContentBackward' || ev.inputType === 'deleteContentForward') {
        ev.preventDefault();
        setReplaceReady(false);
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        setReplaceReady(false);
      }
    });

    input.addEventListener('input', () => {
      if (replaceReady) {
        const cur = input.value;
        const prev = replacePrevVal;
        setReplaceReady(false);
        if (prev && cur.length > prev.length && cur.startsWith(prev)) {
          const typed = cur.slice(prev.length);
          input.value = typed;
          try { input.setSelectionRange(typed.length, typed.length); } catch {}
        }
      }
      syncMoneyKBox(input);
    });

    input.addEventListener('change', () => syncMoneyKBox(input));

    input.addEventListener('pointerdown', () => {
      if (document.activeElement === input && replaceReady) {
        setReplaceReady(false);
      }
    });

    input.addEventListener('focus', () => {
      justFocused = true;
      setReplaceReady(true);
      selectAllMoneyK(input);
      setTimeout(() => {
        if (document.activeElement === input && replaceReady) selectAllMoneyK(input);
      }, 0);
    });

    input.addEventListener('mouseup', ev => {
      if (justFocused) {
        ev.preventDefault();
        justFocused = false;
        if (replaceReady) selectAllMoneyK(input);
      }
    });

    input.addEventListener('blur', () => {
      justFocused = false;
      setReplaceReady(false);
    });

    const form = input.closest('form');
    if (form) {
      form.addEventListener('reset', () => requestAnimationFrame(() => syncMoneyKBox(input)));
    }

    wrap.addEventListener('mousedown', ev => {
      if (ev.target === input || input.disabled) return;
      ev.preventDefault();
      focusSelectMoneyK(input);
    });

    syncMoneyKBox(input);
  });
})();

const TX_EDIT_ICON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>';
const TX_TRASH_ICON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';

function genderIcon(gender) {
  const isFemale = gender === 'female';
  if (isFemale) {
    return `<svg class="gender-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9.5" r="5"></circle><line x1="12" y1="14.5" x2="12" y2="21"></line><line x1="8.5" y1="17.5" x2="15.5" y2="17.5"></line></svg>`;
  }
  return `<svg class="gender-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.5" cy="13.5" r="5"></circle><line x1="19" y1="5" x2="14" y2="10"></line><polyline points="14.5 5 19 5 19 9.5"></polyline></svg>`;
}

function normalizeVi(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
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

function getDaNangCourtsList() {
  const list = [];
  const seen = new Set();
  const add = (name, address) => {
    const cleanName = String(name || '').trim();
    if (!cleanName || cleanName === '__add__' || cleanName === 'Sân __add__') return;
    const key = normalizeVi(cleanName);
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ name: cleanName, address: String(address || '').trim() });
  };
  if (state?.courtName) add(state.courtName, state.courtAddress || '');
  (state?.courts || []).forEach(c => { if (c && c.name) add(c.name, c.address); });
  CASUAL_PRESET_COURTS.forEach(c => add(c.name, c.address));
  return list;
}

function newState() {
  return {
    version: 2,
    fees: { male: 45000, female: 40000 },
    opening: 0,
    openingDate: today(),
    courtRate: 75000,
    courtName: 'Sân số 1',
    courtNumber: '1',
    courtAddress: '',
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
state.expenses = (Array.isArray(state.expenses) ? state.expenses : []).map(e => ({ ...e, id: e.id || id() }));
state.monthlyReceipts = (Array.isArray(state.monthlyReceipts) ? state.monthlyReceipts : []).map(r => ({ ...r, id: r.id || id() }));

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

// 2.1 Chuẩn hóa sân cố định gắn với team hiện tại
state.courtName = String(state.courtName || '').trim();
state.courtNumber = String(state.courtNumber || '').trim();
state.courtAddress = String(state.courtAddress || '').trim();
if (!state.courtName) {
  const sample = state.sessions.find(s => s.courtName || s.courtAddress) || {};
  const matched = state.courts.find(c => c.name === sample.courtName || c.id === sample.courtId) || state.courts[0];
  state.courtName = matched?.name || sample.courtName || 'Sân số 1';
  state.courtAddress = matched?.address != null ? matched.address : (sample.courtAddress || '');
}
if (!state.courtAddress) {
  const matched = state.courts.find(c => c.name.toLocaleLowerCase() === state.courtName.toLocaleLowerCase());
  if (matched?.address) state.courtAddress = matched.address;
}
let defaultTeamCourt = state.courts.find(c => c.name.toLocaleLowerCase() === state.courtName.toLocaleLowerCase());
if (!defaultTeamCourt) {
  defaultTeamCourt = { id: id(), name: state.courtName, address: state.courtAddress || '', number: '1' };
  state.courts.push(defaultTeamCourt);
} else if (state.courtAddress && !defaultTeamCourt.address) {
  defaultTeamCourt.address = state.courtAddress;
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
state.teams.forEach(t => {
  normalizeTeamSessions(t.sessions, t.members, t.fees);
  if (!t.courtName) {
    const sSample = (t.sessions || []).find(s => s.courtName || s.courtAddress);
    const cMatch = (state.courts || []).find(c => c.name === sSample?.courtName || c.id === sSample?.courtId);
    t.courtName = cMatch?.name || sSample?.courtName || 'Sân số 1';
    t.courtAddress = cMatch?.address != null ? cMatch.address : (sSample?.courtAddress || '');
    t.courtRate = Number(t.courtRate || sSample?.courtRate || 75000);
  }
});
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
    courtName: state.courtName || 'Sân số 1',
    courtNumber: state.courtNumber || '',
    courtAddress: state.courtAddress || '',
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
  state.courtName = target.courtName || 'Sân số 1';
  state.courtNumber = target.courtNumber || '';
  state.courtAddress = target.courtAddress || '';
  state.members = JSON.parse(JSON.stringify(target.members || []));
  state.sessions = JSON.parse(JSON.stringify(target.sessions || []));
  state.expenses = JSON.parse(JSON.stringify(target.expenses || []));
  state.monthlyReceipts = JSON.parse(JSON.stringify(target.monthlyReceipts || []));
  normalizeTeamSessions(state.sessions, state.members, state.fees);
  autoEnsureUpcomingSessions();
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
function monthlyReceived(memberId, month, excludeId = '') {
  return state.monthlyReceipts
    .filter(r => r.memberId === memberId && r.month === month && r.id !== excludeId)
    .reduce((n, r) => n + Number(r.amount || 0), 0);
}
function renderMonthlySummary(preserveAmount = false) {
  const mid = $('monthlyMember').value,
    month = $('monthlyMonth').value,
    editingId = $('monthlyReceiptId')?.value || '';
  if (!mid || !month) {
    $('monthlySummary').textContent = 'Chọn thành viên và tháng cần thu';
    return;
  }
  const due = monthlyDue(mid, month),
    received = monthlyReceived(mid, month, editingId);
  $('monthlySummary').textContent = 'Tổng phí ' + fmt(due) + ' · Đã nhận ' + fmt(received) + ' · Còn thu ' + fmt(Math.max(0, due - received));
  $('monthlyAmount').removeAttribute('max');
  if (!preserveAmount) {
    $('monthlyAmount').value = fmtMoneyK(Math.max(0, due - received));
  }
}
function openMonthlyCollection(receipt = null) {
  const r = receipt && receipt.id ? receipt : null;
  const members = state.members.filter(m =>
    m.paymentMode === 'monthly' ||
    (r && m.id === r.memberId) ||
    state.sessions.some(s => (s.attendees || []).some(a => a.memberId === m.id && a.monthlyPayment))
  );
  if (!members.length && !r) {
    showToast('Chưa có thành viên nào đăng ký hình thức Đóng cuối tháng');
    return;
  }
  const options = [...members];
  if (r && !options.some(m => m.id === r.memberId)) {
    options.unshift({ id: r.memberId, name: r.name || 'Thành viên' });
  }
  $('monthlyMember').innerHTML = options.map(m => '<option value="' + esc(m.id) + '">' + esc(m.name) + '</option>').join('');
  if ($('monthlyReceiptId')) $('monthlyReceiptId').value = r ? r.id : '';
  if ($('monthlyDialogTitle')) $('monthlyDialogTitle').textContent = r ? 'Sửa khoản thu cuối tháng' : 'Thu phí cuối tháng';
  if ($('saveMonthlyReceiptBtn')) $('saveMonthlyReceiptBtn').textContent = r ? 'Lưu thay đổi' : 'Ghi nhận thanh toán';
  if ($('deleteMonthlyReceipt')) $('deleteMonthlyReceipt').hidden = !r;

  $('monthlyMember').value = r ? r.memberId : (options[0]?.id || '');
  $('monthlyMonth').value = r ? r.month : monthKey(today());
  $('monthlyDate').value = r ? (r.date || today()) : today();
  if (r) {
    $('monthlyAmount').value = fmtMoneyK(r.amount);
    renderMonthlySummary(true);
  } else {
    renderMonthlySummary(false);
  }
  $('monthlyDialog').showModal();
  focusSelectMoneyK($('monthlyAmount'));
}
function saveMonthlyCollection(e) {
  e.preventDefault();
  const rid = $('monthlyReceiptId')?.value || '',
    memberId = $('monthlyMember').value,
    month = $('monthlyMonth').value,
    date = $('monthlyDate').value,
    amount = parseMoneyK($('monthlyAmount').value);
  if (!memberId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !date || date > today() || !Number.isSafeInteger(amount) || amount <= 0) {
    showToast('Nhập số tiền thực nhận hợp lệ (> 0) và ngày nhận không ở tương lai');
    return;
  }
  const memberNameStr = state.members.find(m => m.id === memberId)?.name || state.monthlyReceipts.find(x => x.id === rid)?.name || 'Thành viên';
  if (rid) {
    const existing = state.monthlyReceipts.find(x => x.id === rid);
    if (existing) {
      Object.assign(existing, { memberId, name: memberNameStr, month, date, amount });
    }
  } else {
    state.monthlyReceipts.push({
      id: id(),
      memberId,
      name: memberNameStr,
      month,
      date,
      amount
    });
  }
  $('monthlyDialog').close();
  save();
  showToast(rid ? 'Đã cập nhật khoản thu cuối tháng' : 'Đã ghi nhận tiền thực nhận vào quỹ');
}
function setFeeEditor(open) {
  if (!$('feeSettingsFields')) return;
  $('feeSettingsFields').hidden = !open;
  $('toggleFees')?.setAttribute('aria-expanded', String(open));
  if ($('toggleFees')) $('toggleFees').textContent = open ? 'Đóng điều chỉnh' : 'Điều chỉnh phí';
  $('maleFee').value = fmtMoneyK(state.fees.male);
  $('femaleFee').value = fmtMoneyK(state.fees.female);
  $('maleFee').disabled = !open;
  $('femaleFee').disabled = !open;
}
window.setFeeEditor = setFeeEditor;

function saveFees(e) {
  e.preventDefault();
  const male = parseMoneyK($('maleFee').value), female = parseMoneyK($('femaleFee').value);
  if (!$('maleFee').value.trim() || !$('femaleFee').value.trim() || !Number.isSafeInteger(male) || !Number.isSafeInteger(female) || male < 0 || female < 0) {
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
  const hours = Number($('courtHours').value), rate = parseMoneyK($('courtHourlyRate').value);
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

// 4.1. Phân tích chu kỳ & Tự động sinh tiếp buổi chơi khi hết hạn
function parseDaysFromText(text) {
  if (!text) return [];
  const s = text.toLowerCase();
  const days = new Set();

  if (/(thứ\s*2\b|t2\b|thứ\s*hai\b)/i.test(s)) days.add(1);
  if (/(thứ\s*3\b|t3\b|thứ\s*ba\b)/i.test(s)) days.add(2);
  if (/(thứ\s*4\b|t4\b|thứ\s*tư\b)/i.test(s)) days.add(3);
  if (/(thứ\s*5\b|t5\b|thứ\s*năm\b)/i.test(s)) days.add(4);
  if (/(thứ\s*6\b|t6\b|thứ\s*sáu\b)/i.test(s)) days.add(5);
  if (/(thứ\s*7\b|t7\b|thứ\s*bảy\b)/i.test(s)) days.add(6);
  if (/(chủ\s*nhật\b|cn\b|t8\b)/i.test(s)) days.add(0);

  if (days.size === 0) {
    const combined = s.match(/\b([2-7])\s*[-–&,và/]+\s*([2-7])(?:\s*[-–&,và/]+\s*([2-7]))?\b/);
    if (combined) {
      for (let i = 1; i < combined.length; i++) {
        if (combined[i]) days.add(Number(combined[i]) - 1);
      }
    }
  }
  return Array.from(days).sort((a, b) => a - b);
}

function detectSchedulePattern() {
  const sorted = [...(state.sessions || [])].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-12);

  const dayStats = {};
  for (const s of recent) {
    if (!s.date) continue;
    const d = parseDate(s.date);
    if (isNaN(d.getTime())) continue;
    const dow = d.getDay();
    if (!dayStats[dow]) {
      dayStats[dow] = { count: 0, latestSession: s };
    }
    dayStats[dow].count++;
    dayStats[dow].latestSession = s;
  }

  const dowKeys = Object.keys(dayStats).map(Number);
  let recurringDays = [];

  if (dowKeys.length > 0) {
    const maxCount = Math.max(...dowKeys.map(k => dayStats[k].count));
    const threshold = recent.length <= 4 ? 1 : Math.max(2, Math.floor(maxCount * 0.5));
    recurringDays = dowKeys.filter(k => dayStats[k].count >= threshold).sort((a, b) => a - b);
  }

  if (!recurringDays.length) {
    const text = (state.scheduleHint || '') + ' ' + (state.teamName || '');
    recurringDays = parseDaysFromText(text);
  }

  if (!recurringDays.length) {
    recurringDays = [2, 4];
  }

  const defaultCourt = state.courts.find(c => c.id === 'court-default') || state.courts[0] || { id: 'court-default', name: 'Sân số 1', address: '', number: '1' };

  let parsedTime = null;
  const timeMatch = (state.scheduleHint || '').match(/([01]?\d|2[0-3]):([0-5]\d)\s*[-–—đến\s]+\s*([01]?\d|2[0-3]):([0-5]\d)/);
  if (timeMatch) {
    parsedTime = {
      start: `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`,
      end: `${timeMatch[3].padStart(2, '0')}:${timeMatch[4]}`
    };
  }

  const latestAnySession = [...recent].reverse().find(s => s.status !== 'passed') || recent[recent.length - 1];
  const templatesByDay = {};

  for (const dow of recurringDays) {
    const s = dayStats[dow]?.latestSession || latestAnySession;
    const hours = s ? Number(s.courtHours ?? sessionHours(s)) || 2 : 2;
    const rate = Number(state.courtRate || (s ? (s.courtRate ?? (s.courtCost != null ? s.courtCost / hours : 75000)) : 75000));
    const courtId = s?.courtId || defaultCourt.id;
    const court = state.courts.find(c => c.id === courtId) || defaultCourt;

    templatesByDay[dow] = {
      start: s?.start || parsedTime?.start || '17:30',
      end: s?.end || parsedTime?.end || '19:30',
      courtId: court.id,
      courtName: state.courtName || court.name || 'Sân số 1',
      courtAddress: state.courtAddress || court.address || '',
      courtNumber: court.number || '',
      courtHours: hours,
      courtRate: rate,
      courtCost: Math.round(hours * rate)
    };
  }

  return { recurringDays, templatesByDay };
}

function autoEnsureUpcomingSessions(force = false) {
  if (state.activeMode === 'casual') return 0;

  const nowStr = today();
  const upcoming = (state.sessions || []).filter(s => s.date >= nowStr);

  if (!force && upcoming.length >= 2) return 0;

  const { recurringDays, templatesByDay } = detectSchedulePattern();
  if (!recurringDays.length) return 0;

  const existingDates = new Set((state.sessions || []).map(s => s.date));
  const sorted = [...(state.sessions || [])].sort((a, b) => a.date.localeCompare(b.date));
  const latestSession = sorted.length ? sorted[sorted.length - 1] : null;
  const latestDateStr = latestSession?.date;

  let cursor;
  if (latestDateStr && latestDateStr >= nowStr) {
    cursor = parseDate(latestDateStr);
    cursor.setDate(cursor.getDate() + 1);
  } else {
    cursor = parseDate(nowStr);
  }

  const targetBatch = 8;
  const newSessions = [];
  let safety = 0;

  while (newSessions.length < targetBatch && safety++ < 365) {
    const dow = cursor.getDay();
    const isoDate = localDate(cursor);

    if (recurringDays.includes(dow) && !existingDates.has(isoDate)) {
      const template = templatesByDay[dow] || templatesByDay[recurringDays[0]];
      newSessions.push({
        id: id(),
        date: isoDate,
        start: template.start,
        end: template.end,
        note: '',
        courtId: template.courtId,
        courtName: template.courtName,
        courtAddress: template.courtAddress,
        courtNumber: template.courtNumber,
        status: 'played',
        courtHours: template.courtHours,
        courtRate: template.courtRate,
        courtCost: template.courtCost,
        passAmount: 0,
        passDate: null,
        attendees: []
      });
      existingDates.add(isoDate);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (newSessions.length > 0) {
    state.sessions = [...(state.sessions || []), ...newSessions];
    state.sessions.sort((a, b) => a.date.localeCompare(b.date));
    syncActiveTeamToRegistry();
    localStorage.setItem(KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('san-cau-saved'));
    return newSessions.length;
  }

  return 0;
}
autoEnsureUpcomingSessions();

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
                <b>${esc(venueTitle)}${esc(courtNo)}</b>
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
            </div>
            <div class="session-location">
              <b>${esc(venueTitle)}${esc(courtNo)}</b>
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
          <div class="fin-sub-row">
            <span>Chi phí sân (trả cuối tháng):</span>
            <strong>${fmt(costAmount)}</strong>
          </div>
        </div>

        <div class="session-bottom">
          <div class="attendee-meta-col">
            ${slotRemaining > 0
              ? `<small class="slot-warning-dot">● Còn trống ${slotRemaining} suất đánh</small>`
              : `<small class="slot-warning-dot" style="color:var(--green)">● Đã đủ suất đánh</small>`}
            <span class="attendee-badge-blue">(${fixedCount} cố định, ${guestCount} khách)</span>
          </div>
          <div class="session-actions">
            <button type="button" class="mini-btn" data-attendance="${esc(s.id)}">Điểm danh</button>
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
let financePreviewFilter = 'all';
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
    $('topbarModeEyebrow').textContent = isCasual ? 'KÈO LẺ PHÁT SINH' : 'SÂN CẦU CỐ ĐỊNH';
    $('topbarModeEyebrow').className = isCasual ? 'topbar-eyebrow casual-eyebrow' : 'topbar-eyebrow';
  }
  if ($('contextSwitcherIcon')) {
    $('contextSwitcherIcon').hidden = isCasual;
    $('contextSwitcherIcon').textContent = isCasual ? '' : '🏸';
  }
  if ($('contextSwitcherLabel')) $('contextSwitcherLabel').textContent = isCasual ? 'Kèo Vãng Lai' : (state.teamName || 'Team T3 – T5');
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

  // Tự động duy trì các buổi chơi sắp tới khi hết hạn
  const autoCreated = autoEnsureUpcomingSessions();
  if (autoCreated > 0) {
    showToast(`Đã tự động cập nhật ${autoCreated} buổi chơi sắp tới`);
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
  $('financeBalance').innerHTML = fmtHtml(curBalance);
  $('monthSummary').textContent = monthLabel(thisMonth);

  const totalInc = incomeTotal() + monthlyReceiptsTotal();
  const totalExp = expenseTotal();
  if ($('monthIncome')) $('monthIncome').textContent = '+' + fmt(totalInc);
  if ($('monthExpense')) $('monthExpense').textContent = '−' + fmt(totalExp);

  // Section Thông tin Sân Cố định trên Dashboard
  if ($('dashboardCourtName')) {
    const cName = state.courtName || 'Sân số 1';
    const rawCourtNo = String(state.courtNumber || '').trim();
    const cAddr = state.courtAddress || '';
    const cRate = Number(state.courtRate || 75000);
    $('dashboardCourtName').textContent = cName;
    if ($('dashboardCourtNumber')) {
      $('dashboardCourtNumber').textContent = rawCourtNo
        ? (/^sân\s/i.test(rawCourtNo) ? rawCourtNo : `Sân ${rawCourtNo}`)
        : 'Chưa nhập số sân';
    }
    $('dashboardCourtAddress').textContent = cAddr ? cAddr : 'Chưa cập nhật địa chỉ sân (Bấm để bổ sung)';
    $('dashboardCourtRate').textContent = fmt(cRate);

    const est = monthlyCourtEstimate(thisMonth);
    if ($('dashboardCourtEstimateAmount')) {
      $('dashboardCourtEstimateAmount').textContent = fmt(est.amount);
    }
    if ($('dashboardCourtEstimateDetail')) {
      $('dashboardCourtEstimateDetail').textContent = `${est.count} buổi · ${est.hours.toLocaleString('vi-VN')} giờ`;
    }
    if ($('dashboardCourtMonthPill')) {
      $('dashboardCourtMonthPill').textContent = monthLabel(thisMonth);
    }
  }

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
  if ($('unpaidSectionBox')) {
    $('unpaidSectionBox').hidden = unpaid.length === 0;
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
  if ($('memberMonthLabel')) $('memberMonthLabel').textContent = monthLabel(memberMonth);
  if ($('memberMonth')) $('memberMonth').value = memberMonth;
  $('memberAttendanceHint').textContent = 'Số buổi thực tế có mặt trên sân trong ' + monthLabel(memberMonth) + ' (không tính đăng ký nhưng vắng)';
  $('memberCount').innerHTML = `<span class="status-dot"></span> ${state.members.length} cố định`;
  if ($('memberCountHeading')) $('memberCountHeading').textContent = String(state.members.length);
  if ($('memberStatsUpdated')) {
    const nowTime = new Date();
    const hh = String(nowTime.getHours()).padStart(2, '0');
    const mm = String(nowTime.getMinutes()).padStart(2, '0');
    $('memberStatsUpdated').textContent = `Cập nhật lúc ${hh}:${mm}`;
  }

  // Monthly attendance analytics
  const occurredInMonth = state.sessions.filter(s => s.status !== 'passed' && s.date <= now && monthKey(s.date) === memberMonth);
  const sortedMembers = [...state.members]
    .map(m => ({ member: m, count: memberAttendanceCount(m.id, memberMonth) }))
    .sort((a, b) => b.count - a.count || (a.member.name || '').localeCompare(b.member.name || '', 'vi'));

  const totalTurns = sortedMembers.reduce((sum, x) => sum + x.count, 0);
  const fixedMemberIds = new Set(state.members.map(m => m.id));
  const playedSessionsCount = occurredInMonth.filter(s =>
    (s.attendees || []).some(a => !a.guest && a.presence === 'present' && (!a.memberId || fixedMemberIds.has(a.memberId)))
  ).length;

  let leastText = '—';
  let leastTitle = '';
  if (sortedMembers.length) {
    const minCount = Math.min(...sortedMembers.map(x => x.count));
    const leastList = sortedMembers.filter(x => x.count === minCount);
    const firstName = leastList[0].member.name || '—';
    leastText = leastList.length > 1 ? `${firstName} +${leastList.length - 1}` : firstName;
    leastTitle = `${leastList.map(x => x.member.name).join(', ')} (${minCount} buổi)`;
  }

  if ($('statTotalTurns')) $('statTotalTurns').textContent = String(totalTurns);
  if ($('statPlayedSessions')) $('statPlayedSessions').textContent = String(playedSessionsCount);
  if ($('statLeastMember')) {
    $('statLeastMember').textContent = leastText;
    $('statLeastMember').title = leastTitle;
  }

  $('membersList').innerHTML = sortedMembers.length
    ? sortedMembers.map(({ member: m, count }) => {
        const isMonthly = m.paymentMode === 'monthly';
        const isZero = count === 0;
        const subtitleText = isZero
          ? 'Chưa có lượt tháng này'
          : (m.phone ? m.phone : 'Thành viên cố định');
        return `
          <div class="tx-swipe-item ${isZero ? 'is-inactive' : ''}" data-tx-swipe>
            <div class="tx-swipe-actions">
              <button type="button" class="tx-action-btn edit" data-edit-member="${esc(m.id)}" aria-label="Chỉnh sửa" title="Chỉnh sửa">${TX_EDIT_ICON_SVG}</button>
              <button type="button" class="tx-action-btn delete" data-delete-member="${esc(m.id)}" aria-label="Xóa" title="Xóa">${TX_TRASH_ICON_SVG}</button>
            </div>
            <div class="member-row tx-swipe-content is-editable ${isZero ? 'is-inactive' : ''}">
              <div class="person-avatar ${m.gender === 'female' ? 'female' : ''}">${genderIcon(m.gender)}</div>
              <div class="transaction-main">
                <div class="transaction-col-left">
                  <strong class="transaction-title">${esc(m.name)}</strong>
                  <span class="transaction-date">${esc(subtitleText)}</span>
                </div>
                <div class="transaction-col-right">
                  <span class="transaction-amount ${isZero ? 'is-zero' : ''}">${count} buổi tham gia</span>
                  <span class="transaction-type">${isMonthly ? 'Đóng cuối tháng' : 'Đóng từng buổi'}</span>
                </div>
              </div>
            </div>
          </div>`;
      }).join('')
    : '<div class="empty">Danh bạ đang trống. Hãy bấm "+ Thêm" hoặc dùng khung Nhập nhanh bên dưới.</div>';

  renderFinance();
}

function getScheduledWeekdays() {
  const text = `${state.teamName || ''} ${state.scheduleHint || ''}`.toLocaleLowerCase();
  const days = new Set();
  if (/thứ\s*2|thứ\s*hai|\bt2\b/.test(text)) days.add(1);
  if (/thứ\s*3|thứ\s*ba|\bt3\b/.test(text)) days.add(2);
  if (/thứ\s*4|thứ\s*tư|\bt4\b/.test(text)) days.add(3);
  if (/thứ\s*5|thứ\s*năm|\bt5\b/.test(text)) days.add(4);
  if (/thứ\s*6|thứ\s*sáu|\bt6\b/.test(text)) days.add(5);
  if (/thứ\s*7|thứ\s*bảy|\bt7\b/.test(text)) days.add(6);
  if (/chủ\s*nhật|\bcn\b/.test(text)) days.add(0);
  return days.size ? [...days] : [2, 4];
}

function monthlyCourtEstimate(month) {
  const [year, mon] = (month || monthKey(today())).split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const weekdays = getScheduledWeekdays();
  const sampleSession = state.sessions.find(s => Number(s.courtRate) > 0);
  const rate = Number(state.courtRate || sampleSession?.courtRate || 75000);

  // Cố định tất cả thứ 3 và thứ 5 trong tháng, mỗi ngày 2 tiếng
  // Tiền trả cho sân = Giá sân theo giờ × Tổng giờ (không liên quan đến việc nhường sân)
  // Tổng giờ thuê sân trong tháng chỉ dựa vào số ngày T3 và T5 trong tháng
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, mon - 1, day, 12);
    if (weekdays.includes(d.getDay())) {
      count++;
    }
  }

  const totalHours = count * 2;
  const totalAmount = Math.round(totalHours * rate);

  return {
    count,
    hours: totalHours,
    rate,
    amount: totalAmount,
    fixed: true
  };
}

function previewMonthlyCourtEstimate(month, customRate = null) {
  const [year, mon] = (month || monthKey(today())).split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const weekdays = getScheduledWeekdays();
  const rate = customRate != null && Number(customRate) > 0 ? Number(customRate) : Number(state.courtRate || 75000);

  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, mon - 1, day, 12);
    if (weekdays.includes(d.getDay())) {
      count++;
    }
  }

  const totalHours = count * 2;
  const totalAmount = Math.round(totalHours * rate);

  return { count, hours: totalHours, rate, amount: totalAmount, fixed: true };
}

function updateTeamCourtInfo({ name, number, address, rate }) {
  const newName = String(name || '').trim() || 'Sân số 1';
  const newNumber = String(number || '').trim();
  const newAddress = String(address || '').trim();
  const newRate = Number(rate) > 0 ? Number(rate) : Number(state.courtRate || 75000);

  state.courtName = newName;
  state.courtNumber = newNumber;
  state.courtAddress = newAddress;
  state.courtRate = newRate;

  // Lưu hoặc cập nhật vào danh bạ sân đã nhập (state.courts) để ghi nhớ lâu dài trong data
  const normNewName = normalizeVi(newName);
  let courtObj = state.courts.find(c => normalizeVi(c.name) === normNewName);
  if (courtObj) {
    courtObj.name = newName;
    courtObj.address = newAddress;
    if (newNumber) courtObj.number = newNumber;
  } else {
    courtObj = { id: id(), name: newName, address: newAddress, number: newNumber };
    state.courts.push(courtObj);
  }

  // Đồng bộ địa chỉ mới cho các team khác (nếu có) đang dùng cùng sân này
  (state.teams || []).forEach(t => {
    if (t && normalizeVi(t.courtName) === normNewName) {
      t.courtAddress = newAddress;
    }
  });

  // Cập nhật cho tất cả buổi chơi trong tháng hiện tại và sắp tới của team cố định
  const curMonth = monthKey(today());
  const todayStr = today();
  for (const s of state.sessions) {
    s.courtName = newName;
    s.courtNumber = newNumber;
    s.courtAddress = newAddress;
    if (courtObj.id) s.courtId = courtObj.id;

    // Khi thay đổi giá giờ sân thì mục tiền sân tạm tính sẽ lập tức thay đổi theo, thay đổi cho tháng đó luôn
    if (monthKey(s.date) === curMonth || s.date >= todayStr) {
      if (s.status !== 'passed') {
        s.courtRate = newRate;
        const hrs = Number(s.courtHours ?? sessionHours(s)) || 2;
        s.courtCost = Math.round(hrs * newRate);
      }
    }
  }

  save();
  const numLabel = newNumber ? ` · Sân ${newNumber}` : '';
  showToast(`Đã lưu ${newName}${numLabel} (${fmt(newRate)}/giờ) và cập nhật tiền tạm tính tháng này!`);
}

function updateTeamCourtPreview() {
  const rateInput = parseMoneyK($('teamCourtInputRate')?.value) || 0;
  const est = previewMonthlyCourtEstimate(monthKey(today()), rateInput > 0 ? rateInput : null);
  if ($('teamCourtPreviewAmount')) {
    $('teamCourtPreviewAmount').textContent = fmt(est.amount);
  }
  if ($('teamCourtPreviewDetail')) {
    const curMonthKey = monthKey(today());
    const effRate = rateInput > 0 ? rateInput : (state.courtRate || 75000);
    const mStr = monthLabel(curMonthKey);
    const capMonth = mStr.charAt(0).toUpperCase() + mStr.slice(1);
    $('teamCourtPreviewDetail').textContent = `${capMonth} · ${est.count} buổi · ${est.hours.toLocaleString('vi-VN')} giờ × ${fmt(effRate)}/giờ`;
  }
}

function openTeamCourtEditDialog(focusFieldId = null) {
  const courts = getDaNangCourtsList();
  const currentName = String(state.courtName || '').trim();
  const selectName = $('teamCourtInputName');

  if (selectName) {
    let matched = courts.find(c => normalizeVi(c.name) === normalizeVi(currentName));
    if (!matched && currentName && currentName !== 'Sân số 1') {
      matched = { name: currentName, address: state.courtAddress || '' };
      courts.unshift(matched);
    }

    selectName.innerHTML = courts.map(c => `
      <option value="${esc(c.name)}">${esc(c.name)}</option>
    `).join('') + '<option value="__custom__">＋ Nhập tên sân khác...</option>';

    if (matched) {
      selectName.value = matched.name;
      if ($('customCourtNameWrap')) $('customCourtNameWrap').hidden = true;
    } else if (currentName && currentName !== 'Sân số 1') {
      selectName.value = '__custom__';
      if ($('customCourtNameWrap')) $('customCourtNameWrap').hidden = false;
      if ($('teamCourtCustomName')) $('teamCourtCustomName').value = currentName;
    } else {
      selectName.value = courts[0]?.name || '';
      if ($('customCourtNameWrap')) $('customCourtNameWrap').hidden = true;
    }
  }

  // Số sân (nhập tay)
  if ($('teamCourtInputNumber')) $('teamCourtInputNumber').value = state.courtNumber || '';

  // Địa chỉ sân (lấy theo sân được chọn hoặc state.courtAddress)
  const currentSelectedCourt = courts.find(c => c.name === selectName?.value);
  if ($('teamCourtInputAddress')) {
    $('teamCourtInputAddress').value = state.courtAddress || currentSelectedCourt?.address || '';
  }

  // Giá sân
  if ($('teamCourtInputRate')) $('teamCourtInputRate').value = fmtMoneyK(state.courtRate || 75000);

  document.querySelectorAll('.quick-rate-chips .chip-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.rate) === Number(state.courtRate));
  });

  updateTeamCourtPreview();
  $('teamCourtEditDialog')?.showModal();
  if (typeof focusFieldId === 'string' && $(focusFieldId)) {
    setTimeout(() => {
      $(focusFieldId)?.focus();
      if ($(focusFieldId)?.select) $(focusFieldId).select();
    }, 60);
  }
}

function fmtHtml(n, sign = '') {
  const num = Number(n || 0);
  const absFormatted = Math.abs(Math.round(num)).toLocaleString('vi-VN');
  const prefix = sign || (num < 0 ? '−' : '');
  return `${prefix}${absFormatted}<span class="currency-unit">₫</span>`;
}

function buildTransactionIconHtml(t) {
  if (t.type === 'shuttle') {
    return '<svg class="tx-svg" width="18" height="18" viewBox="0 0 19.9991 20.0006" fill="none" aria-hidden="true"><path d="M10.3 0.00150749C9.33 0.0315075 8.58 0.841507 8.61 1.80151C8.62 2.04151 8.67 2.27151 8.77 2.50151L9.06 3.14151C9.1 3.27151 9.03 3.41151 8.89 3.45151C8.8 3.50151 8.7 3.45151 8.63 3.37151L8.21 2.82151C7.88 2.40151 7.38 2.14151 6.85 2.13151C5.88 2.11151 5.08 2.88151 5.06 3.84151C5.05 4.26151 5.19 4.66151 5.45 5.00151L5.87 5.50151H5.88C5.96 5.63151 5.93 5.79151 5.82 5.87151C5.73 5.94151 5.61 5.94151 5.53 5.87151L5 5.45151C4.66 5.19151 4.25 5.05151 3.84 5.06151C2.88 5.08151 2.11 5.88151 2.13 6.85151C2.14 7.38151 2.4 7.88151 2.82 8.21151L3.39 8.65151C3.5 8.75151 3.5 8.91151 3.38 9.00151C3.31 9.07151 3.21 9.09151 3.12 9.05151H3.11L2.5 8.77151C2.27 8.68151 2.04 8.62151 1.8 8.61151C0.84 8.58151 0.03 9.34151 0 10.3115C0 11.0315 0.4 11.6915 1.06 11.9715L12.45 17.0415L17.04 12.4515L11.97 1.06151C11.69 0.391507 11 -0.0284925 10.3 0.00150749ZM11.13 4.10151C11.55 4.09151 11.93 4.33151 12.09 4.71151L15.14 11.5515L11.19 7.61151L10.26 5.50151C9.96 4.87151 10.42 4.12151 11.13 4.10151ZM7.85 6.85151C8.12 6.85151 8.37 6.95151 8.56 7.15151L13.37 11.9615C13.77 12.3415 13.78 12.9715 13.4 13.3715C13 13.7715 12.38 13.7815 11.96 13.3715L7.15 8.56151C6.75 8.18151 6.74 7.54151 7.13 7.15151C7.32 6.95151 7.58 6.85151 7.85 6.85151ZM5.13 10.1715C5.26 10.1715 5.4 10.2115 5.5 10.2615L7.63 11.2015L11.57 15.1415L4.71 12.0915C3.69 11.6515 4.03 10.1415 5.13 10.1715ZM18.28 14.0415L14.04 18.2815L14.89 19.1315C15.65 19.8815 16.75 20.1715 17.78 19.9015C18.81 19.6215 19.62 18.8115 19.9 17.7815C20.17 16.75 19.88 15.65 19.13 14.8915L18.28 14.0415Z" fill="currentColor"/></svg>';
  }
  if (t.amount < 0) {
    return '<svg class="tx-svg" width="18" height="17" viewBox="0 0 19 18" fill="none" aria-hidden="true"><path d="M18 15V16C18 16.5304 17.7893 17.0391 17.4142 17.4142C17.0391 17.7893 16.5304 18 16 18H2C0.89 18 0 17.1 0 16V2C0 1.46957 0.210714 0.960859 0.585786 0.585786C0.960859 0.210714 1.46957 0 2 0H16C16.5304 0 17.0391 0.210714 17.4142 0.585786C17.7893 0.960859 18 1.46957 18 2V3H9C7.89 3 7 3.9 7 5V13C7 13.5304 7.21071 14.0391 7.58579 14.4142C7.96086 14.7893 8.46957 15 9 15H18ZM9 13H19V5H9V13ZM13 10.5C12.6022 10.5 12.2206 10.342 11.9393 10.0607C11.658 9.77936 11.5 9.39782 11.5 9C11.5 8.60218 11.658 8.22064 11.9393 7.93934C12.2206 7.65804 12.6022 7.5 13 7.5C13.3978 7.5 13.7794 7.65804 14.0607 7.93934C14.342 8.22064 14.5 8.60218 14.5 9C14.5 9.39782 14.342 9.77936 14.0607 10.0607C13.7794 10.342 13.3978 10.5 13 10.5Z" fill="currentColor"/></svg>';
  }
  return '<svg class="tx-svg" width="20" height="15" viewBox="0 0 22 16" fill="none" aria-hidden="true"><path d="M4 0H22V12H4V0ZM13 3C13.7956 3 14.5587 3.31607 15.1213 3.87868C15.6839 4.44129 16 5.20435 16 6C16 6.79565 15.6839 7.55871 15.1213 8.12132C14.5587 8.68393 13.7956 9 13 9C12.2044 9 11.4413 8.68393 10.8787 8.12132C10.3161 7.55871 10 6.79565 10 6C10 5.20435 10.3161 4.44129 10.8787 3.87868C11.4413 3.31607 12.2044 3 13 3V3ZM8 2C8 2.53043 7.78929 3.03914 7.41421 3.41421C7.03914 3.78929 6.53043 4 6 4V8C6.53043 8 7.03914 8.21071 7.41421 8.58579C7.78929 8.96086 8 9.46957 8 10H18C18 9.46957 18.2107 8.96086 18.5858 8.58579C18.9609 8.21071 19.4696 8 20 8V4C19.4696 4 18.9609 3.78929 18.5858 3.41421C18.2107 3.03914 18 2.53043 18 2H8ZM0 4H2V14H18V16H0V4Z" fill="currentColor"/></svg>';
}

function renderFinance() {
  if ($('maleFee')) $('maleFee').value = fmtMoneyK(state.fees.male);
  if ($('femaleFee')) $('femaleFee').value = fmtMoneyK(state.fees.female);
  const mk = monthKey(localDate(financeCursor));
  $('financeMonth').textContent = monthLabel(mk);

  const courtEstimate = monthlyCourtEstimate(mk);
  $('courtEstimateTitle').textContent = 'Tiền sân ' + monthLabel(mk);
  $('courtEstimateAmount').innerHTML = fmtHtml(courtEstimate.amount);
  $('courtEstimateDetail').textContent = courtEstimate.count + ' buổi · ' +
    courtEstimate.hours.toLocaleString('vi-VN') + ' giờ × ' + fmt(courtEstimate.rate) + '/giờ';

  $('openingSummary').innerHTML = `Số dư đầu kỳ: <strong class="opening-val">${fmt(state.opening)}</strong>`;

  const ins = incomeTotal() + monthlyReceiptsTotal();
  const outs = expenseTotal();
  $('financeIncome').innerHTML = fmtHtml(ins, '+');
  $('financeExpense').innerHTML = fmtHtml(outs, '−');

  const allTrans = state.monthlyReceipts
    .map(r => ({
      date: r.date || today(),
      label: r.name,
      feeType: 'Phí cuối tháng',
      amount: Number(r.amount || 0),
      category: 'monthly',
      editMonthlyId: r.id
    }));

  for (const s of state.sessions) {
    if (s.status === 'passed' && Number(s.passAmount || 0) > 0) {
      allTrans.push({
        date: s.passDate || s.date,
        label: 'Thu tiền nhường sân',
        feeType: 'Chuyển khoản',
        amount: Number(s.passAmount),
        category: 'court'
      });
    } else if (s.status !== 'passed') {
      for (const a of s.attendees || []) {
        const amt = attendeePaidAmount(a);
        if (amt > 0) {
          allTrans.push({
            date: a.paidDate || s.date,
            label: memberName(a),
            feeType: a.guest ? 'Phí vãng lai' : 'Phí theo buổi',
            amount: amt,
            category: 'session'
          });
        }
      }
    }
  }
  for (const e of state.expenses) {
    if (Number(e.amount || 0) > 0) {
      const cat = e.type === 'shuttle' ? 'shuttle' : e.type === 'court' ? 'court' : 'other';
      allTrans.push({
        date: e.date || today(),
        label: e.note || (e.type === 'shuttle' ? 'Mua cầu' : e.type === 'court' ? 'Tiền sân' : 'Khoản chi'),
        feeType: e.type === 'shuttle' ? 'Chi phí cầu' : e.type === 'court' ? 'Tiền sân' : 'Khoản chi',
        amount: -Number(e.amount),
        type: e.type,
        category: cat,
        editExpenseId: e.id
      });
    }
  }

  allTrans.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const buildTxRowInner = t => `
        <div class="transaction-icon ${t.amount < 0 ? 'out' : ''} ${t.type === 'shuttle' ? 'is-shuttle' : ''}">
          ${buildTransactionIconHtml(t)}
        </div>
        <div class="transaction-main">
          <div class="transaction-col-left">
            <strong class="transaction-title">${esc(t.label)}</strong>
            <span class="transaction-date">${txDate(t.date)}</span>
          </div>
          <div class="transaction-col-right">
            <span class="transaction-amount ${t.amount < 0 ? 'out' : ''}">${t.amount < 0 ? '−' : '+'}${fmt(Math.abs(t.amount))}</span>
            <span class="transaction-type">${esc(t.feeType || '')}</span>
          </div>
        </div>`;

  // 1. Preview list on Finance tab (top 3 matching category chip)
  const previewContainer = $('transactionsPreview');
  if (previewContainer) {
    const previewList = allTrans
      .filter(t => financePreviewFilter === 'all' || t.category === financePreviewFilter)
      .slice(0, 3);
    previewContainer.innerHTML = previewList.length
      ? previewList.map(t => `<div class="transaction-row tx-preview-row" role="button" tabindex="0">${buildTxRowInner(t)}</div>`).join('')
      : '<div class="empty">Chưa có giao dịch trong mục này.</div>';
  }

  // 2. Full list on Transactions sub-view (filtered by all/income/expense, with swipe edit/delete)
  const fullTrans = allTrans.filter(t => transactionFilter === 'all' || (transactionFilter === 'income' ? t.amount > 0 : t.amount < 0));

  $('transactions').innerHTML = fullTrans.length
    ? fullTrans.map(t => {
      const editable = !!(t.editMonthlyId || t.editExpenseId);
      const rowInner = buildTxRowInner(t);

      if (!editable) {
        return `<div class="transaction-row">${rowInner}</div>`;
      }

      const editAttr = t.editMonthlyId ? `data-edit-monthly="${esc(t.editMonthlyId)}"` : `data-edit-expense="${esc(t.editExpenseId)}"`;
      const deleteAttr = t.editMonthlyId ? `data-delete-monthly="${esc(t.editMonthlyId)}"` : `data-delete-expense="${esc(t.editExpenseId)}"`;
      return `
        <div class="tx-swipe-item" data-tx-swipe>
          <div class="tx-swipe-actions">
            <button type="button" class="tx-action-btn edit" ${editAttr} aria-label="Chỉnh sửa" title="Chỉnh sửa">${TX_EDIT_ICON_SVG}</button>
            <button type="button" class="tx-action-btn delete" ${deleteAttr} aria-label="Xóa" title="Xóa">${TX_TRASH_ICON_SVG}</button>
          </div>
          <div class="transaction-row tx-swipe-content is-editable">${rowInner}</div>
        </div>`;
    }).join('')
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
  const navTabName = name === 'transactions' ? 'finance' : name;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === navTabName));
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
        <div class="context-card-body">
          <div class="context-card-title-wrap">
            <strong>${esc(t.name)}</strong>
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
  if ($('newTeamCourtName')) $('newTeamCourtName').value = 'Sân số 1';
  if ($('newTeamCourtRate')) $('newTeamCourtRate').value = fmtMoneyK(75000);
  if ($('newTeamCourtAddress')) $('newTeamCourtAddress').value = '';
  $('newTeamMaleFee').value = fmtMoneyK(45000);
  $('newTeamFemaleFee').value = fmtMoneyK(40000);
  $('newTeamOpening').value = fmtMoneyK(0);
  $('teamDialog')?.showModal();
});

$('teamForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const name = $('newTeamName').value.trim();
  if (!name) return;
  syncActiveTeamToRegistry();
  const newId = 'team-' + id();
  const courtName = $('newTeamCourtName')?.value.trim() || 'Sân số 1';
  const courtAddress = $('newTeamCourtAddress')?.value.trim() || '';
  const courtRate = parseMoneyK($('newTeamCourtRate')?.value) || 75000;

  // Lưu sân vào state.courts nếu chưa có
  let cObj = state.courts.find(c => c.name.toLocaleLowerCase() === courtName.toLocaleLowerCase());
  if (cObj) {
    if (courtAddress && !cObj.address) cObj.address = courtAddress;
  } else {
    state.courts.push({ id: id(), name: courtName, address: courtAddress, number: '1' });
  }

  const newTeam = {
    id: newId,
    name,
    scheduleHint: $('newTeamSchedule').value.trim() || 'Lịch sinh hoạt cố định hàng tuần',
    courtName,
    courtAddress,
    courtRate,
    fees: {
      male: parseMoneyK($('newTeamMaleFee').value) || 45000,
      female: parseMoneyK($('newTeamFemaleFee').value) || 40000
    },
    opening: parseMoneyK($('newTeamOpening').value) || 0,
    openingDate: today(),
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
  $('passAmount').value = fmtMoneyK(s?.passAmount || 0);
  const duration = s ? Number(s.courtHours ?? sessionHours(s)) : 2,
    hours = COURT_HOURS.includes(duration) ? duration : 2;
  $('courtHours').value = String(hours);
  $('courtHourlyRate').value = fmtMoneyK(s?.courtRate ?? (s?.courtCost != null ? s.courtCost / hours : state.courtRate));
  $('deleteSession').hidden = !s;
  updateSessionStatusFields();
  $('sessionDialog').showModal();
}

// 9. Screen 03: Unified Attendance & On-Court Payment Collection
let attendanceActiveTab = 'fixed';
function buildGuestInviteText(s) {
  const d = parseDate(s.date || today());
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const court = state.courts.find(c => c.id === s.courtId) || state.courts.find(c => normalizeVi(c.name) === normalizeVi(s.courtName));
  const rawName = String(s.courtName || court?.name || state.courtName || 'Sân số 1').trim();
  const cleanName = rawName.replace(/^sân\s+/i, '');
  const rawAddr = String(s.courtAddress || court?.address || state.courtAddress || '').trim();
  const venueLine = rawAddr ? `📍  Sân ${cleanName} , ${rawAddr}` : `📍  Sân ${cleanName}`;
  const timeRange = `${s.start || '17:30'} – ${s.end || '19:30'}`;
  return [
    `Tìm thêm vãng lai chiều nay ${dd}/${mm}`,
    venueLine,
    `⏰ ${timeRange}`,
    `🏸  TBY`,
    `Mn tham gia cmt hoặc ib mình nhé :d :d`
  ].join('\n');
}

function syncAttendanceHeaderMeta() {
  const isGuest = attendanceActiveTab === 'guest';
  if ($('attendanceFixedMetaBox')) $('attendanceFixedMetaBox').hidden = isGuest;
  if ($('attendanceGuestInviteBox')) $('attendanceGuestInviteBox').hidden = !isGuest;
}

function openAttendance(s) {
  $('attendanceDialog').dataset.session = s.id;
  $('attendanceTitle').textContent = viDate(s.date);
  const court = state.courts.find(c => c.id === s.courtId) || state.courts.find(c => c.name === s.courtName);
  const courtText = court ? `${courtLabel(court)}${court.number ? ` (Sân ${court.number})` : ''}` : (s.courtName || 'Sân số 1');
  $('attendanceMeta').innerHTML = `
    <div class="meta-line-1">🕒 ${esc(s.start)} – ${esc(s.end)} &nbsp;•&nbsp; 📍 ${esc(courtText)}</div>
    <div class="meta-line-2">👥 Tối đa 8 người</div>
  `;
  if ($('guestInviteText')) $('guestInviteText').textContent = buildGuestInviteText(s);
  $('attendanceRows').innerHTML = '';
  attendanceActiveTab = 'fixed';
  syncAttendanceHeaderMeta();
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

    const cardHtml = `
      <div class="attendance-player-card attendance-row ${!isPresent && !a.guest ? 'is-absent' : ''} ${a.guest ? 'tx-swipe-content is-editable' : ''}" data-index="${i}">
        <div class="player-card-main">
          <div class="person">
            <div class="person-avatar ${a.gender === 'female' ? 'female' : ''}">${genderIcon(a.gender)}</div>
            <div class="attendance-name">
              <div class="player-name-row">
                <strong>${esc(memberName(a))}</strong>
              </div>
              <small>
                <b class="${a.gender === 'female' ? 'text-female' : 'text-secondary'}">${a.gender === 'female' ? 'Nữ' : 'Nam'}</b>
                &nbsp;•&nbsp; ${isMonthly ? '<i>Đóng cuối tháng</i>' : `<b>${fmt(feeVal)}</b>`}
                ${a.guest ? ' &nbsp;•&nbsp; <b class="text-success">Thu trước</b>' : ''}
              </small>
            </div>
          </div>
          ${a.guest
            ? ''
            : `<select class="presence-select ${isPresent ? 'present-active' : ''}" aria-label="Điểm danh">
                <option value="present" ${a.presence === 'present' ? 'selected' : ''}>Có mặt</option>
                <option value="not_attending" ${a.presence === 'not_attending' ? 'selected' : ''}>Không tham gia</option>
                <option value="absent" ${a.presence === 'absent' ? 'selected' : ''}>Vắng có báo</option>
              </select>`}
        </div>
        ${paymentSubRow}
      </div>`;

    if (a.guest) {
      $('attendanceRows').insertAdjacentHTML('beforeend', `
        <div class="tx-swipe-item tx-swipe-single" data-tx-swipe data-swipe-width="64">
          <div class="tx-swipe-actions tx-swipe-actions-single">
            <button type="button" class="tx-action-btn delete" data-remove-guest="${i}" aria-label="Xóa khách" title="Xóa khách">${TX_TRASH_ICON_SVG}</button>
          </div>
          ${cardHtml}
        </div>
      `);
    } else {
      $('attendanceRows').insertAdjacentHTML('beforeend', cardHtml);
    }
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
$('openBulkModalLink')?.addEventListener('click', openBulkMembersModal);

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

  // Unpaid List on Casual Hub (same UI as Fixed Team Dashboard)
  const casualUnpaid = [];
  for (const m of openMatches) {
    const calc = calcCasualSplit(m);
    (m.players || []).forEach((p, index) => {
      const fee = calc.feeForPlayer(p);
      if (fee > 0 && !p.paid) {
        casualUnpaid.push({ m, p, index, fee });
      }
    });
  }
  if ($('casualUnpaidSectionBox')) {
    $('casualUnpaidSectionBox').hidden = casualUnpaid.length === 0;
  }
  if ($('casualUnpaidList')) {
    $('casualUnpaidList').innerHTML = casualUnpaid.length
      ? casualUnpaid.slice(0, 6).map(({ m, p, index, fee }) => `
        <div class="unpaid-row">
          <label class="unpaid-check-label">
            <input type="checkbox" class="quick-paid casual-quick-paid" data-casual-match="${esc(m.id)}" data-player-index="${index}" aria-label="Đã thanh toán: ${esc(casualPlayerName(p, index))} · ${esc(shortDate(m.date))}">
            <div class="person">
              <div>
                <strong>${esc(casualPlayerName(p, index))}</strong>
                <small>${esc(viDate(m.date))} · ${esc(m.title || 'Kèo vãng lai')}</small>
              </div>
            </div>
          </label>
          <div class="unpaid-payment">
            <span class="amount text-error">${fmt(fee)}</span>
          </div>
        </div>`).join('')
      : '<div class="empty">Tuyệt vời! Chưa có khoản phí nào tồn đọng 🎉</div>';
  }

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
          const remaining = Math.max(0, calc.totalCost - calc.actualCollected);
          const avatars = (m.players || []).slice(0, 5).map((p, pIdx) =>
            `<span class="stack-avatar ${p.gender === 'female' ? 'female' : ''}">${esc((casualPlayerName(p, pIdx)[0] || 'K').toUpperCase())}</span>`
          ).join('') + (totalCount > 5 ? `<span class="stack-avatar more">+${totalCount - 5}</span>` : '');

          return `
            <article class="session-card casual-active-card">
              <div class="casual-card-top">
                <span class="casual-time-label text-secondary">${esc(shortDate(m.date))} | ${esc(m.timeRange || '18:00 - 20:00')}</span>
                <div class="casual-menu-wrap">
                  <button type="button" class="casual-more-btn" data-casual-menu-toggle="${esc(m.id)}" aria-label="Tùy chọn kèo" aria-haspopup="menu" aria-expanded="false">⋯</button>
                  <div class="casual-more-menu" role="menu" hidden>
                    <button type="button" class="casual-menu-item" role="menuitem" data-casual-split="${esc(m.id)}">${TX_EDIT_ICON_SVG}<span>Chỉnh sửa kèo</span></button>
                    <button type="button" class="casual-menu-item danger" role="menuitem" data-casual-delete="${esc(m.id)}">${TX_TRASH_ICON_SVG}<span>Xóa kèo</span></button>
                  </div>
                </div>
              </div>
              <h3 class="casual-card-title">${esc(m.title)}</h3>
              <p class="casual-card-venue">${esc(formatCasualVenue(m))} &nbsp;•&nbsp; ${totalCount} người tham gia</p>
              ${m.courtAddress ? `<p class="casual-card-address"><small>${esc(m.courtAddress)}</small></p>` : ''}

              <div class="casual-cost-bill">
                <div class="casual-bill-row"><span>Tiền sân</span><strong>${fmt(calc.courtCost)}</strong></div>
                <div class="casual-bill-row"><span>Tiền cầu (${m.shuttleCount || 0}q)</span><strong>${fmt(calc.shuttleCost)}</strong></div>
                <div class="casual-bill-row"><span>Phụ phí</span><strong>${fmt(calc.extraCost)}</strong></div>
              </div>

              <div class="casual-progress-block">
                <div class="fin-top-row">
                  <span>Tiến độ thu: <b>${fmt(calc.actualCollected)}</b> / ${fmt(calc.totalCost)}</span>
                  <strong class="text-secondary">${paidCount}/${totalCount} người</strong>
                </div>
                <div class="casual-avatars-row">
                  <div class="avatar-stack">${avatars}</div>
                  <small class="${remaining > 0 ? 'text-warning' : 'text-success'}">
                    ${remaining > 0 ? `Còn thiếu ${fmt(remaining)}` : '✓ Đã thu đủ 100%'}
                  </small>
                </div>
              </div>

              <div class="casual-card-actions">
                <button type="button" class="secondary-blue casual-remind-btn" data-copy-remind="${esc(m.id)}">Nhắc kèo</button>
                <button type="button" class="primary casual-collect-btn" data-casual-collect="${esc(m.id)}">Ghi cầu &amp; Thu tiền</button>
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
  $('casualCourtRate').value = fmtMoneyK(m.courtRate ?? 80000);
  $('casualShuttlePrice').value = fmtMoneyK(m.shuttlePrice ?? 25000);
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
      <button type="button" class="cp-gender-toggle ${p.gender === 'female' ? 'is-female' : 'is-male'}" data-toggle-gender="${idx}" data-gender="${p.gender === 'female' ? 'female' : 'male'}" aria-label="Đổi giới tính">${p.gender === 'female' ? 'Nữ' : 'Nam'}</button>
      <button type="button" class="cp-del-btn" data-del-cp="${idx}" aria-label="Xóa">×</button>
    </div>
  `).join('');
}

function syncDraftCasualPlayersFromDOM() {
  document.querySelectorAll('#casualPlayersEditor .casual-player-edit-row').forEach(row => {
    const idx = Number(row.dataset.pidx);
    if (!draftCasualPlayers[idx]) return;
    draftCasualPlayers[idx].name = row.querySelector('.cp-name-input')?.value.trim() || '';
    draftCasualPlayers[idx].gender = row.querySelector('.cp-gender-toggle')?.dataset.gender || 'male';
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
    courtRate: parseMoneyK($('casualCourtRate').value) || 80000,
    shuttleCount: Number($('casualShuttleCount')?.value) || 0,
    shuttlePrice: parseMoneyK($('casualShuttlePrice').value) || 25000,
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
  const genderBtn = e.target.closest('[data-toggle-gender]');
  if (genderBtn) {
    syncDraftCasualPlayersFromDOM();
    const idx = Number(genderBtn.dataset.toggleGender);
    if (draftCasualPlayers[idx]) {
      draftCasualPlayers[idx].gender = draftCasualPlayers[idx].gender === 'female' ? 'male' : 'female';
      renderCasualPlayersEditor();
      updateCasualSplitPreview();
    }
    return;
  }
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
    const val = parseMoneyK(el.value);
    el.value = fmtMoneyK(Number.isFinite(val) ? val : 0);
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
    $('collectMatchInfoBox').textContent = `🕒 ${m.timeRange || '18:00 - 20:00'} · 📍 ${venueStr}`;
  }

  if ($('collectShuttleCount')) $('collectShuttleCount').value = m.shuttleCount ?? 5;
  if ($('collectShuttleUnitHint')) $('collectShuttleUnitHint').textContent = `${fmt(m.shuttlePrice || 25000)} / quả`;
  if ($('collectShuttleFormulaText')) $('collectShuttleFormulaText').textContent = 'Tổng tiền cầu';
  if ($('collectShuttleSubtotal')) $('collectShuttleSubtotal').textContent = fmt(calc.shuttleCost);
  if ($('collectExtraCost') && document.activeElement !== $('collectExtraCost')) {
    $('collectExtraCost').value = fmtMoneyK(m.extraCost || 0);
  }
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
    $('collectFemaleDiscount').value = fmtMoneyK(m.femaleDiscount ?? 15000);
  }

  if ($('collectZaloPreviewText')) {
    $('collectZaloPreviewText').textContent = generateCasualZaloBill(m);
  }

  $('casualCollectedBig').textContent = fmt(calc.actualCollected);
  $('casualTargetSmall').textContent = `/ ${fmt(calc.totalCost)}`;
  $('casualCollectProgressBar').style.width = `${pct}%`;
  $('casualCollectStatusPill').textContent = paidCount === players.length && players.length > 0 ? '🎉 Đạt 100% — Đủ tiền trả sân' : `Đang thu (${paidCount}/${players.length})`;
  if ($('casualMetricTotal')) $('casualMetricTotal').textContent = fmt(calc.totalCost);
  if ($('casualMetricPaid')) $('casualMetricPaid').textContent = fmt(calc.actualCollected);
  if ($('casualMetricDiff')) $('casualMetricDiff').textContent = diff === 0 ? '0 ₫' : (diff > 0 ? `+${fmt(diff)}` : `−${fmt(Math.abs(diff))}`);
  if ($('casualPaidCountBadge')) $('casualPaidCountBadge').textContent = `${paidCount}/${players.length} người`;
  if ($('casualSettlementMatchText')) $('casualSettlementMatchText').textContent = paidCount === players.length ? 'Khớp 100% thu chi (0đ dư)' : `Đã thu ${paidCount}/${players.length} người`;

  const allPaid = players.length > 0 && players.every(p => p.paid);
  const settleBtn = $('settleCasualMatchBtn');
  if (settleBtn) {
    settleBtn.disabled = !allPaid;
    settleBtn.setAttribute('aria-disabled', String(!allPaid));
    settleBtn.title = allPaid
      ? 'Tất toán và đóng kèo'
      : `Cần tick thu tiền đủ ${players.length}/${players.length} thành viên để tất toán`;
  }
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
    const pName = casualPlayerName(p, idx);
    return `
      <div class="attendance-player-card casual-collect-row" data-cplayer-idx="${idx}">
        <div class="player-card-main">
          <label class="casual-check-person">
            <input type="checkbox" class="casual-player-paid-check" data-toggle-cpaid="${idx}" ${p.paid ? 'checked' : ''}>
            <div class="person">
              <strong>${esc(pName)}</strong>
            </div>
          </label>
          <div class="casual-player-right">
            <strong>${fmt(fee)}</strong>
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
  const val = parseMoneyK($('collectExtraCost').value);
  m.extraCost = Number.isFinite(val) ? val : 0;
  save();
  renderCasualCollectModal(m);
});

$('collectExtraCost')?.addEventListener('blur', () => {
  const m = state.casualMatches.find(x => x.id === $('casualCollectDialog').dataset.matchId);
  if (!m) return;
  $('collectExtraCost').value = fmtMoneyK(m.extraCost || 0);
});

$('collectFemaleDiscount')?.addEventListener('input', () => {
  const m = state.casualMatches.find(x => x.id === $('casualCollectDialog').dataset.matchId);
  if (!m) return;
  const val = parseMoneyK($('collectFemaleDiscount').value);
  m.femaleDiscount = Number.isFinite(val) ? val : 0;
  save();
  renderCasualCollectModal(m);
});

$('collectFemaleDiscount')?.addEventListener('blur', () => {
  const m = state.casualMatches.find(x => x.id === $('casualCollectDialog').dataset.matchId);
  if (!m) return;
  $('collectFemaleDiscount').value = fmtMoneyK(m.femaleDiscount ?? 15000);
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
  const players = Array.isArray(m.players) ? m.players : [];
  if (!(players.length > 0 && players.every(p => p.paid))) return;
  m.status = 'settled';
  m.settledAt = today();
  $('casualCollectDialog')?.close();
  save();
  showToast('Đã tất toán 0đ dư & đóng kèo thành công (Không ảnh hưởng quỹ Team)');
});

// 12. Event Listeners & Global Bindings
function shiftMemberMonth(delta) {
  const d = parseDate(memberMonth + '-01');
  d.setMonth(d.getMonth() + delta);
  memberMonth = monthKey(localDate(d));
  render();
}
$('prevMemberMonth')?.addEventListener('click', () => shiftMemberMonth(-1));
$('nextMemberMonth')?.addEventListener('click', () => shiftMemberMonth(1));

document.querySelectorAll('.tab').forEach(b => b.onclick = () => setView(b.dataset.view));
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => setView(b.dataset.go));
$('toFinance').onclick = () => setView('finance');
$('addSessionTop').onclick = () => openSession();
if ($('topbarCreateCasualBtn')) $('topbarCreateCasualBtn').onclick = () => openCasualSplitModal(null);
$('addMember').onclick = () => openMember();
function openBulkMembersModal() {
  if ($('bulkMembersInput')) $('bulkMembersInput').value = '';
  updateBulkMembersPreview();
  $('bulkMembersDialog')?.showModal();
}
if ($('addMembersBulk')) $('addMembersBulk').onclick = openBulkMembersModal;
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

function openExpense(exp = null) {
  const e = exp && exp.id ? exp : null;
  $('expenseForm').reset();
  if ($('expenseId')) $('expenseId').value = e ? e.id : '';
  if ($('expenseDialogTitle')) $('expenseDialogTitle').textContent = e ? 'Sửa khoản chi' : 'Ghi khoản chi';
  if ($('saveExpenseBtn')) $('saveExpenseBtn').textContent = e ? 'Lưu thay đổi' : 'Lưu khoản chi';
  if ($('deleteExpense')) $('deleteExpense').hidden = !e;
  $('expenseType').value = e ? (e.type || 'other') : 'court';
  $('expenseAmount').value = e ? fmtMoneyK(e.amount) : '';
  $('expenseDate').value = e ? (e.date || today()) : today();
  $('expenseNote').value = e ? (e.note || '') : '';
  $('expenseDialog').showModal();
  if (e) focusSelectMoneyK($('expenseAmount'));
}

$('addExpense').onclick = () => openExpense(null);

// Court Owner Settlement 1-Click Pre-fill
function triggerSettleCourtOwner() {
  const mk = monthKey(localDate(financeCursor));
  const est = monthlyCourtEstimate(mk);
  openExpense(null);
  $('expenseType').value = 'court';
  $('expenseAmount').value = fmtMoneyK(est.amount || 150000);
  $('expenseDate').value = today();
  $('expenseNote').value = 'Tất toán tiền sân ' + monthLabel(mk);
  focusSelectMoneyK($('expenseAmount'));
}
$('settleCourtOwnerBtn')?.addEventListener('click', triggerSettleCourtOwner);
$('settleCourtOwnerBtnTx')?.addEventListener('click', triggerSettleCourtOwner);

$('viewAllTransactionsBtn')?.addEventListener('click', () => setView('transactions'));
$('backToFinanceBtn')?.addEventListener('click', () => setView('finance'));
$('transactionsPreview')?.addEventListener('click', e => {
  if (e.target.closest('.tx-preview-row')) setView('transactions');
});

document.querySelectorAll('.tx-category-filters button').forEach(button => button.onclick = () => {
  financePreviewFilter = button.dataset.txCategory || 'all';
  document.querySelectorAll('.tx-category-filters button').forEach(item => {
    item.classList.toggle('active', item === button);
    item.setAttribute('aria-pressed', String(item === button));
  });
  renderFinance();
});

document.querySelectorAll('.filter[data-filter]').forEach(b => b.onclick = () => {
  activeFilter = b.dataset.filter;
  document.querySelectorAll('.filter[data-filter]').forEach(x => x.classList.toggle('active', x === b));
  render();
});

$('manualGenerateLink')?.addEventListener('click', () => {
  const count = autoEnsureUpcomingSessions(true);
  if (count > 0) {
    save();
    showToast(`Đã sinh thêm ${count} buổi chơi kế tiếp!`);
  } else {
    showToast('Chưa thể sinh thêm buổi');
  }
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
  const casualCheckbox = e.target.closest('.casual-quick-paid');
  if (casualCheckbox && casualCheckbox.checked) {
    const match = state.casualMatches.find(m => m.id === casualCheckbox.dataset.casualMatch);
    const idx = Number(casualCheckbox.dataset.playerIndex);
    const player = match?.players?.[idx];
    if (!player || player.paid) return;
    player.paid = true;
    if (!player.method) player.method = 'transfer';
    save();
    showToast('Đã ghi nhận thanh toán của ' + casualPlayerName(player, idx));
    return;
  }
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

function closeAllCasualMenus() {
  document.querySelectorAll('.casual-more-menu:not([hidden])').forEach(menu => {
    menu.hidden = true;
  });
  document.querySelectorAll('.casual-more-btn[aria-expanded="true"]').forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
  });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllCasualMenus();
});

document.addEventListener('click', e => {
  const casualMenuToggle = e.target.closest('[data-casual-menu-toggle]');
  if (casualMenuToggle) {
    const wrap = casualMenuToggle.closest('.casual-menu-wrap');
    const menu = wrap?.querySelector('.casual-more-menu');
    const willOpen = menu ? menu.hidden : false;
    closeAllCasualMenus();
    if (menu && willOpen) {
      menu.hidden = false;
      casualMenuToggle.setAttribute('aria-expanded', 'true');
    }
    return;
  }
  closeAllCasualMenus();

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
  if (mem) {
    closeAllTxSwipes();
    openMember(state.members.find(m => m.id === mem.dataset.editMember));
  }

  const delMem = e.target.closest('[data-delete-member]');
  if (delMem) {
    closeAllTxSwipes();
    const mid = delMem.dataset.deleteMember;
    if (confirm('Xóa thành viên khỏi danh bạ? Lịch sử buổi chơi được giữ lại.')) {
      state.members = state.members.filter(m => m.id !== mid);
      save();
      showToast('Đã xóa thành viên');
    }
  }

  const editMonthly = e.target.closest('[data-edit-monthly]');
  if (editMonthly) {
    closeAllTxSwipes();
    const rec = state.monthlyReceipts.find(r => r.id === editMonthly.dataset.editMonthly);
    if (rec) openMonthlyCollection(rec);
  }

  const deleteMonthly = e.target.closest('[data-delete-monthly]');
  if (deleteMonthly) {
    closeAllTxSwipes();
    const rid = deleteMonthly.dataset.deleteMonthly;
    if (confirm('Xóa khoản thu phí cuối tháng này khỏi lịch sử và quỹ?')) {
      state.monthlyReceipts = state.monthlyReceipts.filter(r => r.id !== rid);
      save();
      showToast('Đã xóa khoản thu cuối tháng');
    }
  }

  const editExp = e.target.closest('[data-edit-expense]');
  if (editExp) {
    closeAllTxSwipes();
    const exp = state.expenses.find(x => x.id === editExp.dataset.editExpense);
    if (exp) openExpense(exp);
  }

  const deleteExp = e.target.closest('[data-delete-expense]');
  if (deleteExp) {
    closeAllTxSwipes();
    const eid = deleteExp.dataset.deleteExpense;
    if (confirm('Xóa khoản chi này? Số tiền sẽ được hoàn lại vào quỹ.')) {
      state.expenses = state.expenses.filter(x => x.id !== eid);
      save();
      showToast('Đã xóa khoản chi');
    }
  }

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
    courtRate: parseMoneyK($('courtHourlyRate').value) || 0,
    courtCost: sessionCost({ courtHours: Number($('courtHours').value), courtRate: parseMoneyK($('courtHourlyRate').value) || 0 }),
    passAmount: status === 'passed' ? (parseMoneyK($('passAmount').value) || 0) : 0,
    passDate: status === 'passed' ? old?.passDate || today() : null,
    attendees: status === 'passed' ? [] : (old?.attendees || [])
  };
  const newHourlyRate = parseMoneyK($('courtHourlyRate').value) || 0;
  if (newHourlyRate > 0) state.courtRate = newHourlyRate;
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
  syncAttendanceHeaderMeta();
  renderAttendanceRows(readRows());
  updateAttendance();
});

$('copyGuestInviteBtn')?.addEventListener('click', async () => {
  const text = $('guestInviteText')?.textContent || '';
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
  }
  const btn = $('copyGuestInviteBtn');
  if (btn) {
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 1200);
  }
  showToast('Đã sao chép tin tìm vãng lai');
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
  syncAttendanceHeaderMeta();
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

$('collectMonthly').onclick = () => openMonthlyCollection(null);
$('monthlyMember').addEventListener('change', () => renderMonthlySummary(false));
$('monthlyMonth').addEventListener('change', () => renderMonthlySummary(false));
$('monthlyForm').addEventListener('submit', saveMonthlyCollection);
$('deleteMonthlyReceipt')?.addEventListener('click', () => {
  const rid = $('monthlyReceiptId')?.value;
  if (!rid) return;
  if (confirm('Xóa khoản thu phí cuối tháng này khỏi lịch sử và quỹ?')) {
    state.monthlyReceipts = state.monthlyReceipts.filter(r => r.id !== rid);
    $('monthlyDialog').close();
    save();
    showToast('Đã xóa khoản thu cuối tháng');
  }
});

setFeeEditor(false);
if ($('toggleFees')) $('toggleFees').onclick = () => setFeeEditor($('feeSettingsFields').hidden);
$('feeSettingsForm').addEventListener('submit', saveFees);

$('expenseForm').addEventListener('submit', e => {
  e.preventDefault();
  const eid = $('expenseId')?.value || '',
    amountVal = parseMoneyK($('expenseAmount').value);
  if (!Number.isSafeInteger(amountVal) || amountVal <= 0) {
    showToast('Vui lòng nhập số tiền hợp lệ (> 0)');
    return;
  }
  const payload = {
      type: $('expenseType').value,
      amount: amountVal,
      date: $('expenseDate').value,
      note: $('expenseNote').value.trim()
    };
  if (eid) {
    const existing = state.expenses.find(x => x.id === eid);
    if (existing) Object.assign(existing, payload);
  } else {
    state.expenses.push({ id: id(), ...payload });
  }
  $('expenseDialog').close();
  save();
  showToast(eid ? 'Đã cập nhật khoản chi' : 'Đã ghi khoản chi');
});

$('deleteExpense')?.addEventListener('click', () => {
  const eid = $('expenseId')?.value;
  if (!eid) return;
  if (confirm('Xóa khoản chi này? Số tiền sẽ được hoàn lại vào quỹ.')) {
    state.expenses = state.expenses.filter(x => x.id !== eid);
    $('expenseDialog').close();
    save();
    showToast('Đã xóa khoản chi');
  }
});

$('editOpening').onclick = () => {
  $('openingAmount').value = fmtMoneyK(state.opening || 0);
  $('openingDate').value = state.openingDate || today();
  $('openingDialog').showModal();
  focusSelectMoneyK($('openingAmount'));
};
$('openingForm').addEventListener('submit', e => {
  e.preventDefault();
  const val = parseMoneyK($('openingAmount').value);
  state.opening = Number.isFinite(val) ? val : 0;
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

// 14. Team Court Management & Live Estimate Sync
$('editTeamCourtBtn')?.addEventListener('click', () => openTeamCourtEditDialog());
$('cancelTeamCourtEdit')?.addEventListener('click', () => $('teamCourtEditDialog')?.close());
$('closeTeamCourtEdit')?.addEventListener('click', () => $('teamCourtEditDialog')?.close());

$('teamCourtInputName')?.addEventListener('change', e => {
  const val = e.target.value;
  if (val === '__custom__') {
    if ($('customCourtNameWrap')) $('customCourtNameWrap').hidden = false;
    $('teamCourtCustomName')?.focus();
  } else {
    if ($('customCourtNameWrap')) $('customCourtNameWrap').hidden = true;
    const courts = getDaNangCourtsList();
    const court = courts.find(c => c.name === val || normalizeVi(c.name) === normalizeVi(val));
    if (court && $('teamCourtInputAddress')) {
      $('teamCourtInputAddress').value = court.address || '';
    }
  }
});

$('teamCourtInputRate')?.addEventListener('input', () => {
  const currentRate = parseMoneyK($('teamCourtInputRate').value);
  document.querySelectorAll('.quick-rate-chips .chip-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.rate) === currentRate);
  });
  updateTeamCourtPreview();
});

document.querySelectorAll('.quick-rate-chips .chip-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const rate = Number(btn.dataset.rate);
    if ($('teamCourtInputRate')) {
      $('teamCourtInputRate').value = fmtMoneyK(rate);
      document.querySelectorAll('.quick-rate-chips .chip-btn').forEach(b => b.classList.toggle('active', b === btn));
      updateTeamCourtPreview();
    }
  });
});

$('teamCourtEditForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const selectVal = $('teamCourtInputName')?.value;
  const customVal = $('teamCourtCustomName')?.value.trim();
  const name = selectVal === '__custom__' ? customVal : selectVal;
  const number = $('teamCourtInputNumber')?.value.trim() || '';
  const address = $('teamCourtInputAddress')?.value.trim() || '';
  const rate = parseMoneyK($('teamCourtInputRate')?.value) || 0;

  if (!name) {
    showToast('Vui lòng chọn hoặc nhập tên sân');
    return;
  }
  if (rate <= 0) {
    showToast('Vui lòng nhập giá sân theo giờ hợp lệ (> 0)');
    return;
  }
  updateTeamCourtInfo({ name, number, address, rate });
  $('teamCourtEditDialog')?.close();
});

const TX_SWIPE_WIDTH = 112;

function closeAllTxSwipes(exceptEl = null) {
  document.querySelectorAll('.tx-swipe-content.is-open').forEach(el => {
    if (el !== exceptEl) {
      el.classList.remove('is-open');
      el.style.transform = '';
    }
  });
}

(function initSwipeRows() {
  const containers = [$('transactions'), $('membersList'), $('attendanceRows')].filter(Boolean);
  if (!containers.length) return;

  containers.forEach(container => {
    let activeContent = null;
    let activeWidth = TX_SWIPE_WIDTH;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startOffset = 0;
    let currentOffset = 0;
    let isDragging = false;
    let isLockedVertical = false;

    container.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('.tx-action-btn') || e.target.closest('input, label, select, button')) return;
      const content = e.target.closest('.tx-swipe-content');
      if (!content) return;

      closeAllTxSwipes(content);
      activeContent = content;
      activeWidth = Number(content.closest('[data-tx-swipe]')?.dataset.swipeWidth) || TX_SWIPE_WIDTH;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startOffset = content.classList.contains('is-open') ? -activeWidth : 0;
      currentOffset = startOffset;
      isDragging = false;
      isLockedVertical = false;
    });

    container.addEventListener('pointermove', e => {
      if (!activeContent || e.pointerId !== pointerId || isLockedVertical) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!isDragging) {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
          isLockedVertical = true;
          return;
        }
        if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
          isDragging = true;
          activeContent.classList.add('is-dragging');
          try { activeContent.setPointerCapture(pointerId); } catch {}
        } else {
          return;
        }
      }

      currentOffset = Math.max(-activeWidth, Math.min(0, startOffset + dx));
      activeContent.style.transform = `translateX(${currentOffset}px)`;
    });

    function finishDrag(e) {
      if (!activeContent || e.pointerId !== pointerId) return;
      const content = activeContent;
      const width = activeWidth;
      const wasDragging = isDragging;
      const wasOpen = startOffset < 0;
      const finalOffset = currentOffset;

      activeContent = null;
      pointerId = null;
      isDragging = false;
      isLockedVertical = false;

      content.classList.remove('is-dragging');
      content.style.transform = '';

      if (wasDragging) {
        const threshold = Math.min(36, width * 0.45);
        const shouldOpen = wasOpen ? finalOffset < -width + 24 : finalOffset < -threshold;
        content.classList.toggle('is-open', shouldOpen);
      } else if (wasOpen) {
        content.classList.remove('is-open');
      }
    }

    container.addEventListener('pointerup', finishDrag);
    container.addEventListener('pointercancel', finishDrag);
  });

  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('[data-tx-swipe]')) closeAllTxSwipes();
  });
})();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
render();
