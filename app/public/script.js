// Asks a random question and sends that submission to the mssql server
// Array of questions
const questions = [
  "What is your favorite color?",
  "What is your favorite food?",
  "What is your favorite movie?",
  "How are you feeling today?",
  "What is your favorite sport?"
];

function getRandomQuestion() {
  const randomIndex = Math.floor(Math.random() * questions.length);
  return questions[randomIndex];
}

// Sets question @ page load
document.addEventListener('DOMContentLoaded', () => {
  const randomQuestion = getRandomQuestion();
  document.getElementById('question').textContent = randomQuestion;
});

document.getElementById('question-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const answer = document.getElementById('answer').value;
  const question = document.getElementById('question').textContent;

  // Store the question and answer
  const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer }),
  });

  const result = await response.json();
  alert(result.message);
});

document.getElementById('load-questions').addEventListener('click', async function () {
  const response = await fetch('/api/questions');
  const data = await response.json();
  const questionsList = document.getElementById('questions-list');
  questionsList.innerHTML = '';  // Clear previous results
  data.forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${item.question}: ${item.answer}`;
      questionsList.appendChild(li);
  });
});