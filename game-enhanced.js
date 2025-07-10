const gameArea = document.getElementById('gameArea');
const startBtn = document.getElementById('startBtn');
const endBtn = document.getElementById('endBtn');
const difficultySlider = document.getElementById('difficulty');
const scoreDisplay = document.getElementById('score');
const missedDisplay = document.getElementById('missed');
const highScoreDisplay = document.getElementById('highScore');
const gameOverMsg = document.getElementById('gameOverMsg');
const historyScoresList = document.getElementById('historyScores');
const hitSound = document.getElementById('hitSound');
const missSound = document.getElementById('missSound');
const endSound = document.getElementById('endSound');

let score = 0;
let missed = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameInterval = null;
let gameRunning = false;

highScoreDisplay.textContent = highScore;
loadHistory();

function getRandomColor() {
  const colors = ['#ff6b6b', '#feca57', '#1dd1a1', '#54a0ff', '#5f27cd', '#00d2d3'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomShape() {
  const shapes = ['circle', 'square', 'triangle'];
  return shapes[Math.floor(Math.random() * shapes.length)];
}

function createParticleExplosion(x, y, color) {
  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.backgroundColor = color;
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 60;
    particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
    gameArea.appendChild(particle);
    setTimeout(() => particle.remove(), 600);
  }
}

function createTrail(x, y, color, shape) {
  const trail = document.createElement('div');
  trail.className = `trail dot ${shape}`;
  trail.style.left = `${x}px`;
  trail.style.top = `${y}px`;
  trail.style.backgroundColor = color;
  gameArea.appendChild(trail);
  setTimeout(() => trail.remove(), 300);
}

function createDot() {
  const dot = document.createElement('div');
  const size = 40;
  const shape = getRandomShape();
  const color = getRandomColor();
  dot.className = `dot ${shape}`;
  dot.style.backgroundColor = color;

  const areaW = gameArea.clientWidth;
  const areaH = gameArea.clientHeight;

  const side = ['top', 'bottom', 'left', 'right'][Math.floor(Math.random() * 4)];
  let x, y, dx, dy;

  switch (side) {
    case 'top': x = Math.random() * areaW; y = -size; break;
    case 'bottom': x = Math.random() * areaW; y = areaH + size; break;
    case 'left': x = -size; y = Math.random() * areaH; break;
    case 'right': x = areaW + size; y = Math.random() * areaH; break;
  }

  const targetX = Math.random() * areaW;
  const targetY = Math.random() * areaH;
  const angle = Math.atan2(targetY - y, targetX - x);
  dx = Math.cos(angle);
  dy = Math.sin(angle);

  let t = 0;
  const curveStrength = parseInt(difficultySlider.value) * 0.3;

  dot.style.left = `${x}px`;
  dot.style.top = `${y}px`;

  function handleClick(event) {
    const rect = dot.getBoundingClientRect();
    const dotCenterX = rect.left + rect.width / 2;
    const dotCenterY = rect.top + rect.height / 2;
    const dist = Math.hypot((event.clientX || event.touches?.[0]?.clientX) - dotCenterX,
                            (event.clientY || event.touches?.[0]?.clientY) - dotCenterY);

    if (dist <= rect.width * 0.6) {
      score++;
      scoreDisplay.textContent = score;
      createParticleExplosion(x, y, color);
      hitSound.play();
      dot.remove();
    }
  }

  dot.addEventListener('click', handleClick);
  dot.addEventListener('touchstart', handleClick);

  gameArea.appendChild(dot);

  function move() {
    if (!gameArea.contains(dot)) return;
    t += 0.1;
    x += dx * 3 + Math.sin(t * curveStrength) * 2;
    y += dy * 3 + Math.cos(t * curveStrength) * 2;

    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;

    createTrail(x, y, color, shape);

    if (x < -50 || x > areaW + 50 || y < -50 || y > areaH + 50) {
      dot.remove();
      missed++;
      missedDisplay.textContent = missed;
      missSound.play();
      if (missed >= 60) endGame(true);
    } else {
      requestAnimationFrame(move);
    }
  }

  move();
}

function startGame() {
  if (gameRunning) return;
  score = 0;
  missed = 0;
  scoreDisplay.textContent = 0;
  missedDisplay.textContent = 0;
  gameOverMsg.textContent = '游戏进行中...';
  gameRunning = true;
  const interval = Math.max(200, 1000 - difficultySlider.value * 80);
  gameInterval = setInterval(createDot, interval);
}

function pauseGame() {
  if (gameRunning) {
    clearInterval(gameInterval);
    gameRunning = false;
    gameOverMsg.textContent = '游戏已暂停';
  } else {
    gameOverMsg.textContent = '游戏进行中...';
    const interval = Math.max(200, 1000 - difficultySlider.value * 80);
    gameInterval = setInterval(createDot, interval);
    gameRunning = true;
  }
}

function endGame(failed = false) {
  clearInterval(gameInterval);
  gameRunning = false;
  document.querySelectorAll('.dot, .trail').forEach(dot => dot.remove());
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore);
    highScoreDisplay.textContent = highScore;
  }
  saveHistory(score);
  gameOverMsg.textContent = failed ? '游戏失败：错过太多点点！' : '游戏结束，点击开始再来一次！';
  endSound.play();
}

startBtn.addEventListener('click', () => { endGame(); startGame(); });
endBtn.addEventListener('click', () => endGame());
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!gameRunning && score === 0) return;
    pauseGame();
  }
});
difficultySlider.addEventListener('input', () => {
  if (gameRunning) {
    clearInterval(gameInterval);
    const interval = Math.max(200, 1000 - difficultySlider.value * 80);
    gameInterval = setInterval(createDot, interval);
  }
});

function saveHistory(newScore) {
  let scores = JSON.parse(localStorage.getItem('historyScores') || '[]');
  scores.push(newScore);
  scores = scores.sort((a, b) => b - a).slice(0, 5);
  localStorage.setItem('historyScores', JSON.stringify(scores));
  loadHistory();
}

function loadHistory() {
  let scores = JSON.parse(localStorage.getItem('historyScores') || '[]');
  historyScoresList.innerHTML = scores.map(s => `<li>${s} 分</li>`).join('');
}
