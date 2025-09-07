/**
 * PhaserFlutterBridge.js
 * 
 * Complete communication system between Phaser.js robot programming game and Flutter WebView
 * Handles bidirectional messaging for robot program execution, game state updates, and user interactions
 */

export class PhaserFlutterBridge {
  constructor(game) {
    this.game = game;
    this.gameState = 'IDLE';
    this.currentMap = null;
    this.messageQueue = [];
    this.isProcessingQueue = false;
    
    this.setupFlutterChannel();
    this.setupMessageHandlers();
  }

  /**
   * Setup FlutterChannel for receiving messages from Flutter
   */
  setupFlutterChannel() {
    // Setup window.FlutterChannel for receiving messages from Flutter
    window.FlutterChannel = {
      onMessage: (messageJson) => this.handleFlutterMessage(messageJson),
      postMessage: (messageJson) => this.handleFlutterMessage(messageJson)
    };
    
    console.log('🔄 PhaserFlutterBridge: FlutterChannel initialized');
    
    // Send ready message when game loads
    this.sendToFlutter('READY', {
      message: 'Phaser game initialized',
      gameVersion: '1.0.0',
      features: ['robot-programming', 'battery-collection', 'grid-movement'],
      capabilities: {
        maxProgramLength: 50,
        supportedActions: ['forward', 'turnRight', 'turnLeft', 'collect', 'wait'],
        supportedColors: ['red', 'yellow', 'green'],
        gridSize: 32
      }
    });
  }

  /**
   * Setup message handlers for different message types
   */
  setupMessageHandlers() {
    this.messageHandlers = {
      'RUN_PROGRAM': (data) => this.runRobotProgram(data.program),
      'START_MAP': (data) => this.loadMap(data.mapKey),
      'GET_STATUS': () => this.sendGameStatus(),
      'PAUSE_PROGRAM': () => this.pauseProgram(),
      'RESUME_PROGRAM': () => this.resumeProgram(),
      'STOP_PROGRAM': () => this.stopProgram(),
      'RESET_ROBOT': () => this.resetRobot(),
      'SET_SPEED': (data) => this.setRobotSpeed(data.speed),
      'GET_MAP_INFO': () => this.sendMapInfo(),
      'TEST_CONNECTION': () => this.testConnection()
    };
  }

  /**
   * Handle incoming messages from Flutter
   */
  handleFlutterMessage(messageJson) {
    try {
      const message = JSON.parse(messageJson);
      
      // Validate message format
      if (!message.type || !message.data) {
        console.warn('⚠️ Invalid message format:', message);
        return;
      }

      console.log('📥 Received from Flutter:', message.type, message.data);

      // Add to message queue for processing
      this.messageQueue.push(message);
      this.processMessageQueue();

    } catch (error) {
      console.error('❌ Error parsing Flutter message:', error);
      this.sendToFlutter('ERROR', {
        message: 'Failed to parse message',
        errorType: 'PARSE_ERROR',
        originalMessage: messageJson
      });
    }
  }

  /**
   * Process message queue to handle messages in order
   */
  async processMessageQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      await this.processMessage(message);
    }

    this.isProcessingQueue = false;
  }

  /**
   * Process individual message
   */
  async processMessage(message) {
    const handler = this.messageHandlers[message.type];
    
    if (handler) {
      try {
        await handler(message.data);
      } catch (error) {
        console.error(`❌ Error handling ${message.type}:`, error);
        this.sendToFlutter('ERROR', {
          message: `Error handling ${message.type}`,
          errorType: 'HANDLER_ERROR',
          error: error.message
        });
      }
    } else {
      console.warn('⚠️ Unknown message type:', message.type);
      this.sendToFlutter('ERROR', {
        message: `Unknown message type: ${message.type}`,
        errorType: 'UNKNOWN_MESSAGE_TYPE'
      });
    }
  }

  /**
   * Execute robot program with progress updates
   */
  async runRobotProgram(program) {
    if (this.gameState === 'RUNNING') {
      this.sendToFlutter('ERROR', {
        message: 'Program already running',
        errorType: 'PROGRAM_RUNNING'
      });
      return;
    }

    if (!program || !program.actions || !Array.isArray(program.actions)) {
      this.sendToFlutter('ERROR', {
        message: 'Invalid program format',
        errorType: 'INVALID_PROGRAM'
      });
      return;
    }

    // Get FlutterScene and use its program execution system
    const scene = this.game.scene.getScene('FlutterScene');
    if (!scene) {
      this.sendToFlutter('ERROR', {
        message: 'FlutterScene not found',
        errorType: 'SCENE_NOT_FOUND'
      });
      return;
    }

    try {
      // Use FlutterScene's program execution system
      await scene.runProgram(program);
    } catch (error) {
      console.error('❌ Program execution error:', error);
      this.sendToFlutter('ERROR', {
        message: 'Program execution failed',
        errorType: 'EXECUTION_ERROR',
        error: error.message
      });
    }
  }

  /**
   * Load map
   */
  async loadMap(mapKey) {
    try {
      console.log('🗺️ Loading map:', mapKey);
      
      // Get FlutterScene
      const scene = this.game.scene.getScene('FlutterScene');
      if (scene) {
        // Use FlutterScene's loadMap method
        await scene.loadMap(mapKey);
        this.currentMap = mapKey;
      } else {
        this.sendToFlutter('ERROR', {
          message: 'FlutterScene not found',
          errorType: 'SCENE_NOT_FOUND'
        });
      }
    } catch (error) {
      console.error('❌ Error loading map:', error);
      this.sendToFlutter('ERROR', {
        message: 'Failed to load map',
        errorType: 'MAP_LOAD_ERROR',
        mapKey: mapKey,
        error: error.message
      });
    }
  }

  /**
   * Send game status to Flutter
   */
  sendGameStatus() {
    // Get FlutterScene and use its status
    const scene = this.game.scene.getScene('FlutterScene');
    if (scene) {
      const status = scene.getGameStatus();
      this.sendToFlutter('STATUS', status);
    } else {
      this.sendToFlutter('ERROR', {
        message: 'FlutterScene not found',
        errorType: 'SCENE_NOT_FOUND'
      });
    }
  }

  /**
   * Pause program execution
   */
  pauseProgram() {
    const scene = this.game.scene.getScene('FlutterScene');
    if (scene) {
      scene.pauseGame();
    }
  }

  /**
   * Resume program execution
   */
  resumeProgram() {
    const scene = this.game.scene.getScene('FlutterScene');
    if (scene) {
      scene.resumeGame();
    }
  }

  /**
   * Stop program execution
   */
  stopProgram() {
    const scene = this.game.scene.getScene('FlutterScene');
    if (scene) {
      scene.stopProgram();
    }
  }

  /**
   * Reset robot to starting position
   */
  resetRobot() {
    const scene = this.game.scene.getScene('FlutterScene');
    if (scene) {
      scene.resetGame();
    }
  }

  /**
   * Set robot movement speed
   */
  setRobotSpeed(speed) {
    const scene = this.game.scene.getScene('FlutterScene');
    if (scene) {
      scene.setRobotSpeed(speed);
    }
  }

  /**
   * Send map information
   */
  sendMapInfo() {
    const scene = this.game.scene.getScene('FlutterScene');
    if (scene) {
      const mapInfo = scene.getMapInfo();
      this.sendToFlutter('MAP_INFO', mapInfo);
    }
  }

  /**
   * Test connection
   */
  testConnection() {
    this.sendToFlutter('CONNECTION_TEST', {
      message: 'Connection test successful',
      timestamp: Date.now(),
      gameState: this.gameState
    });
  }

  /**
   * Send message to Flutter
   */
  sendToFlutter(type, data) {
    if (window.FlutterChannel && window.FlutterChannel.postMessage) {
      const message = {
        source: 'phaser-robot-game',
        type: type,
        data: data,
        timestamp: Date.now()
      };
      
      try {
        window.FlutterChannel.postMessage(JSON.stringify(message));
        console.log('📤 Sent to Flutter:', type, data);
      } catch (error) {
        console.error('❌ Error sending message to Flutter:', error);
      }
    } else {
      console.warn('⚠️ FlutterChannel not available');
    }
  }

  /**
   * Set current map
   */
  setCurrentMap(mapKey) {
    this.currentMap = mapKey;
  }

  /**
   * Get current game state
   */
  getGameState() {
    return this.gameState;
  }
}

