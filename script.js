let allQuestions = [];       
let testQuestions = [];      
let currentQuestionIndex = 0;

// Структура для хранения состояния прохождения текущего теста
// Хранит объекты: { selectedIndex: число/null, isSubmitted: true/false }
let userAnswers = []; 

let timerInterval = null;
let timeLeft = 0;
let maxTimePerQuestion = 0; 

window.onload = function() {
    fetch('micro_tests.json')
        .then(response => {
            if (!response.ok) throw new Error("Не удалось загрузить JSON");
            return response.json();
        })
        .then(data => {
            allQuestions = data.sort((a, b) => a.id - b.id);
            console.log(`Загружено вопросов: ${allQuestions.length}`);
            
            if(allQuestions.length > 0) {
                document.getElementById('setting-range-to').value = allQuestions[allQuestions.length - 1].id;
                document.getElementById('setting-range-to').max = allQuestions[allQuestions.length - 1].id;
                document.getElementById('setting-range-from').min = allQuestions[0].id;
            }
        })
        .catch(error => {
            alert("Ошибка загрузки файла micro_tests.json");
            console.error(error);
        });
};

function showScreen(screenId) {
    clearInterval(timerInterval); 
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// === ЛОГИКА ТЕСТА С ПРЕДВАРИТЕЛЬНЫМ ВЫБОРОМ ===
function startTest() {
    if (allQuestions.length === 0) return;

    const fromId = parseInt(document.getElementById('setting-range-from').value) || 1;
    const toId = parseInt(document.getElementById('setting-range-to').value) || allQuestions.length;
    const orderSetting = document.getElementById('setting-order').value;
    maxTimePerQuestion = parseInt(document.getElementById('setting-time').value) || 0;

    let pool = allQuestions.filter(q => q.id >= fromId && q.id <= toId);

    if (pool.length === 0) {
        alert("В выбранном диапазоне вопросов не найдено!");
        return;
    }

    if (orderSetting === 'random') {
        pool = shuffleArray(pool);
    }

    testQuestions = pool;
    currentQuestionIndex = 0;
    
    // Инициализируем массив ответов пользователя пустыми значениями
    userAnswers = testQuestions.map(() => ({
        selectedIndex: null,
        isSubmitted: false
    }));
    
    showScreen('screen-test');
    renderQuestion();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function renderQuestion() {
    clearInterval(timerInterval);
    
    const currentQuestion = testQuestions[currentQuestionIndex];
    const currentAnswerState = userAnswers[currentQuestionIndex];
    
    // Обновляем счетчик и текст вопроса
    document.getElementById('question-counter').innerText = `Вопрос ${currentQuestionIndex + 1} из ${testQuestions.length}`;
    document.getElementById('question-text').innerText = `${currentQuestion.id}. ${currentQuestion.question}`;
    
    // Блокировка/разблокировка кнопок Назад/Вперед
    document.getElementById('btn-prev').disabled = (currentQuestionIndex === 0);
    // Кнопку "Вперед" разрешаем нажимать всегда (чтобы можно было просто пролистать)
    document.getElementById('btn-next').disabled = (currentQuestionIndex === testQuestions.length - 1);

    const container = document.getElementById('options-container');
    container.innerHTML = '';

    currentQuestion.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.innerText = option;
        
        // Отрисовка состояния кнопки в зависимости от того, принят ответ или просто выбран
        if (currentAnswerState.isSubmitted) {
            // Если ответ уже зафиксирован — показываем результат проверки
            if (index === currentQuestion.answer) {
                button.classList.add('correct');
            } else if (index === currentAnswerState.selectedIndex) {
                button.classList.add('wrong');
            }
        } else {
            // Если ответ еще не зафиксирован, но был предварительно выбран ранее
            if (index === currentAnswerState.selectedIndex) {
                button.classList.add('selected');
            }
            button.onclick = () => selectOption(index);
        }
        container.appendChild(button);
    });

    // Управление кнопкой "Принять ответ"
    const submitBtn = document.getElementById('btn-submit-answer');
    if (currentAnswerState.isSubmitted) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Ответ принят";
    } else {
        submitBtn.disabled = (currentAnswerState.selectedIndex === null);
        submitBtn.innerText = "Принять ответ";
    }

    // Запуск таймера (работает только если ответ еще не отправлен и таймер включен)
    const timerBadge = document.getElementById('test-timer');
    if (maxTimePerQuestion > 0 && !currentAnswerState.isSubmitted) {
        timerBadge.style.display = 'inline-block';
        timeLeft = maxTimePerQuestion;
        timerBadge.innerText = `⏱️ ${timeLeft}s`;
        
        timerInterval = setInterval(() => {
            timeLeft--;
            timerBadge.innerText = `⏱️ ${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                handleTimeOut();
            }
        }, 1000);
    } else {
        timerBadge.style.display = 'none';
    }
}

// Предварительный клик по кнопке (до нажатия "Принять ответ")
function selectOption(index) {
    const currentAnswerState = userAnswers[currentQuestionIndex];
    if (currentAnswerState.isSubmitted) return;

    currentAnswerState.selectedIndex = index;
    
    // Перерисовываем выделение кнопок без сброса таймера
    const buttons = document.querySelectorAll('.options-grid .option-btn');
    buttons.forEach((btn, idx) => {
        if (idx === index) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    // Активируем кнопку "Принять ответ"
    document.getElementById('btn-submit-answer').disabled = false;
}

// Клик по кнопке "Принять ответ"
function submitCurrentAnswer() {
    const currentAnswerState = userAnswers[currentQuestionIndex];
    if (currentAnswerState.selectedIndex === null || currentAnswerState.isSubmitted) return;

    clearInterval(timerInterval);
    currentAnswerState.isSubmitted = true;
    
    // Отображаем правильный/неправильный ответ анимацией
    renderQuestion();
}

function handleTimeOut() {
    const currentAnswerState = userAnswers[currentQuestionIndex];
    currentAnswerState.isSubmitted = true;
    if (currentAnswerState.selectedIndex === null) {
        currentAnswerState.selectedIndex = -1; // Значит не успел ответить
    }
    renderQuestion();
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
}

function nextQuestion() {
    if (currentQuestionIndex < testQuestions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    }
}

// Завершение теста через кнопку в шапке или по окончанию
function finishTestLogic() {
    clearInterval(timerInterval);
    
    // Считаем итоговые баллы
    let finalScore = 0;
    userAnswers.forEach((ans, idx) => {
        if (ans.isSubmitted && ans.selectedIndex === testQuestions[idx].answer) {
            finalScore++;
        }
    });

    // Сохраняем в историю
    saveToHistory(finalScore, testQuestions.length);

    // Выводим результаты на экран завершения
    document.getElementById('result-score-digits').innerText = `${finalScore} / ${testQuestions.length}`;
    showScreen('screen-results');
}

function confirmExit() {
    document.getElementById('modal-confirm').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-confirm').style.display = 'none';
}

function exitTest() {
    closeModal();
    finishTestLogic();
}

// === ЭКРАН РАБОТЫ НАД ОШИБКАМИ (ОТЧЕТ) ===
function openReviewScreen() {
    showScreen('screen-review');
    const container = document.getElementById('review-list');
    container.innerHTML = '';

    testQuestions.forEach((q, idx) => {
        const ansState = userAnswers[idx];
        const isCorrect = ansState.isSubmitted && (ansState.selectedIndex === q.answer);
        
        const item = document.createElement('div');
        item.className = `study-item ${isCorrect ? 'item-correct' : 'item-wrong'}`;
        
        let userAnsText = "Нет ответа (Пропущено или время вышло)";
        if (ansState.selectedIndex !== null && ansState.selectedIndex >= 0) {
            userAnsText = q.options[ansState.selectedIndex];
        }

        const correctAnsText = q.options[q.answer];

        let reviewHTML = `<div class="study-q">${q.id}. ${q.question}</div>`;
        
        if (isCorrect) {
            reviewHTML += `<div class="study-a">✅ Ваш ответ правильный: ${correctAnsText}</div>`;
        } else {
            reviewHTML += `
                <div class="study-user-a">❌ Ваш ответ: ${userAnsText}</div>
                <div class="study-a">✅ Правильный ответ: ${correctAnsText}</div>
            `;
        }

        item.innerHTML = reviewHTML;
        container.appendChild(item);
    });
}

// === РЕЖИМ ИЗУЧЕНИЯ ТЕСТОВ ===
function openStudyScreen() {
    showScreen('screen-study');
    document.getElementById('study-search').value = ''; 
    renderStudyList(allQuestions);
}

function renderStudyList(questions) {
    const container = document.getElementById('study-list');
    container.innerHTML = '';

    if(questions.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center;">Вопросы не найдены</p>';
        return;
    }

    questions.forEach(q => {
        const correctText = q.options[q.answer];
        const item = document.createElement('div');
        item.className = 'study-item';
        item.innerHTML = `
            <div class="study-q">${q.id}. ${q.question}</div>
            <div class="study-a">✅ Правильный ответ: ${correctText}</div>
        `;
        container.appendChild(item);
    });
}

function filterStudyQuestions() {
    const query = document.getElementById('study-search').value.toLowerCase();
    const filtered = allQuestions.filter(q => 
        q.question.toLowerCase().includes(query) || q.id.toString().includes(query)
    );
    renderStudyList(filtered);
}

// === ИСТОРИЯ ===
function saveToHistory(score, total) {
    if(total === 0) return;
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    const now = new Date();
    const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    history.unshift({ date: dateStr, score: score, total: total });
    localStorage.setItem('quiz_history', JSON.stringify(history));
}

function showHistoryScreen() {
    showScreen('screen-history');
    const container = document.getElementById('history-list');
    container.innerHTML = '';

    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');

    if (history.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; padding: 20px;">История пуста</p>';
        return;
    }

    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `<span>📅 ${item.date}</span><strong>🏆 ${item.score} / ${item.total}</strong>`;
        container.appendChild(div);
    });
}

// Очистка
function clearHistory() {
    if (confirm("Удалить историю прохождений?")) {
        localStorage.removeItem('quiz_history');
        showHistoryScreen();
    }
}