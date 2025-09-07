import "./style.css";
import Phaser from "phaser";
import MenuScene from "./scenes/MenuScene";
import Scene from "./scenes/basics/Scene";
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
  scene: [Scene],
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

// Export game instance for external access
window.game = game;
