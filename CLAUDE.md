# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo này.

## Tổng quan dự án

**Tên tạm:** FlowBreak — app desktop giúp người làm việc văn phòng giữ sức khỏe khi ngồi lâu.

Ba tính năng cốt lõi:

1. **Nhắc uống nước:** nhắc theo chu kỳ (mặc định 45 phút), theo dõi lượng nước đã uống trong ngày so với mục tiêu (mặc định 2000 ml).
2. **Nhắc đứng dậy, vận động nhẹ:** sau một khoảng ngồi liên tục (mặc định 50 phút), hiện lời nhắc kèm 1 bài khởi động ngắn (30 giây đến 2 phút) có hướng dẫn từng bước và đồng hồ đếm ngược.
3. **To-do list:** quản lý công việc trong ngày. Có thể "tạm dừng nhắc nhở" khi đang tập trung vào một task (Focus mode).

Cách kết hợp: lời nhắc nên rơi vào **khoảng nghỉ tự nhiên**, ví dụ ngay sau khi người dùng đánh dấu hoàn thành một task. Nếu đang ở Focus mode thì hoãn nhắc tối đa 15 phút, rồi nhắc nhẹ.

Ngôn ngữ giao diện: **tiếng Việt** (mặc định), có hỗ trợ tiếng Anh, tiếng Hàn. Mọi chuỗi hiển thị phải đi qua hệ thống i18n, không hard-code.

## Tech stack

- **Tauri 2** (desktop, Windows là nền tảng chính): app nhẹ, chạy nền dưới system tray, gửi thông báo native.
- **React 18 + TypeScript (strict)** + **Vite**
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives) cho component
- **lucide-react** cho icon, **framer-motion** cho animation
- **Zustand** cho state, **SQLite** qua `@tauri-apps/plugin-sql` để lưu dữ liệu
- Plugin Tauri: `notification`, `sql`, `autostart`, `store` (lưu settings)
- **i18next** cho đa ngôn ngữ
- **Vitest** + **Testing Library** cho test, **ESLint** + **Prettier** cho lint/format
- Package manager: **pnpm**

> Yêu cầu môi trường: Node 20+, pnpm, Rust toolchain (rustup), Microsoft C++ Build Tools, WebView2.

## Lệnh thường dùng

```bash
pnpm install            # cài dependency
pnpm tauri dev          # chạy app ở chế độ dev
pnpm dev                # chỉ chạy frontend trên trình duyệt (dùng mock cho Tauri API)
pnpm build              # build frontend
pnpm tauri build        # đóng gói installer Windows (.msi / .exe)
pnpm test               # chạy test
pnpm lint               # eslint
pnpm typecheck          # tsc --noEmit
```

Trước khi báo hoàn thành một thay đổi: chạy `pnpm typecheck`, `pnpm lint` và `pnpm test`, và tất cả phải pass.

## Cấu trúc thư mục

```
src/
  app/              # App shell, routing, layout, providers
  features/
    hydration/      # nhắc uống nước: store, components, logic
    movement/       # nhắc vận động, danh sách bài tập, màn hình hướng dẫn
    todos/          # to-do list
    focus/          # Focus mode, liên kết task với lời nhắc
    stats/          # thống kê 7 ngày (logic thuần + biểu đồ)
    settings/
  components/ui/    # component shadcn/ui (sinh bằng CLI, hạn chế sửa tay)
  components/       # component dùng chung tự viết
  lib/
    scheduler/      # bộ lập lịch nhắc nhở (logic thuần, không phụ thuộc UI)
    db/             # repository SQLite + bản localStorage cho trình duyệt; migrations/*.sql (Rust include_str!)
    notifications/  # wrapper cho Tauri notification
    tauri/          # wrapper + mock cho Tauri API (để chạy được trên trình duyệt)
  i18n/             # vi.json, en.json, ko.json (thêm key phải thêm đủ cả 3 file)
  styles/           # globals.css, design tokens
src-tauri/          # code Rust, cấu hình Tauri, tray, capabilities
```

`src/app/` chứa phần ghép nối giữa các feature: `useReminderEngine.ts` (tick scheduler mỗi 30 giây, lắng nghe tray/phím tắt/popup), `reminders-store.ts` (trạng thái scheduler, lưu bằng plugin-store) và `ReminderPopupApp.tsx`. Cùng một bundle phục vụ hai cửa sổ: `main` và `reminder` (popup luôn nổi ở góc phải dưới, do Rust tạo trong `src-tauri/src/reminder.rs`). Hai cửa sổ giao tiếp qua event `reminder-action` / `reminder-update`.

Mỗi feature tự chứa phần của mình: `components/`, `store.ts`, `types.ts`, `*.test.ts`. Không import chéo vào phần nội bộ của feature khác; chỉ dùng qua `index.ts` mà feature đó export.

## Quy tắc nghiệp vụ quan trọng

- **Scheduler là logic thuần:** nhận vào thời gian hiện tại + trạng thái, trả về lời nhắc kế tiếp. Không gọi `Date.now()` trực tiếp bên trong mà inject clock để test được.
- **Phát hiện "đang ngồi":** dựa trên thời gian hoạt động của người dùng (idle detection). Nếu idle hơn 5 phút thì coi như đã đứng dậy và reset bộ đếm vận động.
- **Không làm phiền:** tôn trọng giờ làm việc người dùng cài (mặc định 8:00 đến 18:00), không nhắc ngoài giờ, không nhắc khi máy đang khóa, có nút "Hoãn 10 phút" và "Bỏ qua".
- **Không dồn nhắc:** nếu hai lời nhắc trùng thời điểm thì gộp lại thành một thông báo.
- App chạy nền dưới tray; đóng cửa sổ chỉ ẩn xuống tray, không thoát app.
- Mọi dữ liệu lưu **cục bộ**, không gửi ra ngoài. Không thêm analytics/telemetry.
- Thay đổi schema DB phải tạo **migration mới**, không sửa migration cũ.

## Nguyên tắc thiết kế UI/UX

Mục tiêu: **dễ nhìn, dễ dùng, hiện đại, chuyên nghiệp.** Cảm giác bình tĩnh, khuyến khích, không gây áp lực.

### Phong cách

- Tối giản, nhiều khoảng trắng, mỗi màn hình chỉ có một hành động chính.
- Bo góc mềm (`rounded-xl` cho card, `rounded-lg` cho button/input), shadow nhẹ, viền mảnh.
- Hỗ trợ **Light / Dark / theo hệ thống** ngay từ đầu.

### Màu sắc (định nghĩa bằng CSS variables trong `styles/globals.css`, không dùng mã màu rời rạc trong component)

- **Primary (nước):** xanh dương dịu, tông sky/cyan, ví dụ `#0EA5E9`
- **Accent (vận động):** xanh lá tươi, tông emerald, ví dụ `#10B981`
- **To-do / trung tính:** slate/zinc
- **Cảnh báo:** amber; **lỗi:** rose. Dùng tiết chế.
- Nền light: `#F8FAFC`; nền dark: `#0B1120`. Tương phản chữ đạt chuẩn **WCAG AA** (≥ 4.5:1).

### Typography

- Font: **Inter** (hỗ trợ tốt tiếng Việt), fallback `system-ui`.
- Thang chữ: 12 / 14 / 16 / 20 / 24 / 32. Nội dung chính 14–16px. Số liệu (ml, phút) dùng `tabular-nums`.

### Bố cục

- Cửa sổ chính khoảng 420×720 (dạng panel gọn), có thể resize. Layout không vỡ ở chiều rộng 360px.
- **Dashboard** là màn hình đầu: vòng tiến độ nước uống, thời gian đến lần vận động kế tiếp, danh sách task hôm nay.
- Điều hướng: thanh tab dưới hoặc sidebar thu gọn gồm Hôm nay · Công việc · Thống kê · Cài đặt.
- Khoảng cách theo lưới 4px (`gap-2`, `p-4`, `p-6`...).

### Tương tác

- Thao tác chính chỉ mất **một chạm**: "+250 ml", "Đã tập xong", thêm task bằng Enter.
- Hỗ trợ đầy đủ bàn phím: phím tắt toàn cục (ví dụ `Ctrl+Shift+W` ghi nhận uống nước), focus ring rõ ràng.
- Animation ngắn (150–250ms), nhẹ nhàng. Tôn trọng `prefers-reduced-motion`.
- Có **empty state** thân thiện (minh họa + 1 câu gợi ý + nút hành động). Có skeleton khi đang tải.
- Lời nhắc dùng giọng văn tích cực, ngắn gọn, ví dụ: "Đến giờ uống một ngụm nước rồi 💧", không dùng lời lẽ trách móc.
- Các thao tác xóa đều có **Undo** qua toast thay vì hộp thoại xác nhận.

### Accessibility

- Mọi nút icon phải có `aria-label`. Dùng đúng thẻ semantic.
- Không truyền đạt thông tin chỉ bằng màu sắc.
- Kích thước vùng bấm tối thiểu 36×36px.

## Quy ước code

- TypeScript strict, không dùng `any`. Ưu tiên `type` cho dữ liệu và union type cho trạng thái.
- Function component + hooks. Tên component `PascalCase`, hook `useXxx`, file component `PascalCase.tsx`, còn lại `kebab-case.ts`.
- Style bằng Tailwind utility; gộp class bằng helper `cn()`. Không viết CSS inline trừ giá trị động.
- Ưu tiên dùng component có sẵn trong `components/ui` trước khi tự viết mới.
- Logic nghiệp vụ (scheduler, tính toán nước, thống kê) phải có unit test.
- Mọi lời gọi Tauri API đi qua `lib/tauri/` để frontend chạy và test được khi không có Tauri.
- Comment và commit message viết bằng tiếng Anh; nội dung hiển thị cho người dùng viết bằng tiếng Việt qua i18n.
- Commit theo Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`...

## Lộ trình (MVP trước)

1. Khung app Tauri + tray + theme + i18n
2. To-do list (CRUD, sắp xếp, lưu SQLite)
3. Scheduler + nhắc uống nước + thông báo
4. Nhắc vận động + thư viện bài tập có hướng dẫn
5. Focus mode + tích hợp lời nhắc với task
6. Thống kê theo ngày/tuần, autostart cùng Windows, đóng gói installer
