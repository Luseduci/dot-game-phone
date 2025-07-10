你已经正确地集成了横屏提示和方向检测，但遇到问题时通常是 **orientationchange** 和 **resize** 事件的细节没有处理好。

为了确保在横竖屏切换时能正确响应，以下是我对你代码的一些改进：

### **修复建议：**

1. **优化方向检测**：确保 `resize` 和 `orientationchange` 能够根据屏幕的宽高自动触发。
2. **横屏提示**：将提示的显示与隐藏直接控制到 **`overlay`** 元素，避免在 CSS 中使用 `@media` 规则。
3. **屏幕旋转后的显示问题**：通过 JavaScript 动态判断屏幕方向，及时更新游戏区域的可见性。

### **完整改进后的代码**：

```javascript
// --- 游戏主脚本 ---

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
const overlay = document.getElementById('orientationOverlay');

let score = 0;
let missed = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameInterval = null;
let timerInterval = null;
let gameRunning = false;
let timeLeft = 60; // 倒计时秒数

highScoreDisplay.textContent = highScore;
loadHistory();

function checkOrientation() {
  const isPortrait = window.innerHeight > window.innerWidth;
  overlay.style.display = isPortrait ? 'flex' : 'none';
}

// 页面加载和方向变化时都检查
window.addEventListener('load', checkOrientation);
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);

// 倒计时显示
const timerDisplay = document.createElement('div');
timerDisplay.style.fontSize = '1rem';
timerDisplay.style.marginTop = '6px';
timerDisplay.style.color = '#333';
timerDisplay.textContent = '倒计时：60 秒';
document.getElementById('scoreBoard').appendChild(timerDisplay);

function updateTimer() {
  timeLeft--;
  timerDisplay.textContent = `倒计时：${timeLeft} 秒`;
  if (timeLeft <= 0) {
    endGame();
  }
}

function startGame() {
  if (gameRunning) return;
  score = 0;
  missed = 0;
  timeLeft = 60;
  scoreDisplay.textContent = 0;
  missedDisplay.textContent = 0;
  timerDisplay.textContent = '倒计时：60 秒';
  gameOverMsg.textContent = '游戏进行中...';
  gameRunning = true;
  const interval = Math.max(200, 1000 - difficultySlider.value * 80);
  gameInterval = setInterval(createDot, interval);
  timerInterval = setInterval(updateTimer, 1000);
}

function pauseGame() {
  if (gameRunning) {
    clearInterval(gameInterval);
    clearInterval(timerInterval);
    gameRunning = false;
    gameOverMsg.textContent = '游戏已暂停';
  } else {
    gameOverMsg.textContent = '游戏进行中...';
    const interval = Math.max(200, 1000 - difficultySlider.value * 80);
    gameInterval = setInterval(createDot, interval);
    timerInterval = setInterval(updateTimer, 1000);
    gameRunning = true;
  }
}

function endGame(failed = false) {
  clearInterval(gameInterval);
  clearInterval(timerInterval);
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

function createDot() {
  const dot = document.createElement('div');
  const size = 40;
  const shape = ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)];
  const color = ['#ff6b6b', '#feca57', '#1dd1a1', '#54a0ff', '#5f27cd', '#00d2d3'][Math.floor(Math.random() * 6)];
  dot.className = `dot ${shape}`;
  dot.style.backgroundColor = color;

  const areaW = gameArea.clientWidth;
  const areaH = gameArea.clientHeight;
  const side = ['top', 'bottom', 'left', 'right'][Math.floor(Math.random() * 4)];
  let x, y;
  switch (side) {
    case 'top': x = Math.random() * areaW; y = -size; break;
    case 'bottom': x = Math.random() * areaW; y = areaH + size; break;
    case 'left': x = -size; y = Math.random() * areaH; break;
    case 'right': x = areaW + size; y = Math.random() * areaH; break;
  }

  const centerX = areaW / 2;
  const centerY = areaH / 2;
  const angle = Math.atan2(centerY - y, centerX - x);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let t = 0;
  const curveStrength = parseInt(difficultySlider.value) * 0.5;

  dot.style.left = `${x}px`;
  dot.style.top = `${y}px`;

  const handleClick = (event) => {
    const rect = dot.getBoundingClientRect();
    const dotCenterX = rect.left + rect.width / 2;
    const dotCenterY = rect.top + rect.height / 2;
    const clientX = event.clientX || (event.touches && event.touches[0].clientX);
    const clientY = event.clientY || (event.touches && event.touches[0].clientY);
    const distance = Math.sqrt(Math.pow(clientX - dotCenterX, 2) + Math.pow(clientY - dotCenterY, 2));
    if (distance <= rect.width * 0.6) {
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

  const move = () => {
    if (!gameArea.contains(dot)) return;
    t += 0.1;
    x += dx * 3 + Math.sin(t * curveStrength) * 2;
    y += dy * 3 + Math.cos(t * curveStrength) * 2;
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;

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

startBtn.addEventListener('click', () => { endGame(); startGame(); });
endBtn.addEventListener('click', () => endGame());
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!gameRunning && score
```
