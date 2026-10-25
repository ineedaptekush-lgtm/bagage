'use strict';
const DATA = JSON.parse(document.getElementById('content-data').textContent);
const dialogs = [...document.querySelectorAll('dialog')];
const menuDialog = document.getElementById('menu-dialog');
const caseDialog = document.getElementById('case-dialog');
const menuToggle = document.querySelector('.menu-toggle');
const form = document.getElementById('lead-form');
const carInput = document.getElementById('car');
const serviceSelect = document.getElementById('service');
let activeCase = null;
let caseImageIndex = 0;

function wrappedIndex(index, length) {
  return ((index % length) + length) % length;
}
function imageAt(images, index) {
  return images[wrappedIndex(index, images.length)];
}
function updateImage(image, item) {
  image.src = item.src;
  image.alt = item.alt;
  image.width = item.width;
  image.height = item.height;
}
function initSlider(container) {
  const images = DATA.galleries[container.dataset.gallery];
  if (!images || images.length === 0) return;
  if (images.length === 1) container.removeAttribute('tabindex');
  const image = container.querySelector('[data-slide-image]');
  const count = container.querySelector('[data-slide-count]');
  const caption = container.querySelector('[data-slide-caption]');
  const prev = container.querySelector('[data-slide-prev]');
  const next = container.querySelector('[data-slide-next]');
  let index = 0;
  function show(newIndex) {
    index = wrappedIndex(newIndex, images.length);
    const item = images[index];
    updateImage(image, item);
    count.textContent = (index + 1) + ' / ' + images.length;
    caption.textContent = item.caption || '';
    container.style.setProperty('--progress', ((index + 1) / images.length * 100) + '%');
  }
  prev.disabled = images.length < 2;
  next.disabled = images.length < 2;
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  container.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  let start = null;
  container.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || event.target.closest('button,a')) return;
    start = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  }, { passive: true });
  container.addEventListener('pointerup', event => {
    if (!start || event.pointerId !== start.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.abs(dx) >= 44 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      show(index + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });
  container.addEventListener('pointercancel', () => { start = null; }, { passive: true });
  show(0);
}
document.querySelectorAll('[data-gallery]').forEach(initSlider);

function openDialog(dialog) {
  dialogs.forEach(other => { if (other !== dialog && other.open) other.close(); });
  dialog.showModal();
  document.body.classList.add('modal-open');
}
dialogs.forEach(dialog => {
  dialog.addEventListener('close', () => {
    if (!dialogs.some(item => item.open)) document.body.classList.remove('modal-open');
    if (dialog === menuDialog) menuToggle.setAttribute('aria-expanded', 'false');
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
});
document.querySelectorAll('[data-close]').forEach(button => {
  button.addEventListener('click', () => document.getElementById(button.dataset.close).close());
});
menuToggle.addEventListener('click', () => {
  openDialog(menuDialog);
  menuToggle.setAttribute('aria-expanded', 'true');
});
menuDialog.querySelectorAll('a').forEach(link => link.addEventListener('click', () => menuDialog.close()));

document.querySelectorAll('[data-service]').forEach(link => {
  link.addEventListener('click', () => { serviceSelect.value = link.dataset.service; });
});

function showCaseImage(index) {
  if (!activeCase) return;
  const images = DATA.galleries[activeCase.gallery];
  caseImageIndex = wrappedIndex(index, images.length);
  const item = imageAt(images, caseImageIndex);
  updateImage(document.getElementById('case-image'), item);
  document.getElementById('case-counter').textContent = (caseImageIndex + 1) + ' / ' + images.length;
  document.getElementById('case-caption').textContent = item.caption || '';
  document.querySelectorAll('#case-thumbs button').forEach((button, i) => {
    button.setAttribute('aria-pressed', String(i === caseImageIndex));
  });
}
function showCase(id) {
  activeCase = DATA.cases.find(item => item.id === id);
  if (!activeCase) return;
  const images = DATA.galleries[activeCase.gallery];
  document.querySelectorAll('[data-case-prev],[data-case-next]').forEach(button => { button.disabled = images.length < 2; });
  document.getElementById('case-title').textContent = activeCase.title;
  document.getElementById('case-category').textContent = activeCase.category + ' / Идеальный багажник';
  const tasks = activeCase.tasks.map(text => {
    const li = document.createElement('li'); li.textContent = text; return li;
  });
  document.getElementById('case-tasks').replaceChildren(...tasks);
  document.getElementById('case-thumbs').replaceChildren(...images.map((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Фотография ' + (index + 1) + (item.caption ? ': ' + item.caption : ''));
    button.setAttribute('aria-pressed', 'false');
    const image = document.createElement('img');
    image.src = item.src; image.alt = ''; image.width = 64; image.height = 64; image.loading = 'lazy';
    button.append(image);
    button.addEventListener('click', () => showCaseImage(index));
    return button;
  }));
  showCaseImage(0);
  openDialog(caseDialog);
}
document.querySelectorAll('[data-case]').forEach(button => button.addEventListener('click', () => showCase(button.dataset.case)));
document.querySelector('[data-case-prev]').addEventListener('click', () => showCaseImage(caseImageIndex - 1));
document.querySelector('[data-case-next]').addEventListener('click', () => showCaseImage(caseImageIndex + 1));
caseDialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); showCaseImage(caseImageIndex + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
document.getElementById('case-action').addEventListener('click', () => {
  serviceSelect.value = activeCase.service || 'Нужна консультация';
  document.getElementById('message').value = 'Интересует направление: ' + activeCase.title + '. Моя задача: ';
  caseDialog.close();
});

let preparedMessage = '';
function composeMessage(car, service, details) {
  const lines = ['Здравствуйте! Пишу в мастерскую «Идеальный багажник».', 'Автомобиль: ' + car + '.', 'Задача: ' + service + '.'];
  if (details) lines.push('Пожелания: ' + details);
  lines.push('Хочу уточнить состав работ, стоимость и сроки. Фотографии приложу в чате.');
  return lines.join('\n');
}
function composeTelegramUrl(message) {
  return 'https://t.me/+79224151283?text=' + encodeURIComponent(message);
}
form.addEventListener('submit', event => {
  event.preventDefault();
  carInput.setCustomValidity(carInput.value.trim().length < 2 ? 'Укажите марку и модель автомобиля.' : '');
  if (!form.reportValidity()) return;
  preparedMessage = composeMessage(carInput.value.trim(), serviceSelect.value, document.getElementById('message').value.trim());
  const link = document.createElement('a');
  link.href = composeTelegramUrl(preparedMessage);
  link.target = '_blank'; link.rel = 'noopener noreferrer';
  document.body.append(link); link.click(); link.remove();
  document.getElementById('copy-message').hidden = false;
  document.getElementById('form-status').textContent = 'Сообщение подготовлено. Добавьте фотографии и отправьте его в Telegram. При необходимости скопируйте текст кнопкой выше.';
});
document.getElementById('copy-message').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(preparedMessage);
    document.getElementById('form-status').textContent = 'Текст скопирован. Вставьте его в чат мастерской и добавьте фотографии.';
  } catch {
    document.getElementById('form-status').textContent = 'Не удалось скопировать текст. Откройте Telegram по ссылке в контактах и отправьте модель автомобиля и описание задачи.';
  }
});
carInput.addEventListener('input', () => carInput.setCustomValidity(''));
form.addEventListener('input', () => { document.getElementById('form-status').textContent = ''; document.getElementById('copy-message').hidden = true; });
const backtop = document.querySelector('.backtop');
window.addEventListener('scroll', () => { backtop.hidden = window.scrollY < 800; }, { passive: true });
backtop.addEventListener('click', () => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  document.querySelector('.brand').focus({ preventScroll: true });
});
document.getElementById('year').textContent = new Date().getFullYear();
