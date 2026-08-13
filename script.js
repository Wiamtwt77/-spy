let playerCount = 4;
let gameState = {
    players: [],
    context: "",
    realTopic: "",
    fakeTopic: "",
    hints: [],
    currentPassIndex: 0
};

let timerInterval;

// Web Audio API Synthesis للمؤثرات الصوتية بدون ملفات خارجية!
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
    } else if (type === 'flip') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    } else if (type === 'alarm') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(400, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.1);
        osc.frequency.setValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    }
}

function triggerShake() {
    const main = document.getElementById('mainContainer');
    main.classList.remove('shake');
    void main.offsetWidth;
    main.classList.add('shake');
}

function setPlayerCount(count) {
    playSound('click');
    playerCount = count;
    const container = document.getElementById('playerInputs');
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        container.innerHTML += `<input type="text" class="input-neon" id="pName${i}" value="لاعب ${i}">`;
    }
}
setPlayerCount(4);

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

async function startGame() {
    playSound('click');
    showScreen('screen-loading');

    const names = [];
    for (let i = 1; i <= playerCount; i++) {
        names.push(document.getElementById(`pName${i}`)?.value.trim() || `لاعب ${i}`);
    }

    try {
        const res = await fetch('/api/generate', { method: 'POST' });
        const data = await res.json();
        gameState.context = data.context;
        gameState.realTopic = data.realTopic;
        gameState.fakeTopic = data.fakeTopic;
    } catch (e) {
        gameState.context = "في كواليس مسرحية 🎭";
        gameState.realTopic = "المخرج";
        gameState.fakeTopic = "الممثل الرئيسي";
    }

    // توزيع الأدوار: كاشف، جاسوس، جوكر (إذا كان العدد >= 4)، وبقية لاعبين عاديين
    let shuffled = names.map((_, i) => i).sort(() => Math.random() - 0.5);
    const detectorIdx = shuffled[0];
    const spyIdx = shuffled[1];
    const jokerIdx = (names.length >= 4) ? shuffled[2] : -1;

    gameState.players = names.map((name, index) => {
        let role = 'normal';
        if (index === detectorIdx) role = 'detector';
        else if (index === spyIdx) role = 'spy';
        else if (index === jokerIdx) role = 'joker';
        return { id: index, name, role };
    });

    gameState.hints = [];
    gameState.currentPassIndex = 0;
    startRolePass();
}

function startRolePass() {
    if (gameState.currentPassIndex < gameState.players.length) {
        const p = gameState.players[gameState.currentPassIndex];
        document.getElementById('passRolePlayerName').innerText = p.name;
        document.getElementById('roleCard').classList.remove('flipped');
        showScreen('screen-pass-role');
    } else {
        startHintCollection();
    }
}

function flipRoleCard() {
    const card = document.getElementById('roleCard');
    if (card.classList.contains('flipped')) return;

    playSound('flip');
    card.classList.add('flipped');

    const p = gameState.players[gameState.currentPassIndex];
    const badge = document.getElementById('roleBadge');
    const topic = document.getElementById('roleTopicDisplay');
    const desc = document.getElementById('roleDescDisplay');
    document.getElementById('contextDisplay').innerText = gameState.context;

    if (p.role === 'detector') {
        badge.innerText = "🔍 أنت الكاشف";
        badge.style.color = "var(--neon-cyan)";
        topic.innerText = gameState.realTopic;
        desc.innerText = "تعرف الموضوع الحقيقي. هدفك كشف الجاسوس وحذر من السقوط في فخ الجوكر!";
    } else if (p.role === 'spy') {
        badge.innerText = "🕵️‍♂️ أنت الجاسوس";
        badge.style.color = "var(--neon-pink)";
        topic.innerText = gameState.fakeTopic;
        desc.innerText = "حصلت على موضوع موهم يشارك نفس البيئة! اندمج واكتشف الموضوع الحقيقي لتفوز.";
    } else if (p.role === 'joker') {
        badge.innerText = "🃏 أنت الجوكر";
        badge.style.color = "var(--neon-purple)";
        topic.innerText = gameState.realTopic;
        desc.innerText = "تعرف الموضوع الحقيقي، لكن هدفك هو التلميح بشكل مريب ليتم اتهامك من الكاشف وتفوز وحدك!";
    } else {
        badge.innerText = "👤 أنت لاعب عادي";
        badge.style.color = "var(--neon-green)";
        topic.innerText = gameState.realTopic;
        desc.innerText = "تعرف الموضوع الحقيقي. لمح بذكاء وساعد الكاشف في التعرف على الجاسوس.";
    }
}

function finishRoleView() {
    playSound('click');
    gameState.currentPassIndex++;
    startRolePass();
}

function startHintCollection() {
    gameState.currentPassIndex = 0;
    passNextHint();
}

function passNextHint() {
    if (gameState.currentPassIndex < gameState.players.length) {
        const p = gameState.players[gameState.currentPassIndex];
        document.getElementById('hintPlayerName').innerText = p.name;
        document.getElementById('hintTextInput').value = '';
        showScreen('screen-pass-hint');
    } else {
        showAnonHints();
    }
}

function submitHint() {
    playSound('click');
    const text = document.getElementById('hintTextInput').value.trim();
    gameState.hints.push(text || "تلميح غامض");
    gameState.currentPassIndex++;
    passNextHint();
}

function showAnonHints() {
    const container = document.getElementById('anonHintsContainer');
    container.innerHTML = '';

    // خلط التلميحات عشوائياً 100% لإخفاء أي ترتيب أو هوية
    const shuffledHints = [...gameState.hints].sort(() => Math.random() - 0.5);

    shuffledHints.forEach((hintText, index) => {
        container.innerHTML += `
            <div class="hint-anon-card" style="animation-delay: ${index * 0.1}s">
                <span style="color: var(--neon-cyan); font-weight:800; font-size:0.85rem;">🕵️‍♂️ تلميح مجهول #${index + 1}:</span>
                <p style="font-size:1.05rem; margin-top:3px;">"${hintText}"</p>
            </div>
        `;
    });

    showScreen('screen-review-hints');
}

function goToDiscussion() {
    playSound('click');
    showScreen('screen-discussion');
    startTimer(120);
}

function startTimer(seconds) {
    clearInterval(timerInterval);
    let left = seconds;
    const disp = document.getElementById('discTimer');
    
    timerInterval = setInterval(() => {
        let m = Math.floor(left / 60);
        let s = left % 60;
        disp.innerText = `${m < 10 ? '0':''}${m}:${s < 10 ? '0':''}${s}`;
        if (left <= 0) clearInterval(timerInterval);
        left--;
    }, 1000);
}

// فتح وإغلاق النوافذ المودال
function openDetectorModal() {
    playSound('alarm');
    triggerShake();
    const list = document.getElementById('detectorTargetsList');
    list.innerHTML = '';

    gameState.players.filter(p => p.role !== 'detector').forEach(p => {
        list.innerHTML += `
            <button class="btn-neon btn-red" onclick="executeDetectorAccuse(${p.id})">اتّهام: ${p.name}</button>
        `;
    });

    document.getElementById('modalDetector').classList.add('active');
}

function openSpyModal() {
    playSound('click');
    document.getElementById('spyGuessInput').value = '';
    document.getElementById('modalSpy').classList.add('active');
}

function closeModals() {
    playSound('click');
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

// تنفيذ اتّهام الكاشف
function executeDetectorAccuse(targetId) {
    closeModals();
    const target = gameState.players.find(p => p.id === targetId);

    if (target.role === 'joker') {
        triggerEndGame('joker_win');
    } else if (target.role === 'spy') {
        triggerEndGame('detector_win');
    } else {
        triggerEndGame('spy_win_wrong_accuse');
    }
}

// تنفيذ تخمين الجاسوس
function submitSpyGuess() {
    closeModals();
    const guess = document.getElementById('spyGuessInput').value.trim();
    if (guess.toLowerCase() === gameState.realTopic.toLowerCase()) {
        triggerEndGame('spy_win_correct_guess');
    } else {
        alert("تخمين خاطئ! استمرت اللعبة.");
    }
}

// شاشة النهاية
function triggerEndGame(type) {
    clearInterval(timerInterval);
    playSound('win');
    triggerShake();

    const title = document.getElementById('revealTitle');
    const sub = document.getElementById('revealSub');

    const detector = gameState.players.find(p => p.role === 'detector');
    const spy = gameState.players.find(p => p.role === 'spy');
    const joker = gameState.players.find(p => p.role === 'joker');

    document.getElementById('revealDetector').innerText = detector ? detector.name : "لا يوجد";
    document.getElementById('revealSpy').innerText = spy ? spy.name : "لا يوجد";
    
    if (joker) {
        document.getElementById('jokerRow').style.display = 'block';
        document.getElementById('revealJoker').innerText = joker.name;
    } else {
        document.getElementById('jokerRow').style.display = 'none';
    }

    document.getElementById('revealContext').innerText = gameState.context;
    document.getElementById('revealReal').innerText = gameState.realTopic;
    document.getElementById('revealFake').innerText = gameState.fakeTopic;

    if (type === 'joker_win') {
        title.innerText = "🃏 فاز الجوكر بمفرده!";
        title.style.color = "var(--neon-purple)";
        sub.innerText = `وقع الكاشف في الفخ واتهم الجوكر (${joker.name})!`;
    } else if (type === 'detector_win') {
        title.innerText = "🎉 فاز الكاشف والعاديون!";
        title.style.color = "var(--neon-green)";
        sub.innerText = "نجح الكاشف في تحديد الجاسوس الحقيقي كشخصية عبقرية!";
    } else if (type === 'spy_win_wrong_accuse') {
        title.innerText = "🕵️‍♂️ فاز الجاسوس!";
        title.style.color = "var(--neon-pink)";
        sub.innerText = "أخطأ الكاشف واتهم لاعباً عادياً، فنفد الجاسوس بالانتصار!";
    } else if (type === 'spy_win_correct_guess') {
        title.innerText = "🕵️‍♂️ فاز الجاسوس بالتخمين!";
        title.style.color = "var(--neon-yellow)";
        sub.innerText = "خمن الجاسوس الموضوع الحقيقي بالضبط واقتنص الفوز!";
    }

    showScreen('screen-reveal');
}
