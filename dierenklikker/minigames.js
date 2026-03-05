/* ================================================================
   SECTIE 8: MINI-GAMES
   ================================================================ */

let quizActive = false;
let catcherActive = false;
let catcherInterval = null;
let catcherScore = 0;
let catcherSpawnInterval = null;

function startQuiz() {
  if (quizActive || !isMinigameUnlocked('quiz')) return;
  const now = Date.now();
  if (now - state.minigames.quizLast < QUIZ_COOLDOWN) return;
  quizActive = true; sfxGameStart();
  document.getElementById('quiz-btn').disabled = true;

  // Pick random question
  const q = QUIZ_QUESTIONS[Math.floor(Math.random() * QUIZ_QUESTIONS.length)];
  // Shuffle answers (keep track of correct)
  const correctAnswer = q.a[q.c];
  const shuffled = [...q.a].sort(() => Math.random() - 0.5);
  const correctIdx = shuffled.indexOf(correctAnswer);

  let html = '<div class="quiz-question">' + q.q + '</div><div class="quiz-answers">';
  shuffled.forEach((a, i) => {
    html += '<button class="quiz-answer" onclick="answerQuiz(' + i + ',' + correctIdx + ')" data-idx="' + i + '">' + a + '</button>';
  });
  html += '</div><div id="quiz-result"></div>';

  const game = document.getElementById('quiz-game');
  game.innerHTML = html;
  game.style.display = 'block';
}

function answerQuiz(chosen, correct) {
  if (!quizActive) return;
  quizActive = false;
  state.minigames.quizLast = Date.now();
  state.stats.quizPlayed++;

  const buttons = document.querySelectorAll('.quiz-answer');
  buttons.forEach((b, i) => {
    b.onclick = null;
    b.style.pointerEvents = 'none';
    if (i === correct) b.classList.add('correct');
    if (i === chosen && chosen !== correct) b.classList.add('wrong');
  });

  const result = document.getElementById('quiz-result');
  if (chosen === correct) {
    sfxCorrect();
    state.stats.quizCorrect++;
    const bonus = getTotalDps() * 600; // 10 minutes DPS
    state.currentPoints += bonus;
    state.totalEarned += bonus;
    state.allTime.totalEarned += bonus;
    result.innerHTML = '<div class="quiz-result" style="background:rgba(67,160,71,0.2);color:var(--green-light)">Goed! +' + formatNumber(bonus) + ' punten!</div>';
  } else {
    sfxWrong();
    state.stats.quizWrong++;
    result.innerHTML = '<div class="quiz-result" style="background:rgba(239,83,80,0.2);color:var(--red)">Helaas, fout!</div>';
  }

  setTimeout(() => {
    document.getElementById('quiz-game').style.display = 'none';
    document.getElementById('quiz-btn').disabled = false;
  }, 2500);
}

function startCatcher() {
  if (catcherActive || !isMinigameUnlocked('catcher')) return;
  const now = Date.now();
  if (now - state.minigames.catcherLast < CATCHER_COOLDOWN) return;
  catcherActive = true; sfxGameStart();
  catcherScore = 0;
  document.getElementById('catcher-btn').disabled = true;
  document.getElementById('catcher-game').style.display = 'block';
  document.getElementById('catcher-score').textContent = '0';
  document.getElementById('catcher-timer').textContent = '15';
  document.getElementById('catcher-field').innerHTML = '';

  const allEmoji = [...new Set([...ANIMALS.map(a => a.emoji), ...INTRUDER_GROUPS.flatMap(g => g.animals)])];
  let timeLeft = 15;

  // Spawn animals
  catcherSpawnInterval = setInterval(() => {
    if (!catcherActive) return;
    const field = document.getElementById('catcher-field');
    const emoji = allEmoji[Math.floor(Math.random() * allEmoji.length)];
    const el = document.createElement('div');
    el.className = 'catch-animal';
    el.textContent = emoji;
    parseAppleEmoji(el);
    el.style.left = Math.random() * 85 + '%';
    el.style.top = Math.random() * 85 + '%';
    el.onclick = function() {
      catcherScore++;
      document.getElementById('catcher-score').textContent = catcherScore;
      el.style.transform = 'scale(0)';
      setTimeout(() => el.remove(), 200);
    };
    field.appendChild(el);
    // Remove after 2 seconds if not caught
    setTimeout(() => { if (el.parentNode) el.remove(); }, 2000);
  }, 600);

  // Timer
  catcherInterval = setInterval(() => {
    timeLeft--;
    document.getElementById('catcher-timer').textContent = timeLeft;
    if (timeLeft <= 0) endCatcher();
  }, 1000);
}

function endCatcher() {
  catcherActive = false;
  sfxGameEnd();
  state.minigames.catcherLast = Date.now();
  state.stats.catcherPlayed++;
  state.stats.catcherCaught += catcherScore;
  clearInterval(catcherInterval);
  clearInterval(catcherSpawnInterval);

  const bonus = getTotalDps() * 60 * catcherScore; // each caught = 1 min DPS
  state.currentPoints += bonus;
  state.totalEarned += bonus;
  state.allTime.totalEarned += bonus;

  const field = document.getElementById('catcher-field');
  field.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;font-size:18px;font-weight:700">' +
    '<div>' + catcherScore + ' gevangen!</div>' +
    '<div style="color:var(--gold);margin-top:8px">+' + formatNumber(bonus) + ' punten</div></div>';

  setTimeout(() => {
    document.getElementById('catcher-game').style.display = 'none';
    document.getElementById('catcher-btn').disabled = false;
  }, 3000);
}

/* ================================================================
   SECTIE 8b: MINI-GAME UNLOCK & NIEUWE GAMES
   ================================================================ */

function isMinigameUnlocked(id) {
  const mg = MINIGAME_UNLOCKS.find(m => m.id === id);
  if (!mg) return true;
  return (state.animals[mg.reqAnimal] || 0) > 0;
}

/* Dieren Wiskunde */
let mathActive = false;

function startMath() {
  if (mathActive || !isMinigameUnlocked('math')) return;
  if (Date.now() - state.minigames.mathLast < MATH_COOLDOWN) return;
  mathActive = true; sfxGameStart();
  document.getElementById('math-btn').disabled = true;

  const emoji = ANIMALS[Math.floor(Math.random() * ANIMALS.length)].emoji;
  const isAdd = Math.random() > 0.3;
  let a, b, answer;
  if (isAdd) {
    a = 1 + Math.floor(Math.random() * 12);
    b = 1 + Math.floor(Math.random() * 12);
    answer = a + b;
  } else {
    a = 3 + Math.floor(Math.random() * 15);
    b = 1 + Math.floor(Math.random() * a);
    answer = a - b;
  }
  const op = isAdd ? '+' : '−';

  const options = new Set([answer]);
  while (options.size < 4) {
    let fake = answer + Math.floor(Math.random() * 7) - 3;
    if (fake < 0) fake = 0;
    if (fake !== answer) options.add(fake);
  }
  const sorted = [...options].sort((a,b) => a - b);
  const correctIdx = sorted.indexOf(answer);

  const game = document.getElementById('math-game');
  game.style.display = 'block';
  let html = '<div class="quiz-question" style="font-size:22px;text-align:center">' +
    a + ' ' + emoji + ' ' + op + ' ' + b + ' ' + emoji + ' = ?</div>';
  html += '<div class="quiz-answers">';
  sorted.forEach((opt, i) => {
    html += '<button class="quiz-answer" onclick="answerMath(' + i + ',' + correctIdx + ')">' + opt + ' ' + emoji + '</button>';
  });
  html += '</div><div id="math-result"></div>';
  game.innerHTML = html;
}

function answerMath(chosen, correct) {
  if (!mathActive) return;
  mathActive = false;
  state.minigames.mathLast = Date.now();
  state.stats.mathPlayed++;

  const buttons = document.querySelectorAll('#math-game .quiz-answer');
  buttons.forEach((b, i) => {
    b.onclick = null; b.style.pointerEvents = 'none';
    if (i === correct) b.classList.add('correct');
    if (i === chosen && chosen !== correct) b.classList.add('wrong');
  });

  const result = document.getElementById('math-result');
  if (chosen === correct) {
    state.stats.mathCorrect++;
    const bonus = getTotalDps() * 600;
    state.currentPoints += bonus;
    state.totalEarned += bonus;
    state.allTime.totalEarned += bonus;
    result.innerHTML = '<div class="quiz-result" style="background:rgba(67,160,71,0.2);color:var(--green-light)">Goed! +' + formatNumber(bonus) + ' punten!</div>';
  } else {
    state.stats.mathWrong++;
    result.innerHTML = '<div class="quiz-result" style="background:rgba(239,83,80,0.2);color:var(--red)">Helaas, fout!</div>';
  }
  setTimeout(() => {
    document.getElementById('math-game').style.display = 'none';
    document.getElementById('math-btn').disabled = false;
  }, 2500);
}

/* Buff Kiezer */
let activeBuff = null; // {type, endsAt}
let buyMultiplier = 1; // 1, 10 or 100

function startBuff() {
  if (!isMinigameUnlocked('buff')) return;
  if (Date.now() - state.minigames.buffLast < BUFF_COOLDOWN) return;
  // Don't allow if buff already active
  if (activeBuff && Date.now() < activeBuff.endsAt) return;

  document.getElementById('buff-btn').disabled = true;

  // Pick 4 random animals for flavor
  const shuffled = [...ANIMALS].sort(() => Math.random() - 0.5);
  const game = document.getElementById('buff-game');
  game.style.display = 'block';
  let html = '<div class="buff-choices">';
  BUFF_TYPES.forEach((buff, i) => {
    html += '<div class="buff-card" onclick="chooseBuff(\'' + buff.id + '\')" style="border-color:' + buff.color + '30">';
    html += '<div class="buff-card-emoji">' + shuffled[i].emoji + '</div>';
    html += '<div class="buff-card-name" style="color:' + buff.color + '">' + buff.emoji + ' ' + buff.name + '</div>';
    html += '<div class="buff-card-desc">' + buff.desc + '</div>';
    html += '</div>';
  });
  html += '</div>';
  game.innerHTML = html;
  parseAppleEmoji(game);
}

function chooseBuff(buffId) {
  const buff = BUFF_TYPES.find(b => b.id === buffId);
  if (!buff) return;

  // Start cooldown when buff is actually chosen, not when menu opens
  state.minigames.buffLast = Date.now();
  state.stats.buffPlayed++;

  // Apply jackpot immediately
  if (buff.id === 'jackpot') {
    const bonus = getTotalDps() * 30; // 30 seconds DPS
    state.currentPoints += bonus;
    state.totalEarned += bonus;
    state.allTime.totalEarned += bonus;
    showToast(buff.emoji + ' Jackpot! +' + formatNumber(bonus) + ' punten!');
  } else {
    // Set timed buff
    activeBuff = { type: buff.id, endsAt: Date.now() + BUFF_DURATION, emoji: buff.emoji, name: buff.name, color: buff.color };
    showToast(buff.emoji + ' ' + buff.name + ' actief voor 30 seconden!');
  }

  document.getElementById('buff-game').style.display = 'none';
  document.getElementById('buff-btn').disabled = false;
}

function getActiveBuff() {
  if (!activeBuff) return null;
  if (Date.now() >= activeBuff.endsAt) { activeBuff = null; return null; }
  return activeBuff;
}

/* Dieren Sorteren */
let sortActive = false;
let sortInterval = null;
let sortScore = 0;
let sortCurrent = null;
let sortBag = [];

function startSort() {
  if (sortActive || !isMinigameUnlocked('sort')) return;
  if (Date.now() - state.minigames.sortLast < SORT_COOLDOWN) return;
  sortActive = true; sfxGameStart();
  sortScore = 0;
  sortBag = [];
  document.getElementById('sort-btn').disabled = true;
  document.getElementById('sort-game').style.display = 'block';
  document.getElementById('sort-score').textContent = '0';
  document.getElementById('sort-timer').textContent = '15';

  nextSortAnimal();
  let timeLeft = 15;
  sortInterval = setInterval(() => {
    timeLeft--;
    document.getElementById('sort-timer').textContent = timeLeft;
    if (timeLeft <= 0) endSort();
  }, 1000);
}

function nextSortAnimal() {
  // Bag-based shuffle: refill when empty for fair category distribution
  if (sortBag.length === 0) {
    sortBag = [...SORT_ANIMALS].sort(() => Math.random() - 0.5);
    // If last shown animal is same as first in new bag, swap with a random later one
    if (sortCurrent && sortBag[0].emoji === sortCurrent.emoji && sortBag.length > 1) {
      const swapIdx = 1 + Math.floor(Math.random() * (sortBag.length - 1));
      [sortBag[0], sortBag[swapIdx]] = [sortBag[swapIdx], sortBag[0]];
    }
  }
  sortCurrent = sortBag.shift();
  const sortEl = document.getElementById('sort-current');
  sortEl.textContent = sortCurrent.emoji;
  parseAppleEmoji(sortEl);
  document.getElementById('sort-name').textContent = sortCurrent.name;
  // Reset button styles
  document.querySelectorAll('.sort-cat-btn').forEach(b => {
    b.classList.remove('correct', 'wrong');
  });
}

function sortAnswer(category) {
  if (!sortActive || !sortCurrent) return;
  const btn = document.querySelector('.sort-cat-btn[onclick*="' + category + '"]');
  if (category === sortCurrent.cat) {
    sortScore++;
    document.getElementById('sort-score').textContent = sortScore;
    if (btn) btn.classList.add('correct');
    setTimeout(nextSortAnimal, 300);
  } else {
    // Wrong answer: show correct category, then end the game
    sortActive = false; // prevent further clicks
    clearInterval(sortInterval); // stop timer to prevent double endSort
    if (btn) btn.classList.add('wrong');
    document.querySelectorAll('.sort-cat-btn').forEach(b => {
      if (b.getAttribute('onclick').includes(sortCurrent.cat)) b.classList.add('correct');
    });
    setTimeout(endSort, 800);
  }
}

function endSort() {
  sortActive = false;
  sfxGameEnd();
  state.minigames.sortLast = Date.now();
  state.stats.sortPlayed++;
  state.stats.sortCorrect += sortScore;
  if (sortScore > state.stats.sortBestStreak) state.stats.sortBestStreak = sortScore;
  clearInterval(sortInterval);
  sortCurrent = null;

  const bonus = getTotalDps() * 60 * sortScore;
  state.currentPoints += bonus;
  state.totalEarned += bonus;
  state.allTime.totalEarned += bonus;

  const field = document.getElementById('sort-field');
  field.innerHTML = '<div style="font-size:18px;font-weight:700;padding:20px">' +
    '<div>' + sortScore + ' goed gesorteerd!</div>' +
    '<div style="color:var(--gold);margin-top:8px">+' + formatNumber(bonus) + ' punten</div></div>';

  setTimeout(() => {
    document.getElementById('sort-game').style.display = 'none';
    document.getElementById('sort-btn').disabled = false;
    // Restore sort field HTML
    document.getElementById('sort-field').innerHTML =
      '<div id="sort-current"></div><div id="sort-name"></div>';
  }, 3000);
}

/* Dieren Memory */
let memoryActive = false;
let memoryCards = [];
let memoryFlipped = [];
let memoryPairs = 0;
let memoryMistakes = 0;

function startMemory() {
  if (memoryActive || !isMinigameUnlocked('memory')) return;
  if (Date.now() - state.minigames.memoryLast < MEMORY_COOLDOWN) return;
  memoryActive = true; sfxGameStart();
  memoryPairs = 0;
  memoryMistakes = 0;
  memoryFlipped = [];
  document.getElementById('memory-btn').disabled = true;
  document.getElementById('memory-game').style.display = 'block';
  document.getElementById('memory-game').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('memory-pairs').textContent = '0';
  document.getElementById('memory-mistakes').textContent = '0';

  // Pick 8 random unique emojis
  const shuffled = [...MEMORY_POOL].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 8);
  memoryCards = [...picked, ...picked].sort(() => Math.random() - 0.5);

  const grid = document.getElementById('memory-grid');
  grid.innerHTML = '';
  memoryCards.forEach((emoji, i) => {
    const card = document.createElement('div');
    card.className = 'memory-card face-down';
    card.textContent = '?';
    card.dataset.index = i;
    card.onclick = () => flipCard(i);
    grid.appendChild(card);
  });
}

function flipCard(index) {
  if (!memoryActive) return;
  if (memoryFlipped.length >= 2) return;
  const cards = document.querySelectorAll('.memory-card');
  const card = cards[index];
  if (!card || card.classList.contains('face-up') || card.classList.contains('matched')) return;

  card.classList.remove('face-down');
  card.classList.add('face-up');
  card.textContent = memoryCards[index];
  parseAppleEmoji(card);
  memoryFlipped.push(index);

  if (memoryFlipped.length === 2) {
    const [a, b] = memoryFlipped;
    if (memoryCards[a] === memoryCards[b]) {
      // Match!
      sfxMemoryMatch();
      setTimeout(() => {
        cards[a].classList.add('matched');
        cards[b].classList.add('matched');
        memoryFlipped = [];
        memoryPairs++;
        document.getElementById('memory-pairs').textContent = memoryPairs;
        if (memoryPairs === 8) endMemory();
        else if (memoryPairs === 7) {
          // Auto-flip last 2 cards — they're guaranteed to match
          setTimeout(() => {
            const remaining = document.querySelectorAll('.memory-card.face-down');
            if (remaining.length === 2) {
              const idxA = parseInt(remaining[0].dataset.index);
              const idxB = parseInt(remaining[1].dataset.index);
              remaining[0].classList.remove('face-down');
              remaining[0].classList.add('face-up');
              remaining[0].textContent = memoryCards[idxA];
              parseAppleEmoji(remaining[0]);
              remaining[1].classList.remove('face-down');
              remaining[1].classList.add('face-up');
              remaining[1].textContent = memoryCards[idxB];
              parseAppleEmoji(remaining[1]);
              setTimeout(() => {
                remaining[0].classList.add('matched');
                remaining[1].classList.add('matched');
                memoryPairs++;
                document.getElementById('memory-pairs').textContent = memoryPairs;
                endMemory();
              }, 400);
            }
          }, 500);
        }
      }, 400);
    } else {
      // No match
      sfxMemoryFail();
      memoryMistakes++;
      document.getElementById('memory-mistakes').textContent = memoryMistakes;
      setTimeout(() => {
        cards[a].classList.remove('face-up');
        cards[a].classList.add('face-down');
        cards[a].textContent = '?';
        cards[b].classList.remove('face-up');
        cards[b].classList.add('face-down');
        cards[b].textContent = '?';
        memoryFlipped = [];
      }, 700);
    }
  }
}

function endMemory() {
  memoryActive = false;
  sfxGameEnd();
  state.minigames.memoryLast = Date.now();
  state.stats.memoryPlayed++;
  state.stats.memoryPairsFound += memoryPairs;
  if (memoryMistakes === 0) state.stats.memoryWon++;

  // Graduated penalty: multiplier = max(0, 1 - mistakes²/36)
  // 0 fouten = 100%, 1 = 97%, 2 = 89%, 3 = 75%, 4 = 56%, 5 = 31%, 6+ = 0%
  const penaltyMult = Math.max(0, 1 - (memoryMistakes * memoryMistakes) / 36);
  const maxBonus = getTotalDps() * 60 * 8;
  const bonus = Math.round(maxBonus * penaltyMult);
  state.currentPoints += bonus;
  state.totalEarned += bonus;
  state.allTime.totalEarned += bonus;

  const grid = document.getElementById('memory-grid');
  let msg;
  if (memoryMistakes === 0) msg = '<div style="color:var(--gold)">Perfect! Geen fouten!</div>';
  else if (memoryMistakes <= 2) msg = '<div style="color:var(--green-light)">Goed gedaan!</div>';
  else if (memoryMistakes <= 4) msg = '<div style="color:var(--orange)">Kan beter!</div>';
  else msg = '<div style="color:var(--red)">Veel fouten gemaakt!</div>';
  const pctText = Math.round(penaltyMult * 100) + '% bonus';
  grid.innerHTML = '<div style="grid-column:1/-1;font-size:18px;font-weight:700;padding:20px;text-align:center">' +
    msg + '<div style="margin-top:4px">' + memoryMistakes + ' fout' + (memoryMistakes !== 1 ? 'en' : '') + ' — ' + pctText + '</div>' +
    '<div style="color:var(--gold);margin-top:8px">+' + formatNumber(bonus) + ' punten</div></div>';

  setTimeout(() => {
    document.getElementById('memory-game').style.display = 'none';
    document.getElementById('memory-btn').disabled = false;
  }, 3000);
  saveGame();
}

/* Dieren Tellen */
let tellenActive = false;
let tellenTarget = '';
let tellenCount = 0;

function startTellen() {
  if (tellenActive || !isMinigameUnlocked('tellen')) return;
  if (Date.now() - state.minigames.tellenLast < TELLEN_COOLDOWN) return;
  tellenActive = true; sfxGameStart();
  document.getElementById('tellen-btn').disabled = true;
  const game = document.getElementById('tellen-game');
  game.style.display = 'block';

  // Pick target animal
  const pool = MEMORY_POOL.filter(e => !e.includes('\uFE0F') && e.length <= 2); // clean single emojis
  tellenTarget = pool[Math.floor(Math.random() * pool.length)];
  tellenCount = 1 + Math.floor(Math.random() * 5); // 1-5

  // Build grid: 16 cells, tellenCount of them are target
  const cells = [];
  for (let i = 0; i < tellenCount; i++) cells.push(tellenTarget);
  while (cells.length < 16) {
    const r = pool[Math.floor(Math.random() * pool.length)];
    if (r !== tellenTarget) cells.push(r);
  }
  cells.sort(() => Math.random() - 0.5);

  // Phase 1: show target (big icon)
  game.innerHTML = '<div id="tellen-prompt">Let op de:</div>' +
    '<div style="font-size:64px;text-align:center;margin:8px 0">' + tellenTarget + '</div>';
  parseAppleEmoji(game);

  setTimeout(() => {
    // Phase 2: flash grid with wiggle
    let html = '<div id="tellen-flash">';
    cells.forEach((c, i) => {
      const dx = (Math.random() * 6 - 3).toFixed(1);
      const dy = (Math.random() * 6 - 3).toFixed(1);
      const dur = (1.5 + Math.random() * 1.5).toFixed(2);
      const del = (Math.random() * -2).toFixed(2);
      html += '<div class="tellen-cell tellen-wiggle" style="--dx:' + dx + 'px;--dy:' + dy + 'px;animation-duration:' + dur + 's;animation-delay:' + del + 's">' + c + '</div>';
    });
    html += '</div>';
    game.innerHTML = html;
    parseAppleEmoji(game);

    setTimeout(() => {
      // Phase 3: ask question
      const options = new Set([tellenCount]);
      while (options.size < 4) {
        let fake = tellenCount + Math.floor(Math.random() * 5) - 2;
        if (fake < 0) fake = 0;
        if (fake > 8) fake = 8;
        if (fake !== tellenCount) options.add(fake);
      }
      const sorted = [...options].sort((a,b) => a - b);
      let qhtml = '<div id="tellen-prompt">Hoeveel ' + tellenTarget + ' zag je?</div>';
      qhtml += '<div class="tellen-answers">';
      sorted.forEach(n => {
        qhtml += '<button class="tellen-ans" onclick="answerTellen(' + n + ')">' + n + '</button>';
      });
      qhtml += '</div>';
      game.innerHTML = qhtml;
      parseAppleEmoji(game);
    }, 3000);
  }, 2000);
}

function answerTellen(n) {
  if (!tellenActive) return;
  tellenActive = false;
  state.minigames.tellenLast = Date.now();
  state.stats.tellenPlayed++;

  const buttons = document.querySelectorAll('.tellen-ans');
  buttons.forEach(b => {
    b.onclick = null;
    b.style.pointerEvents = 'none';
    if (parseInt(b.textContent) === tellenCount) b.classList.add('correct');
    if (parseInt(b.textContent) === n && n !== tellenCount) b.classList.add('wrong');
  });

  if (n === tellenCount) {
    state.stats.tellenCorrect++;
    const bonus = getTotalDps() * 600;
    state.currentPoints += bonus;
    state.totalEarned += bonus;
    state.allTime.totalEarned += bonus;
    const prompt = document.getElementById('tellen-prompt');
    if (prompt) prompt.innerHTML = '<span style="color:var(--green-light)">Goed! +' + formatNumber(bonus) + ' punten!</span>';
  } else {
    state.stats.tellenWrong++;
    const prompt = document.getElementById('tellen-prompt');
    if (prompt) prompt.innerHTML = '<span style="color:var(--red)">Helaas! Het waren er ' + tellenCount + '.</span>';
  }

  setTimeout(() => {
    document.getElementById('tellen-game').style.display = 'none';
    document.getElementById('tellen-btn').disabled = false;
  }, 2500);
  saveGame();
}

/* De Indringer */
let indringerActive = false;
let indringerScore = 0;
let indringerInterval = null;
let indringerCorrectIdx = -1;

function startIndringer() {
  if (indringerActive || !isMinigameUnlocked('indringer')) return;
  if (Date.now() - state.minigames.indringerLast < INDRINGER_COOLDOWN) return;
  indringerActive = true; sfxGameStart();
  indringerScore = 0;
  document.getElementById('indringer-btn').disabled = true;
  document.getElementById('indringer-game').style.display = 'block';
  document.getElementById('indringer-score').textContent = '0';
  document.getElementById('indringer-timer').textContent = '10';

  nextIndringer();
  let timeLeft = 10;
  indringerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById('indringer-timer').textContent = timeLeft;
    if (timeLeft <= 0) endIndringer();
  }, 1000);
}

function nextIndringer() {
  // Pick 2 different groups
  const g1idx = Math.floor(Math.random() * INTRUDER_GROUPS.length);
  let g2idx;
  do { g2idx = Math.floor(Math.random() * INTRUDER_GROUPS.length); } while (g2idx === g1idx);
  const group = INTRUDER_GROUPS[g1idx];
  const other = INTRUDER_GROUPS[g2idx];

  // 3 from group, 1 intruder
  const shuffled = [...group.animals].sort(() => Math.random() - 0.5);
  const three = shuffled.slice(0, 3);
  const intruder = other.animals[Math.floor(Math.random() * other.animals.length)];

  const cards = [...three, intruder].sort(() => Math.random() - 0.5);
  indringerCorrectIdx = cards.indexOf(intruder);

  const grid = document.getElementById('indringer-grid');
  grid.innerHTML = '';
  cards.forEach((emoji, i) => {
    const card = document.createElement('div');
    card.className = 'indringer-card';
    card.innerHTML = '<div class="indringer-emoji">' + emoji + '</div>';
    card.onclick = () => answerIndringer(i);
    grid.appendChild(card);
  });
  parseAppleEmoji(grid);
}

function answerIndringer(idx) {
  if (!indringerActive) return;
  const cards = document.querySelectorAll('.indringer-card');
  if (idx === indringerCorrectIdx) {
    indringerScore++;
    document.getElementById('indringer-score').textContent = indringerScore;
    cards[idx].classList.add('correct');
    setTimeout(nextIndringer, 250);
  } else {
    cards[idx].classList.add('wrong');
    cards[indringerCorrectIdx].classList.add('correct');
    endIndringer();
  }
}

function endIndringer() {
  indringerActive = false;
  sfxGameEnd();
  state.minigames.indringerLast = Date.now();
  state.stats.indringerPlayed++;
  if (indringerScore > state.stats.indringerBest) state.stats.indringerBest = indringerScore;
  clearInterval(indringerInterval);

  const bonus = getTotalDps() * 60 * indringerScore;
  state.currentPoints += bonus;
  state.totalEarned += bonus;
  state.allTime.totalEarned += bonus;

  const grid = document.getElementById('indringer-grid');
  grid.innerHTML = '<div style="grid-column:1/-1;font-size:18px;font-weight:700;padding:20px;text-align:center">' +
    '<div>' + indringerScore + ' indringers gevonden!</div>' +
    '<div style="color:var(--gold);margin-top:8px">+' + formatNumber(bonus) + ' punten</div></div>';

  setTimeout(() => {
    document.getElementById('indringer-game').style.display = 'none';
    document.getElementById('indringer-btn').disabled = false;
  }, 3000);
  saveGame();
}

/* Groter of Kleiner */
let groterActive = false;
let groterScore = 0;
let groterMistakes = 0;
let groterRound = 0;
let groterPair = null;
let groterTimeout = null;

function startGroter() {
  if (groterActive || !isMinigameUnlocked('groter')) return;
  if (Date.now() - state.minigames.groterLast < GROTER_COOLDOWN) return;
  groterActive = true; sfxGameStart();
  groterScore = 0;
  groterMistakes = 0;
  groterRound = 0;
  document.getElementById('groter-btn').disabled = true;
  document.getElementById('groter-game').style.display = 'block';
  document.getElementById('groter-score').textContent = '0';
  document.getElementById('groter-mistakes').textContent = '0';
  nextGroter();
}

function nextGroter() {
  groterRound++;
  if (groterRound > 10 || groterMistakes >= 3) { endGroter(); return; }
  // Pick 2 different animals
  const shuffled = [...ANIMAL_WEIGHTS].sort(() => Math.random() - 0.5);
  let a = shuffled[0], b = shuffled[1];
  // Ensure they're not too similar
  if (Math.abs(a.kg - b.kg) / Math.max(a.kg, b.kg) < 0.3) {
    b = shuffled[2] || b;
  }
  groterPair = [a, b];
  const questions = ['Welk dier is zwaarder?', 'Welk dier weegt meer?', 'Welke is de zwaarste?'];
  document.getElementById('groter-question').textContent = questions[Math.floor(Math.random() * questions.length)];

  const pair = document.getElementById('groter-pair');
  pair.innerHTML = '';
  [a, b].forEach((animal, i) => {
    const div = document.createElement('div');
    div.className = 'groter-choice';
    div.innerHTML = '<div class="groter-emoji">' + animal.emoji + '</div><div class="groter-name">' + animal.name + '</div>';
    div.onclick = () => answerGroter(i);
    pair.appendChild(div);
  });
  parseAppleEmoji(pair);
  // 3 second timer
  clearTimeout(groterTimeout);
  groterTimeout = setTimeout(() => {
    if (!groterActive) return;
    // Time's up = wrong answer
    const choices = document.querySelectorAll('.groter-choice');
    choices.forEach(c => { c.onclick = null; c.style.pointerEvents = 'none'; });
    const heavier = groterPair[0].kg >= groterPair[1].kg ? 0 : 1;
    choices[heavier].classList.add('correct');
    groterMistakes++;
    state.stats.groterWrong++;
    document.getElementById('groter-mistakes').textContent = groterMistakes;
    setTimeout(nextGroter, 600);
  }, 3000);
}

function answerGroter(idx) {
  if (!groterActive) return;
  clearTimeout(groterTimeout);
  const [a, b] = groterPair;
  const heavier = a.kg >= b.kg ? 0 : 1;
  const choices = document.querySelectorAll('.groter-choice');
  choices.forEach(c => { c.onclick = null; c.style.pointerEvents = 'none'; });
  choices[heavier].classList.add('correct');

  if (idx === heavier) {
    groterScore++;
    state.stats.groterCorrect++;
    document.getElementById('groter-score').textContent = groterScore;
  } else {
    groterMistakes++;
    state.stats.groterWrong++;
    choices[idx].classList.add('wrong');
    document.getElementById('groter-mistakes').textContent = groterMistakes;
  }
  setTimeout(nextGroter, 600);
}

function endGroter() {
  clearTimeout(groterTimeout);
  sfxGameEnd();
  groterActive = false;
  state.minigames.groterLast = Date.now();
  state.stats.groterPlayed++;

  const bonus = getTotalDps() * 60 * groterScore;
  state.currentPoints += bonus;
  state.totalEarned += bonus;
  state.allTime.totalEarned += bonus;

  const pair = document.getElementById('groter-pair');
  pair.innerHTML = '<div style="width:100%;font-size:18px;font-weight:700;padding:20px;text-align:center">' +
    '<div>' + groterScore + '/10 goed!</div>' +
    '<div style="color:var(--gold);margin-top:8px">+' + formatNumber(bonus) + ' punten</div></div>';

  setTimeout(() => {
    document.getElementById('groter-game').style.display = 'none';
    document.getElementById('groter-btn').disabled = false;
  }, 3000);
  saveGame();
}

/* Paardenrace */
let raceActive = false;
let raceChoice = -1;
let raceHorses = [];
let raceTimer = null;

const RACE_NAMES = [
  {name:'Bliksem', emoji:'⚡'}, {name:'Stormvogel', emoji:'🌪️'}, {name:'Goudvos', emoji:'🦊'},
  {name:'Schaduw', emoji:'🌙'}, {name:'Donder', emoji:'💥'}, {name:'Komeet', emoji:'☄️'},
  {name:'Vuurpijl', emoji:'🚀'}, {name:'Windkracht', emoji:'💨'}
];

function startRace() {
  if (raceActive || !isMinigameUnlocked('race')) return;
  if (Date.now() - state.minigames.raceLast < RACE_COOLDOWN) return;
  raceActive = true; sfxGameStart();
  raceChoice = -1;
  document.getElementById('race-btn').disabled = true;
  document.getElementById('race-game').style.display = 'block';
  document.getElementById('race-pick-phase').style.display = 'block';
  document.getElementById('race-track-phase').style.display = 'none';
  document.getElementById('race-game').scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Pick 3 random horse names
  const shuffled = [...RACE_NAMES].sort(() => Math.random() - 0.5);
  raceHorses = shuffled.slice(0, 3).map((h, i) => ({
    ...h, pos: 0, speed: 0.7 + Math.random() * 0.6,
    color: ['#ff6b35','#42a5f5','#66bb6a'][i]
  }));

  const picks = document.getElementById('race-picks');
  picks.innerHTML = '';
  raceHorses.forEach((h, i) => {
    const btn = document.createElement('button');
    btn.className = 'race-pick-btn';
    btn.innerHTML = h.emoji + ' ' + h.name;
    btn.style.borderColor = h.color + '80';
    btn.onclick = () => pickHorse(i);
    picks.appendChild(btn);
  });
}

function pickHorse(idx) {
  raceChoice = idx;
  document.getElementById('race-pick-phase').style.display = 'none';
  document.getElementById('race-track-phase').style.display = 'block';

  // Build track
  const track = document.getElementById('race-track');
  track.innerHTML = '';
  raceHorses.forEach((h, i) => {
    const lane = document.createElement('div');
    lane.className = 'race-lane';
    lane.style.borderLeft = '3px solid ' + h.color;
    const horse = document.createElement('div');
    horse.className = 'race-horse';
    horse.id = 'race-horse-' + i;
    horse.textContent = '🐴';
    horse.style.left = '0px';
    const finish = document.createElement('div');
    finish.className = 'race-finish';
    const label = document.createElement('span');
    label.style.cssText = 'position:absolute;left:6px;top:50%;transform:translateY(-50%);font-size:11px;color:' + h.color + ';font-weight:600;z-index:2';
    label.textContent = h.emoji + ' ' + h.name + (i === raceChoice ? ' (jij!)' : '');
    lane.appendChild(label);
    lane.appendChild(horse);
    lane.appendChild(finish);
    track.appendChild(lane);
  });
  parseAppleEmoji(track);

  document.getElementById('race-status').textContent = '3... 2... 1... START!';
  // Reset positions
  raceHorses.forEach(h => h.pos = 0);

  let tick = 0;
  const maxTicks = 60; // ~6 seconds at 100ms interval
  raceTimer = setInterval(() => {
    tick++;
    const progress = tick / maxTicks;
    raceHorses.forEach((h, i) => {
      // Random speed variation, gets more dramatic near end
      const variation = (Math.random() - 0.45) * (0.5 + progress * 1.5);
      h.pos += h.speed + variation;
      if (h.pos < 0) h.pos = 0;
      // Rubber-banding: leader slows, trailer speeds up slightly
      const maxPos = Math.max(...raceHorses.map(r => r.pos));
      const minPos = Math.min(...raceHorses.map(r => r.pos));
      if (h.pos === maxPos && maxPos - minPos > 3) h.pos -= 0.3;
      if (h.pos === minPos && maxPos - minPos > 3) h.pos += 0.2;
      // Render
      const lane = document.querySelectorAll('.race-lane')[i];
      const laneW = lane.offsetWidth - 40;
      const pct = Math.min(h.pos / (maxTicks * 1.0), 1);
      document.getElementById('race-horse-' + i).style.left = Math.floor(pct * laneW) + 'px';
    });

    if (tick >= maxTicks) {
      clearInterval(raceTimer);
      endRace();
    }
  }, 100);
}

function endRace() {
  raceActive = false;
  sfxGameEnd();
  state.minigames.raceLast = Date.now();
  state.stats.racePlayed++;

  // Determine winner
  let maxPos = -1, winner = 0;
  raceHorses.forEach((h, i) => { if (h.pos > maxPos) { maxPos = h.pos; winner = i; } });

  const won = winner === raceChoice;
  if (won) state.stats.raceWon++;

  const bonus = won ? getTotalDps() * 120 : 0;
  if (bonus > 0) {
    state.currentPoints += bonus;
    state.totalEarned += bonus;
    state.allTime.totalEarned += bonus;
  }

  const winName = raceHorses[winner].emoji + ' ' + raceHorses[winner].name;
  const msg = won
    ? '<div style="color:var(--gold);font-size:18px;font-weight:700">Jouw paard wint!</div>'
    : '<div style="color:var(--red);font-size:18px;font-weight:700">' + winName + ' wint... Jammer!</div>';
  document.getElementById('race-status').innerHTML = msg +
    (bonus > 0 ? '<div style="color:var(--gold);margin-top:4px">+' + formatNumber(bonus) + ' punten</div>' : '<div style="color:var(--text-dim);margin-top:4px">Geen punten</div>');

  setTimeout(() => {
    document.getElementById('race-game').style.display = 'none';
    document.getElementById('race-btn').disabled = false;
  }, 3000);
  saveGame();
}

/* Dieren Puzzel */
let puzzelActive = false;
let puzzelMoves = 0;
let puzzelBoard = [];
const PUZZEL_EMOJIS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔'];

function startPuzzel() {
  if (puzzelActive || !isMinigameUnlocked('puzzel')) return;
  if (Date.now() - state.minigames.puzzelLast < PUZZEL_COOLDOWN) return;
  puzzelActive = true; sfxGameStart();
  puzzelMoves = 0;
  document.getElementById('puzzel-btn').disabled = true;
  document.getElementById('puzzel-game').style.display = 'block';
  document.getElementById('puzzel-moves').textContent = '0';
  document.getElementById('puzzel-game').scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Pick 8 random emojis for tiles 1-8
  const shuffled = [...PUZZEL_EMOJIS].sort(() => Math.random() - 0.5);
  const icons = shuffled.slice(0, 8);

  // Generate solvable puzzle: start solved, then do random moves
  puzzelBoard = [1, 2, 3, 4, 5, 6, 7, 8, 0]; // 0 = empty (bottom-right)
  let emptyIdx = 8;
  const adj = [[1,3],[0,2,4],[1,5],[0,4,6],[1,3,5,7],[2,4,8],[3,7],[4,6,8],[5,7]];
  for (let i = 0; i < 200; i++) {
    const neighbors = adj[emptyIdx];
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    puzzelBoard[emptyIdx] = puzzelBoard[pick];
    puzzelBoard[pick] = 0;
    emptyIdx = pick;
  }

  renderPuzzel(icons);
}

function renderPuzzel(icons) {
  if (!icons) {
    const grid = document.getElementById('puzzel-grid');
    icons = JSON.parse(grid.dataset.icons);
  }
  const grid = document.getElementById('puzzel-grid');
  grid.dataset.icons = JSON.stringify(icons);
  grid.innerHTML = '';
  puzzelBoard.forEach((val, idx) => {
    const tile = document.createElement('div');
    if (val === 0) {
      tile.className = 'puzzel-tile empty';
    } else {
      tile.className = 'puzzel-tile';
      // Highlight tiles in correct position
      if (val === idx + 1) tile.classList.add('correct');
      tile.innerHTML = '<span style="font-size:11px;opacity:0.6;position:absolute;top:2px;left:5px">' + val + '</span>' + icons[val - 1];
      tile.style.position = 'relative';
      tile.onclick = () => puzzelClick(idx);
    }
    grid.appendChild(tile);
  });
  parseAppleEmoji(grid);
}

function puzzelClick(idx) {
  if (!puzzelActive) return;
  const emptyIdx = puzzelBoard.indexOf(0);
  // Check adjacency (3x3 grid)
  const row1 = Math.floor(idx / 3), col1 = idx % 3;
  const row2 = Math.floor(emptyIdx / 3), col2 = emptyIdx % 3;
  const dist = Math.abs(row1 - row2) + Math.abs(col1 - col2);
  if (dist !== 1) return;

  // Swap
  puzzelBoard[emptyIdx] = puzzelBoard[idx];
  puzzelBoard[idx] = 0;
  puzzelMoves++;
  document.getElementById('puzzel-moves').textContent = puzzelMoves;
  renderPuzzel();

  // Check win: [1,2,3,4,5,6,7,8,0]
  const solved = puzzelBoard.every((v, i) => i < 8 ? v === i + 1 : v === 0);
  if (solved) endPuzzel();
}

function endPuzzel() {
  puzzelActive = false;
  sfxGameEnd();
  state.minigames.puzzelLast = Date.now();
  state.stats.puzzelPlayed++;
  state.stats.puzzelWon++;
  if (state.stats.puzzelBestMoves === 0 || puzzelMoves < state.stats.puzzelBestMoves) {
    state.stats.puzzelBestMoves = puzzelMoves;
  }

  // Bonus: fewer moves = higher multiplier. Perfect is ~24 moves for 3x3
  const mult = Math.max(0.2, 2 - (puzzelMoves - 20) / 40);
  const bonus = Math.round(getTotalDps() * 60 * mult);
  state.currentPoints += bonus;
  state.totalEarned += bonus;
  state.allTime.totalEarned += bonus;

  const grid = document.getElementById('puzzel-grid');
  grid.innerHTML = '<div style="grid-column:1/-1;font-size:18px;font-weight:700;padding:20px;text-align:center">' +
    '<div style="color:var(--green-light)">Opgelost!</div>' +
    '<div style="margin-top:4px">' + puzzelMoves + ' zetten</div>' +
    '<div style="color:var(--gold);margin-top:8px">+' + formatNumber(bonus) + ' punten</div></div>';

  setTimeout(() => {
    document.getElementById('puzzel-game').style.display = 'none';
    document.getElementById('puzzel-btn').disabled = false;
  }, 3000);
  saveGame();
}

/* Wat Eet Ik? */
let voedselActive = false;
let voedselScore = 0;
let voedselMistakes = 0;
let voedselRound = 0;
let voedselBag = [];
let voedselCurrent = null;
let voedselTimeout = null;

function startVoedsel() {
  if (voedselActive || !isMinigameUnlocked('voedsel')) return;
  if (Date.now() - state.minigames.voedselLast < VOEDSEL_COOLDOWN) return;
  voedselActive = true; sfxGameStart();
  voedselScore = 0;
  voedselMistakes = 0;
  voedselRound = 0;
  voedselBag = [...FOOD_QUIZ].sort(() => Math.random() - 0.5);
  document.getElementById('voedsel-btn').disabled = true;
  document.getElementById('voedsel-game').style.display = 'block';
  document.getElementById('voedsel-score').textContent = '0';
  document.getElementById('voedsel-mistakes').textContent = '0';
  nextVoedsel();
}

function nextVoedsel() {
  voedselRound++;
  if (voedselRound > 10 || voedselMistakes >= 3) { endVoedsel(); return; }
  if (voedselBag.length === 0) voedselBag = [...FOOD_QUIZ].sort(() => Math.random() - 0.5);
  voedselCurrent = voedselBag.shift();

  const field = document.getElementById('voedsel-field');
  const wrongPick = voedselCurrent.wrong.sort(() => Math.random() - 0.5).slice(0, 2);
  const options = [voedselCurrent.food, ...wrongPick].sort(() => Math.random() - 0.5);

  let html = '<div class="voedsel-animal">' + voedselCurrent.emoji + '</div>';
  html += '<div class="voedsel-name">' + voedselCurrent.name + ' eet...</div>';
  html += '<div class="voedsel-options">';
  options.forEach(opt => {
    html += '<button class="voedsel-opt" onclick="answerVoedsel(this,\'' + opt.replace(/'/g, "\\'") + '\')">' + opt + '</button>';
  });
  html += '</div>';
  field.innerHTML = html;
  parseAppleEmoji(field);
  // 3 second timer
  clearTimeout(voedselTimeout);
  voedselTimeout = setTimeout(() => {
    if (!voedselActive) return;
    const buttons = document.querySelectorAll('.voedsel-opt');
    buttons.forEach(b => { b.onclick = null; b.style.pointerEvents = 'none'; });
    buttons.forEach(b => { if (b.textContent === voedselCurrent.food) b.classList.add('correct'); });
    voedselMistakes++;
    state.stats.voedselWrong++;
    document.getElementById('voedsel-mistakes').textContent = voedselMistakes;
    setTimeout(nextVoedsel, 600);
  }, 3000);
}

function answerVoedsel(btn, answer) {
  if (!voedselActive) return;
  clearTimeout(voedselTimeout);
  const buttons = document.querySelectorAll('.voedsel-opt');
  buttons.forEach(b => { b.onclick = null; b.style.pointerEvents = 'none'; });
  buttons.forEach(b => { if (b.textContent === voedselCurrent.food) b.classList.add('correct'); });

  if (answer === voedselCurrent.food) {
    voedselScore++;
    state.stats.voedselCorrect++;
    document.getElementById('voedsel-score').textContent = voedselScore;
  } else {
    voedselMistakes++;
    state.stats.voedselWrong++;
    btn.classList.add('wrong');
    document.getElementById('voedsel-mistakes').textContent = voedselMistakes;
  }
  setTimeout(nextVoedsel, 600);
}

function endVoedsel() {
  clearTimeout(voedselTimeout);
  sfxGameEnd();
  voedselActive = false;
  state.minigames.voedselLast = Date.now();
  state.stats.voedselPlayed++;

  const bonus = getTotalDps() * 60 * voedselScore;
  state.currentPoints += bonus;
  state.totalEarned += bonus;
  state.allTime.totalEarned += bonus;

  const field = document.getElementById('voedsel-field');
  field.innerHTML = '<div style="font-size:18px;font-weight:700;padding:20px;text-align:center">' +
    '<div>' + voedselScore + ' goed!</div>' +
    '<div style="color:var(--gold);margin-top:8px">+' + formatNumber(bonus) + ' punten</div></div>';

  setTimeout(() => {
    document.getElementById('voedsel-game').style.display = 'none';
    document.getElementById('voedsel-btn').disabled = false;
  }, 3000);
  saveGame();
}

