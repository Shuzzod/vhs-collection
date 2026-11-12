let tapes = JSON.parse(localStorage.getItem('vhsTapes')) || [];

// Сжатие фото до 300x400 и качества 0.7
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

function renderCollection() {
    const container = document.getElementById('collection');
    if (tapes.length === 0) {
        container.innerHTML = '<p>Пока пусто. Добавьте первую кассету.</p>';
        return;
    }
    container.innerHTML = tapes.map((tape, index) => `
        <div class="tape-card">
            ${tape.cover 
                ? `<img src="${tape.cover}" alt="${tape.title}" class="tape-cover">` 
                : `<div class="tape-cover tape-cover-empty">Нет фото</div>`}
            <div class="tape-info">
                <h3>${tape.title}</h3>
                <p>Студия: ${tape.studio || '—'}</p>
                <p>Год: ${tape.year || '—'}</p>
                <p>Локализация: ${tape.localization || '—'}</p>
                <p>Состояние: ${tape.condition}</p>
                <button onclick="deleteTape(${index})">Удалить</button>
            </div>
        </div>
    `).join('');
}

document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
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
        year: document.getElementById('year').value,
        condition: document.getElementById('condition').value,
        cover: coverData
    };
    
    tapes.push(tape);
    localStorage.setItem('vhsTapes', JSON.stringify(tapes));
    
    document.getElementById('addForm').reset();
    renderCollection();
});

function deleteTape(index) {
    if (!confirm('Удалить кассету?')) return;
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

renderCollection();