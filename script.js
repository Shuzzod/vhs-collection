let tapes = JSON.parse(localStorage.getItem('vhsTapes')) || [];
let editingIndex = null;

const DEFAULT_STUDIOS = [
    'Varus Video', 'Most Video', 'Premier Video Film', 'Крупный план',
    'Лазер Видео', 'Союз Видео', 'West Video', 'EA Cinema', 'Екатеринбург Арт',
    'Первая Видеокомпания', 'Видео Восток', 'Стилан Видео',
    'American Video', 'AGMA PARADISE', 'Техновидео', 'Другая'
];

const DEFAULT_LOCALIZATIONS = [
    'Одноголосый',
    'Двухголосый',
    'Многоголосый',
    'Дубляж',
    'Субтитры',
    'Оригинал',
    'Пиратский перевод',
    'Другая'
];

let studios = JSON.parse(localStorage.getItem('vhsStudios')) || [...DEFAULT_STUDIOS];
let localizations = JSON.parse(localStorage.getItem('vhsLocalizations')) || [...DEFAULT_LOCALIZATIONS];

function saveStudios() {
    localStorage.setItem('vhsStudios', JSON.stringify(studios));
}

function saveLocalizations() {
    localStorage.setItem('vhsLocalizations', JSON.stringify(localizations));
}

// ===== Модальные окна =====
function showError(message) {
    document.getElementById('errorText').textContent = message || '';
    document.getElementById('errorModal').hidden = false;
}

function closeError() {
    document.getElementById('errorModal').hidden = true;
}

let confirmCallback = null;

function showConfirm(message, onConfirm) {
    document.getElementById('confirmText').textContent = message || '';
    confirmCallback = onConfirm;
    document.getElementById('confirmModal').hidden = false;
}

function closeConfirm() {
    confirmCallback = null;
    document.getElementById('confirmModal').hidden = true;
}

document.addEventListener('DOMContentLoaded', () => {
    const okBtn = document.getElementById('confirmOkBtn');
    if (okBtn) {
        okBtn.addEventListener('click', () => {
            const cb = confirmCallback;
            closeConfirm();
            if (typeof cb === 'function') cb();
        });
    }
});

// ===== Datalist =====
function renderDatalists() {
    const studiosList = document.getElementById('studiosList');
    const localizationsList = document.getElementById('localizationsList');
    if (studiosList) {
        studiosList.innerHTML = studios.map(s => `<option value="${escapeAttr(s)}">`).join('');
    }
    if (localizationsList) {
        localizationsList.innerHTML = localizations.map(l => `<option value="${escapeAttr(l)}">`).join('');
    }
}

function rememberValue(value, list, saveFn) {
    const trimmed = (value || '').trim();
    if (!trimmed) return;
    if (!list.includes(trimmed)) {
        list.push(trimmed);
        saveFn();
        renderDatalists();
    }
}

// ===== Фильтры =====
function renderFilters() {
    const studioFilter = document.getElementById('filterStudio');
    const locFilter = document.getElementById('filterLocalization');
    if (!studioFilter || !locFilter) return;

    const currentStudio = studioFilter.value;
    const currentLoc = locFilter.value;

    // Собираем уникальные значения из коллекции + базовые списки
    const usedStudios = [...new Set(tapes.map(t => t.studio).filter(Boolean))];
    const usedLocs = [...new Set(tapes.map(t => t.localization).filter(Boolean))];

    const allStudios = [...new Set([...usedStudios, ...studios])].sort();
    const allLocs = [...new Set([...usedLocs, ...localizations])].sort();

    studioFilter.innerHTML = '<option value="">Все студии</option>' +
        allStudios.map(s => `<option value="${escapeAttr(s)}"${s === currentStudio ? ' selected' : ''}>${escapeHtml(s)}</option>`).join('');

    locFilter.innerHTML = '<option value="">Все локализации</option>' +
        allLocs.map(l => `<option value="${escapeAttr(l)}"${l === currentLoc ? ' selected' : ''}>${escapeHtml(l)}</option>`).join('');
}

// ===== Фильтрация и сортировка =====
function getFilteredTapes() {
    const search = (document.getElementById('searchInput').value || '').trim().toLowerCase();
    const studioFilter = document.getElementById('filterStudio').value;
    const locFilter = document.getElementById('filterLocalization').value;
    const sort = document.getElementById('sortSelect').value;

    // Оставляем исходный индекс для кнопок
    let result = tapes.map((tape, index) => ({ tape, index }));

    if (search) {
        result = result.filter(({ tape }) => {
            const haystack = [
                tape.title, tape.studio, tape.localization, tape.year, tape.condition
            ].filter(Boolean).join(' ').toLowerCase();
            return haystack.includes(search);
        });
    }
    if (studioFilter) {
        result = result.filter(({ tape }) => (tape.studio || '') === studioFilter);
    }
    if (locFilter) {
        result = result.filter(({ tape }) => (tape.localization || '') === locFilter);
    }

    // Сортировка
    result.sort((a, b) => {
        const ta = a.tape, tb = b.tape;
        switch (sort) {
            case 'title-asc':
                return (ta.title || '').localeCompare(tb.title || '', 'ru');
            case 'title-desc':
                return (tb.title || '').localeCompare(ta.title || '', 'ru');
            case 'year-asc':
                return (parseInt(ta.year) || 0) - (parseInt(tb.year) || 0);
            case 'year-desc':
                return (parseInt(tb.year) || 0) - (parseInt(ta.year) || 0);
            case 'added-asc':
                return (ta.addedAt || 0) - (tb.addedAt || 0);
            case 'added-desc':
            default:
                return (tb.addedAt || 0) - (ta.addedAt || 0);
        }
    });

    return result;
}

// ===== Отрисовка =====
function renderCollection() {
    const container = document.getElementById('collection');
    const counter = document.getElementById('counter');
    const filtered = getFilteredTapes();

    if (counter) {
        counter.textContent = filtered.length === tapes.length
            ? `Всего: ${tapes.length}`
            : `Показано ${filtered.length} из ${tapes.length}`;
    }

    if (tapes.length === 0) {
        container.innerHTML = '<p>Пока пусто. Добавьте первую кассету.</p>';
        return;
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p>Ничего не найдено. Попробуйте изменить поиск или фильтры.</p>';
        return;
    }

    container.innerHTML = filtered.map(({ tape, index }) => {
        if (editingIndex === index) {
            return renderEditCard(tape, index);
        }
        return `
        <div class="tape-card">
            ${tape.cover
                ? `<img src="${tape.cover}" alt="${escapeAttr(tape.title)}" class="tape-cover">`
                : `<div class="tape-cover tape-cover-empty">Нет фото</div>`}
            <div class="tape-info">
                <h3>${escapeHtml(tape.title)}</h3>
                <p>Студия: ${escapeHtml(tape.studio) || '—'}</p>
                <p>Локализация: ${escapeHtml(tape.localization) || '—'}</p>
                <p>Год: ${escapeHtml(tape.year) || '—'}</p>
                <p>Состояние: ${escapeHtml(tape.condition)}</p>
                <div class="card-actions">
                    <button class="edit-btn" onclick="startEdit(${index})">Редактировать</button>
                    <button class="delete-btn" onclick="deleteTape(${index})">Удалить</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderEditCard(tape, index) {
    return `
    <div class="tape-card editing">
        <div class="tape-info" style="width:100%">
            <h3>Редактирование</h3>
            <input type="text" id="edit-title-${index}" value="${escapeAttr(tape.title)}" placeholder="Название">

            <input list="editStudiosList-${index}" id="edit-studio-${index}" value="${escapeAttr(tape.studio)}" placeholder="Студия">
            <datalist id="editStudiosList-${index}">
                ${studios.map(s => `<option value="${escapeAttr(s)}">`).join('')}
            </datalist>

            <input list="editLocalizationsList-${index}" id="edit-localization-${index}" value="${escapeAttr(tape.localization)}" placeholder="Локализация">
            <datalist id="editLocalizationsList-${index}">
                ${localizations.map(l => `<option value="${escapeAttr(l)}">`).join('')}
            </datalist>

            <input type="text" id="edit-year-${index}" value="${escapeAttr(tape.year)}" placeholder="Год" inputmode="numeric">

            <select id="edit-condition-${index}">
                ${['Запечатана','Отличное','Хорошее','Потёртости'].map(c =>
                    `<option value="${c}"${c === tape.condition ? ' selected' : ''}>${c}</option>`
                ).join('')}
            </select>

            <input type="file" id="edit-cover-${index}" accept="image/*">

            <div class="card-actions">
                <button class="save-btn" onclick="saveEdit(${index})">Сохранить</button>
                <button class="cancel-btn" onclick="cancelEdit()">Отмена</button>
            </div>
        </div>
    </div>`;
}

function startEdit(index) {
    editingIndex = index;
    renderCollection();
}

function cancelEdit() {
    editingIndex = null;
    renderCollection();
}

async function saveEdit(index) {
    const yearInput = document.getElementById(`edit-year-${index}`).value;
    const yearCheck = validateYear(yearInput);
    if (!yearCheck.ok) {
        showError('Год должен быть 4 цифры (1997) или диапазон (1997-1998)');
        return;
    }

    const newStudio = document.getElementById(`edit-studio-${index}`).value;
    const newLocalization = document.getElementById(`edit-localization-${index}`).value;

    rememberValue(newStudio, studios, saveStudios);
    rememberValue(newLocalization, localizations, saveLocalizations);

    const coverInput = document.getElementById(`edit-cover-${index}`);
    let coverData = tapes[index].cover;
    if (coverInput.files && coverInput.files[0]) {
        try {
            coverData = await compressImage(coverInput.files[0]);
        } catch (err) {
            showError('Не удалось обработать фото: ' + err.message);
            return;
        }
    }

    tapes[index] = {
        ...tapes[index],
        title: document.getElementById(`edit-title-${index}`).value,
        studio: newStudio.trim(),
        localization: newLocalization.trim(),
        year: yearCheck.value,
        condition: document.getElementById(`edit-condition-${index}`).value,
        cover: coverData
    };

    localStorage.setItem('vhsTapes', JSON.stringify(tapes));
    editingIndex = null;
    renderFilters();
    renderDatalists();
    renderCollection();
}

// ===== Добавление =====
document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const yearInput = document.getElementById('year').value;
    const yearCheck = validateYear(yearInput);
    if (!yearCheck.ok) {
        showError('Год должен быть 4 цифры (1997) или диапазон (1997-1998)');
        return;
    }

    const newStudio = document.getElementById('studio').value;
    const newLocalization = document.getElementById('localization').value;

    rememberValue(newStudio, studios, saveStudios);
    rememberValue(newLocalization, localizations, saveLocalizations);

    let coverData = '';
    const coverInput = document.getElementById('cover');
    if (coverInput.files && coverInput.files[0]) {
        try {
            coverData = await compressImage(coverInput.files[0]);
        } catch (err) {
            showError('Не удалось обработать фото: ' + err.message);
            return;
        }
    }

    const tape = {
        title: document.getElementById('title').value,
        studio: newStudio.trim(),
        localization: newLocalization.trim(),
        year: yearCheck.value,
        condition: document.getElementById('condition').value,
        cover: coverData,
        addedAt: Date.now()
    };

    tapes.push(tape);
    localStorage.setItem('vhsTapes', JSON.stringify(tapes));

    document.getElementById('addForm').reset();
    renderDatalists();
    renderFilters();
    renderCollection();
});

// ===== Удаление =====
function deleteTape(index) {
    const tape = tapes[index];
    showConfirm(tape ? tape.title : '', () => {
        if (editingIndex === index) editingIndex = null;
        tapes.splice(index, 1);
        localStorage.setItem('vhsTapes', JSON.stringify(tapes));
        renderFilters();
        renderCollection();
    });
}

// ===== Экспорт/импорт =====
function exportCollection() {
    const dataStr = JSON.stringify(tapes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vhs-collection.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importCollection(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                // На случай старых файлов без addedAt
                tapes = imported.map((t, i) => ({ ...t, addedAt: t.addedAt || Date.now() + i }));
                localStorage.setItem('vhsTapes', JSON.stringify(tapes));
                editingIndex = null;
                renderDatalists();
                renderFilters();
                renderCollection();
                showError('Коллекция загружена: ' + tapes.length + ' кассет');
            } else {
                showError('Неверный формат файла');
            }
        } catch (err) {
            showError('Ошибка чтения файла: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// ===== Фото =====
function compressImage(file, maxWidth = 300, maxHeight = 400) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ===== Год =====
function validateYear(value) {
    const trimmed = value.trim();
    if (!trimmed) return { ok: true, value: '' };
    if (/^\d{4}$/.test(trimmed)) return { ok: true, value: trimmed };
    if (/^\d{4}\s*[-–]\s*\d{4}$/.test(trimmed)) return { ok: true, value: trimmed };
    return { ok: false, value: trimmed };
}

// ===== Утилиты =====
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    return escapeHtml(str);
}

// ===== Инициализация =====
function init() {
    renderDatalists();
    renderFilters();

    document.getElementById('searchInput').addEventListener('input', renderCollection);
    document.getElementById('filterStudio').addEventListener('change', renderCollection);
    document.getElementById('filterLocalization').addEventListener('change', renderCollection);
    document.getElementById('sortSelect').addEventListener('change', renderCollection);

    document.getElementById('resetFilters').addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterStudio').value = '';
        document.getElementById('filterLocalization').value = '';
        document.getElementById('sortSelect').value = 'added-desc';
        renderCollection();
    });

    renderCollection();
}

init();