# Kỷ Yếu Lớp 9A — THCS Vũ Lăng (2016–2019)

Trang kỷ yếu điện tử cho lớp 9A trường THCS Vũ Lăng, niên khóa 2016–2019.

## Kiến trúc

| Tầng | Công nghệ |
|------|-----------|
| Frontend | React + Vite + TypeScript (Tailwind CSS 4, Framer Motion, shadcn/ui) |
| Backend | Python FastAPI (uvicorn), psycopg2 |
| Database | PostgreSQL (Replit managed) |
| API Client | Orval codegen → TanStack Query hooks (`lib/api-client-react`) |
| Routing (FE) | wouter |
| Monorepo | pnpm workspaces |

## Cấu trúc thư mục

```
artifacts/
  yearbook/          # Frontend React-Vite (preview path: /)
  api-server/        # Backend FastAPI (preview path: /api)
  mockup-sandbox/    # Canvas component preview server
lib/
  api-spec/          # openapi.yaml — nguồn sự thật cho API
  api-client-react/  # Codegen TanStack Query hooks
  api-zod/           # Codegen Zod schemas
```

## Các trang

- `/` — Trang chủ (hero, thống kê, học sinh nổi bật, ký ức mới nhất)
- `/students` — Danh sách tập thể 9A (tìm kiếm, badge vai trò, khung ảnh)
- `/students/:id` — Trang cá nhân học sinh
- `/gallery` — Album ảnh (lọc theo danh mục, lightbox)
- `/memories` — Sổ lưu bút (ký ức dài dạng text)
- `/events` — Dòng thời gian sự kiện
- `/teachers` — Lời nhắn từ thầy cô
- `/frames` — Cửa hàng khung ảnh (miễn phí & premium)
- `/admin` — Bảng quản trị CRUD (học sinh, gallery, ký ức, sự kiện, thầy cô, khung ảnh)

## Ghi chú kỹ thuật

- `birth_date` và `event_date` trong DB lưu định dạng `"dd/MM/yyyy"` — phải dùng `parse(str, "dd/MM/yyyy", new Date())` từ `date-fns` thay vì `new Date(str)`.
- Frame `image_url` chứa CSS gradient string; frontend render bằng CSS mask trick tạo vòng tròn trang trí quanh avatar.
- Admin panel không có xác thực (mở hoàn toàn) — phù hợp cho nội bộ lớp.

## User preferences

- Ngôn ngữ UI: Tiếng Việt, không dùng emoji.
- Design: tươi sáng, ấm áp, font chữ tay (Caveat) cho tiêu đề, Plus Jakarta Sans cho nội dung.
