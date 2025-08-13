/**
 * 网页版俄罗斯方块游戏 - Game Boy风格
 * 使用ES6模块化和现代Web API实现
 */

// 游戏状态枚举
const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over'
};

// 游戏配置
const GameConfig = {
  BOARD_WIDTH: 10,
  BOARD_HEIGHT: 20,
  CELL_SIZE: 24,
  INITIAL_SPEED: 1000,
  SPEED_INCREASE: 0.9,
  LINES_PER_LEVEL: 10
};

// 方块类型定义
const TetrominoTypes = {
  I: {
    shape: [[1,1,1,1]],
    color: '#9bbc0f'
  },
  O: {
    shape: [[1,1],[1,1]],
    color: '#9bbc0f'
  },
  T: {
    shape: [[0,1,0],[1,1,1]],
    color: '#9bbc0f'
  },
  S: {
    shape: [[0,1,1],[1,1,0]],
    color: '#9bbc0f'
  },
  Z: {
    shape: [[1,1,0],[0,1,1]],
    color: '#9bbc0f'
  },
  J: {
    shape: [[1,0,0],[1,1,1]],
    color: '#9bbc0f'
  },
  L: {
    shape: [[0,0,1],[1,1,1]],
    color: '#9bbc0f'
  }
};

// 方块类
class Tetromino {
  constructor(type, x = 3, y = 0) {
    this.type = type;
    this.shape = TetrominoTypes[type].shape;
    this.color = TetrominoTypes[type].color;
    this.x = x;
    this.y = y;
    this.rotation = 0;
  }

  // 旋转方块
  rotate() {
    const rotated = [];
    const rows = this.shape.length;
    const cols = this.shape[0].length;
    
    for (let i = 0; i < cols; i++) {
      rotated[i] = [];
      for (let j = 0; j < rows; j++) {
        rotated[i][j] = this.shape[rows - 1 - j][i];
      }
    }
    
    return rotated;
  }

  // 获取旋转后的形状
  getRotatedShape() {
    return this.rotate();
  }

  // 移动方块
  move(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  // 获取方块的所有占用位置
  getPositions() {
    const positions = [];
    for (let row = 0; row < this.shape.length; row++) {
      for (let col = 0; col < this.shape[row].length; col++) {
        if (this.shape[row][col]) {
          positions.push({
            x: this.x + col,
            y: this.y + row
          });
        }
      }
    }
    return positions;
  }
}

// 音效管理器
class AudioManager {
  constructor() {
    this.context = null;
    this.enabled = true;
    this.sounds = {};
    this.initAudio();
  }

  async initAudio() {
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.loadSounds();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  loadSounds() {
    // 8-bit风格音效配置
    this.sounds = {
      move: { frequency: 220, duration: 0.1 },
      rotate: { frequency: 330, duration: 0.1 },
      drop: { frequency: 110, duration: 0.2 },
      clear: { frequency: 440, duration: 0.3 },
      gameOver: { frequency: 165, duration: 0.5 }
    };
  }

  playSound(name) {
    if (!this.enabled || !this.context || !this.sounds[name]) return;
    
    try {
      const { frequency, duration } = this.sounds[name];
      const oscillator = this.context.createOscillator();
      const gainNode = this.context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.context.destination);
      
      oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
      oscillator.type = 'square'; // 8-bit方波音效
      
      gainNode.gain.setValueAtTime(0.1, this.context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
      
      oscillator.start(this.context.currentTime);
      oscillator.stop(this.context.currentTime + duration);
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  }

  toggleMute() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

// 存储管理器
class StorageManager {
  static saveHighScore(score) {
    localStorage.setItem('tetris_high_score', score.toString());
  }

  static getHighScore() {
    return parseInt(localStorage.getItem('tetris_high_score')) || 0;
  }

  static saveSettings(settings) {
    localStorage.setItem('tetris_settings', JSON.stringify(settings));
  }

  static getSettings() {
    const settings = localStorage.getItem('tetris_settings');
    return settings ? JSON.parse(settings) : { soundEnabled: true };
  }
}

// 输入控制管理器
class InputManager {
  constructor(game) {
    this.game = game;
    this.keys = {};
    this.touchStartPos = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // 键盘事件
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    // 按钮点击事件
    this.setupButtonEvents();
    
    // 触屏事件
    this.setupTouchEvents();
  }

  handleKeyDown(e) {
    if (this.keys[e.code]) return; // 防止重复触发
    this.keys[e.code] = true;
    
    switch (e.code) {
      case 'ArrowLeft':
        this.game.movePiece(-1, 0);
        e.preventDefault();
        break;
      case 'ArrowRight':
        this.game.movePiece(1, 0);
        e.preventDefault();
        break;
      case 'ArrowDown':
        this.game.movePiece(0, 1);
        e.preventDefault();
        break;
      case 'ArrowUp':
        this.game.rotatePiece();
        e.preventDefault();
        break;
      case 'Space':
        this.game.dropPiece();
        e.preventDefault();
        break;
      case 'Escape':
        this.game.togglePause();
        e.preventDefault();
        break;
      case 'Enter':
        if (this.game.state === GameState.MENU || this.game.state === GameState.GAME_OVER) {
          this.game.start();
        }
        e.preventDefault();
        break;
    }
  }

  handleKeyUp(e) {
    this.keys[e.code] = false;
  }

  setupButtonEvents() {
    // D-Pad按钮
    document.getElementById('btnLeft').addEventListener('click', () => this.game.movePiece(-1, 0));
    document.getElementById('btnRight').addEventListener('click', () => this.game.movePiece(1, 0));
    document.getElementById('btnUp').addEventListener('click', () => this.game.rotatePiece());
    document.getElementById('btnDown').addEventListener('click', () => this.game.movePiece(0, 1));
    
    // 功能按钮
    document.getElementById('btnA').addEventListener('click', () => this.game.dropPiece());
    document.getElementById('btnB').addEventListener('click', () => this.game.togglePause());
    
    // 控制按钮
    document.getElementById('startBtn').addEventListener('click', () => {
      if (this.game.state === GameState.MENU || this.game.state === GameState.GAME_OVER) {
        this.game.start();
      } else {
        this.game.togglePause();
      }
    });
    
    document.getElementById('soundBtn').addEventListener('click', () => {
      const enabled = this.game.audioManager.toggleMute();
      document.body.classList.toggle('sound-disabled', !enabled);
    });
  }

  setupTouchEvents() {
    const touchOverlay = document.getElementById('touchOverlay');
    
    touchOverlay.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.touchStartPos = { x: touch.clientX, y: touch.clientY };
    });
    
    touchOverlay.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (!this.touchStartPos) return;
      
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - this.touchStartPos.x;
      const deltaY = touch.clientY - this.touchStartPos.y;
      const threshold = 30;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 水平滑动
        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0) {
            this.game.movePiece(1, 0); // 右滑
          } else {
            this.game.movePiece(-1, 0); // 左滑
          }
        }
      } else {
        // 垂直滑动
        if (Math.abs(deltaY) > threshold) {
          if (deltaY > 0) {
            this.game.movePiece(0, 1); // 下滑
          } else {
            this.game.rotatePiece(); // 上滑
          }
        }
      }
      
      this.touchStartPos = null;
    });
  }
}

// 主游戏类
class TetrisGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.nextCanvas = document.getElementById('nextCanvas');
    this.nextCtx = this.nextCanvas.getContext('2d');
    
    this.state = GameState.MENU;
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.board = this.createBoard();
    this.currentPiece = null;
    this.nextPiece = null;
    this.dropTime = 0;
    this.lastTime = 0;
    
    this.audioManager = new AudioManager();
    this.inputManager = new InputManager(this);
    
    this.init();
  }

  init() {
    // 设置画布像素化渲染
    this.ctx.imageSmoothingEnabled = false;
    this.nextCtx.imageSmoothingEnabled = false;
    
    // 加载设置
    const settings = StorageManager.getSettings();
    this.audioManager.enabled = settings.soundEnabled;
    
    // 更新UI
    this.updateUI();
    this.render();
    
    // 开始游戏循环
    this.gameLoop();
  }

  createBoard() {
    return Array(GameConfig.BOARD_HEIGHT).fill().map(() => 
      Array(GameConfig.BOARD_WIDTH).fill(0)
    );
  }

  generateRandomPiece() {
    const types = Object.keys(TetrominoTypes);
    const randomType = types[Math.floor(Math.random() * types.length)];
    return new Tetromino(randomType);
  }

  start() {
    this.state = GameState.PLAYING;
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.board = this.createBoard();
    this.currentPiece = this.generateRandomPiece();
    this.nextPiece = this.generateRandomPiece();
    this.dropTime = 0;
    
    document.getElementById('gameOverlay').style.display = 'none';
    document.body.classList.add('game-playing');
    
    this.updateUI();
  }

  pause() {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.PAUSED;
      document.getElementById('gameOverlay').style.display = 'flex';
      document.getElementById('startMessage').textContent = 'PAUSED';
      document.body.classList.remove('game-playing');
      document.body.classList.add('game-paused');
    }
  }

  resume() {
    if (this.state === GameState.PAUSED) {
      this.state = GameState.PLAYING;
      document.getElementById('gameOverlay').style.display = 'none';
      document.body.classList.remove('game-paused');
      document.body.classList.add('game-playing');
    }
  }

  togglePause() {
    if (this.state === GameState.PLAYING) {
      this.pause();
    } else if (this.state === GameState.PAUSED) {
      this.resume();
    }
  }

  gameOver() {
    this.state = GameState.GAME_OVER;
    this.audioManager.playSound('gameOver');
    
    // 保存最高分
    const highScore = StorageManager.getHighScore();
    if (this.score > highScore) {
      StorageManager.saveHighScore(this.score);
    }
    
    document.getElementById('gameOverlay').style.display = 'flex';
    document.getElementById('startMessage').textContent = 'GAME OVER\nPRESS START';
    document.body.classList.remove('game-playing');
    document.body.classList.add('game-over');
    
    this.updateUI();
  }

  isValidPosition(piece, dx = 0, dy = 0, shape = null) {
    const testShape = shape || piece.shape;
    const testX = piece.x + dx;
    const testY = piece.y + dy;
    
    for (let row = 0; row < testShape.length; row++) {
      for (let col = 0; col < testShape[row].length; col++) {
        if (testShape[row][col]) {
          const x = testX + col;
          const y = testY + row;
          
          // 检查边界
          if (x < 0 || x >= GameConfig.BOARD_WIDTH || y >= GameConfig.BOARD_HEIGHT) {
            return false;
          }
          
          // 检查是否与已有方块冲突
          if (y >= 0 && this.board[y][x]) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  movePiece(dx, dy) {
    if (this.state !== GameState.PLAYING || !this.currentPiece) return;
    
    if (this.isValidPosition(this.currentPiece, dx, dy)) {
      this.currentPiece.move(dx, dy);
      if (dx !== 0) {
        this.audioManager.playSound('move');
      }
      return true;
    }
    
    return false;
  }

  rotatePiece() {
    if (this.state !== GameState.PLAYING || !this.currentPiece) return;
    
    const rotatedShape = this.currentPiece.getRotatedShape();
    
    if (this.isValidPosition(this.currentPiece, 0, 0, rotatedShape)) {
      this.currentPiece.shape = rotatedShape;
      this.audioManager.playSound('rotate');
    }
  }

  dropPiece() {
    if (this.state !== GameState.PLAYING || !this.currentPiece) return;
    
    while (this.movePiece(0, 1)) {
      // 继续下落直到不能移动
    }
    
    this.audioManager.playSound('drop');
    this.lockPiece();
  }

  lockPiece() {
    if (!this.currentPiece) return;
    
    // 将当前方块固定到游戏板上
    const positions = this.currentPiece.getPositions();
    positions.forEach(pos => {
      if (pos.y >= 0) {
        this.board[pos.y][pos.x] = 1;
      }
    });
    
    // 检查游戏结束
    if (positions.some(pos => pos.y < 0)) {
      this.gameOver();
      return;
    }
    
    // 检查并清除满行
    this.clearLines();
    
    // 生成新方块
    this.currentPiece = this.nextPiece;
    this.nextPiece = this.generateRandomPiece();
    
    // 重置下落时间
    this.dropTime = 0;
  }

  clearLines() {
    let linesCleared = 0;
    
    for (let row = GameConfig.BOARD_HEIGHT - 1; row >= 0; row--) {
      if (this.board[row].every(cell => cell !== 0)) {
        // 移除满行
        this.board.splice(row, 1);
        // 在顶部添加新的空行
        this.board.unshift(Array(GameConfig.BOARD_WIDTH).fill(0));
        linesCleared++;
        row++; // 重新检查当前行
      }
    }
    
    if (linesCleared > 0) {
      this.audioManager.playSound('clear');
      
      // 更新分数和等级
      this.lines += linesCleared;
      this.score += linesCleared * 100 * this.level;
      
      // 每10行提升一个等级
      const newLevel = Math.floor(this.lines / GameConfig.LINES_PER_LEVEL) + 1;
      if (newLevel > this.level) {
        this.level = newLevel;
      }
      
      this.updateUI();
    }
  }

  getDropSpeed() {
    return GameConfig.INITIAL_SPEED * Math.pow(GameConfig.SPEED_INCREASE, this.level - 1);
  }

  update(deltaTime) {
    if (this.state !== GameState.PLAYING || !this.currentPiece) return;
    
    this.dropTime += deltaTime;
    
    if (this.dropTime >= this.getDropSpeed()) {
      if (!this.movePiece(0, 1)) {
        this.lockPiece();
      }
      this.dropTime = 0;
    }
  }

  render() {
    // 清空画布
    this.ctx.fillStyle = '#0f380f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制游戏板
    this.renderBoard();
    
    // 绘制当前方块
    if (this.currentPiece) {
      this.renderPiece(this.currentPiece);
    }
    
    // 绘制下一个方块
    this.renderNextPiece();
  }

  renderBoard() {
    for (let row = 0; row < GameConfig.BOARD_HEIGHT; row++) {
      for (let col = 0; col < GameConfig.BOARD_WIDTH; col++) {
        if (this.board[row][col]) {
          this.renderCell(col, row, '#9bbc0f');
        }
      }
    }
  }

  renderPiece(piece) {
    const positions = piece.getPositions();
    positions.forEach(pos => {
      if (pos.y >= 0) {
        this.renderCell(pos.x, pos.y, piece.color);
      }
    });
  }

  renderCell(x, y, color) {
    const cellSize = GameConfig.CELL_SIZE;
    const pixelX = x * cellSize;
    const pixelY = y * cellSize;
    
    // 填充方块
    this.ctx.fillStyle = color;
    this.ctx.fillRect(pixelX, pixelY, cellSize, cellSize);
    
    // 绘制边框
    this.ctx.strokeStyle = '#0f380f';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(pixelX, pixelY, cellSize, cellSize);
  }

  renderNextPiece() {
    // 清空下一个方块画布
    this.nextCtx.fillStyle = '#0f380f';
    this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
    
    if (!this.nextPiece) return;
    
    const shape = this.nextPiece.shape;
    const cellSize = 20;
    const offsetX = (this.nextCanvas.width - shape[0].length * cellSize) / 2;
    const offsetY = (this.nextCanvas.height - shape.length * cellSize) / 2;
    
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const x = offsetX + col * cellSize;
          const y = offsetY + row * cellSize;
          
          this.nextCtx.fillStyle = this.nextPiece.color;
          this.nextCtx.fillRect(x, y, cellSize, cellSize);
          
          this.nextCtx.strokeStyle = '#0f380f';
          this.nextCtx.lineWidth = 1;
          this.nextCtx.strokeRect(x, y, cellSize, cellSize);
        }
      }
    }
  }

  updateUI() {
    document.getElementById('score').textContent = this.score.toString().padStart(6, '0');
    document.getElementById('level').textContent = this.level.toString().padStart(2, '0');
    document.getElementById('lines').textContent = this.lines.toString().padStart(3, '0');
    document.getElementById('highScore').textContent = StorageManager.getHighScore().toString().padStart(6, '0');
  }

  gameLoop(currentTime = 0) {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    this.update(deltaTime);
    this.render();
    
    requestAnimationFrame((time) => this.gameLoop(time));
  }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
  const game = new TetrisGame();
  
  // 将游戏实例暴露到全局作用域以便调试
  window.tetrisGame = game;
});

// 导出模块（如果需要）
export { TetrisGame, GameState, GameConfig };