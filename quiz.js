// ── State ─────────────────────────────────────────────────────────────────────
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

function prepareQuestions() {
  quiz = QUESTIONS.map(q => {
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
      correct: shuffled.indexOf(correctAnswer)
    };
  });
  shuffle(quiz);
}

// ── Start screen ──────────────────────────────────────────────────────────────
function showStartScreen() {
  document.getElementById("progressSection").style.display = "none";

  const card = document.getElementById("quizCard");
  card.classList.remove("fade-in");
  void card.offsetWidth;
  card.classList.add("fade-in");

  card.innerHTML = `
    <div class="start-screen">
      <h2 class="start-title">Choose your mode</h2>
      <p class="start-desc">Practice shows correct answers as you go.<br>Test mode hides them until the end.</p>
      <div class="mode-btns">
        <button class="mode-btn mode-practice" onclick="startQuiz(false)">
          <span class="mode-icon">💡</span>
          <span class="mode-label">Practice</span>
          <span class="mode-hint">Answers revealed each question</span>
        </button>
        <button class="mode-btn mode-test" onclick="startQuiz(true)">
          <span class="mode-icon">📝</span>
          <span class="mode-label">Test</span>
          <span class="mode-hint">Results at the end only</span>
        </button>
      </div>
    </div>
  `;
}

function startQuiz(isTestMode) {
  testMode = isTestMode;
  current = 0;
  score = 0;
  answered = false;
  wrongAnswers = [];
  selectedAnswers = [];

  prepareQuestions();
  quiz = quiz.slice(0, testMode ? 60 : 20);

  document.getElementById("progressSection").style.display = "block";
  // Show mode badge in progress bar area
  document.getElementById("modeBadge").textContent = testMode ? "Test mode" : "Practice mode";
  document.getElementById("modeBadge").className = "mode-badge " + (testMode ? "badge-test" : "badge-practice");

  const card = document.getElementById("quizCard");
  card.innerHTML = `
    <p id="questionText" class="question-text"></p>
    <div id="answers" class="answers"></div>
    <p id="feedback" class="feedback" style="display:none" aria-live="assertive"></p>
    <button id="nextBtn" class="next-btn" onclick="nextQuestion()" style="display:none">
      Continue <span aria-hidden="true">→</span>
    </button>
  `;

  loadQuestion();
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function updateProgress() {
  const percent = (current / quiz.length) * 100;
  document.getElementById("progressFill").style.width = percent + "%";
  document.getElementById("progressText").textContent =
    `Question ${current + 1} of ${quiz.length}`;
}

function loadQuestion() {
  answered = false;

  const container = document.getElementById("quizCard");
  container.classList.remove("fade-in");
  void container.offsetWidth;
  container.classList.add("fade-in");

  const q = quiz[current];
  document.getElementById("questionText").textContent = q.question;

  const answersDiv = document.getElementById("answers");
  answersDiv.innerHTML = "";

  q.answers.forEach((answer, i) => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";

    const letter = document.createElement("span");
    letter.className = "answer-letter";
    letter.textContent = String.fromCharCode(65 + i);

    const text = document.createElement("span");
    text.className = "answer-text";
    text.textContent = answer;

    btn.appendChild(letter);
    btn.appendChild(text);
    btn.addEventListener("click", () => selectAnswer(btn, i));
    answersDiv.appendChild(btn);
  });

  document.getElementById("nextBtn").style.display = "none";
  updateProgress();
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
    loadQuestion();
    document.getElementById("feedback").style.display = "none";
  } else {
    showResults();
  }
}

// ── Results ───────────────────────────────────────────────────────────────────
function showResults() {
  const percent = Math.round((score / quiz.length) * 100);
  const pass = percent >= PASS_THRESHOLD;

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
      <p class="result-threshold">Pass mark: ${PASS_THRESHOLD}%</p>

      ${wrongAnswers.length > 0 ? `
        <div class="review-section">
          <h3 class="review-heading">Review (${wrongAnswers.length} wrong)</h3>
          ${wrongHTML}
        </div>
      ` : '<p class="perfect">Perfect score! Well done. 🎉</p>'}

      <button class="restart-btn" onclick="showStartScreen()">Choose mode &amp; restart</button>
    </div>
  `;
}

// ── Boot ──────────────────────────────────────────────────────────────────────
showStartScreen();
