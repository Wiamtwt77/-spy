let playerCount = 4;
let gameState = {
    players: [],
    realTopic: "",
    fakeTopic: "",
    currentRound: 1,
    hintsHistory: [], // [ [ { playerId, playerName, text, isBlocked } ] ]
    spyStrikesLeft: 2,
    currentPassIndex: 0
};

let timerInterval;

// إعداد الأسماء
function setPlayerCount(count) {
    playerCount = count;
    const container = document.getElementById('playerInputs');
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        container.innerHTML += `
            <input type="text" class="input-neon" id="pName${i}" value="لاعب ${i}" placeholder="اسم اللاعب ${i}">
        `;
    }
}
setPlayerCount(4);

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// بدء اللعبة وتوزيع الأدوار
async function startGame() {
    showScreen('screen-loading');
    
    // جمع الأسماء
    const names = [];
    for (let i = 1; i <= playerCount; i++) {
        const val = document.getElementById(`pName${i}`)?.value.trim();
        names.push(val || `لاعب ${i}`);
    }

    // جلب المواضيع من API
    try {
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categories: [] })
        });
        const data = await res.json();
        gameState.realTopic = data.realTopic;
        gameState.fakeTopic = data.fakeTopic;
    } catch (e) {
        gameState.realTopic = "طيار مدني";
        gameState.fakeTopic = "مراقب برج المراقبة";
    }

    // تعيين الأدوار عشوائياً (1 كاشف، 1 جاسوس، الباقي عاديون)
    let shuffledIndices = names.map((_, i) => i).sort(() => Math.random() - 0.5);
    const detectorIdx = shuffledIndices[0];
    const spyIdx = shuffledIndices[1];

    gameState.players = names.map((name, index) => {
        let role = 'normal';
        if (index === detectorIdx) role = 'detector';
        if (index === spyIdx) role = 'spy';
        return { id: index, name, role };
    });

    gameState.currentRound = 1;
    gameState.hintsHistory = [];
    gameState.spyStrikesLeft = 2;
    gameState.currentPassIndex = 0;

    startRolePass();
}

// تمرير الهاتف لإظهار الدور
function startRolePass() {
    if (gameState.currentPassIndex < gameState.players.length) {
        const p = gameState.players[gameState.currentPassIndex];
        document.getElementById('passRolePlayerName').innerText = p.name;
        showScreen('screen-pass-role');
    } else {
        // انتهى عرض الأدوار -> الانتقال لمركز الجولة
        setupRoundHub();
    }
}

function showPlayerRole() {
    const p = gameState.players[gameState.currentPassIndex];
    document.getElementById('rolePlayerNameDisplay').innerText = p.name;
    
    const badge = document.getElementById('roleBadge');
    const topic = document.getElementById('roleTopicDisplay');
    const desc = document.getElementById('roleDescDisplay');

    if (p.role === 'detector') {
        badge.innerText = "🔍 أنت الكاشف";
        badge.style.color = "var(--neon-cyan)";
        topic.innerText = gameState.realTopic;
        desc.innerText = "تعرف الموضوع الحقيقي وسترى أسماء كتاب التلميحات لاحقاً!";
    } else if (p.role === 'spy') {
        badge.innerText = "🕵️‍♂️ أنت الجاسوس";
        badge.style.color = "var(--neon-pink)";
        topic.innerText = gameState.fakeTopic;
        desc.innerText = "حصلت على موضوع خاطئ! حاول ألا تنكشف واستغل ضرباتك لكشف الكاشف.";
    } else {
        badge.innerText = "👤 أنت لاعب عادي";
        badge.style.color = "var(--neon-green)";
        topic.innerText = gameState.realTopic;
        desc.innerText = "تعرف الموضوع الحقيقي، اكتب تلميحاتك وساعد الكاشف.";
    }

    showScreen('screen-view-role');
}

function finishRoleView() {
    gameState.currentPassIndex++;
    startRolePass();
}

// مركز الجولات
function setupRoundHub() {
    document.getElementById('roundTitle').innerText = `الجولة ${gameState.currentRound} من 3`;
    showScreen('screen-round-hub');
}

// البدء بجمع التلميحات
function startHintCollection() {
    gameState.hintsHistory.push([]); // مصفوفة جديدة للحدث
    gameState.currentPassIndex = 0;
    passNextHint();
}

function passNextHint() {
    if (gameState.currentPassIndex < gameState.players.length) {
        const p = gameState.players[gameState.currentPassIndex];
        document.getElementById('hintPlayerName').innerText = p.name;
        showScreen('screen-pass-hint');
    } else {
        // اكتملت التلميحات للجولة -> مراجعتها
        showReviewHints();
    }
}

function enterHintPhase() {
    const p = gameState.players[gameState.currentPassIndex];
    document.getElementById('activeHintWriter').innerText = p.name;

    // حظر عشوائي بنسبة 25%
    const isBlocked = Math.random() < 0.25;

    if (isBlocked) {
        document.getElementById('hintInputBox').style.display = 'none';
        document.getElementById('hintBlockedBox').style.display = 'flex';
    } else {
        document.getElementById('hintInputBox').style.display = 'flex';
        document.getElementById('hintBlockedBox').style.display = 'none';
        document.getElementById('hintTextInput').value = '';
    }

    showScreen('screen-input-hint');
}

function submitHint(isBlocked = false) {
    const p = gameState.players[gameState.currentPassIndex];
    const text = document.getElementById('hintTextInput').value.trim();

    const roundHints = gameState.hintsHistory[gameState.currentRound - 1];
    roundHints.push({
        playerId: p.id,
        playerName: p.name,
        text: isBlocked ? "🚫 محظور هذه المرة" : (text || "تلميح غامض"),
        isBlocked
    });

    gameState.currentPassIndex++;
    passNextHint();
}

// عرض التلميحات للمراجعة
function showReviewHints() {
    const container = document.getElementById('hintsListContainer');
    container.innerHTML = '';

    // نحدد الدور الذي يشاهد (سندع الكاشف يرى الأسماء فقط)
    const detector = gameState.players.find(p => p.role === 'detector');
    document.getElementById('reviewSubtitle').innerText = `تنبيه: الكاشف وحده يرى أصحاب التلميحات!`;

    const currentHints = gameState.hintsHistory[gameState.currentRound - 1];

    currentHints.forEach((h, idx) => {
        container.innerHTML += `
            <div class="hint-item">
                <span style="color: var(--neon-cyan); font-weight:800;">[مكشوف للكاشف فقط: ${h.playerName}]</span><br>
                <span>تلميح ${idx + 1}: ${h.text}</span>
            </div>
        `;
    });

    showScreen('screen-review-hints');
}

function goToDiscussion() {
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
        if (left <= 0) {
            clearInterval(timerInterval);
        }
        left--;
    }, 1000);
}

// ضربة الجاسوس السرية (الخيارات)
function spyStrikeModal() {
    const container = document.getElementById('spyStrikeOptions');
    container.innerHTML = '';
    
    gameState.players.forEach(p => {
        container.innerHTML += `
            <button class="btn-neon btn-pink" onclick="executeSpyStrike(${p.id})">${p.name}</button>
        `;
    });

    showScreen('screen-spy-strike');
}

function closeSpyStrike() {
    showScreen('screen-discussion');
}

function executeSpyStrike(targetId) {
    const target = gameState.players.find(p => p.id === targetId);
    
    if (target.role === 'detector') {
        // الجاسوس فاز!
        triggerEndGame('spy_strike_success');
    } else {
        gameState.spyStrikesLeft--;
        alert(`محاولة خاطئة! متبقي لديك ${gameState.spyStrikesLeft} محاولات سرية.`);
        showScreen('screen-discussion');
    }
}

// الانتقال للجولة التالية أو ختام التهمة
function nextRoundOrFinal() {
    clearInterval(timerInterval);
    if (gameState.currentRound < 3) {
        gameState.currentRound++;
        setupRoundHub();
    } else {
        // انتهت الـ 3 جولات -> حان دور الكاشف للاتهام
        startDetectorAccuse();
    }
}

function startDetectorAccuse() {
    const container = document.getElementById('detectorAccuseOptions');
    container.innerHTML = '';

    const detector = gameState.players.find(p => p.role === 'detector');

    gameState.players.filter(p => p.role !== 'detector').forEach(p => {
        container.innerHTML += `
            <button class="btn-neon btn-yellow" onclick="executeDetectorAccuse(${p.id})">أنا (${detector.name}) أتهم: ${p.name}</button>
        `;
    });

    showScreen('screen-detector-accuse');
}

function executeDetectorAccuse(targetId) {
    const target = gameState.players.find(p => p.id === targetId);
    if (target.role === 'spy') {
        triggerEndGame('detector_success');
    } else {
        triggerEndGame('detector_failed');
    }
}

// شاشة النهاية
function triggerEndGame(type) {
    const title = document.getElementById('revealTitle');
    const sub = document.getElementById('revealSub');

    const detector = gameState.players.find(p => p.role === 'detector');
    const spy = gameState.players.find(p => p.role === 'spy');

    document.getElementById('revealDetector').innerText = detector.name;
    document.getElementById('revealSpy').innerText = spy.name;
    document.getElementById('revealReal').innerText = gameState.realTopic;
    document.getElementById('revealFake').innerText = gameState.fakeTopic;

    if (type === 'spy_strike_success') {
        title.innerText = "🎉 فاز الجاسوس!";
        title.style.color = "var(--neon-pink)";
        sub.innerText = "نجح الجاسوس في كشف الكاشف بذكاء قبل انقضاء الوقت!";
    } else if (type === 'detector_success') {
        title.innerText = "🎉 فاز الكاشف والعاديون!";
        title.style.color = "var(--neon-green)";
        sub.innerText = "استطاع الكاشف تحليل التلميحات واكتشاف الجاسوس بنجاح!";
    } else {
        title.innerText = "😈 فاز الجاسوس!";
        title.style.color = "var(--neon-red)";
        sub.innerText = "أخطأ الكاشف في الاتهام وفشل الجميع معه!";
    }

    showScreen('screen-reveal');
}

// Toast المطور
let toastTimeout;
function showDevToast() {
    const toast = document.getElementById('devToast');
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
