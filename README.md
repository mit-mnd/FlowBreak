# FlowBreak

App desktop (Windows) giúp làm việc khỏe hơn: nhắc uống nước, nhắc đứng dậy vận động nhẹ và quản lý công việc trong ngày.

## Tính năng

- **Uống nước:** vòng tiến độ theo mục tiêu ngày, ghi nhận một chạm (+250 ml), nhắc theo chu kỳ.
- **Vận động:** phát hiện thời gian ngồi liên tục (dựa trên idle của hệ thống), 8 bài tập ngắn có hướng dẫn từng bước và đồng hồ đếm ngược.
- **Công việc:** thêm bằng Enter, kéo thả hoặc Alt+↑/↓ để sắp xếp, đánh dấu quan trọng, Hoàn tác khi xóa/hoàn thành.
- **Focus mode:** tập trung 15–60 phút vào một việc; lời nhắc được hoãn tối đa 15 phút. Hoàn thành việc = khoảng nghỉ tự nhiên để nhắc.
- **Lời nhắc thông minh:** cửa sổ nhỏ ở góc màn hình (Đã uống / Bắt đầu tập / Hoãn 10 phút / Bỏ qua), gộp nhắc trùng giờ, chỉ nhắc trong giờ làm việc, im lặng khi bạn rời máy hoặc khóa máy.
- **Thống kê 7 ngày**, chế độ Sáng/Tối/Hệ thống, tiếng Việt / English / 한국어.
- Chạy nền dưới khay hệ thống, phím tắt toàn cục **Ctrl+Shift+W** để ghi nhận uống nước, tùy chọn khởi động cùng Windows.
- Dữ liệu chỉ lưu trên máy (SQLite).

## Chạy và build

Yêu cầu: Node 20+, pnpm, Rust (rustup), Microsoft C++ Build Tools, WebView2.

```bash
pnpm install
pnpm tauri dev      # chạy app desktop
pnpm dev            # chỉ giao diện trên trình duyệt (dữ liệu lưu localStorage)
pnpm tauri build    # tạo installer trong src-tauri/target/release/bundle/
```

Kiểm tra trước khi commit: `pnpm typecheck && pnpm lint && pnpm test`.

Xem [CLAUDE.md](CLAUDE.md) để biết kiến trúc và quy ước.
