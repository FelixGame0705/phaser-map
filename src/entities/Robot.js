/**
 * Robot.js
 * 
 * Phaser robot sprite class with grid-based movement, battery tracking, and collision detection
 */

export class Robot extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, texture = 'robot_east') {
    super(scene, x, y, texture);
    
    this.scene = scene;
    this.gridSize = 32; // Grid cell size
    this.speed = 500; // Movement speed in ms
    this.batteryLevel = 100;
    this.maxBattery = 100;
    this.batteryDrainRate = 1; // Battery drained per move
    this.isMoving = false;
    this.direction = 'east'; // east, west, north, south
    this.startPosition = { x, y };
    this.startDirection = 'east';
    
    // Battery collection tracking
    this.collectedBatteries = {
      red: 0,
      yellow: 0,
      green: 0,
      total: 0
    };
    
    // Movement queue for smooth animations
    this.movementQueue = [];
    this.isProcessingQueue = false;
    
    // Collision detection
    this.collisionGroup = null;
    
    this.init();
  }

  init() {
    // Add to scene
    this.scene.add.existing(this);
    
    // Set up physics
    this.scene.physics.add.existing(this);
    this.body.setSize(this.gridSize, this.gridSize);
    this.body.setCollideWorldBounds(true);
    
    // Set up collision group
    this.collisionGroup = this.scene.physics.add.group();
    
    // Set initial position on grid
    this.setGridPosition(this.startPosition.x, this.startPosition.y);
    
    // Set up animations
    this.setupAnimations();
    
    console.log('🤖 Robot initialized at', this.getGridPosition());
  }

  /**
   * Setup robot animations
   */
  setupAnimations() {
    // Movement animations
    this.scene.anims.create({
      key: 'robot_move_east',
      frames: this.scene.anims.generateFrameNumbers('robot_east', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'robot_move_west',
      frames: this.scene.anims.generateFrameNumbers('robot_west', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'robot_move_north',
      frames: this.scene.anims.generateFrameNumbers('robot_north', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'robot_move_south',
      frames: this.scene.anims.generateFrameNumbers('robot_south', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

    // Idle animations
    this.scene.anims.create({
      key: 'robot_idle_east',
      frames: [{ key: 'robot_east', frame: 0 }]
    });

    this.scene.anims.create({
      key: 'robot_idle_west',
      frames: [{ key: 'robot_west', frame: 0 }]
    });

    this.scene.anims.create({
      key: 'robot_idle_north',
      frames: [{ key: 'robot_north', frame: 0 }]
    });

    this.scene.anims.create({
      key: 'robot_idle_south',
      frames: [{ key: 'robot_south', frame: 0 }]
    });
  }

  /**
   * Move robot forward by specified number of steps
   */
  async moveForward(steps = 1) {
    if (this.isMoving) {
      return { success: false, error: 'Robot is already moving', errorType: 'ALREADY_MOVING' };
    }

    this.isMoving = true;
    this.playMovementAnimation();

    try {
      for (let i = 0; i < steps; i++) {
        const newPosition = this.calculateNextPosition();
        
        // Check collision
        if (this.checkCollision(newPosition)) {
          this.stopMovement();
          return { 
            success: false, 
            error: 'Robot hit an obstacle', 
            errorType: 'COLLISION',
            position: this.getPosition()
          };
        }

        // Check if out of bounds
        if (this.checkOutOfBounds(newPosition)) {
          this.stopMovement();
          return { 
            success: false, 
            error: 'Robot went out of bounds', 
            errorType: 'OUT_OF_BOUNDS',
            position: this.getPosition()
          };
        }

        // Move to new position
        await this.moveToPosition(newPosition);
        
        // Drain battery
        this.drainBattery(this.batteryDrainRate);
        
        // Check if battery is dead
        if (this.batteryLevel <= 0) {
          this.stopMovement();
          return { 
            success: false, 
            error: 'Robot battery is dead', 
            errorType: 'BATTERY_DEAD',
            position: this.getPosition()
          };
        }
      }

      this.stopMovement();
      return { success: true, position: this.getPosition() };

    } catch (error) {
      this.stopMovement();
      return { success: false, error: error.message, errorType: 'MOVEMENT_ERROR' };
    }
  }

  /**
   * Turn robot right
   */
  async turnRight() {
    if (this.isMoving) {
      return { success: false, error: 'Robot is already moving', errorType: 'ALREADY_MOVING' };
    }

    this.isMoving = true;
    
    try {
      const directions = ['east', 'south', 'west', 'north'];
      const currentIndex = directions.indexOf(this.direction);
      this.direction = directions[(currentIndex + 1) % 4];
      
      this.updateTexture();
      this.drainBattery(0.5); // Less battery for turning
      
      // Animation delay
      await this.sleep(200);
      
      this.isMoving = false;
      return { success: true, direction: this.direction };

    } catch (error) {
      this.isMoving = false;
      return { success: false, error: error.message, errorType: 'TURN_ERROR' };
    }
  }

  /**
   * Turn robot left
   */
  async turnLeft() {
    if (this.isMoving) {
      return { success: false, error: 'Robot is already moving', errorType: 'ALREADY_MOVING' };
    }

    this.isMoving = true;
    
    try {
      const directions = ['east', 'north', 'west', 'south'];
      const currentIndex = directions.indexOf(this.direction);
      this.direction = directions[(currentIndex + 1) % 4];
      
      this.updateTexture();
      this.drainBattery(0.5); // Less battery for turning
      
      // Animation delay
      await this.sleep(200);
      
      this.isMoving = false;
      return { success: true, direction: this.direction };

    } catch (error) {
      this.isMoving = false;
      return { success: false, error: error.message, errorType: 'TURN_ERROR' };
    }
  }

  /**
   * Collect battery at current position
   */
  async collect(color = null) {
    if (this.isMoving) {
      return { success: false, error: 'Robot is already moving', errorType: 'ALREADY_MOVING' };
    }

    try {
      // Find battery at current position
      const battery = this.findBatteryAtPosition(this.getGridPosition());
      
      if (!battery) {
        return { 
          success: false, 
          error: 'No battery at current position', 
          errorType: 'NO_BATTERY',
          batteryCollected: false
        };
      }

      // Check color match if specified
      if (color && battery.color !== color) {
        return { 
          success: false, 
          error: `Expected ${color} battery, found ${battery.color}`, 
          errorType: 'COLOR_MISMATCH',
          batteryCollected: false
        };
      }

      // Collect battery
      this.collectedBatteries[battery.color]++;
      this.collectedBatteries.total++;
      
      // Remove battery from scene
      battery.destroy();
      
      // Add battery to robot's energy
      this.addBattery(20);
      
      // Play collection sound/effect
      this.playCollectionEffect(battery.color);
      
      return { 
        success: true, 
        batteryCollected: true,
        batteryColor: battery.color,
        collectedBatteries: this.collectedBatteries
      };

    } catch (error) {
      return { success: false, error: error.message, errorType: 'COLLECTION_ERROR' };
    }
  }

  /**
   * Wait for specified duration
   */
  async wait(duration = 1000) {
    if (this.isMoving) {
      return { success: false, error: 'Robot is already moving', errorType: 'ALREADY_MOVING' };
    }

    this.isMoving = true;
    
    try {
      await this.sleep(duration);
      this.isMoving = false;
      return { success: true };

    } catch (error) {
      this.isMoving = false;
      return { success: false, error: error.message, errorType: 'WAIT_ERROR' };
    }
  }

  /**
   * Calculate next position based on current direction
   */
  calculateNextPosition() {
    const currentPos = this.getGridPosition();
    const newPos = { ...currentPos };

    switch (this.direction) {
      case 'east':
        newPos.x += 1;
        break;
      case 'west':
        newPos.x -= 1;
        break;
      case 'north':
        newPos.y -= 1;
        break;
      case 'south':
        newPos.y += 1;
        break;
    }

    return newPos;
  }

  /**
   * Move to specific grid position
   */
  async moveToPosition(gridPos) {
    const worldPos = this.gridToWorld(gridPos.x, gridPos.y);
    
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        x: worldPos.x,
        y: worldPos.y,
        duration: this.speed,
        ease: 'Power2',
        onComplete: () => {
          resolve();
        }
      });
    });
  }

  /**
   * Check collision at position
   */
  checkCollision(position) {
    // Check against walls and obstacles
    const worldPos = this.gridToWorld(position.x, position.y);
    
    // Check if position is occupied by obstacle
    if (this.scene.obstacles) {
      for (let obstacle of this.scene.obstacles) {
        if (obstacle.x === worldPos.x && obstacle.y === worldPos.y) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Check if position is out of bounds
   */
  checkOutOfBounds(position) {
    const mapData = this.scene.mapData;
    if (!mapData) return false;
    
    return position.x < 0 || position.x >= mapData.width || 
           position.y < 0 || position.y >= mapData.height;
  }

  /**
   * Find battery at grid position
   */
  findBatteryAtPosition(gridPos) {
    if (!this.scene.batteries) return null;
    
    const worldPos = this.gridToWorld(gridPos.x, gridPos.y);
    
    for (let battery of this.scene.batteries) {
      if (battery.x === worldPos.x && battery.y === worldPos.y) {
        return battery;
      }
    }
    
    return null;
  }

  /**
   * Play movement animation
   */
  playMovementAnimation() {
    const animKey = `robot_move_${this.direction}`;
    if (this.scene.anims.exists(animKey)) {
      this.play(animKey);
    }
  }

  /**
   * Stop movement animation
   */
  stopMovement() {
    this.isMoving = false;
    const animKey = `robot_idle_${this.direction}`;
    if (this.scene.anims.exists(animKey)) {
      this.play(animKey);
    }
  }

  /**
   * Update robot texture based on direction
   */
  updateTexture() {
    const textureKey = `robot_${this.direction}`;
    if (this.scene.textures.exists(textureKey)) {
      this.setTexture(textureKey);
    }
  }

  /**
   * Play collection effect
   */
  playCollectionEffect(color) {
    // Create collection particle effect
    const particles = this.scene.add.particles(0, 0, `${color}_particle`, {
      x: this.x,
      y: this.y,
      speed: { min: 50, max: 100 },
      scale: { start: 0.5, end: 0 },
      lifespan: 500
    });
    
    particles.explode(10);
    
    // Remove particles after animation
    this.scene.time.delayedCall(500, () => {
      particles.destroy();
    });
  }

  /**
   * Drain battery
   */
  drainBattery(amount) {
    this.batteryLevel = Math.max(0, this.batteryLevel - amount);
  }

  /**
   * Add battery energy
   */
  addBattery(amount) {
    this.batteryLevel = Math.min(this.maxBattery, this.batteryLevel + amount);
  }

  /**
   * Set robot speed
   */
  setSpeed(speed) {
    this.speed = speed;
  }

  /**
   * Reset robot to starting position
   */
  reset() {
    this.setGridPosition(this.startPosition.x, this.startPosition.y);
    this.direction = this.startDirection;
    this.batteryLevel = this.maxBattery;
    this.collectedBatteries = { red: 0, yellow: 0, green: 0, total: 0 };
    this.isMoving = false;
    this.updateTexture();
    this.stopMovement();
  }

  /**
   * Get robot position in world coordinates
   */
  getPosition() {
    return {
      x: this.x,
      y: this.y,
      gridX: this.getGridPosition().x,
      gridY: this.getGridPosition().y
    };
  }

  /**
   * Get robot position in grid coordinates
   */
  getGridPosition() {
    return {
      x: Math.round(this.x / this.gridSize),
      y: Math.round(this.y / this.gridSize)
    };
  }

  /**
   * Set robot position in grid coordinates
   */
  setGridPosition(gridX, gridY) {
    const worldPos = this.gridToWorld(gridX, gridY);
    this.setPosition(worldPos.x, worldPos.y);
  }

  /**
   * Get robot direction
   */
  getDirection() {
    return this.direction;
  }

  /**
   * Convert grid coordinates to world coordinates
   */
  gridToWorld(gridX, gridY) {
    return {
      x: gridX * this.gridSize + this.gridSize / 2,
      y: gridY * this.gridSize + this.gridSize / 2
    };
  }

  /**
   * Convert world coordinates to grid coordinates
   */
  worldToGrid(worldX, worldY) {
    return {
      x: Math.floor(worldX / this.gridSize),
      y: Math.floor(worldY / this.gridSize)
    };
  }

  /**
   * Get battery level
   */
  getBatteryLevel() {
    return this.batteryLevel;
  }

  /**
   * Get collected batteries
   */
  getCollectedBatteries() {
    return { ...this.collectedBatteries };
  }

  /**
   * Check if robot is moving
   */
  isMoving() {
    return this.isMoving;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Destroy robot
   */
  destroy() {
    this.stopMovement();
    super.destroy();
  }
}
