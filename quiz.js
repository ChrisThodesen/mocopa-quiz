// ── State ─────────────────────────────────────────────────────────────────────
let quizRegistry = [];
let currentQuiz = null;
let quiz = [];
let current = 0;
let score = 0;
let answered = false;
let wrongAnswers = [];
let testMode = false;
// In test mode we also track selected answers to show in review
let selectedAnswers = [];
const PASS_THRESHOLD = 80;

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function prepareQuestions(questions, count) {
  const prepared = questions.map(q => {
    const correctAnswer = q.answers[q.correct];
    const aoaIndex = q.answers.findIndex(a =>
      a.toLowerCase().includes("all of the above")
    );
    let aoa = null;
    const rest = [...q.answers];
    if (aoaIndex !== -1) aoa = rest.splice(aoaIndex, 1)[0];
    shuffle(rest);
    const shuffled = aoa ? [...rest, aoa] : rest;
    return {
      question: q.question,
      answers: shuffled,
      correct: shuffled.indexOf(correctAnswer),
      explanation: q.explanation || ''
    };
  });
  const shuffled = shuffle(prepared);
  return count ? shuffled.slice(0, count) : shuffled;
}
// ── Start screen ──────────────────────────────────────────────────────────────
function showQuizSelector() {
  document.getElementById('progressSection').style.display = 'none';
  document.getElementById('quizSubtitle').textContent = '⚡ Smart Metering Apprenticeship Training ⚡';

  const card = document.getElementById('quizCard');
  card.className = 'quiz-card fade-in';

  fetch('./data/index.json')
    .then(r => r.json())
    .then(registry => {
      quizRegistry = registry;
      console.log(registry);
      card.innerHTML = `
        <p class="quiz-select-title">Select a quiz</p>
        <p class="quiz-select-desc">Choose a topic below, then select practice or test mode.</p>
        <div class="quiz-list">
          ${quizRegistry.map(q => `
            <button class="quiz-card-btn" onclick="selectQuiz('${q.id}')">
              <div class="quiz-card-icon">${q.icon}</div>
              <div>
                <div class="quiz-card-title">${q.title}</div>
                <div class="quiz-card-subtitle">${q.subtitle}</div>
              </div>
            </button>
          `).join('')}
        </div>
      `;
    })
    .catch((err) => {
      console.error('Error loading quiz registry:', err);
      card.innerHTML = `<p class="start-desc">Could not load quiz list. Please check data/index.json exists. ${err}</p>`;
    });
}

function selectQuiz(id) {
  currentQuiz = quizRegistry.find(q => q.id === id);
  showModeSelector();
}

function showModeSelector() {
  const card = document.getElementById('quizCard');
  card.className = 'quiz-card fade-in';
  document.getElementById('quizSubtitle').textContent = currentQuiz.subtitle;

  card.innerHTML = `
    <button class="back-btn" onclick="showQuizSelector()">&#8592; All quizzes</button>
    <p class="selected-quiz-name">${currentQuiz.title}</p>
    <div class="mode-btns">
      <button class="mode-btn mode-practice" onclick="loadAndStart('practice')">
        <span class="mode-icon">📝</span>
        <span class="mode-label">Practice Mode</span>
        <span class="mode-hint">Instant feedback after each answer</span>
      </button>
      <button class="mode-btn mode-test" onclick="loadAndStart('test')">
        <span class="mode-icon">🎯</span>
        <span class="mode-label">Test Mode</span>
        <span class="mode-hint">Results revealed at the end — pass mark ${currentQuiz.passmark}%</span>
      </button>
    </div>
  `;
}

function loadAndStart(mode) {
  fetch(currentQuiz.file)
    .then(r => r.json())
    .then(questions => {
      startQuiz(mode, questions);
    })
    .catch(err => {
      console.error('Error loading quiz questions:', err);
      alert('Could not load quiz questions. Please check the data file exists.');
    });
}

function startQuiz(mode, questions) {
  testMode        = (mode === 'test');
  quiz            = prepareQuestions(questions, 
    testMode ? currentQuiz.testCount : currentQuiz.practiceCount);
  current         = 0;
  score           = 0;
  wrongAnswers    = [];
  selectedAnswers = [];
  answered        = false;

  const modeBadge = document.getElementById('modeBadge');
  modeBadge.textContent = testMode ? 'Test' : 'Practice';
  modeBadge.className   = 'mode-badge ' + (testMode ? 'badge-test' : 'badge-practice');

  document.getElementById('progressSection').style.display = 'block';
  renderQuestion();
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function updateProgress() {
  const percent = (current / quiz.length) * 100;
  document.getElementById("progressFill").style.width = percent + "%";
  document.getElementById("progressText").textContent =
    `Question ${current + 1} of ${quiz.length}`;
}

function renderQuestion() {
  answered = false;

  const card = document.getElementById('quizCard');
  card.className = 'quiz-card fade-in';

  const q = quiz[current];
  updateProgress();

  card.innerHTML = `
    <p class="question-text">${q.question}</p>
    <div class="answers" id="answers"></div>
    <div class="feedback" id="feedback" style="display:none"></div>
    <button class="next-btn" id="nextBtn" style="display:none" onclick="nextQuestion()">
      ${current < quiz.length - 1 ? 'Next question &#8594;' : 'See results'}
    </button>
  `;

  const answersDiv = document.getElementById('answers');
  q.answers.forEach((answer, i) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.innerHTML = `
      <span class="answer-letter">${String.fromCharCode(65 + i)}</span>
      <span class="answer-text">${answer}</span>
    `;
    btn.addEventListener('click', () => selectAnswer(btn, i));
    answersDiv.appendChild(btn);
  });
}

function selectAnswer(button, index) {
  if(!testMode) {
    if (answered) return;
    answered = true;
  }

  const correctIndex = quiz[current].correct;
  const buttons = document.querySelectorAll(".answer-btn");

  // Record result
  if(!testMode) {
    if (index === correctIndex) {
      score++;
    } else {
      wrongAnswers.push({
        question: quiz[current].question,
        selected: quiz[current].answers[index],
        correct: quiz[current].answers[correctIndex]
      });
    }
  }

  if (testMode) {

    selectedAnswers[current] = index;
    // Test mode: just mark the selected button neutrally, no reveal
    buttons.forEach((btn,i) =>{
      btn.classList.remove("selected");
      if(i === index) {
        btn.classList.add("selected");
      } 
    });

    const feedback = document.getElementById("feedback");
    feedback.textContent = "Selection saved. You can change it before continuing.";
    feedback.className = "feedback neutral-feedback";
    feedback.style.display = "block";
  } else {
    // Practice mode: reveal correct/wrong immediately
    buttons.forEach((btn, i) => {
      btn.disabled = true;
      if (i === correctIndex) btn.classList.add("correct","anim-correct");
      else if (i === index) btn.classList.add("wrong","anim-wrong");
    });

    const feedback = document.getElementById("feedback");
    if (index === correctIndex) {
      feedback.textContent = "Correct!";
      feedback.className = "feedback correct-feedback";
    } else {
      feedback.textContent = `Incorrect — the correct answer was: ${quiz[current].answers[correctIndex]}`;
      feedback.className = "feedback wrong-feedback";
    }
    feedback.style.display = "block";
  }

  document.getElementById("nextBtn").style.display = "flex";
}

function nextQuestion() {
  if(testMode) {

const selected = selectedAnswers[current];
    const correctIndex = quiz[current].correct;

    if (selected === undefined) {
      // Optional: warn user
      alert("Please select an answer before continuing.");
      return;
    }

    // Score now (final answer)
    if (selected === correctIndex) {
      score++;
    } else {
      wrongAnswers.push({
        question: quiz[current].question,
        selected: quiz[current].answers[selected],
        correct: quiz[current].answers[correctIndex]
      });
    }
  }
  
  current++;
  if (current < quiz.length) {
    renderQuestion();
  } else {
    showResults();
  }
}

// ── Results ───────────────────────────────────────────────────────────────────
function showResults() {
  const percent = Math.round((score / quiz.length) * 100);
  const passmark = currentQuiz ? currentQuiz.passmark : 80;
  const pass     = percent >= passmark;

  const card = document.getElementById("quizCard");
  card.classList.remove("fade-in");
  void card.offsetWidth;
  card.classList.add("fade-in");

  document.getElementById("progressSection").style.display = "none";

  let wrongHTML = "";
  if (wrongAnswers.length > 0) {
    wrongHTML = wrongAnswers.map(item => `
      <div class="review-item">
        <p class="review-question">${item.question}</p>
        <p class="review-wrong">✗ Your answer: ${item.selected}</p>
        <p class="review-correct">✓ Correct: ${item.correct}</p>
      </div>
    `).join("");
  }

  const modeLabel = testMode ? "Test" : "Practice";

  card.innerHTML = `
    <div class="results">
      <p class="result-mode-label">${modeLabel} mode result</p>
      <div class="result-score-ring">
        <svg viewBox="0 0 120 120" class="ring-svg" aria-hidden="true">
          <circle class="ring-bg" cx="60" cy="60" r="52"/>
          <circle class="ring-fill ${pass ? 'ring-pass' : 'ring-fail'}"
            cx="60" cy="60" r="52"
            stroke-dasharray="${Math.round(2 * Math.PI * 52)}"
            stroke-dashoffset="${Math.round(2 * Math.PI * 52 * (1 - percent / 100))}"/>
        </svg>
        <div class="ring-label">
          <span class="ring-percent">${percent}%</span>
          <span class="ring-verdict ${pass ? 'verdict-pass' : 'verdict-fail'}">${pass ? 'PASS' : 'FAIL'}</span>
        </div>
      </div>

      <p class="result-detail">${score} / ${quiz.length} correct</p>
      <p class="result-threshold">Pass mark: ${passmark}%</p>

      ${wrongAnswers.length > 0 ? `
        <div class="review-section">
          <h3 class="review-heading">Review (${wrongAnswers.length} wrong)</h3>
          ${wrongHTML}
        </div>
      ` : '<p class="perfect">Perfect score! Well done. 🎉</p>'}

      <button class="restart-btn" onclick="showModeSelector()">Try again</button>
      <button class="restart-btn" onclick="showQuizSelector()" style="margin-top:8px">Choose a different quiz</button>
    </div>
  `;
}

// ── Theme toggle ───────────────────────────────────────────
const themeSwitch = document.querySelector('input[name=mode]');

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeSwitch.checked = dark;
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}

themeSwitch.addEventListener('change', function () {
  document.documentElement.classList.add('transition');
  setTimeout(() => document.documentElement.classList.remove('transition'), 1000);
  applyTheme(this.checked);
});

// Restore saved preference on load
const savedTheme = localStorage.getItem('theme');
applyTheme(savedTheme === null ? true : savedTheme === 'dark');

// ── Boot ──────────────────────────────────────────────────────────────────────
showQuizSelector();
