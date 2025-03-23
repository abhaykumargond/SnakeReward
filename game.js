// Game Constants
const GRID_SIZE = 20;
const BASE_GAME_SPEED = 100;
const MIN_GAME_SPEED = 50;  // Maximum speed (minimum delay)
const SPEED_INCREASE_FACTOR = 2;  // How much to reduce speed per food eaten
const CANVAS_SIZE = 400;
const INITIAL_SNAKE_LENGTH = 3;
const INITIAL_SNAKE_SIZE = 18;  // Initial size of snake segments
const SIZE_INCREASE = 1;  // How much the snake grows in size per food
const MAX_SNAKE_SIZE = GRID_SIZE - 2;  // Maximum size of snake segments
const SNAKE_COLORS = [
    '#1B5E20', // Dark green
    '#2E7D32', // Forest green
    '#388E3C', // Deep green
    '#43A047'  // Rich green
];
const FOOD_COLORS = ['#FF4081', '#EC407A', '#E91E63', '#D81B60'];  // Colors for regular food
const SPECIAL_FOOD_COLORS = ['#FFD700', '#FFC107', '#FFB300', '#FFA000'];  // Colors for special food
const PARTICLE_COUNT = 10;  // Number of particles for effects

// Game Variables
let canvas, ctx;
let snake = [];
let direction = 'right';
let food = { x: 0, y: 0 };
let specialFood = { x: -1, y: -1 };
let score = 0;
let gameLoop;
let isMuted = false;
let gameStarted = false;
let currentGameSpeed = BASE_GAME_SPEED;
let foodColor = FOOD_COLORS[0];
let specialFoodColor = SPECIAL_FOOD_COLORS[0];
let foodPulseTime = 0;
let particles = [];
let snakeSize = INITIAL_SNAKE_SIZE;  // Current size of snake segments
let touchStartX = null;
let touchStartY = null;
const SWIPE_THRESHOLD = 30;

// Sound Effects
const eatSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
const gameOverSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3');
const celebrationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');

// Initialize the game
function init() {
    canvas = document.getElementById('gameCanvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    ctx = canvas.getContext('2d');

    // Initialize snake
    snake = [];
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
        snake.push({ x: Math.floor(CANVAS_SIZE / (2 * GRID_SIZE)) - i, y: Math.floor(CANVAS_SIZE / (2 * GRID_SIZE)) });
    }

    // Set up event listeners
    document.addEventListener('keydown', handleKeyPress);
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('muteBtn').addEventListener('click', toggleMute);
    document.getElementById('score').addEventListener('click', showRedeemSection);
    document.getElementById('closeRedeemBtn').addEventListener('click', hideRedeemSection);
    document.getElementById('closeModalBtn').addEventListener('click', hideRedemptionModal);

    // Set up mobile controls
    setupMobileControls();

    // Set up touch controls
    setupTouchControls();

    // Set up redeem buttons
    setupRedeemButtons();

    // Load high score
    updateHighScore();
    generateFood();
    updateRedemptionHistory();

    // Prevent scrolling on touch devices when touching game area
    canvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, { passive: false });
}

// Setup redeem buttons
function setupRedeemButtons() {
    const redeemButtons = document.querySelectorAll('.redeem-btn');
    redeemButtons.forEach(button => {
        button.addEventListener('click', () => {
            const requiredCoins = parseInt(button.getAttribute('data-coins'));
            const giftCardValue = parseInt(button.getAttribute('data-value'));
            tryRedeemGiftCard(requiredCoins, giftCardValue);
        });
    });
}

// Show redeem section
function showRedeemSection() {
    const redeemSection = document.getElementById('redeemSection');
    redeemSection.classList.remove('hidden');
    document.getElementById('availableCoins').textContent = score;
    updateRedeemButtonsState();
}

// Hide redeem section
function hideRedeemSection() {
    document.getElementById('redeemSection').classList.add('hidden');
}

// Update redeem buttons state
function updateRedeemButtonsState() {
    const redeemButtons = document.querySelectorAll('.redeem-btn');
    redeemButtons.forEach(button => {
        const requiredCoins = parseInt(button.getAttribute('data-coins'));
        button.disabled = score < requiredCoins;
    });
}

// Try to redeem gift card
function tryRedeemGiftCard(requiredCoins, giftCardValue) {
    if (score >= requiredCoins) {
        // Deduct coins
        score -= requiredCoins;
        updateScore();
        
        // Use specific gift card codes based on value
        let giftCardCode;
        if (giftCardValue === 10) {
            giftCardCode = 'ABHA67AYUI78HYU7';
        } else if (giftCardValue === 20) {
            giftCardCode = 'ADRT67YTAGTY6KJIU';
        }
        
        // Show redemption modal with the specific code
        showRedemptionModal(giftCardValue, giftCardCode);
        
        // Add to history
        addToRedemptionHistory(giftCardCode, requiredCoins, giftCardValue);
        
        // Hide redeem section
        hideRedeemSection();
    }
}

// Show redemption modal
function showRedemptionModal(value, code) {
    const modal = document.getElementById('redemptionModal');
    document.getElementById('modalGiftCardValue').textContent = `₹${value} Gift Card`;
    document.getElementById('modalGiftCardCode').textContent = code;
    modal.classList.remove('hidden');
}

// Hide redemption modal
function hideRedemptionModal() {
    document.getElementById('redemptionModal').classList.add('hidden');
}

// Add to redemption history
function addToRedemptionHistory(code, coinsSpent, value) {
    const history = JSON.parse(localStorage.getItem('redemptionHistory') || '[]');
    const redemption = {
        code,
        coinsSpent,
        value,
        date: new Date().toLocaleDateString()
    };
    history.push(redemption);
    localStorage.setItem('redemptionHistory', JSON.stringify(history));
    updateRedemptionHistory();
}

// Update redemption history display
function updateRedemptionHistory() {
    const history = JSON.parse(localStorage.getItem('redemptionHistory') || '[]');
    const historyContainer = document.getElementById('redemptionHistory');
    historyContainer.innerHTML = '';
    
    history.reverse().forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <span>₹${item.value} Gift Card</span>
            <span>Code: ${item.code}</span>
            <span>Coins Spent: ${item.coinsSpent}</span>
            <span>Date: ${item.date}</span>
        `;
        historyContainer.appendChild(historyItem);
    });
}

// Update score display
function updateScore() {
    const scoreElement = document.getElementById('score');
    scoreElement.textContent = score;
    document.getElementById('availableCoins').textContent = score;
    updateRedeemButtonsState();
    updateHighScore();
    
    // Add flash effect
    scoreElement.classList.remove('score-flash');
    void scoreElement.offsetWidth; // Trigger reflow
    scoreElement.classList.add('score-flash');
}

// Start the game
function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    currentGameSpeed = BASE_GAME_SPEED;
    document.getElementById('startBtn').textContent = 'Restart Game';
    
    // Use requestAnimationFrame for smoother animation
    function gameLoop() {
        if (!gameStarted) return;
        gameStep();
        setTimeout(() => requestAnimationFrame(gameLoop), currentGameSpeed);
    }
    requestAnimationFrame(gameLoop);
}

// Game loop step
function gameStep() {
    // Request next frame immediately for smoother animation
    if (gameStarted) {
        requestAnimationFrame(() => {
            moveSnake();
            if (checkCollision()) {
                gameOver();
                return;
            }
            checkFood();
            draw();
        });
    }
}

// Move the snake
function moveSnake() {
    const head = { x: snake[0].x, y: snake[0].y };
    switch (direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
    }
    snake.unshift(head);
    if (!checkFood()) {
        snake.pop();
    }
}

// Check for collisions
function checkCollision() {
    const head = snake[0];
    
    // Instead of collision with walls, wrap around
    if (head.x < 0) head.x = (CANVAS_SIZE / GRID_SIZE) - 1;
    if (head.x >= CANVAS_SIZE / GRID_SIZE) head.x = 0;
    if (head.y < 0) head.y = (CANVAS_SIZE / GRID_SIZE) - 1;
    if (head.y >= CANVAS_SIZE / GRID_SIZE) head.y = 0;
    
    // Check for collision with any part of the snake
    for (let i = 0; i < snake.length; i++) {
        for (let j = i + 1; j < snake.length; j++) {
            // Get the current pair of segments to check
            const segment1 = snake[i];
            const segment2 = snake[j];
            
            // Calculate the bounds of both segments
            const bounds1 = {
                left: segment1.x * GRID_SIZE + (GRID_SIZE - snakeSize) / 2,
                right: segment1.x * GRID_SIZE + (GRID_SIZE - snakeSize) / 2 + snakeSize,
                top: segment1.y * GRID_SIZE + (GRID_SIZE - snakeSize) / 2,
                bottom: segment1.y * GRID_SIZE + (GRID_SIZE - snakeSize) / 2 + snakeSize
            };
            
            const bounds2 = {
                left: segment2.x * GRID_SIZE + (GRID_SIZE - snakeSize) / 2,
                right: segment2.x * GRID_SIZE + (GRID_SIZE - snakeSize) / 2 + snakeSize,
                top: segment2.y * GRID_SIZE + (GRID_SIZE - snakeSize) / 2,
                bottom: segment2.y * GRID_SIZE + (GRID_SIZE - snakeSize) / 2 + snakeSize
            };
            
            // Check for overlap between the segments
            if (!(bounds1.right < bounds2.left || 
                  bounds1.left > bounds2.right || 
                  bounds1.bottom < bounds2.top || 
                  bounds1.top > bounds2.bottom)) {
                return true; // Collision detected
            }
        }
    }
    return false;
}

// Check if snake ate food
function checkFood() {
    const head = snake[0];
    if (head.x === food.x && head.y === food.y) {
        if (!isMuted) eatSound.play();
        createEatEffect(food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2, FOOD_COLORS);
        score += 10;
        updateScore();
        updateGameSpeed();
        increaseSnakeSize();
        generateFood();
        if (Math.random() < 0.2) generateSpecialFood();
        return true;
    }
    if (head.x === specialFood.x && head.y === specialFood.y) {
        if (!isMuted) eatSound.play();
        createEatEffect(specialFood.x * GRID_SIZE + GRID_SIZE / 2, specialFood.y * GRID_SIZE + GRID_SIZE / 2, SPECIAL_FOOD_COLORS);
        score += 20;
        updateScore();
        updateGameSpeed();
        increaseSnakeSize();
        increaseSnakeSize();  // Increase size twice for special food
        specialFood = { x: -1, y: -1 };
        return true;
    }
    return false;
}

// Generate new food
function generateFood() {
    food = {
        x: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE)),
        y: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE))
    };
    foodColor = FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)];
    while (snake.some(segment => segment.x === food.x && segment.y === food.y)) {
        food = {
            x: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE)),
            y: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE))
        };
    }
}

// Generate special food
function generateSpecialFood() {
    specialFood = {
        x: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE)),
        y: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE))
    };
    specialFoodColor = SPECIAL_FOOD_COLORS[Math.floor(Math.random() * SPECIAL_FOOD_COLORS.length)];
}

// Draw the game
function draw() {
    // Clear canvas with a gradient background
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= CANVAS_SIZE; i += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(CANVAS_SIZE, i);
        ctx.stroke();
    }

    // Draw snake with enhanced visibility
    snake.forEach((segment, index) => {
        const colorIndex = index % SNAKE_COLORS.length;
        const nextColorIndex = (index + 1) % SNAKE_COLORS.length;
        
        // Create gradient for snake segment
        const gradient = ctx.createLinearGradient(
            segment.x * GRID_SIZE,
            segment.y * GRID_SIZE,
            (segment.x + 1) * GRID_SIZE,
            (segment.y + 1) * GRID_SIZE
        );
        gradient.addColorStop(0, SNAKE_COLORS[colorIndex]);
        gradient.addColorStop(1, SNAKE_COLORS[nextColorIndex]);
        
        // Enhanced glow effect
        ctx.shadowColor = SNAKE_COLORS[colorIndex];
        ctx.shadowBlur = index === 0 ? 20 : 10; // Increased glow
        
        // Draw segment with border
        const offset = (GRID_SIZE - snakeSize) / 2;
        ctx.beginPath();
        ctx.roundRect(
            segment.x * GRID_SIZE + offset,
            segment.y * GRID_SIZE + offset,
            snakeSize,
            snakeSize,
            index === 0 ? snakeSize / 2 : snakeSize / 4
        );
        
        // Fill with gradient
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add border for better visibility
        ctx.strokeStyle = '#0A3D0A'; // Dark green border
        ctx.lineWidth = 1;
        ctx.stroke();
    });
    ctx.shadowBlur = 0;

    // Draw regular food with pulse effect
    foodPulseTime += 0.1;
    const foodPulse = Math.sin(foodPulseTime) * 0.2 + 0.8;
    const foodSize = GRID_SIZE * foodPulse;
    const foodOffset = (GRID_SIZE - foodSize) / 2;

    ctx.fillStyle = foodColor;
    ctx.shadowColor = foodColor;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(
        food.x * GRID_SIZE + GRID_SIZE / 2,
        food.y * GRID_SIZE + GRID_SIZE / 2,
        foodSize / 2 - 1,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Draw special food with rotating effect
    if (specialFood.x !== -1) {
        ctx.save();
        ctx.translate(
            specialFood.x * GRID_SIZE + GRID_SIZE / 2,
            specialFood.y * GRID_SIZE + GRID_SIZE / 2
        );
        ctx.rotate(foodPulseTime);
        
        ctx.fillStyle = specialFoodColor;
        ctx.shadowColor = specialFoodColor;
        ctx.shadowBlur = 20;
        
        // Draw star shape
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5;
            const radius = foodSize / 2 - 1;
            if (i === 0) {
                ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            } else {
                ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // Draw particles
    particles = particles.filter(particle => {
        particle.life -= 0.05;
        if (particle.life <= 0) return false;

        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.size *= 0.95;

        ctx.fillStyle = `rgba(${particle.color}, ${particle.life})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        return true;
    });
}

// Handle keyboard input
function handleKeyPress(event) {
    const key = event.key.toLowerCase();
    if (!gameStarted && (key === ' ' || key === 'enter')) {
        startGame();
        return;
    }

    const newDirection = {
        'arrowup': 'up', 'w': 'up',
        'arrowdown': 'down', 's': 'down',
        'arrowleft': 'left', 'a': 'left',
        'arrowright': 'right', 'd': 'right'
    }[key];

    if (newDirection && isValidDirection(newDirection)) {
        direction = newDirection;
    }
}

// Check if the new direction is valid
function isValidDirection(newDir) {
    if (direction === 'up' && newDir === 'down') return false;
    if (direction === 'down' && newDir === 'up') return false;
    if (direction === 'left' && newDir === 'right') return false;
    if (direction === 'right' && newDir === 'left') return false;
    return true;
}

// Update high score
function updateHighScore() {
    const highScore = localStorage.getItem('snakeHighScore') || 0;
    if (score > highScore) {
        localStorage.setItem('snakeHighScore', score);
    }
    document.getElementById('highScore').textContent = Math.max(score, highScore);
}

// Toggle sound
function toggleMute() {
    isMuted = !isMuted;
    const muteBtn = document.getElementById('muteBtn');
    muteBtn.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
}

// Show celebration and gift card
function showCelebration() {
    clearInterval(gameLoop);
    gameStarted = false;
    if (!isMuted) celebrationSound.play();
    
    const celebration = document.getElementById('celebration');
    celebration.classList.remove('hidden');
    
    const giftCardCode = generateGiftCardCode();
    document.getElementById('giftCardCode').textContent = giftCardCode;
}

// Game over
function gameOver() {
    clearInterval(gameLoop);
    gameStarted = false;
    if (!isMuted) gameOverSound.play();
    document.getElementById('startBtn').textContent = 'Start Game';
}

// Reset game
function resetGame() {
    score = 0;
    direction = 'right';
    currentGameSpeed = BASE_GAME_SPEED;
    snakeSize = INITIAL_SNAKE_SIZE;  // Reset snake size
    updateScore();
    snake = [];
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
        snake.push({ x: Math.floor(CANVAS_SIZE / (2 * GRID_SIZE)) - i, y: Math.floor(CANVAS_SIZE / (2 * GRID_SIZE)) });
    }
    generateFood();
    specialFood = { x: -1, y: -1 };
}

// Update game speed based on score
function updateGameSpeed() {
    // Calculate new speed: reduce delay as score increases
    currentGameSpeed = Math.max(
        MIN_GAME_SPEED,
        BASE_GAME_SPEED - (Math.floor(score / 50) * SPEED_INCREASE_FACTOR)
    );
    
    // Restart the game loop with new speed
    if (gameStarted) {
        clearInterval(gameLoop);
        gameLoop = setInterval(gameStep, currentGameSpeed);
    }
}

// Add particle effect function
function createEatEffect(x, y, colors) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        const speed = 2 + Math.random() * 2;
        particles.push({
            x: x,
            y: y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 3,
            color: colors[Math.floor(Math.random() * colors.length)].replace('#', ''),
            life: 1
        });
    }
}

// Increase snake size
function increaseSnakeSize() {
    snakeSize = Math.min(snakeSize + SIZE_INCREASE, MAX_SNAKE_SIZE);
}

// Setup mobile control buttons
function setupMobileControls() {
    const controls = {
        'up-btn': 'up',
        'down-btn': 'down',
        'left-btn': 'left',
        'right-btn': 'right'
    };

    Object.entries(controls).forEach(([className, dir]) => {
        const btn = document.querySelector(`.${className}`);
        if (btn) {
            // Handle touch events for mobile buttons
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (isValidDirection(dir)) {
                    direction = dir;
                }
            });

            // Handle mouse events for mobile buttons (for tablets)
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (isValidDirection(dir)) {
                    direction = dir;
                }
            });
        }
    });
}

// Setup touch controls
function setupTouchControls() {
    canvas.addEventListener('touchstart', handleTouchStart, false);
    canvas.addEventListener('touchmove', handleTouchMove, false);
    canvas.addEventListener('touchend', handleTouchEnd, false);
}

// Handle touch start
function handleTouchStart(e) {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}

// Handle touch move
function handleTouchMove(e) {
    if (!touchStartX || !touchStartY) return;

    const touch = e.touches[0];
    const diffX = touchStartX - touch.clientX;
    const diffY = touchStartY - touch.clientY;

    // Only handle the swipe if it's significant enough
    if (Math.abs(diffX) > SWIPE_THRESHOLD || Math.abs(diffY) > SWIPE_THRESHOLD) {
        // Determine if the swipe is more horizontal or vertical
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Horizontal swipe
            const newDir = diffX > 0 ? 'left' : 'right';
            if (isValidDirection(newDir)) direction = newDir;
        } else {
            // Vertical swipe
            const newDir = diffY > 0 ? 'up' : 'down';
            if (isValidDirection(newDir)) direction = newDir;
        }
        
        // Reset touch start coordinates after handling the swipe
        touchStartX = null;
        touchStartY = null;
    }
}

// Handle touch end
function handleTouchEnd() {
    touchStartX = null;
    touchStartY = null;
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    init();
    updateRedemptionHistory();
}); 
