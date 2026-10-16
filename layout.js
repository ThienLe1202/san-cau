(() => {
const $=id=>document.getElementById(id);
const finance=$('financeView');
const dashboard=$('dashboardView'),balanceCard=dashboard.querySelector('.balance-card'),unpaid=$('unpaidList');
const unpaidHeading=unpaid.previousElementSibling;dashboard.insertBefore(unpaidHeading,balanceCard);dashboard.insertBefore(unpaid,balanceCard);unpaid.classList.add('dashboard-priority-unpaid');
const settings=document.createElement('dialog');settings.id='settingsView';settings.className='settings-drawer';settings.setAttribute('aria-labelledby','settingsTitle');settings.innerHTML='<div class="page-title"><div><p class="eyebrow">QUẢN LÝ ỨNG DỤNG</p><h1 id="settingsTitle">Cài đặt</h1></div><button class="drawer-close" id="settingsBack" type="button" aria-label="Đóng cài đặt">×</button></div><div class="settings-sections"><section class="settings-card" id="feesSettings"><h2>Phí tham gia</h2><p>Mức phí mặc định cho các lần ghi nhận mới.</p></section><section class="settings-card" id="fundSettings"><h2>Thiết lập quỹ</h2><p>Số dư và ngày bắt đầu theo dõi.</p></section><section class="settings-card" id="accountSettings"></section><section class="settings-card" id="backupSettings"><h2>Sao lưu dữ liệu</h2><p>Tải một bản dữ liệu về máy để lưu giữ.</p></section></div>';
document.querySelector('main.page').append(settings);
const topActions=document.createElement('div');topActions.className='header-actions';topActions.innerHTML='<button id="openSettings" type="button" class="settings-trigger" aria-label="Cài đặt" aria-pressed="false"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m9 3-.6 2.1-1.7 1L4.6 5.6 2.9 8.5l1.5 1.6v2l-1.5 1.6 1.7 2.9 2.1-.5 1.7 1L9 19.2h3.4l.6-2.1 1.7-1 2.1.5 1.7-2.9-1.5-1.6v-2l1.5-1.6-1.7-2.9-2.1.5-1.7-1L12.4 3Z" transform="translate(1 1)"/><circle cx="11.7" cy="12.1" r="3.1"/></svg></button>';
document.querySelector('.topbar').append(topActions);

$('feesSettings').append($('feeSettingsForm'));
const opening=$('openingSummary').parentElement;$('fundSettings').append(opening);
const cloud=finance.querySelector('.cloud-panel');cloud.querySelector('h2').textContent='Tài khoản & đồng bộ';$('accountSettings').append(cloud);
$('backupSettings').append($('cloudExport'));
const balance=finance.querySelector('.finance-cards .wide:not(.court-estimate)');const cards=finance.querySelector('.finance-cards');finance.insertBefore(balance,cards);balance.classList.add('finance-current-balance');
const actionRow=document.createElement('div');actionRow.className='finance-actions';$('collectMonthly').textContent='＋ Thu phí cuối tháng';actionRow.append($('collectMonthly'),$('addExpense'));finance.insertBefore(actionRow,cards.nextSibling);
// The old collection heading is replaced by the single action row.
const oldHeading=Array.from(finance.querySelectorAll('.section-head')).find(x=>x.querySelector('h2')?.textContent==='Thu phí cuối tháng');oldHeading?.remove();
const estimate=finance.querySelector('.court-estimate');const details=document.createElement('details');details.className='court-estimate-disclosure';details.innerHTML='<summary>Tiền sân tạm tính <span>Chỉ tham khảo</span></summary>';details.append(estimate);finance.append(details);
const filter=document.createElement('div');filter.className='filter-row transaction-filters';filter.setAttribute('aria-label','Lọc giao dịch');filter.innerHTML='<button type="button" class="filter active" data-transaction-filter="all" aria-pressed="true">Tất cả</button><button type="button" class="filter" data-transaction-filter="income" aria-pressed="false">Tiền thu</button><button type="button" class="filter" data-transaction-filter="expense" aria-pressed="false">Tiền chi</button>';finance.insertBefore(filter,$('transactions'));
const detail=document.createElement('dialog');detail.id='settingsDetail';detail.className='settings-drawer settings-fullscreen';detail.setAttribute('aria-labelledby','settingsDetailTitle');
detail.innerHTML='<header class="settings-detail-head"><button type="button" class="secondary" id="settingsDetailBack" aria-label="Quay lại Cài đặt">←</button><h1 id="settingsDetailTitle"></h1></header><div class="settings-detail-body"></div>';
document.body.append(detail);
const sections=settings.querySelector('.settings-sections');detail.querySelector('.settings-detail-body').append(sections);
const menu=document.createElement('nav');menu.className='settings-menu';menu.setAttribute('aria-label','Các mục cài đặt');
const items=[['feesSettings','Phí tham gia'],['fundSettings','Thiết lập quỹ'],['accountSettings','Tài khoản & đồng bộ'],['backupSettings','Sao lưu dữ liệu']];
items.forEach(([id,title])=>{const button=document.createElement('button');button.type='button';button.innerHTML='<span>'+title+'</span><span aria-hidden="true">›</span>';button.onclick=()=>{if(id==='fundSettings'){$('editOpening').click();return}sections.querySelectorAll('.settings-card').forEach(section=>section.hidden=section.id!==id);$('settingsDetailTitle').textContent=title;if(id==='feesSettings')setFeeEditor(true);detail.showModal()};menu.append(button)});
settings.append(menu);$('settingsDetailBack').onclick=()=>detail.close();
const openingDialog=$('openingDialog');openingDialog.classList.add('settings-fullscreen');
const openingHead=openingDialog.querySelector('.modal-head');openingHead.classList.add('settings-detail-head');const openingClose=openingHead.querySelector('.close');openingClose.textContent='←';openingClose.setAttribute('aria-label','Quay lại Cài đặt');openingClose.className='secondary';openingHead.prepend(openingClose);openingClose.onclick=()=>openingDialog.close();
openingHead.querySelector('.eyebrow').remove();openingHead.querySelector('h2').textContent='Thiết lập quỹ';const fundHeading=document.createElement('h2');fundHeading.className='fund-content-title';fundHeading.textContent='Số dư đầu kỳ';openingHead.after(fundHeading);
$('feeSettingsForm').addEventListener('submit',()=>queueMicrotask(()=>{if($('feeSettingsFields').hidden)detail.close()}));

$('feesSettings').querySelector(':scope > p').textContent='Đặt mức thu cho mỗi người trong một buổi chơi.';
const feeFields=$('feeSettingsFields');
feeFields.querySelector('.hint').innerHTML='<strong>Áp dụng cho lần ghi nhận mới</strong><br>Các khoản đã ghi nhận trước đó giữ nguyên mức phí.';
feeFields.querySelector('button[type="submit"]').textContent='Lưu thay đổi';
['maleFee','femaleFee'].forEach((id,index)=>{const input=$(id),label=input.parentElement;label.firstChild.textContent=index===0?'Thành viên nam':'Thành viên nữ';const wrap=document.createElement('div');wrap.className='fee-input-wrap';input.before(wrap);wrap.append(input);const unit=document.createElement('span');unit.textContent='₫ / buổi';unit.setAttribute('aria-hidden','true');wrap.append(unit);input.setAttribute('aria-label',(index===0?'Phí nam':'Phí nữ')+' (đồng mỗi buổi)');input.setAttribute('inputmode','numeric')});

function openSettings(){if(!settings.open){settings.showModal();$('openSettings').setAttribute('aria-pressed','true')}}
$('openSettings').onclick=openSettings;$('settingsBack').onclick=()=>settings.close();
settings.addEventListener('close',()=>$('openSettings').setAttribute('aria-pressed','false'));
settings.addEventListener('click',event=>{if(event.target!==settings)return;const rect=settings.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)settings.close()});
filter.querySelectorAll('button').forEach(button=>button.onclick=()=>{transactionFilter=button.dataset.transactionFilter;filter.querySelectorAll('button').forEach(item=>{item.classList.toggle('active',item===button);item.setAttribute('aria-pressed',String(item===button))});renderFinance()});
})();
