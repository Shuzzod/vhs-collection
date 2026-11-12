let tapes = JSON.parse(localStorage.getItem('vhsTapes')) || [];
let editingIndex = null;

const DEFAULT_STUDIOS = [
    'Союз Видео', 'Варус Видео', 'Мастер Тэйп', 'Most Video',
    'West Video', 'Студия Горького', 'Крупный План', 'Другая'
];

const DEFAULT_LOCALIZATIONS = [
    'Одноголосый (Володарский)',
    'Двухголосый',
    'Многоголосый (профессиональный)',
    'Дубляж',
    'Субтитры',
    'Оригинал (без перевода)',
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

function renderStudioOptions(selected = '', selectId = 'studio') {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">— Выберите студию —</option>' +
        studios.map(s => `<option value="${s}"${s === selected ? ' selected' : ''}>${s}</option>`).join('');
}

function renderLocalizationOptions(selected = '', selectId = 'localization') {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">— Локализация —</option>' +
        localizations.map(l => `<option value="${l}"${l === selected ? ' selected' : ''}>${l}</option>`).join('');
}

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

// Валидация года: допускаем пусто, 4 цифры, или диапазон "1997-1998"
function validateYear(value) {
    const trimmed = value.trim();
    if (!trimmed) return { ok: true, value: '' };
    if (/^\d{4}$/.test(trimmed)) return { ok: true, value: trimmed };
    if (/^\d{4}\s*[-–]\s*\d{4}$/.test(trimmed)) return { ok: true, value: trimmed };
    return { ok: false, value: trimmed };
}

function renderCollection() {
    const container = document.getElementById('collection');
    if (tapes.length === 0) {
        container.innerHTML = '<p>Пока пусто. Добавьте первую кассету.</p>';
        return;
    }
    container.innerHTML = tapes.map((tape, index) => {
        if (editingIndex === index) {
            return renderEditCard(tape, index);
        }
        return `
        <div class="tape-card">
            ${tape.cover
                ? `<img src="${tape.cover}" alt="${tape.title}" class="tape-cover">`
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
            <select id="edit-studio-${index}"></select>
            <select id="edit-localization-${index}"></select>
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
    // после отрисовки заполняем селекты
    renderStudioOptions(tapes[index].studio, `edit-studio-${index}`);
    renderLocalizationOptions(tapes[index].localization, `edit-localization-${index}`);
}

function cancelEdit() {
    editingIndex = null;
    renderCollection();
}

async function saveEdit(index) {
    const yearInput = document.getElementById(`edit-year-${index}`).value;
    const yearCheck = validateYear(yearInput);
    if (!yearCheck.ok) {
        alert('Год должен быть 4 цифры (1997) или диапазон (1997-1998)');
        return;
    }

    const coverInput = document.getElementById(`edit-cover-${index}`);
    let coverData = tapes[index].cover;
    if (coverInput.files && coverInput.files[0]) {
        try {
            coverData = await compressImage(coverInput.files[0]);
        } catch (err) {
            alert('Не удалось обработать фото: ' + err.message);
            return;
        }
    }

    tapes[index] = {
        ...tapes[index],
        title: document.getElementById(`edit-title-${index}`).value,
        studio: document.getElementById(`edit-studio-${index}`).value,
        localization: document.getElementById(`edit-localization-${index}`).value,
        year: yearCheck.value,
        condition: document.getElementById(`edit-condition-${index}`).value,
        cover: coverData
    };

    localStorage.setItem('vhsTapes', JSON.stringify(tapes));
    editingIndex = null;
    renderCollection();
}

document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const yearInput = document.getElementById('year').value;
    const yearCheck = validateYear(yearInput);
    if (!yearCheck.ok) {
        alert('Год должен быть 4 цифры (1997) или диапазон (1997-1998)');
        return;
    }

    let coverData = '';
    const coverInput = document.getElementById('cover');
    if (coverInput.files && coverInput.files[0]) {
        try {
            coverData = await compressImage(coverInput.files[0]);
        } catch (err) {
            alert('Не удалось обработать фото: ' + err.message);
            return;
        }
    }

    const tape = {
        title: document.getElementById('title').value,
        studio: document.getElementById('studio').value,
        localization: document.getElementById('localization').value,
        year: yearCheck.value,
        condition: document.getElementById('condition').value,
        cover: coverData
    };

    tapes.push(tape);
    localStorage.setItem('vhsTapes', JSON.stringify(tapes));

    document.getElementById('addForm').reset();
    renderStudioOptions();
    renderLocalizationOptions();
    renderCollection();
});

document.getElementById('addStudioBtn').addEventListener('click', () => {
    const name = prompt('Название новой студии:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (studios.includes(trimmed)) {
        alert('Такая студия уже есть в списке');
        return;
    }
    studios.push(trimmed);
    saveStudios();
    renderStudioOptions(trimmed);
});

document.getElementById('addLocalizationBtn').addEventListener('click', () => {
    const name = prompt('Новый вариант локализации:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (localizations.includes(trimmed)) {
        alert('Такая локализация уже есть в списке');
        return;
    }
    localizations.push(trimmed);
    saveLocalizations();
    renderLocalizationOptions(trimmed);
});

function deleteTape(index) {
    if (!confirm('Удалить кассету?')) return;
    if (editingIndex === index) editingIndex = null;
    tapes.splice(index, 1);
    localStorage.setItem('vhsTapes', JSON.stringify(tapes));
    renderCollection();
}

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
                tapes = imported;
                localStorage.setItem('vhsTapes', JSON.stringify(tapes));
                editingIndex = null;
                renderCollection();
                alert('Коллекция загружена: ' + tapes.length + ' кассет');
            } else {
                alert('Неверный формат файла');
            }
        } catch (err) {
            alert('Ошибка чтения файла: ' + err.message);
        }
    };
    reader.readAsText(file);
}

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

renderStudioOptions();
renderLocalizationOptions();
renderCollection();