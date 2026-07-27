# ChillNet Web

Frontend cho mạng xã hội ChillNet. React 18 + Vite + Tailwind v4, nói chuyện với API gateway ở `:8080`.

## Chạy dev

```bash
cd frontend
npm install
npm run dev        # http://localhost:5174
```

Cần backend đang chạy (xem `../README.md`): `docker compose -f ../docker-compose.infra.yml up -d` + `../scripts/run-all.sh` (gateway ở `:8080`). Vite proxy `/api` → `:8080` và `/ws` → chat-service `:8086`, nên trình duyệt không dính CORS khi dev.

## Build

```bash
npm run build      # ra dist/
npm run preview
```

## Kiến trúc

- `src/lib/` — nền chung: `api.js` (axios + JWT interceptor, tự bóc `ApiResponse.result`), `endpoints.js` (mọi URL gateway), `auth.jsx` (AuthContext, JWT decode), `format.js`.
- `src/components/ui/` — design system dùng chung (Button, Input, Avatar, Card, Modal, Toast, ...). Accent teal (`brand-*`), neutral zinc, dark mode qua `.dark` trên `<html>`.
- `src/components/layout/` — `AppShell` (rail trái + topbar + bottom nav mobile), `ProtectedRoute`.
- `src/features/<x>/` — từng miền tính năng: `auth`, `feed`, `chat`, `profile`, `friends`, `groups`, `notifications`. Router (`src/App.jsx`) lazy-load các page.

Quy ước thiết kế + hợp đồng cho người mở rộng feature: xem [DESIGN.md](DESIGN.md).
