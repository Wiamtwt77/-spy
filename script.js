let playerCount = 4;

// لوحة الألوان المتاحة للاعبين
const COLOR_PALETTE = [
    { name: "الأحمر 🔴", hex: "#ff0055", symbol: "🔴" },
    { name: "الأزرق 🔵", hex: "#00f3ff", symbol: "🔵" },
    { name: "الأخضر 🟢", hex: "#39ff14", symbol: "🟢" },
    { name: "الأصفر 🟡", hex: "#ffe600", symbol: "🟡" },
    { name: "البنفسجي 🟣", hex: "#9d00ff", symbol: "🟣" },
    { name: "البرتقالي 🟠", hex: "#ff9900", symbol: "🟠" }
];

let gameState = {
    players: [],
    context: "",
    realTopic: "",
    fakeTopic: "",
    currentRound: 1,
    hintsHistory: [],
    spyStrikesLeft: 2,
    currentPassIndex: 0
};

let timerInterval;

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

async function startGame() {
    showScreen('screen-loading');
    
    const names = [];
    for (let i = 1; i <= playerCount; i++) {
        const val = document.getElementById(`pName${i}`)?.value.trim();
        names.push(val || `لاعب ${i}`);
    }

    try {
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const data = await res.json();
        gameState.context = data.context || "عام";
        gameState.realTopic = data.realTopic;
        gameState.fakeTopic = data.fakeTopic;
    } catch (e) {
        gameState.context = "في صالة الأفراح 💒";
        gameState.realTopic = "أم العروس";
        gameState.fakeTopic = "منظمة الحفل (Event Planner)";
    }

    // توزيع الأدوار والألوان السرية
    let shuffledIndices = names.map((_, i) => i).sort(() => Math.random() - 0.5);
    let shuffledColors = [...COLOR_PALETTE].sort(() => Math.random() - 0.5);

    const detectorIdx = shuffledIndices[0];
    const spyIdx = shuffledIndices[1];

    gameState.players = names.map((name, index) => {
        let role = 'normal';
        if (index === detectorIdx) role = 'detector';
        if (index === spyIdx) role = 'spy';
        return {
            id: index,
            name,
            role,
            color: shuffledColors[index]
        };
    });

    gameState.currentRound = 1;
    gameState.hintsHistory = [];
    gameState.spyStrikesLeft = 2;
    gameState.currentPassIndex = 0;

    startRolePass();
}

function startRolePass() {
    if (gameState.currentPassIndex < gameState.players.length) {
        const p = gameState.players[gameState.currentPassIndex];
        document.getElementById('passRolePlayerName').innerText = p.name;
        showScreen('screen-pass-role');
    } else {
        setupRoundHub();
    }
}

function showPlayerRole() {
    const p = gameState.players[gameState.currentPassIndex];
    document.getElementById('rolePlayerNameDisplay').innerText = p.name;
    
    const badge = document.getElementById('roleBadge');
    const topic = document.getElementById('roleTopicDisplay');
    const desc = document.getElementById('roleDescDisplay');
    const colorDisp = document.getElementById('playerColorDisplay');
    const contextDisp = document.getElementById('contextDisplay');
    const legendBox = document.getElementById('detectorLegendBox');

    colorDisp.innerText = p.color.name;
    colorDisp.style.color = p.color.hex;
    contextDisp.innerText = gameState.context;

    if (p.role === 'detector') {
        badge.innerText = "🔍 أنت الكاشف";
        badge.style.color = "var(--neon-cyan)";
        topic.innerText = gameState.realTopic;
        desc.innerText = "تعرف الموضوع الحقيقي، وهذه الخريطة أسفله تُظهر ألوان الجميع لتكشف الجاسوس!";
        
        // بناء خريطة الألوان للكاشف فقط
        legendBox.style.display = 'block';
        const legendList = document.getElementById('legendList');
        legendList.innerHTML = '';
        gameState.players.forEach(player => {
            legendList.innerHTML += `
                <div class="color-legend-item">
                    <span>${player.name}</span>
                    <b style="color: ${player.color.hex};">${player.color.name}</b>
                </div>
            `;
        });

    } else if (p.role === 'spy') {
        badge.innerText = "🕵️‍♂️ أنت الجاسوس";
        badge.style.color = "var(--neon-pink)";
        topic.innerText = gameState.fakeTopic;
        desc.innerText = "حصلت على موضوع يشارك السياق نفسه! اكتب تلميحاتك بذوق لتخدع الكاشف.";
        legendBox.style.display = 'none';

    } else {
        badge.innerText = "👤 أنت لاعب عادي";
        badge.style.color = "var(--neon-green)";
        topic.innerText = gameState.realTopic;
        desc.innerText = "تعرف الموضوع الحقيقي، اكتب تلميحك بلونك السري وساعد الكاشف.";
        legendBox.style.display = 'none';
    }

    showScreen('screen-view-role');
}

function finishRoleView() {
    gameState.currentPassIndex++;
    startRolePass();
}

function setupRoundHub() {
    document.getElementById('roundTitle').innerText = `الجولة ${gameState.currentRound} من 3`;
    showScreen('screen-round-hub');
}

function startHintCollection() {
    gameState.hintsHistory.push([]);
    gameState.currentPassIndex = 0;
    passNextHint();
}

function passNextHint() {
    if (gameState.currentPassIndex < gameState.players.length) {
        const p = gameState.players[gameState.currentPassIndex];
        document.getElementById('hintPlayerName').innerText = p.name;
        showScreen('screen-pass-hint');
    } else {
        showReviewHints();
    }
}

function enterHintPhase() {
    const p = gameState.players[gameState.currentPassIndex];
    document.getElementById('activeHintWriter').innerText = p.name;

    const isBlocked = Math.random() < 0.20;

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
        playerColor: p.color,
        text: isBlocked ? "🚫 [تلميح محظور في هذه الجولة]" : (text || "تلميح غامض")
    });

    gameState.currentPassIndex++;
    passNextHint();
}

function showReviewHints() {
    const container = document.getElementById('hintsListContainer');
    container.innerHTML = '';

    const currentHints = gameState.hintsHistory[gameState.currentRound - 1];

    currentHints.forEach((h) => {
        container.innerHTML += `
            <div class="hint-item" style="border-right-color: ${h.playerColor.hex};">
                <span style="color: ${h.playerColor.hex}; font-weight:800;">[صاحب اللون ${h.playerColor.name}]:</span><br>
                <span style="font-size: 1.05rem;">"${h.text}"</span>
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
        triggerEndGame('spy_strike_success');
    } else {
        gameState.spyStrikesLeft--;
        alert(`محاولة خاطئة! متبقي لديك ${gameState.spyStrikesLeft} محاولات سرية.`);
        showScreen('screen-discussion');
    }
}

function nextRoundOrFinal() {
    clearInterval(timerInterval);
    if (gameState.currentRound < 3) {
        gameState.currentRound++;
        setupRoundHub();
    } else {
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

function triggerEndGame(type) {
    const title = document.getElementById('revealTitle');
    const sub = document.getElementById('revealSub');

    const detector = gameState.players.find(p => p.role === 'detector');
    const spy = gameState.players.find(p => p.role === 'spy');

    document.getElementById('revealDetector').innerText = detector.name;
    document.getElementById('revealSpy').innerText = spy.name;
    document.getElementById('revealContext').innerText = gameState.context;
    document.getElementById('revealReal').innerText = gameState.realTopic;
    document.getElementById('revealFake').innerText = gameState.fakeTopic;

    // إظهار كشف خريطة الألوان الكاملة في النهاية
    const fullMap = document.getElementById('fullColorMapDisplay');
    fullMap.innerHTML = '';
    gameState.players.forEach(p => {
        fullMap.innerHTML += `
            <div>- ${p.name}: <b style="color:${p.color.hex}">${p.color.name}</b> (${p.role === 'spy' ? 'الجاسوس' : p.role === 'detector' ? 'الكاشف' : 'عادي'})</div>
        `;
    });

    if (type === 'spy_strike_success') {
        title.innerText = "🎉 فاز الجاسوس!";
        title.style.color = "var(--neon-pink)";
        sub.innerText = "نجح الجاسوس في كشف الكاشف بذكاء!";
    } else if (type === 'detector_success') {
        title.innerText = "🎉 فاز الكاشف والعاديون!";
        title.style.color = "var(--neon-green)";
        sub.innerText = "تمكن الكاشف من تحليل شفرات الألوان واكتشاف الجاسوس بنجاح!";
    } else {
        title.innerText = "😈 فاز الجاسوس!";
        title.style.color = "var(--neon-red)";
        sub.innerText = "أخطأ الكاشف في الاتهام، وفاز الجاسوس لعدم انكشافه!";
    }

    showScreen('screen-reveal');
}

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
