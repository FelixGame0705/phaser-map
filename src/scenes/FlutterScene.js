/**
 * FlutterScene.js
 * 
 * Complete Phaser scene integrated with PhaserFlutterBridge for Flutter WebView communication
 */

import Phaser from "phaser";
import { PhaserFlutterBridge } from "../bridge/PhaserFlutterBridge.js";
import { Robot } from "../entities/Robot.js";
import { MapLoader } from "../utils/MapLoader.js";
import { getMapConfig, getDirectionIndex } from "../data/mapConfigs.js";
import { ProgramExecutor } from "../utils/ProgramExecutor.js";
import { RobotController } from "../managers/RobotController.js";
import { BatteryManager } from "../managers/BatteryManager.js";
import { GameInputHandler } from "../managers/GameInputHandler.js";
import { GameUIManager } from "../managers/GameUIManager.js";
import {
  createBatteryStatusText,
  updateBatteryStatusText,
  checkAndDisplayVictory,
} from "../utils/VictoryConditions.js";

export default class FlutterScene extends Phaser.Scene {
  constructor() {
    super("FlutterScene");
    
    // Core systems
    this.bridge = null;
    this.robot = null;
    
    // Managers (same as Scene.js)
    this.robotController = null;
    this.batteryManager = null;
    this.inputHandler = null;
    this.uiManager = null;
    this.programExecutor = null;
    
    // Game state
    this.gameState = 'IDLE';
    this.currentMap = null;
    this.isInitialized = false;
    this.programMode = false;
  }

  /**
   * Initialize scene with map key
   */
  init(data) {
    this.currentMap = data && data.mapKey ? data.mapKey : "basic1";
    console.log('🎮 FlutterScene initialized with map:', this.currentMap);
  }

  /**
   * Preload assets (same as Scene.js)
   */
  preload() {
    // Load selected map json by key (e.g., basic1..basic8)
    const mapJsonPath = `assets/maps/${this.currentMap}.json`;
    this.load.tilemapTiledJSON(this.currentMap, mapJsonPath);

    // Load example Blockly JSON program
    this.load.json("blockyData", "src/data/blockyData.json");

    // Load tile assets để phù hợp với tileset trong demo1.json
    this.load.image("wood", "assets/tiles/wood.png");
    this.load.image("road_h", "assets/tiles/road_h.png");
    this.load.image("road_v", "assets/tiles/road_v.png");
    this.load.image("water", "assets/tiles/water.png");
    this.load.image("grass", "assets/tiles/grass.png");
    this.load.image("crossroad", "assets/tiles/crossroad.png");

    // Load robot assets theo hướng
    this.load.image("robot_north", "assets/tiles/robot_north.png");
    this.load.image("robot_east", "assets/tiles/robot_east.png");
    this.load.image("robot_south", "assets/tiles/robot_south.png");
    this.load.image("robot_west", "assets/tiles/robot_west.png");
    this.load.image("robot_position", "assets/tiles/robot_position.png");

    // Load pin/battery variants
    this.load.image("pin_red", "assets/tiles/pin_red.png");
    this.load.image("pin_yellow", "assets/tiles/pin_yellow.png");
    this.load.image("pin_green", "assets/tiles/pin_green.png");

    // Load other position sprites
    this.load.image("box", "assets/tiles/box.png");
  }

  /**
   * Create scene (same structure as Scene.js)
   */
  create() {
    console.log('🏗️ Creating FlutterScene...');
    
    // Initialize PhaserFlutterBridge
    this.bridge = new PhaserFlutterBridge(this.game);
    
    // Load map sử dụng MapLoader (same as Scene.js)
    const mapData = MapLoader.loadMap(this, this.currentMap, {
      offsetX: 500,
      offsetY: 0,
      scale: 1,
    });

    this.map = mapData.map;
    this.layer = mapData.layer;
    this.mapData = mapData;

    // Load objects sử dụng config
    const objectConfig = getMapConfig(this.currentMap);
    const loadedObjects = MapLoader.loadObjects(this, mapData, objectConfig);

    // DEBUG: Log battery positions
    console.log("🔋 DEBUG: Loaded batteries:", loadedObjects.batteries.length);
    loadedObjects.batteries.forEach((battery, i) => {
      console.log(
        `   Battery ${i}: x=${battery.x}, y=${battery.y}, key=${battery.texture.key}`
      );
    });

    // Kiểm tra vị trí pin trong config
    if (objectConfig && objectConfig.batteries) {
      console.log(
        "🔋 DEBUG: Battery config:",
        JSON.stringify(objectConfig.batteries)
      );
    }

    // Lưu config để sử dụng cho robot direction
    this.objectConfig = objectConfig;

    // Lưu references
    this.robot = loadedObjects.robot;

    // Initialize Managers (same as Scene.js)
    this.robotController = new RobotController(
      this,
      this.robot,
      this.map,
      this.layer
    );
    this.robotController.initialize(objectConfig);

    this.batteryManager = new BatteryManager(this);
    this.batteryManager.initialize(
      this.robotController,
      objectConfig,
      loadedObjects.batteries
    );

    this.inputHandler = new GameInputHandler(this);
    this.uiManager = new GameUIManager(this);
    this.uiManager.initialize();

    // Setup program executor
    this.programExecutor = new ProgramExecutor(this);

    // Setup input
    this.inputHandler.setupInput();
    
    // Set robot in bridge
    this.bridge.setRobot(this.robot);
    
    // Mark as initialized
    this.isInitialized = true;
    
    console.log('✅ FlutterScene created successfully');
  }

  /**
   * Load map (restart scene with new map)
   */
  async loadMap(mapKey) {
    try {
      console.log('🗺️ Loading map:', mapKey);
      
      // Restart scene with new map
      this.scene.restart({ mapKey });
      
      this.bridge.sendToFlutter('MAP_LOADED', {
        message: `Map ${mapKey} loaded successfully`,
        mapKey: mapKey
      });
      
      console.log('✅ Map loaded successfully:', mapKey);
      
    } catch (error) {
      console.error('❌ Error loading map:', error);
      this.bridge.sendToFlutter('ERROR', {
        message: 'Failed to load map',
        errorType: 'MAP_LOAD_ERROR',
        mapKey: mapKey,
        error: error.message
      });
    }
  }

  /**
   * Run robot program (using existing ProgramExecutor)
   */
  async runProgram(program) {
    if (!this.programExecutor) {
      this.bridge.sendToFlutter('ERROR', {
        message: 'ProgramExecutor not initialized',
        errorType: 'PROGRAM_EXECUTOR_NOT_FOUND'
      });
      return;
    }

    try {
      // Load and start program using existing system
      const success = this.programExecutor.loadProgram(program);
      if (success) {
        this.programMode = true;
        this.gameState = 'RUNNING';
        
        this.bridge.sendToFlutter('PROGRESS', {
          message: 'Program loaded and starting execution',
          currentStep: 0,
          totalSteps: program.actions ? program.actions.length : 0
        });
        
        // Start program execution
        this.programExecutor.startProgram();
      } else {
        this.bridge.sendToFlutter('ERROR', {
          message: 'Failed to load program',
          errorType: 'PROGRAM_LOAD_ERROR'
        });
      }
    } catch (error) {
      console.error('❌ Error running program:', error);
      this.bridge.sendToFlutter('ERROR', {
        message: 'Program execution failed',
        errorType: 'PROGRAM_ERROR',
        error: error.message
      });
    }
  }

  /**
   * Get game status
   */
  getGameStatus() {
    return {
      gameState: this.gameState,
      currentMap: this.currentMap,
      mapKey: this.currentMap,
      collectedBatteries: this.batteryManager ? this.batteryManager.getCollectedBatteries() : 0,
      collectedBatteryTypes: this.batteryManager ? this.batteryManager.getCollectedBatteryTypes() : {
        red: 0,
        yellow: 0,
        green: 0,
      },
      robot: this.robot ? {
        position: this.robotController ? this.robotController.getCurrentTilePosition() : { x: 0, y: 0 },
        direction: this.robotController ? this.robotController.getCurrentDirection() : 'east'
      } : null,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Check victory conditions (using existing system)
   */
  checkVictory() {
    if (!this.batteryManager) {
      return { isVictory: false, message: 'BatteryManager not initialized' };
    }

    const victoryResult = checkAndDisplayVictory(this);
    
    if (victoryResult.isVictory) {
      this.gameState = 'VICTORY';
      this.bridge.sendToFlutter('VICTORY', {
        message: victoryResult.message,
        score: this.calculateScore(),
        batteriesCollected: this.batteryManager.getCollectedBatteries(),
        mapKey: this.currentMap
      });
    } else {
      this.bridge.sendToFlutter('PROGRESS', {
        message: victoryResult.message,
        progress: victoryResult.progress,
        collected: victoryResult.collected,
        required: victoryResult.required
      });
    }

    return victoryResult;
  }

  /**
   * Calculate game score
   */
  calculateScore() {
    if (!this.batteryManager) return 0;
    
    const collected = this.batteryManager.getCollectedBatteries();
    return collected * 10; // 10 points per battery
  }

  /**
   * Reset game
   */
  resetGame() {
    if (this.robotController) {
      this.robotController.resetRobot();
    }
    
    if (this.batteryManager) {
      this.batteryManager.resetBatteries();
    }
    
    this.gameState = 'IDLE';
    this.programMode = false;
    
    this.bridge.sendToFlutter('GAME_RESET', {
      message: 'Game reset successfully'
    });
  }

  /**
   * Pause game
   */
  pauseGame() {
    if (this.programExecutor) {
      this.programExecutor.pauseProgram();
    }
    this.gameState = 'PAUSED';
    this.bridge.sendToFlutter('GAME_PAUSED', {
      message: 'Game paused'
    });
  }

  /**
   * Resume game
   */
  resumeGame() {
    if (this.programExecutor) {
      this.programExecutor.resumeProgram();
    }
    this.gameState = 'RUNNING';
    this.bridge.sendToFlutter('GAME_RESUMED', {
      message: 'Game resumed'
    });
  }

  /**
   * Set robot speed
   */
  setRobotSpeed(speed) {
    if (this.robotController) {
      this.robotController.setSpeed(speed);
      this.bridge.sendToFlutter('SPEED_SET', {
        message: `Robot speed set to ${speed}`,
        speed: speed
      });
    }
  }

  /**
   * Get map information
   */
  getMapInfo() {
    return {
      mapKey: this.currentMap,
      width: this.mapData ? this.mapData.map.widthInPixels : 0,
      height: this.mapData ? this.mapData.map.heightInPixels : 0,
      tileSize: 32,
      batteries: this.batteryManager ? this.batteryManager.getTotalBatteries() : 0,
      obstacles: 0 // Not tracked in current system
    };
  }

  /**
   * Update loop
   */
  update() {
    // Check victory conditions periodically
    if (this.batteryManager && this.gameState === 'RUNNING') {
      this.checkVictory();
    }
  }

  /**
   * Scene shutdown
   */
  shutdown() {
    console.log('🔄 FlutterScene shutting down...');
    
    if (this.robot) {
      this.robot.destroy();
    }
    
    this.isInitialized = false;
    console.log('✅ FlutterScene shutdown complete');
  }

  // ========================================
  // DELEGATION METHODS (same as Scene.js)
  // ========================================

  /**
   * Di chuyển thẳng theo hướng hiện tại của robot
   * @returns {boolean} Success/failure
   */
  moveForward() {
    return this.robotController ? this.robotController.moveForward() : false;
  }

  /**
   * Quay trái 90 độ
   * @returns {boolean} Success/failure
   */
  turnLeft() {
    return this.robotController ? this.robotController.turnLeft() : false;
  }

  /**
   * Quay phải 90 độ
   * @returns {boolean} Success/failure
   */
  turnRight() {
    return this.robotController ? this.robotController.turnRight() : false;
  }

  /**
   * Quay lại sau lưng 180 độ
   * @returns {boolean} Success/failure
   */
  turnBack() {
    return this.robotController ? this.robotController.turnBack() : false;
  }

  /**
   * Lấy vị trí tile hiện tại của robot
   * @returns {Object} {x, y} tile coordinates
   */
  getCurrentTilePosition() {
    return this.robotController ? this.robotController.getCurrentTilePosition() : { x: 0, y: 0 };
  }

  /**
   * Lấy key của tile hiện tại (dùng cho battery tracking)
   * @returns {string} Tile key format: "x,y"
   */
  getCurrentTileKey() {
    return this.robotController ? this.robotController.getCurrentTileKey() : "0,0";
  }

  /**
   * Lấy world center của tile
   * @param {number} tileX
   * @param {number} tileY
   * @returns {Object} {x, y} world coordinates
   */
  getTileWorldCenter(tileX, tileY) {
    return this.robotController ? this.robotController.getTileWorldCenter(tileX, tileY) : { x: 0, y: 0 };
  }

  /**
   * Thu thập 1 pin tại vị trí hiện tại của robot (ưu tiên theo màu nếu truyền vào)
   * @param {string} [preferredColor] - "red" | "yellow" | "green"
   * @returns {number} 1 nếu thu thập thành công, 0 nếu không có pin phù hợp
   */
  collectBattery(preferredColor) {
    if (!this.batteryManager) return 0;
    
    const result = this.batteryManager.collectBattery(preferredColor);

    if (result > 0) {
      // Cập nhật UI trạng thái và kiểm tra thắng/thua
      this.uiManager.updateStatusUI();
      const victoryResult = checkAndDisplayVictory(this);
      if (victoryResult.isVictory) {
        this.uiManager.showVictoryMessage(victoryResult.message);
      } else {
        this.uiManager.showProgressMessage(victoryResult.progress);
      }
    }

    return result;
  }

  /**
   * Load chương trình từ Blockly JSON
   * @param {Object} programData - Blockly JSON program
   * @param {boolean} autoStart - Tự động bắt đầu thực thi (default: false)
   * @returns {boolean} Success/failure
   */
  loadProgram(programData, autoStart = false) {
    if (!this.programExecutor) {
      console.error("❌ ProgramExecutor not initialized");
      return false;
    }

    const success = this.programExecutor.loadProgram(programData);
    if (success) {
      this.programMode = true;
      console.log("📋 Program loaded successfully");

      if (autoStart) {
        console.log("🚀 Auto-starting program execution...");
        setTimeout(() => {
          this.startProgram();
        }, 500);
      }
    }
    return success;
  }

  /**
   * Bắt đầu thực thi chương trình
   * @returns {boolean} Success/failure
   */
  startProgram() {
    if (!this.programExecutor) {
      console.error("❌ ProgramExecutor not initialized");
      return false;
    }

    const success = this.programExecutor.startProgram();
    if (success) {
      this.programMode = true;
      this.gameState = 'RUNNING';
      console.log("🚀 Program execution started");
    }
    return success;
  }

  /**
   * Dừng chương trình
   */
  stopProgram() {
    if (this.programExecutor) {
      this.programExecutor.stopProgram();
      this.programMode = false;
      this.gameState = 'IDLE';
      console.log("⏹️ Program execution stopped");
    }
  }

  /**
   * Tạm dừng chương trình
   */
  pauseProgram() {
    if (this.programExecutor) {
      this.programExecutor.pauseProgram();
    }
  }

  /**
   * Tiếp tục chương trình
   */
  resumeProgram() {
    if (this.programExecutor) {
      this.programExecutor.resumeProgram();
    }
  }

  /**
   * Lấy trạng thái chương trình
   * @returns {Object} Program status
   */
  getProgramStatus() {
    return this.programExecutor ? this.programExecutor.getStatus() : null;
  }
}
