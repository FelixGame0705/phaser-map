import "./style.css";
import Phaser from "phaser";
import MenuScene from "./scenes/MenuScene";
import Scene from "./scenes/basics/Scene";
import FlutterScene from "./scenes/FlutterScene";
import { initWebViewCommunication } from "./utils/WebViewMessenger";

const sizes = {
  width: 1400,
  height: 800,
};

const config = {
  type: Phaser.AUTO,
  width: sizes.width,
  height: sizes.height,
  parent: "app",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
    },
  },
  scene: [Scene, FlutterScene], // FlutterScene first for Flutter integration
};

const game = new Phaser.Game(config);

// Khởi tạo hệ thống giao tiếp với webview
window.addEventListener("load", () => {
  // Đợi game khởi tạo xong
  setTimeout(() => {
    initWebViewCommunication(game);
    console.log("🔄 WebView communication initialized");
    
    // Thêm PhaserChannel cho Flutter WebView
    window.PhaserChannel = {
      postMessage: function(message) {
        console.log('📤 PhaserChannel received from Flutter:', message);
        try {
          const data = JSON.parse(message);
          console.log('📤 PhaserChannel parsed data:', data);
        } catch (e) {
          console.error('❌ PhaserChannel parse error:', e);
        }
      }
    };
    
    console.log('🔄 PhaserChannel ready for Flutter communication');
  }, 1000);
});
window.PhaserChannel = {
  postMessage: function(message) {
    console.log('📤 PhaserChannel received from Flutter:', message);
    try {
      const msg = typeof message === 'string' ? JSON.parse(message) : message;
      console.log('📤 PhaserChannel parsed data:', msg);

      // Xử lý các loại message
      switch (msg.type) {
        case 'compiled': {
          const program = msg.payload;
          const scene = window.game.scene.getScene('FlutterScene') || window.game.scene.getScene('Scene');
          if (scene && typeof scene.runProgram === 'function') {
            scene.runProgram(program);
            // Gửi ACK về Flutter
            try {
              window.FlutterFromPhaser?.postMessage(JSON.stringify({ type:'ack', payload:{ ok:true, received:'compiled' } }));
            } catch (e) {}
          }
          break;
        }
        case 'START_MAP': {
          const mapKey = msg.payload?.mapKey;
          if (mapKey) {
            window.game.scene.start('FlutterScene', { mapKey });
            try {
              window.FlutterFromPhaser?.postMessage(JSON.stringify({ type:'ack', payload:{ ok:true, received:'START_MAP' } }));
            } catch (e) {}
          }
          break;
        }
        case 'RUN_PROGRAM': {
          const program = msg.payload?.program;
          const scene = window.game.scene.getScene('FlutterScene') || window.game.scene.getScene('Scene');
          if (scene && typeof scene.runProgram === 'function' && program) {
            scene.runProgram(program);
            try {
              window.FlutterFromPhaser?.postMessage(JSON.stringify({ type:'ack', payload:{ ok:true, received:'RUN_PROGRAM' } }));
            } catch (e) {}
          }
          break;
        }
        default:
          console.log('Unhandled message type:', msg.type);
          try {
            window.FlutterFromPhaser?.postMessage(JSON.stringify({ type:'ack', payload:{ ok:true, received: msg.type } }));
          } catch (e) {}
      }
    } catch (e) {
      console.error('❌ PhaserChannel parse error:', e);
      try {
        window.FlutterFromPhaser?.postMessage(JSON.stringify({ type:'ack', payload:{ ok:false, reason:'parse_error' } }));
      } catch (_) {}
    }
  }
};
// Export game instance for external access
window.game = game;
