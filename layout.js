(() => {
  const $ = id => document.getElementById(id);
  const finance = $('financeView');
  if (!finance) return;

  // Create Settings Drawer Dialog
  const settings = document.createElement('dialog');
  settings.id = 'settingsView';
  settings.className = 'settings-drawer';
  settings.setAttribute('aria-labelledby', 'settingsTitle');
  settings.innerHTML = `
    <div class="page-title">
      <div>
        <p class="eyebrow">QUẢN LÝ ỨNG DỤNG</p>
        <h1 id="settingsTitle">Cài đặt</h1>
      </div>
      <button class="drawer-close" id="settingsBack" type="button" aria-label="Đóng cài đặt">×</button>
    </div>
    <div class="settings-sections">
      <section class="settings-card" id="feesSettings">
        <h2>Phí tham gia</h2>
        <p>Đặt mức thu cho mỗi người trong một buổi chơi.</p>
      </section>
      <section class="settings-card" id="fundSettings">
        <h2>Thiết lập quỹ</h2>
        <p>Số dư và ngày bắt đầu theo dõi.</p>
      </section>
      <section class="settings-card" id="accountSettings"></section>
      <section class="settings-card" id="backupSettings">
        <h2>Sao lưu &amp; Khôi phục dữ liệu</h2>
        <p>Tải bản sao lưu (.json) về máy hoặc khôi phục lại từ file đã lưu.</p>
      </section>
    </div>
  `;
  document.body.append(settings);

  // Add Settings Button to Topbar Right Actions
  const topRight = $('topbarRightActions') || document.querySelector('.topbar');
  const topActions = document.createElement('div');
  topActions.className = 'header-actions';
  topActions.innerHTML = `
    <button id="openSettings" type="button" class="settings-trigger" aria-label="Cài đặt" aria-pressed="false" title="Cài đặt & Sao lưu">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="m9 3-.6 2.1-1.7 1L4.6 5.6 2.9 8.5l1.5 1.6v2l-1.5 1.6 1.7 2.9 2.1-.5 1.7 1L9 19.2h3.4l.6-2.1 1.7-1 2.1.5 1.7-2.9-1.5-1.6v-2l1.5-1.6-1.7-2.9-2.1.5-1.7-1L12.4 3Z" transform="translate(1 1)"/>
        <circle cx="11.7" cy="12.1" r="3.1"/>
      </svg>
    </button>
  `;
  topRight?.append(topActions);

  // Move Fee Settings, Cloud Panel, and Backup Actions into Settings Drawer
  const feeForm = $('feeSettingsForm');
  if (feeForm) $('feesSettings').append(feeForm);

  const cloud = finance.querySelector('.cloud-panel');
  if (cloud) {
    const cloudHeading = cloud.querySelector('h2');
    if (cloudHeading) cloudHeading.textContent = 'Tài khoản & đồng bộ';
    $('accountSettings').append(cloud);
  }

  const backupWrap = $('backupActionsWrap') || $('cloudExport');
  if (backupWrap) $('backupSettings').append(backupWrap);

  // Fullscreen Settings Detail Dialog
  const detail = document.createElement('dialog');
  detail.id = 'settingsDetail';
  detail.className = 'settings-drawer settings-fullscreen';
  detail.setAttribute('aria-labelledby', 'settingsDetailTitle');
  detail.innerHTML = `
    <header class="settings-detail-head">
      <button type="button" class="secondary" id="settingsDetailBack" aria-label="Quay lại Cài đặt">←</button>
      <h1 id="settingsDetailTitle"></h1>
    </header>
    <div class="settings-detail-body"></div>
  `;
  document.body.append(detail);

  const sections = settings.querySelector('.settings-sections');
  detail.querySelector('.settings-detail-body').append(sections);

  const menu = document.createElement('nav');
  menu.className = 'settings-menu';
  menu.setAttribute('aria-label', 'Các mục cài đặt');
  const items = [
    ['feesSettings', 'Phí tham gia'],
    ['fundSettings', 'Thiết lập số dư quỹ đầu kỳ'],
    ['accountSettings', 'Tài khoản & đồng bộ đám mây'],
    ['backupSettings', 'Sao lưu & khôi phục dữ liệu (.json)']
  ];

  items.forEach(([id, title]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<span>${title}</span><span aria-hidden="true">›</span>`;
    button.onclick = () => {
      if (id === 'fundSettings') {
        $('editOpening')?.click();
        return;
      }
      sections.querySelectorAll('.settings-card').forEach(section => {
        section.hidden = section.id !== id;
      });
      $('settingsDetailTitle').textContent = title;
      if (id === 'feesSettings' && typeof window.setFeeEditor === 'function') {
        window.setFeeEditor(true);
      } else if (id === 'feesSettings') {
        const feeFields = $('feeSettingsFields');
        if (feeFields) feeFields.hidden = false;
        const male = $('maleFee'), female = $('femaleFee');
        if (male) male.disabled = false;
        if (female) female.disabled = false;
      }
      detail.showModal();
    };
    menu.append(button);
  });

  settings.append(menu);
  $('settingsDetailBack').onclick = () => detail.close();

  const openingDialog = $('openingDialog');
  if (openingDialog) {
    openingDialog.classList.add('settings-fullscreen');
    const openingHead = openingDialog.querySelector('.modal-head');
    if (openingHead) {
      openingHead.classList.add('settings-detail-head');
      const openingClose = openingHead.querySelector('.close');
      if (openingClose) {
        openingClose.textContent = '←';
        openingClose.setAttribute('aria-label', 'Quay lại Cài đặt');
        openingClose.className = 'secondary';
        openingHead.prepend(openingClose);
        openingClose.onclick = () => openingDialog.close();
      }
      openingHead.querySelector('.eyebrow')?.remove();
      const h2 = openingHead.querySelector('h2');
      if (h2) h2.textContent = 'Thiết lập quỹ';
      const fundHeading = document.createElement('h2');
      fundHeading.className = 'fund-content-title';
      fundHeading.textContent = 'Số dư đầu kỳ';
      openingHead.after(fundHeading);
    }
  }

  feeForm?.addEventListener('submit', () => queueMicrotask(() => {
    if ($('feeSettingsFields')?.hidden) detail.close();
  }));

  const feeFields = $('feeSettingsFields');
  if (feeFields) {
    const hint = feeFields.querySelector('.hint');
    if (hint) {
      hint.innerHTML = '<strong>Áp dụng cho lần ghi nhận mới</strong><br>Các khoản đã ghi nhận trước đó giữ nguyên mức phí.';
    }
    const submitBtn = feeFields.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Lưu thay đổi';

    ['maleFee', 'femaleFee'].forEach((id, index) => {
      const input = $(id);
      if (!input) return;
      const label = input.parentElement;
      if (label && label.firstChild) {
        label.firstChild.textContent = index === 0 ? 'Thành viên nam' : 'Thành viên nữ';
      }
      const wrap = document.createElement('div');
      wrap.className = 'fee-input-wrap';
      input.before(wrap);
      wrap.append(input);
      const unit = document.createElement('span');
      unit.textContent = '₫ / buổi';
      unit.setAttribute('aria-hidden', 'true');
      wrap.append(unit);
      input.setAttribute('aria-label', (index === 0 ? 'Phí nam' : 'Phí nữ') + ' (đồng mỗi buổi)');
      input.setAttribute('inputmode', 'numeric');
    });
  }

  function openSettings() {
    if (!settings.open) {
      settings.showModal();
      $('openSettings')?.setAttribute('aria-pressed', 'true');
    }
  }

  $('openSettings').onclick = openSettings;
  $('settingsBack').onclick = () => settings.close();
  settings.addEventListener('close', () => $('openSettings')?.setAttribute('aria-pressed', 'false'));
  settings.addEventListener('click', event => {
    if (event.target !== settings) return;
    const rect = settings.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      settings.close();
    }
  });
})();
