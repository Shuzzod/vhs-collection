// Массив для хранения кассет
let tapes = JSON.parse(localStorage.getItem('vhsTapes')) || [];

// Функция отрисовки коллекции
function renderCollection() {
    const container = document.getElementById('collection');
    if (tapes.length === 0) {
        container.innerHTML = '<p>Пока пусто. Добавьте первую кассету.</p>';
        return;
    }
    
    container.innerHTML = tapes.map((tape, index) => `
        <div class="tape-card">
            <h3>${tape.title}</h3>
            <p>Студия: ${tape.studio || '—'}</p>
            <p>Год: ${tape.year || '—'}</p>
            <p>Состояние: ${tape.condition}</p>
            <button onclick="deleteTape(${index})">Удалить</button>
        </div>
    `).join('');
}

// Добавление кассеты
document.getElementById('addForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const tape = {
        title: document.getElementById('title').value,
        studio: document.getElementById('studio').value,
        year: document.getElementById('year').value,
        condition: document.getElementById('condition').value
    };
    
    tapes.push(tape);
    localStorage.setItem('vhsTapes', JSON.stringify(tapes));
    
    // Очищаем форму
    document.getElementById('addForm').reset();
    
    renderCollection();
});

// Удаление кассеты
function deleteTape(index) {
    tapes.splice(index, 1);
    localStorage.setItem('vhsTapes', JSON.stringify(tapes));
    renderCollection();
}

// Первая отрисовка при загрузке
renderCollection();