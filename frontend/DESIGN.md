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

## Ngôn ngữ thiết kế: Instagram Web (BẮT BUỘC nhất quán)

Toàn bộ giao diện bám theo Instagram web. Nguyên tắc gốc: **chrome đơn sắc, nội dung (ảnh) là thứ duy nhất có màu.**

### Token màu — dùng token, KHÔNG dùng `zinc-*`/`brand-*`/màu Tailwind thô

Token tự đảo theo dark mode, nên **không cần viết biến thể `dark:`** cho chúng.

| Class | Nghĩa | Light | Dark |
|---|---|---|---|
| `bg-canvas` | nền trang | `#fafafa` | `#000` |
| `bg-surface` | nền card/panel | `#fff` | `#000` |
| `border-line` | viền hairline chuẩn | `#dbdbdb` | `#262626` |
| `border-line-soft` | vạch chia nhạt hơn | `#efefef` | `#1f1f1f` |
| `text-ink` | chữ chính | `#000` | `#f5f5f5` |
| `text-muted` | chữ phụ, timestamp, caption phụ | `#737373` | `#a8a8a8` |
| `text-faint` | placeholder, chữ mờ nhất | `#c7c7c7` | `#737373` |
| `bg-hover` | nền khi hover row/nav | `#f2f2f2` | `#1a1a1a` |
| `bg-fill` | nút phụ, input fill, skeleton | `#efefef` | `#262626` |
| `bg-fill-strong` | fill đậm hơn (hover nút phụ) | `#dbdbdb` | `#363636` |

Màu điểm nhấn (giống nhau ở cả 2 mode):

- `text-accent` / `bg-accent` = `#0095f6` — nút chính, link xanh ("Theo dõi", "Xem tất cả"). `hover:bg-accent-hover`.
- `text-accent-strong` = `#00376b` — hashtag/mention/link trong nội dung.
- `text-like` / `bg-like` = `#ed4956` — tim đã thích, badge số, lỗi, hành động nguy hiểm.
- `.story-ring` — gradient cam-tím, CHỈ dùng cho vòng story quanh avatar (`<Avatar ring="story">`).

**Không có màu nào khác.** Không teal, không emerald, không tint avatar nhiều màu, không gradient nào ngoài story ring.

### Typography

- Font = system stack (`--font-sans`), đã set ở `body`. Không import font.
- Cỡ chữ chỉ dùng: `text-xs` (12px, meta/tab), `text-sm` (14px, mặc định gần như mọi nơi), `text-base` (16px, nav + tiêu đề panel), `text-[22px] font-light` (tiêu đề empty-state lớn).
- Độ đậm: `font-semibold` (600) cho username/tên/nút/tiêu đề. `font-normal` cho nội dung. **Không dùng `font-bold` cho heading** (chỉ dùng cho item nav đang active).
- Tên người dùng luôn `text-sm font-semibold text-ink`; thời gian luôn `text-xs text-muted`.

### Hình khối & bề mặt

- **Shape lock:** input `rounded` (4px); nút/card `rounded-lg` (8px); modal `rounded-xl` (12px); avatar/pill `rounded-full`.
- **KHÔNG đổ bóng.** Chỉ modal và popover được có shadow. Card phân tách bằng `border border-line`, không bằng shadow.
- Bài viết trên feed tràn viền ở mobile: dùng `<Card flush>`.
- Vạch chia trong list: `divide-y divide-line` hoặc `border-b border-line`.

### Icon & tương tác

- Icon chrome (nav, action bar bài viết) = `size={24}`, `weight="regular"`. Icon inline nhỏ = `size={16|20}`.
- Trạng thái active/đã-thích: đổi sang `weight="fill"` (tim thích thêm `className="text-like"`).
- Nút icon: **không nền, không viền** — dùng `<IconButton>` (hover chỉ mờ đi `opacity-60`). Không `hover:bg-*` cho nút icon.
- Không `active:scale-*` cho nút thường; chỉ glyph nav mới có press-scale nhẹ.

### Bố cục (rất quan trọng để "ra chất" Instagram)

- Shell đã lo sidebar trái (73px, mở 245px ở `xl`) + tab bar mobile. Page của bạn **chỉ render nội dung**, tự bọc container riêng, tự lo padding trên (`pt-4 md:pt-[30px]`).
- **Feed:** cột bài viết `max-w-[470px]`; feed + right rail bọc trong `max-w-[935px] mx-auto` với rail `w-[320px]` chỉ hiện ở `xl` (`hidden xl:block`).
- **Profile / trang nội dung khác:** `max-w-[935px] mx-auto px-4`.
- **Lưới ảnh:** 3 cột, `gap-1 sm:gap-[3px] md:gap-1`, ô vuông `aspect-square object-cover`.
- **Inbox:** 2 panel, list `w-[350px] shrink-0 border-r border-line`, cửa sổ chat chiếm phần còn lại, chiều cao `h-[calc(100dvh-60px)] md:h-[100dvh]`.

### Nội dung & trạng thái

- **Tiếng Việt** cho mọi text hiển thị. **TUYỆT ĐỐI không dùng dấu gạch dài `—` (em-dash)** ở bất kỳ đâu, dùng dấu phẩy, chấm, hoặc `-` thường.
- Ảnh thật: khi cần placeholder ảnh dùng `https://picsum.photos/seed/<mô-tả>/<w>/<h>`. Không vẽ SVG fake.
- **Đủ trạng thái:** loading (`<Skeleton>` khớp layout, không spinner tràn màn), empty (`<EmptyState>` kiểu Instagram: vòng tròn viền mảnh + tiêu đề nhẹ), error (toast qua `useToast()`).
- Responsive: mobile-first. Mọi layout nhiều cột phải có fallback `< md`.

## Bộ UI dùng chung — import từ barrel

```js
import {
	Button, buttonClasses, IconButton, Input, Textarea, Avatar, Card, Tabs,
	Spinner, Skeleton, EmptyState, Modal, useToast,
} from "../../components/ui";
```

- `<Button variant="primary|secondary|ghost|outline|link|danger" size="sm|md|lg" loading>` — `primary` = nút xanh Instagram, `secondary` = nút xám `#efefef`, `link` = chữ xanh không nền (dùng cho "Theo dõi", "Xem tất cả"). Mặc định `md` = cao 32px.
- `buttonClasses({variant,size,className})` — để style `<Link>` cho giống button.
- `<Input label error hint leftIcon />`, `<Textarea label error />` — label trên, error dưới.
- `<Avatar src name size="xs|sm|md|lg|xl|2xl" ring={false|"story"|"seen"} />` — `xs`24 `sm`32 (header bài viết/comment) `md`44 `lg`56 (story, inbox) `xl`88 `2xl`150 (profile). Không có ảnh thì fallback chữ cái đơn sắc.
- `<Card flush>` — surface phẳng + hairline; `flush` bỏ viền/bo góc ở mobile.
- `<Tabs items={[{key,label,icon}]} value onChange />` — dải tab CHỮ HOA kiểu profile Instagram.
- `<IconButton label><Icon/></IconButton>` — nút icon trần.
- `<Modal open onClose title size>` — scrim đen 65%, tiêu đề canh giữa, nút X ở góc màn hình.
- `<EmptyState icon title description action>`.
- `const toast = useToast(); toast.success("..."); toast.error("...")` — hiện pill đen ở giữa dưới.

## Data layer

```js
import api, { http, toFormData } from "../../lib/api";   // api.get/post/put/delete -> TRẢ THẲNG .result
import endpoints from "../../lib/endpoints";              // mọi URL ở đây, đừng tự ghép path
import { useAuth } from "../../lib/auth";                 // const { user, userId } = useAuth()
import { timeAgo, displayName } from "../../lib/format";
```

- `api.get/post/put/patch/delete` đã **tự bóc `ApiResponse.result`** và tự gắn JWT. Lỗi sẽ `throw` Error có `.message` (tiếng Việt từ server) + `.status`.
- Envelope backend: `ApiResponse { code, message, result }`. Trang phân trang: `result = PageResponse { content[], page, size, totalElements, totalPages, hasNext, hasPrevious }`. Đa số list nhận query `?page=1&size=10` (page bắt đầu từ 1).
- **Upload ảnh (multipart):** `http.post(url, toFormData({ content, images: [file1,file2] }), { headers: { "Content-Type": "multipart/form-data" } })` rồi đọc `res.data.result`.
- `userId` (từ JWT `sub`) = id user hiện tại. Dùng để so sánh chủ sở hữu.

## Grounding: ĐỌC DTO backend để lấy đúng field

Repo backend nằm ở `../<service>-service/src/main/java/com/tien/<svc>/`. TRƯỚC khi code 1 màn, đọc:
`controller/` (path + request param + tên field multipart) và `dto/request`, `dto/response` (tên field chính xác của JSON).
Đừng đoán tên field, verify bằng file thật. Endpoint URL thì đã có sẵn trong `endpoints.js`.

## Xong việc

- Page chính phải `export default` tại đúng path router đã trỏ (đừng đổi tên/đường dẫn file page).
- Đặt component con + hook trong chính feature folder của bạn (vd `feature/feed/components/PostCard.jsx`).
- Chạy `npx vite build` ở thư mục `frontend/` để chắc chắn không lỗi import trước khi báo xong.
- Báo cáo cuối: liệt kê file đã tạo + endpoint đã dùng + chỗ nào chưa chắc (nếu có).
