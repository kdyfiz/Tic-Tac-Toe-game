(() => {
    const LINES = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    const LINE_COORDS = {
        "0,1,2": [8, 16.5, 92, 16.5],
        "3,4,5": [8, 50, 92, 50],
        "6,7,8": [8, 83.5, 92, 83.5],
        "0,3,6": [16.5, 8, 16.5, 92],
        "1,4,7": [50, 8, 50, 92],
        "2,5,8": [83.5, 8, 83.5, 92],
        "0,4,8": [12, 12, 88, 88],
        "2,4,6": [88, 12, 12, 88]
    };
    const MARK_SVG = {
        X: `<svg viewBox="0 0 100 100" aria-hidden="true"><path class="x-line" d="M22 22 L78 78"/><path class="x-line" d="M78 22 L22 78"/></svg>`,
        O: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="o-circle" cx="50" cy="50" r="28"/></svg>`
    };
    const STORAGE_KEY = "ttt-arcade-v1";
    const BLITZ_SECONDS = 10;

    const els = {
        setup: document.getElementById("setupScreen"),
        game: document.getElementById("gameScreen"),
        form: document.getElementById("playerForm"),
        player1: document.getElementById("player1"),
        player2: document.getElementById("player2"),
        player1Label: document.getElementById("player1Label"),
        player2Field: document.getElementById("player2Field"),
        player2Label: document.getElementById("player2Label"),
        nameGrid: document.getElementById("nameGrid"),
        rivalCard: document.getElementById("rivalCard"),
        rivalName: document.getElementById("rivalName"),
        rivalBlurb: document.getElementById("rivalBlurb"),
        difficultyField: document.getElementById("difficultyField"),
        board: document.getElementById("board"),
        cells: [...document.querySelectorAll(".cell")],
        winLine: document.getElementById("winLine"),
        winLineSeg: document.querySelector("#winLine line"),
        turnBanner: document.getElementById("turnBanner"),
        nameX: document.getElementById("nameX"),
        nameO: document.getElementById("nameO"),
        scoreX: document.getElementById("scoreX"),
        scoreO: document.getElementById("scoreO"),
        scoreDraws: document.getElementById("scoreDraws"),
        matchNum: document.getElementById("matchNum"),
        streakLabel: document.getElementById("streakLabel"),
        cardX: document.getElementById("cardX"),
        cardO: document.getElementById("cardO"),
        timerWrap: document.getElementById("timerWrap"),
        timerBar: document.getElementById("timerBar"),
        undoBtn: document.getElementById("undoBtn"),
        rematchBtn: document.getElementById("rematchBtn"),
        menuBtn: document.getElementById("menuBtn"),
        modal: document.getElementById("resultModal"),
        resultKicker: document.getElementById("resultKicker"),
        resultTitle: document.getElementById("resultTitle"),
        resultSub: document.getElementById("resultSub"),
        playAgainBtn: document.getElementById("playAgainBtn"),
        modalMenuBtn: document.getElementById("modalMenuBtn"),
        toast: document.getElementById("toast"),
        muteBtn: document.getElementById("muteBtn"),
        themeBtn: document.getElementById("themeBtn"),
        brandBtn: document.getElementById("brandBtn"),
        confetti: document.getElementById("confetti")
    };

    const state = {
        mode: "pvp",
        difficulty: "medium",
        pace: "classic",
        names: { X: "You", O: "Echo" },
        current: "X",
        starter: "X",
        board: Array(9).fill(""),
        active: false,
        scores: { X: 0, O: 0, draws: 0 },
        round: 1,
        streak: 0,
        lastWinner: "",
        history: [],
        winningLine: null,
        cpuBusy: false,
        cpuTimer: null,
        muted: false,
        audio: null,
        blitzTimer: null,
        confettiBits: [],
        confettiRaf: 0,
        toastTimer: 0,
        friendDraft: ""
    };

    const persist = {
        load() {
            try {
                return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
            } catch {
                return {};
            }
        },
        save(extra = {}) {
            const current = persist.load();
            const next = { ...current, ...extra };
            delete next.games;
            delete next.wins;
            delete next.streak;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
    };

    function init() {
        const saved = persist.load();
        els.player1.value = "";
        els.player2.value = "";
        if (saved.p1) els.player1.placeholder = saved.p1;
        if (saved.p2) els.player2.placeholder = saved.p2;
        state.friendDraft = "";
        if (saved.theme === "light") document.body.dataset.theme = "light";
        if (saved.muted) setMuted(true);
        persist.save({});
        bindSetup();
        bindGame();
        bindChrome();
        updateSetupUi();
    }

    function bindSetup() {
        document.querySelectorAll("[data-mode]").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.mode = btn.dataset.mode;
                document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("is-active", b === btn));
                updateSetupUi();
                sound.click();
            });
        });
        document.querySelectorAll("[data-difficulty]").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.difficulty = btn.dataset.difficulty;
                document.querySelectorAll("[data-difficulty]").forEach((b) => b.classList.toggle("is-active", b === btn));
                updateSetupUi();
                sound.click();
            });
        });
        document.querySelectorAll("[data-pace]").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.pace = btn.dataset.pace;
                document.querySelectorAll("[data-pace]").forEach((b) => b.classList.toggle("is-active", b === btn));
                sound.click();
            });
        });
        els.form.addEventListener("submit", (event) => {
            event.preventDefault();
            startMatch();
        });
    }

    function updateSetupUi() {
        const solo = state.mode === "cpu";
        if (solo) state.friendDraft = els.player2.value.trim() || state.friendDraft;
        else if (els.player2.value.trim()) state.friendDraft = els.player2.value.trim();

        els.difficultyField.hidden = !solo;
        els.player2Field.hidden = solo;
        els.player2.required = !solo;
        els.player2.readOnly = false;
        els.player1.readOnly = false;
        els.player1Label.textContent = solo ? "Your name" : "Player 1";
        els.player2Label.textContent = "Player 2";
        els.nameGrid.classList.toggle("is-solo", solo);
        els.rivalCard.hidden = !solo;
        els.rivalName.textContent = rivalName();
        els.rivalBlurb.textContent = rivalBlurb();

        if (solo) {
            els.player2.value = "";
            els.player1.placeholder = "Type your name";
        } else {
            if (state.friendDraft && !els.player2.value) els.player2.value = state.friendDraft;
            els.player1.placeholder = "Type a name";
            els.player2.placeholder = "Type a name";
        }
    }

    function rivalName() {
        return "Echo";
    }

    function rivalBlurb() {
        return {
            easy: "Playful, a little reckless — good for a warm-up.",
            medium: "Reads the board and punishes open lines.",
            hard: "Never misses a win or a block."
        }[state.difficulty];
    }

    function bindGame() {
        els.cells.forEach((cell) => {
            cell.addEventListener("click", () => place(Number(cell.dataset.i)));
            cell.addEventListener("mouseenter", () => preview(Number(cell.dataset.i), true));
            cell.addEventListener("mouseleave", () => preview(Number(cell.dataset.i), false));
        });
        els.undoBtn.addEventListener("click", undo);
        els.rematchBtn.addEventListener("click", rematch);
        els.menuBtn.addEventListener("click", goMenu);
        els.playAgainBtn.addEventListener("click", rematch);
        els.modalMenuBtn.addEventListener("click", goMenu);
        document.addEventListener("keydown", onKey);
    }

    function bindChrome() {
        els.muteBtn.addEventListener("click", () => {
            setMuted(!state.muted);
            persist.save({ muted: state.muted });
        });
        els.themeBtn.addEventListener("click", () => {
            const next = document.body.dataset.theme === "light" ? "dark" : "light";
            if (next === "light") document.body.dataset.theme = "light";
            else delete document.body.dataset.theme;
            persist.save({ theme: next });
            sound.click();
        });
        els.brandBtn.addEventListener("click", goMenu);
    }

    function startMatch() {
        const p1 = els.player1.value.trim();
        const p2 = state.mode === "cpu" ? rivalName() : els.player2.value.trim();
        if (!p1 || (state.mode !== "cpu" && !p2)) return;
        state.names = { X: p1, O: p2 };
        state.scores = { X: 0, O: 0, draws: 0 };
        state.round = 1;
        state.streak = 0;
        state.lastWinner = "";
        state.starter = "X";
        persist.save({
            p1,
            p2: state.mode === "cpu" ? state.friendDraft : p2
        });
        els.setup.classList.add("hidden");
        els.game.classList.remove("hidden");
        renderHud();
        newRound();
        sound.start();
        if (state.mode === "cpu" && state.difficulty === "hard") toast("Echo does not miss.");
    }

    function newRound() {
        stopBlitz();
        clearTimeout(state.cpuTimer);
        state.board = Array(9).fill("");
        state.history = [];
        state.winningLine = null;
        state.active = true;
        state.cpuBusy = false;
        state.current = state.starter;
        hideModal();
        els.winLine.classList.remove("is-on");
        els.cells.forEach((cell, i) => {
            cell.innerHTML = "";
            cell.disabled = false;
            cell.classList.remove("is-win");
            cell.setAttribute("aria-label", `Empty cell ${i + 1}`);
        });
        renderHud();
        setBanner(`${state.names[state.current]} to move`);
        syncTurnClock();
        if (state.mode === "cpu" && state.current === "O") scheduleCpu();
    }

    function rematch() {
        if (!els.game.classList.contains("hidden") || !els.modal.classList.contains("hidden")) {
            state.starter = state.starter === "X" ? "O" : "X";
            state.round += 1;
            newRound();
            sound.click();
        }
    }

    function goMenu() {
        stopBlitz();
        clearTimeout(state.cpuTimer);
        hideModal();
        state.active = false;
        els.game.classList.add("hidden");
        els.setup.classList.remove("hidden");
        els.player1.value = state.names.X || "";
        els.player2.value = state.mode === "cpu" ? "" : (state.names.O || "");
        if (state.mode !== "cpu") state.friendDraft = state.names.O || state.friendDraft;
        updateSetupUi();
        els.player1.focus();
        els.player1.select();
    }

    function place(index, fromCpu = false, fromBlitz = false) {
        if (!state.active || state.board[index]) {
            if (state.active && state.board[index] && !fromCpu) shake();
            return;
        }
        if (state.mode === "cpu" && !fromCpu && (state.current === "O" || state.cpuBusy)) return;

        const before = state.board.slice();
        const mark = state.current;
        const almost = threatCount(state.board, opponent(mark));
        state.board[index] = mark;
        state.history.push({ board: before, current: mark, index });
        paintCell(index, mark);
        sound.place(mark);

        const result = winnerOf(state.board);
        if (result) {
            finishRound(result);
            return;
        }

        if (!fromBlitz && almost > 0 && threatCount(state.board, opponent(mark)) < almost) {
            toast("Nice block!");
        }

        state.current = opponent(mark);
        renderHud();
        setBanner(`${state.names[state.current]} to move`);
        syncTurnClock();
        if (state.mode === "cpu" && state.current === "O") scheduleCpu();
    }

    function scheduleCpu() {
        state.cpuBusy = true;
        setBanner("Echo is thinking…");
        const wait = state.difficulty === "hard" ? 520 : 380 + Math.random() * 320;
        clearTimeout(state.cpuTimer);
        state.cpuTimer = setTimeout(() => {
            if (!state.active) return;
            const move = cpuMove(state.board, state.difficulty);
            state.cpuBusy = false;
            if (move != null) place(move, true);
        }, wait);
    }

    function cpuMove(board, difficulty) {
        const empty = empties(board);
        if (!empty.length) return null;
        if (difficulty === "easy") {
            if (Math.random() < 0.7) return empty[Math.floor(Math.random() * empty.length)];
            return smartMove(board, "O", "X") ?? empty[Math.floor(Math.random() * empty.length)];
        }
        if (difficulty === "medium") {
            return smartMove(board, "O", "X") ?? positional(empty);
        }
        return minimaxPick(board);
    }

    function smartMove(board, ai, human) {
        for (const i of empties(board)) {
            board[i] = ai;
            if (winnerOf(board)?.winner === ai) {
                board[i] = "";
                return i;
            }
            board[i] = "";
        }
        for (const i of empties(board)) {
            board[i] = human;
            if (winnerOf(board)?.winner === human) {
                board[i] = "";
                return i;
            }
            board[i] = "";
        }
        return null;
    }

    function positional(empty) {
        const order = [4, 0, 2, 6, 8, 1, 3, 5, 7];
        return order.find((i) => empty.includes(i));
    }

    function minimaxPick(board) {
        let best = -Infinity;
        let choice = empties(board)[0];
        for (const i of empties(board)) {
            board[i] = "O";
            const score = minimax(board, false, 0);
            board[i] = "";
            if (score > best) {
                best = score;
                choice = i;
            }
        }
        return choice;
    }

    function minimax(board, maximizing, depth) {
        const result = winnerOf(board);
        if (result?.winner === "O") return 10 - depth;
        if (result?.winner === "X") return depth - 10;
        if (result?.draw || !empties(board).length) return 0;

        if (maximizing) {
            let best = -Infinity;
            for (const i of empties(board)) {
                board[i] = "O";
                best = Math.max(best, minimax(board, false, depth + 1));
                board[i] = "";
            }
            return best;
        }
        let best = Infinity;
        for (const i of empties(board)) {
            board[i] = "X";
            best = Math.min(best, minimax(board, true, depth + 1));
            board[i] = "";
        }
        return best;
    }

    function finishRound(result) {
        state.active = false;
        stopBlitz();

        if (result.draw) {
            state.scores.draws += 1;
            state.streak = 0;
            state.lastWinner = "";
            setBanner("Draw game");
            sound.draw();
            showModal("Stalemate", "It's a draw", "Board is full. Rematch and break it open.");
        } else {
            const winMark = result.winner;
            state.scores[winMark] += 1;
            state.winningLine = result.line;
            result.line.forEach((i) => els.cells[i].classList.add("is-win"));
            drawWinLine(result.line);
            const humanWon = !(state.mode === "cpu" && winMark === "O");
            if (state.lastWinner === winMark) state.streak += 1;
            else state.streak = 1;
            state.lastWinner = winMark;
            if (humanWon) {
                burstConfetti();
                sound.win();
                toast(state.streak >= 3 ? "On fire!" : "Clean sweep!");
            } else {
                state.streak = 0;
                sound.lose();
            }
            setBanner(`${state.names[winMark]} wins`);
            showModal(
                humanWon ? "Victory" : "Round lost",
                `${state.names[winMark]} wins!`,
                humanWon && state.streak >= 2 ? `${state.streak} in a row. Keep the streak alive.` : "Rematch, or tweak the setup."
            );
        }

        renderHud();
        els.cells.forEach((cell) => { cell.disabled = true; });
    }

    function undo() {
        if (!state.active || !state.history.length || state.cpuBusy) return;
        const steps = state.mode === "cpu" && state.history.length >= 2 ? 2 : 1;
        let snapshot = null;
        for (let i = 0; i < steps; i += 1) snapshot = state.history.pop();
        if (!snapshot) return;
        state.board = snapshot.board;
        state.current = snapshot.current;
        els.cells.forEach((cell, i) => {
            cell.innerHTML = state.board[i] ? MARK_SVG[state.board[i]] : "";
            cell.disabled = Boolean(state.board[i]);
            cell.classList.remove("is-win");
            if (state.board[i]) skipDrawAnim(cell);
        });
        renderHud();
        setBanner(`${state.names[state.current]} to move`);
        syncTurnClock();
        if (state.mode === "cpu" && state.current === "O") scheduleCpu();
        sound.click();
    }

    function skipDrawAnim(cell) {
        cell.querySelectorAll(".x-line, .o-circle").forEach((node) => {
            node.style.strokeDashoffset = "0";
            node.style.animation = "none";
        });
    }

    function preview(index, on) {
        const cell = els.cells[index];
        if (!on) {
            cell.querySelector(".ghost")?.remove();
            return;
        }
        if (!state.active || state.board[index] || state.cpuBusy) return;
        if (state.mode === "cpu" && state.current === "O") return;
        if (cell.querySelector("svg")) return;
        const wrap = document.createElement("span");
        wrap.className = "ghost";
        wrap.innerHTML = MARK_SVG[state.current];
        cell.appendChild(wrap);
    }

    function paintCell(index, mark) {
        const cell = els.cells[index];
        cell.querySelector(".ghost")?.remove();
        cell.innerHTML = MARK_SVG[mark];
        cell.disabled = true;
        cell.setAttribute("aria-label", `${mark} in cell ${index + 1}`);
    }

    function renderHud() {
        els.nameX.textContent = state.names.X;
        els.nameO.textContent = state.names.O;
        els.scoreX.textContent = state.scores.X;
        els.scoreO.textContent = state.scores.O;
        els.scoreDraws.textContent = state.scores.draws;
        els.matchNum.textContent = state.round;
        els.streakLabel.textContent = `Streak ${state.streak}`;
        els.cardX.classList.toggle("is-turn", state.active && state.current === "X");
        els.cardO.classList.toggle("is-turn", state.active && state.current === "O");
        els.timerWrap.hidden = state.pace !== "blitz";
    }

    function setBanner(text) {
        els.turnBanner.textContent = text;
    }

    function winnerOf(board) {
        for (const line of LINES) {
            const [a, b, c] = line;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { winner: board[a], line };
            }
        }
        if (board.every(Boolean)) return { draw: true, line: null };
        return null;
    }

    function threatCount(board, mark) {
        let count = 0;
        for (const [a, b, c] of LINES) {
            const cells = [board[a], board[b], board[c]];
            if (cells.filter((v) => v === mark).length === 2 && cells.includes("")) count += 1;
        }
        return count;
    }

    function empties(board) {
        return board.map((v, i) => (v ? null : i)).filter((v) => v !== null);
    }

    function opponent(mark) {
        return mark === "X" ? "O" : "X";
    }

    function drawWinLine(line) {
        const coords = LINE_COORDS[line.join(",")];
        if (!coords) return;
        const [x1, y1, x2, y2] = coords;
        els.winLineSeg.setAttribute("x1", x1);
        els.winLineSeg.setAttribute("y1", y1);
        els.winLineSeg.setAttribute("x2", x2);
        els.winLineSeg.setAttribute("y2", y2);
        els.winLine.classList.remove("is-on");
        void els.winLine.offsetWidth;
        els.winLine.classList.add("is-on");
    }

    function syncTurnClock() {
        if (state.pace !== "blitz") {
            stopBlitz();
            return;
        }
        if (state.mode === "cpu" && state.current === "O") {
            stopBlitz();
            return;
        }
        startBlitz();
    }

    function startBlitz() {
        stopBlitz();
        els.timerBar.classList.remove("is-running");
        void els.timerBar.offsetWidth;
        els.timerBar.classList.add("is-running");
        state.blitzTimer = setTimeout(() => {
            if (!state.active) return;
            const open = empties(state.board);
            if (!open.length) return;
            toast("Time!");
            const fromCpu = state.mode === "cpu" && state.current === "O";
            place(open[Math.floor(Math.random() * open.length)], fromCpu, true);
        }, BLITZ_SECONDS * 1000);
    }

    function stopBlitz() {
        clearTimeout(state.blitzTimer);
        els.timerBar.classList.remove("is-running");
    }

    function showModal(kicker, title, sub) {
        els.resultKicker.textContent = kicker;
        els.resultTitle.textContent = title;
        els.resultSub.textContent = sub;
        els.modal.classList.remove("hidden");
        els.playAgainBtn.focus();
    }

    function hideModal() {
        els.modal.classList.add("hidden");
    }

    function toast(text) {
        els.toast.textContent = text;
        els.toast.classList.add("is-on");
        clearTimeout(state.toastTimer);
        state.toastTimer = setTimeout(() => els.toast.classList.remove("is-on"), 1400);
    }

    function shake() {
        els.board.classList.remove("is-shake");
        void els.board.offsetWidth;
        els.board.classList.add("is-shake");
        sound.bad();
    }

    function onKey(event) {
        if (event.target.matches("input")) return;
        if (event.key.toLowerCase() === "m") {
            setMuted(!state.muted);
            persist.save({ muted: state.muted });
        }
        if (els.game.classList.contains("hidden")) return;
        if (/^[1-9]$/.test(event.key)) place(Number(event.key) - 1);
        if (event.key.toLowerCase() === "u") undo();
        if (event.key.toLowerCase() === "r") rematch();
        if (event.key === "Escape") goMenu();
    }

    function setMuted(value) {
        state.muted = value;
        document.body.classList.toggle("is-muted", value);
        els.muteBtn.setAttribute("aria-pressed", String(value));
        els.muteBtn.setAttribute("aria-label", value ? "Unmute sounds" : "Mute sounds");
    }

    const sound = {
        ctx: null,
        ensure() {
            if (state.muted) return null;
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            if (!sound.ctx) sound.ctx = new Ctx();
            if (sound.ctx.state === "suspended") sound.ctx.resume();
            return sound.ctx;
        },
        tone(freq, dur, type = "sine", gain = 0.05, delay = 0) {
            const ctx = sound.ensure();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const amp = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            amp.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
            amp.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + delay + 0.02);
            amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + dur);
            osc.connect(amp).connect(ctx.destination);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + dur + 0.02);
        },
        click() { sound.tone(520, 0.06, "triangle", 0.03); },
        place(mark) { sound.tone(mark === "X" ? 440 : 330, 0.09, "triangle", 0.045); },
        start() { sound.tone(392, 0.1, "sine", 0.04); sound.tone(523, 0.12, "sine", 0.04, 0.08); },
        win() { [523, 659, 784, 1046].forEach((f, i) => sound.tone(f, 0.14, "triangle", 0.05, i * 0.08)); },
        lose() { sound.tone(220, 0.18, "sawtooth", 0.03); sound.tone(164, 0.22, "sawtooth", 0.03, 0.1); },
        draw() { sound.tone(300, 0.12); sound.tone(240, 0.16, "sine", 0.04, 0.1); },
        bad() { sound.tone(140, 0.08, "square", 0.02); }
    };

    function burstConfetti() {
        const canvas = els.confetti;
        const ctx = canvas.getContext("2d");
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        const colors = ["#38bdf8", "#f472b6", "#fbbf24", "#34d399", "#a78bfa"];
        state.confettiBits = Array.from({ length: 90 }, () => ({
            x: canvas.width * 0.5 + (Math.random() - 0.5) * 160,
            y: canvas.height * 0.38,
            vx: (Math.random() - 0.5) * 9,
            vy: Math.random() * -10 - 4,
            g: 0.22 + Math.random() * 0.1,
            size: 4 + Math.random() * 6,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 80 + Math.random() * 30
        }));
        cancelAnimationFrame(state.confettiRaf);
        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            state.confettiBits = state.confettiBits.filter((bit) => bit.life > 0);
            state.confettiBits.forEach((bit) => {
                bit.vy += bit.g;
                bit.x += bit.vx;
                bit.y += bit.vy;
                bit.life -= 1;
                ctx.globalAlpha = Math.max(bit.life / 80, 0);
                ctx.fillStyle = bit.color;
                ctx.fillRect(bit.x, bit.y, bit.size, bit.size * 0.6);
            });
            ctx.globalAlpha = 1;
            if (state.confettiBits.length) state.confettiRaf = requestAnimationFrame(tick);
            else ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
        tick();
    }

    init();
})();
