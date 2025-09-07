/**
 * MapSystem.js
 * 
 * Enhanced map system with grid-based movement, victory conditions, and dynamic map loading
 */

export class MapSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentMap = null;
    this.mapData = null;
    this.tileSize = 32;
    this.batteries = [];
    this.obstacles = [];
    this.victoryConditions = null;
    this.startPosition = { x: 0, y: 0 };
    this.mapLayers = {
      background: null,
      obstacles: null,
      batteries: null,
      decorations: null
    };
  }

  /**
   * Load map from JSON data
   */
  async loadMap(mapKey) {
    try {
      console.log('🗺️ Loading map:', mapKey);
      
      // Load map data
      const mapData = await this.loadMapData(mapKey);
      if (!mapData) {
        throw new Error(`Map ${mapKey} not found`);
      }

      this.currentMap = mapKey;
      this.mapData = mapData;
      this.scene.mapData = mapData;

      // Clear existing map elements
      this.clearMap();

      // Create map layers
      await this.createMapLayers(mapData);

      // Set up victory conditions
      this.setupVictoryConditions(mapData.victoryConditions);

      // Set start position
      this.startPosition = mapData.startPosition || { x: 0, y: 0 };

      console.log('✅ Map loaded successfully:', mapKey);
      return true;

    } catch (error) {
      console.error('❌ Error loading map:', error);
      return false;
    }
  }

  /**
   * Load map data from JSON file
   */
  async loadMapData(mapKey) {
    try {
      const response = await fetch(`/assets/maps/${mapKey}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load map: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ Error loading map data:', error);
      return null;
    }
  }

  /**
   * Create map layers
   */
  async createMapLayers(mapData) {
    // Create background layer
    this.createBackgroundLayer(mapData);

    // Create obstacles layer
    this.createObstaclesLayer(mapData);

    // Create batteries layer
    this.createBatteriesLayer(mapData);

    // Create decorations layer
    this.createDecorationsLayer(mapData);
  }

  /**
   * Create background layer
   */
  createBackgroundLayer(mapData) {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x90EE90); // Light green background
    graphics.fillRect(0, 0, mapData.width * this.tileSize, mapData.height * this.tileSize);

    // Draw grid lines
    graphics.lineStyle(1, 0x000000, 0.3);
    for (let x = 0; x <= mapData.width; x++) {
      graphics.moveTo(x * this.tileSize, 0);
      graphics.lineTo(x * this.tileSize, mapData.height * this.tileSize);
    }
    for (let y = 0; y <= mapData.height; y++) {
      graphics.moveTo(0, y * this.tileSize);
      graphics.lineTo(mapData.width * this.tileSize, y * this.tileSize);
    }

    this.mapLayers.background = graphics;
  }

  /**
   * Create obstacles layer
   */
  createObstaclesLayer(mapData) {
    this.obstacles = [];
    
    if (mapData.obstacles) {
      mapData.obstacles.forEach(obstacle => {
        const sprite = this.scene.add.sprite(
          obstacle.x * this.tileSize + this.tileSize / 2,
          obstacle.y * this.tileSize + this.tileSize / 2,
          obstacle.texture || 'wood'
        );
        
        sprite.setScale(this.tileSize / sprite.width);
        this.obstacles.push(sprite);
      });
    }

    this.scene.obstacles = this.obstacles;
  }

  /**
   * Create batteries layer
   */
  createBatteriesLayer(mapData) {
    this.batteries = [];
    
    if (mapData.batteries) {
      mapData.batteries.forEach(battery => {
        const sprite = this.scene.add.sprite(
          battery.x * this.tileSize + this.tileSize / 2,
          battery.y * this.tileSize + this.tileSize / 2,
          `pin_${battery.color}`
        );
        
        sprite.setScale(this.tileSize / sprite.width);
        sprite.color = battery.color;
        sprite.setData('batteryData', battery);
        
        // Add collection animation
        this.scene.tweens.add({
          targets: sprite,
          scaleX: sprite.scaleX * 1.2,
          scaleY: sprite.scaleY * 1.2,
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        
        this.batteries.push(sprite);
      });
    }

    this.scene.batteries = this.batteries;
  }

  /**
   * Create decorations layer
   */
  createDecorationsLayer(mapData) {
    if (mapData.decorations) {
      mapData.decorations.forEach(decoration => {
        const sprite = this.scene.add.sprite(
          decoration.x * this.tileSize + this.tileSize / 2,
          decoration.y * this.tileSize + this.tileSize / 2,
          decoration.texture
        );
        
        sprite.setScale(this.tileSize / sprite.width);
        sprite.setDepth(-1); // Behind other elements
      });
    }
  }

  /**
   * Setup victory conditions
   */
  setupVictoryConditions(conditions) {
    this.victoryConditions = conditions || {
      type: 'collect_all_batteries',
      requiredBatteries: {
        red: 0,
        yellow: 0,
        green: 0,
        total: 0
      }
    };

    // Calculate required batteries from map data
    if (this.mapData && this.mapData.batteries) {
      this.victoryConditions.requiredBatteries = {
        red: 0,
        yellow: 0,
        green: 0,
        total: 0
      };

      this.mapData.batteries.forEach(battery => {
        this.victoryConditions.requiredBatteries[battery.color]++;
        this.victoryConditions.requiredBatteries.total++;
      });
    }

    console.log('🎯 Victory conditions set:', this.victoryConditions);
  }

  /**
   * Check victory conditions
   */
  checkVictory(robot) {
    if (!this.victoryConditions) {
      return { isVictory: false, message: 'No victory conditions set' };
    }

    const collectedBatteries = robot.getCollectedBatteries();
    const required = this.victoryConditions.requiredBatteries;

    switch (this.victoryConditions.type) {
      case 'collect_all_batteries':
        return this.checkCollectAllBatteries(collectedBatteries, required);

      case 'collect_specific_batteries':
        return this.checkCollectSpecificBatteries(collectedBatteries, required);

      case 'reach_position':
        return this.checkReachPosition(robot);

      case 'collect_minimum':
        return this.checkCollectMinimum(collectedBatteries, required);

      default:
        return { isVictory: false, message: 'Unknown victory condition type' };
    }
  }

  /**
   * Check collect all batteries victory
   */
  checkCollectAllBatteries(collected, required) {
    const isVictory = collected.total >= required.total &&
                     collected.red >= required.red &&
                     collected.yellow >= required.yellow &&
                     collected.green >= required.green;

    return {
      isVictory,
      message: isVictory ? 'All batteries collected! Victory!' : 'Collect all batteries to win',
      progress: Math.round((collected.total / required.total) * 100),
      collected,
      required
    };
  }

  /**
   * Check collect specific batteries victory
   */
  checkCollectSpecificBatteries(collected, required) {
    const isVictory = collected.red >= required.red &&
                     collected.yellow >= required.yellow &&
                     collected.green >= required.green;

    const totalRequired = required.red + required.yellow + required.green;
    const totalCollected = collected.red + collected.yellow + collected.green;

    return {
      isVictory,
      message: isVictory ? 'Required batteries collected! Victory!' : 'Collect the required batteries',
      progress: Math.round((totalCollected / totalRequired) * 100),
      collected,
      required
    };
  }

  /**
   * Check reach position victory
   */
  checkReachPosition(robot) {
    const targetPos = this.victoryConditions.targetPosition;
    const robotPos = robot.getGridPosition();
    
    const isVictory = robotPos.x === targetPos.x && robotPos.y === targetPos.y;

    return {
      isVictory,
      message: isVictory ? 'Target position reached! Victory!' : 'Reach the target position',
      progress: isVictory ? 100 : 0,
      targetPosition: targetPos,
      currentPosition: robotPos
    };
  }

  /**
   * Check collect minimum victory
   */
  checkCollectMinimum(collected, required) {
    const isVictory = collected.total >= required.total;

    return {
      isVictory,
      message: isVictory ? 'Minimum batteries collected! Victory!' : 'Collect minimum batteries',
      progress: Math.round((collected.total / required.total) * 100),
      collected,
      required
    };
  }

  /**
   * Get map information
   */
  getMapInfo() {
    return {
      mapKey: this.currentMap,
      width: this.mapData ? this.mapData.width : 0,
      height: this.mapData ? this.mapData.height : 0,
      tileSize: this.tileSize,
      batteries: this.batteries.length,
      obstacles: this.obstacles.length,
      startPosition: this.startPosition,
      victoryConditions: this.victoryConditions
    };
  }

  /**
   * Get battery at position
   */
  getBatteryAtPosition(gridX, gridY) {
    const worldX = gridX * this.tileSize + this.tileSize / 2;
    const worldY = gridY * this.tileSize + this.tileSize / 2;

    for (let battery of this.batteries) {
      if (battery.x === worldX && battery.y === worldY) {
        return battery;
      }
    }

    return null;
  }

  /**
   * Remove battery from map
   */
  removeBattery(battery) {
    const index = this.batteries.indexOf(battery);
    if (index > -1) {
      this.batteries.splice(index, 1);
      battery.destroy();
    }
  }

  /**
   * Check if position is valid (not obstacle)
   */
  isValidPosition(gridX, gridY) {
    // Check bounds
    if (gridX < 0 || gridX >= this.mapData.width || 
        gridY < 0 || gridY >= this.mapData.height) {
      return false;
    }

    // Check obstacles
    for (let obstacle of this.obstacles) {
      const obstacleGridX = Math.floor(obstacle.x / this.tileSize);
      const obstacleGridY = Math.floor(obstacle.y / this.tileSize);
      
      if (obstacleGridX === gridX && obstacleGridY === gridY) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all batteries of specific color
   */
  getBatteriesByColor(color) {
    return this.batteries.filter(battery => 
      battery.getData('batteryData').color === color
    );
  }

  /**
   * Clear map elements
   */
  clearMap() {
    // Clear layers
    Object.values(this.mapLayers).forEach(layer => {
      if (layer) {
        layer.destroy();
      }
    });

    // Clear arrays
    this.batteries = [];
    this.obstacles = [];

    // Clear scene references
    this.scene.batteries = [];
    this.scene.obstacles = [];
  }

  /**
   * Get map data
   */
  getMapData() {
    return this.mapData;
  }

  /**
   * Get current map key
   */
  getCurrentMap() {
    return this.currentMap;
  }

  /**
   * Get victory conditions
   */
  getVictoryConditions() {
    return this.victoryConditions;
  }

  /**
   * Get start position
   */
  getStartPosition() {
    return this.startPosition;
  }

  /**
   * Get tile size
   */
  getTileSize() {
    return this.tileSize;
  }

  /**
   * Get map dimensions
   */
  getMapDimensions() {
    return {
      width: this.mapData ? this.mapData.width : 0,
      height: this.mapData ? this.mapData.height : 0
    };
  }
}
