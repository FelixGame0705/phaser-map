# 🧪 Hướng dẫn Test WebViewMessenger

## 📁 Các file test đã tạo

### 1. `test-iframe.html` - Test đầy đủ với iframe
- **Mục đích**: Test toàn bộ tính năng WebViewMessenger với giao diện đầy đủ
- **Tính năng**:
  - Chọn map từ dropdown
  - Nhập chương trình robot (JSON)
  - Gửi các loại thông báo khác nhau
  - Hiển thị log giao tiếp real-time
  - Cập nhật trạng thái game

### 2. `test-simple.html` - Test đơn giản
- **Mục đích**: Test cơ bản với giao diện đơn giản
- **Tính năng**:
  - Các nút điều khiển cơ bản
  - Log giao tiếp
  - Test nhanh các chức năng chính

### 3. `test-flutter-channel.html` - Test FlutterChannel
- **Mục đích**: Test FlutterChannel với jsChannel simulation
- **Tính năng**:
  - Simulation jsChannel library
  - Test FlutterChannel initialization
  - Simulate Flutter messages
  - Test bidirectional communication

## 🚀 Cách sử dụng

### Bước 1: Khởi động game server
```bash
npm run dev
```
Server sẽ chạy trên `http://localhost:5173`

### Bước 2: Mở file test
Mở một trong các file test trong trình duyệt:
- `test-iframe.html` - Test đầy đủ
- `test-simple.html` - Test đơn giản  
- `test-flutter-channel.html` - Test FlutterChannel

### Bước 3: Test các tính năng

#### Test cơ bản:
1. **Bắt đầu Map**: Click "Bắt đầu Basic 1" để load map
2. **Lấy Trạng thái**: Click "Lấy Trạng thái" để xem thông tin game
3. **Gửi Test**: Click "Gửi Test" để test giao tiếp

#### Test FlutterChannel:
1. **Khởi tạo FlutterChannel**: Click "Khởi tạo FlutterChannel"
2. **Test Flutter Message**: Click "Test Flutter Message"
3. **Simulate Flutter Start Map**: Click "Flutter Start Map"
4. **Simulate Flutter Run Program**: Click "Flutter Run Program"

## 📊 Các loại thông báo được test

### Từ Parent → Game:
- `START_MAP`: Bắt đầu map mới
- `LOAD_MAP`: Tải map khác
- `RUN_PROGRAM`: Chạy chương trình robot
- `GET_STATUS`: Lấy trạng thái game
- `TEST`: Test message

### Từ Game → Parent:
- `READY`: Game sẵn sàng
- `VICTORY`: Game thắng
- `PROGRESS`: Tiến độ game
- `STATUS`: Trạng thái game
- `ERROR`: Lỗi từ game

## 🔧 Debug và Troubleshooting

### Kiểm tra Console
Mở Developer Tools (F12) để xem:
- Log từ game Phaser
- Log từ WebViewMessenger
- Lỗi JavaScript (nếu có)

### Kiểm tra Network
- Đảm bảo game server đang chạy
- Kiểm tra assets được load đúng
- Kiểm tra CORS policy

### Kiểm tra Message Flow
1. Mở Console trong game iframe
2. Mở Console trong parent window
3. Gửi test message và theo dõi log

## 📱 Test với Flutter thực tế

### Trong Flutter app:
```dart
// Khởi tạo jsChannel
final channel = JsChannel('flutter_channel');

// Gửi message đến game
channel.postMessage(jsonEncode({
  'source': 'flutter-app',
  'type': 'START_MAP',
  'data': {'mapKey': 'basic1'},
  'timestamp': DateTime.now().millisecondsSinceEpoch
}));

// Lắng nghe message từ game
channel.onMessage = (message) {
  final data = jsonDecode(message);
  print('Received from game: ${data['type']}');
};
```

### Trong game Phaser:
```javascript
// Sử dụng FlutterChannel
if (window.FlutterChannel) {
  window.FlutterChannel.postMessage(JSON.stringify({
    source: "phaser-robot-game",
    type: "VICTORY",
    data: { mapKey: "basic1", isVictory: true }
  }));
}
```

## 🎯 Test Cases

### Test Case 1: Basic Communication
1. Mở `test-simple.html`
2. Click "Bắt đầu Basic 1"
3. Kiểm tra log có message `START_MAP`
4. Kiểm tra game load map đúng

### Test Case 2: FlutterChannel
1. Mở `test-flutter-channel.html`
2. Click "Khởi tạo FlutterChannel"
3. Click "Test Flutter Message"
4. Kiểm tra log có message từ FlutterChannel

### Test Case 3: Program Execution
1. Mở `test-iframe.html`
2. Chọn map "basic1"
3. Nhập program JSON:
```json
{
  "commands": [
    {"type": "move", "direction": "right"},
    {"type": "move", "direction": "down"},
    {"type": "collect"}
  ]
}
```
4. Click "Chạy Chương trình"
5. Kiểm tra robot thực hiện program

## 📝 Notes

- Đảm bảo game server chạy trước khi mở file test
- Sử dụng `test-simple.html` để test nhanh
- Sử dụng `test-iframe.html` để test đầy đủ
- Sử dụng `test-flutter-channel.html` để test Flutter integration
- Kiểm tra Console để debug
- Test trên nhiều trình duyệt khác nhau
