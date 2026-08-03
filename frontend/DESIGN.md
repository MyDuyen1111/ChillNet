# ChillNet Web — Contract cho feature agents

Đọc file này TRƯỚC khi code. Nền chung (foundation) đã dựng xong và build sạch.
Nhiệm vụ của bạn: chỉ hiện thực hoá **1 feature folder** được giao. Không đụng file ngoài folder đó.

## Stack & quy ước

- **React 18 + Vite**, JavaScript thuần (`.jsx`, KHÔNG TypeScript).
- **Tailwind v4** (đã cấu hình). Dùng utility class trực tiếp.
- **Thụt đầu dòng = TAB** (khớp code hiện có). Prettier-style, dấu `;`.
- **Icon:** `@phosphor-icons/react` (chỉ family này). `import { House, Heart } from "@phosphor-icons/react"`.
- **Animation:** `motion/react` (`import { motion, AnimatePresence, useReducedMotion } from "motion/react"`). Motion phải có lý do (hierarchy/feedback/state). Tôn trọng reduced-motion.
- **KHÔNG thêm dependency mới.** Mọi thứ cần đã cài: axios, react-router-dom v6, motion, @phosphor-icons/react, @stomp/stompjs, sockjs-client, date-fns, clsx. Nếu thật sự thiếu → ghi vào báo cáo cuối, đừng sửa package.json.
- **KHÔNG sửa:** `src/lib/*`, `src/components/ui/*`, `src/components/layout/*`, `src/App.jsx`, `src/main.jsx`, `src/index.css`, `package.json`, `vite.config.js`. Router đã trỏ sẵn tới page của bạn.

## Ngôn ngữ thiết kế (BẮT BUỘC nhất quán)

- **Accent DUY NHẤT = teal**, dùng qua class `brand-*` (vd `bg-brand-600 text-white`, `text-brand-600`, `bg-brand-50`). KHÔNG dùng màu accent khác. `rose` chỉ cho hành động nguy hiểm/like-heart, `amber/sky/violet` chỉ cho avatar tint có sẵn.
- **Neutral = zinc** (`bg-zinc-50 dark:bg-zinc-950`, `text-zinc-900 dark:text-zinc-100`, viền `border-zinc-200 dark:border-zinc-800`).
- **Dark mode BẮT BUỘC** cho mọi thành phần: luôn kèm biến thể `dark:`. Test cả 2 mode.
- **Shape lock:** button/input `rounded-xl`; card `rounded-2xl`; avatar/pill `rounded-full`. Đừng trộn lung tung.
- **Font** đã set sẵn (Plus Jakarta Sans + JetBrains Mono cho số/mono). Không import font.
- **Tiếng Việt** cho mọi text hiển thị. **TUYỆT ĐỐI không dùng dấu gạch dài `—` (em-dash)** ở bất kỳ đâu — dùng dấu phẩy, chấm, hoặc `-` thường.
- Ảnh thật: khi cần placeholder ảnh (ảnh bìa, ảnh minh hoạ) dùng `https://picsum.photos/seed/<mô-tả>/<w>/<h>`. Không vẽ SVG fake.
- **Đủ trạng thái:** loading (dùng `<Skeleton>` khớp layout, không spinner tràn màn), empty (`<EmptyState>`), error (toast qua `useToast()`). Không chỉ làm mỗi happy path.
- Responsive: mobile-first, layout nhiều cột phải khai báo fallback `< md`. Content bọc trong `max-w-*` hợp lý (feed thường `max-w-xl`/`max-w-2xl`).

## Bộ UI dùng chung — import từ barrel

```js
import {
	Button, buttonClasses, IconButton, Input, Textarea, Avatar, Card,
	Spinner, Skeleton, EmptyState, Modal, useToast,
} from "../../components/ui";
```

- `<Button variant="primary|secondary|ghost|outline|danger" size="sm|md|lg" loading>` — accent lo sẵn.
- `buttonClasses({variant,size,className})` — để style `<Link>` cho giống button.
- `<Input label error hint leftIcon />`, `<Textarea label error />` — label trên, error dưới.
- `<Avatar src name size="xs|sm|md|lg|xl" />` — tự fallback initials + tint theo tên.
- `<Card>` — surface bo góc + viền. `<IconButton label><Icon/></IconButton>` — nút icon tròn.
- `<Modal open onClose title size>`, `<EmptyState icon title description action>`.
- `const toast = useToast(); toast.success("..."); toast.error("...")`.

## Data layer

```js
import api, { http, toFormData } from "../../lib/api";   // api.get/post/put/delete -> TRẢ THẲNG .result
import endpoints from "../../lib/endpoints";              // mọi URL ở đây, đừng tự ghép path
import { useAuth } from "../../lib/auth";                 // const { user, userId } = useAuth()
import { timeAgo, displayName } from "../../lib/format";
```

- `api.get/post/put/patch/delete` đã **tự bóc `ApiResponse.result`** và tự gắn JWT. Lỗi sẽ `throw` Error có `.message` (tiếng Việt từ server) + `.status`.
- Envelope backend: `ApiResponse { code, message, result }`. Trang phân trang: `result = PageResponse { content[], page, size, totalElements, totalPages, hasNext, hasPrevious }`. Đa số list nhận query `?page=1&size=10` (page bắt đầu từ 1).
- **Upload ảnh (multipart):** `http.post(url, toFormData({ content, images: [file1,file2] }), { headers: { "Content-Type": "multipart/form-data" } })` rồi đọc `res.data.result`. (Với post: field `content` + `images`; với profile avatar/background: field khác — ĐỌC controller để lấy đúng tên field.)
- `userId` (từ JWT `sub`) = id user hiện tại. Dùng để so sánh chủ sở hữu (vd nút xoá bài của mình).

## Grounding: ĐỌC DTO backend để lấy đúng field

Repo backend nằm ở `../<service>-service/src/main/java/com/tien/<svc>/`. TRƯỚC khi code 1 màn, đọc:
`controller/` (path + request param + tên field multipart) và `dto/request`, `dto/response` (tên field chính xác của JSON).
Đừng đoán tên field — verify bằng file thật. Endpoint URL thì đã có sẵn trong `endpoints.js`.

## Xong việc

- Page chính phải `export default` tại đúng path router đã trỏ (đừng đổi tên/đường dẫn file page).
- Đặt component con + hook trong chính feature folder của bạn (vd `feature/feed/components/PostCard.jsx`).
- Chạy `npx vite build` ở thư mục `frontend/` để chắc chắn không lỗi import trước khi báo xong.
- Báo cáo cuối: liệt kê file đã tạo + endpoint đã dùng + chỗ nào chưa chắc (nếu có).
