import { http, toFormData } from "./api";
import endpoints from "./endpoints";

// Upload ảnh thẳng lên file-service để lấy URL công khai.
//
// Đường thường dùng khi ĐĂNG bài là `/post/create` (multipart) — post-service tự
// gọi file-service hộ. Nhưng khi SỬA bài thì không dùng được: endpoint multipart
// `PUT /post/{id}` thay TOÀN BỘ danh sách ảnh bằng đúng những file vừa gửi, nên
// thêm một ảnh sẽ xoá sạch các ảnh cũ. Cách duy nhất giữ được ảnh cũ là tự upload
// ảnh mới ở đây rồi gửi danh sách URL đầy đủ qua `PUT /post/{id}/json`.
//
// file-service KHÔNG bọc kết quả trong ApiResponse — nó trả thẳng UploadResponse
// (hoặc mảng UploadResponse), nên `api.post` sẽ đưa nguyên vật đó ra vì không
// tìm thấy `.result`.
const IMAGE_TYPE_POST = "POST_IMAGE";

// Đúng bằng ALLOWED_CONTENT_TYPES và MAX_FILE_SIZE của file-service
// (ImageService). Kiểm tra lại ở client không phải để bảo mật — backend vẫn tự
// chặn — mà để người dùng biết ngay tệp nào không nhận, thay vì chọn ảnh xong
// bấm lưu rồi ăn một lỗi khó hiểu. `accept="image/*"` của trình duyệt rộng hơn
// danh sách này (bmp, heic, tiff... đều lọt qua).
export const ALLOWED_IMAGE_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	"image/avif",
];

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

// Trả về { ok, rejected } — `rejected` là lý do đọc được để hiện cho người dùng.
export function screenImageFiles(files) {
	const ok = [];
	const rejected = [];
	for (const file of Array.from(files || [])) {
		if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
			rejected.push(`${file.name}: định dạng không được hỗ trợ`);
		} else if (file.size > MAX_IMAGE_BYTES) {
			rejected.push(`${file.name}: vượt quá 20MB`);
		} else {
			ok.push(file);
		}
	}
	return { ok, rejected };
}

export async function uploadPostImages(files, { ownerId, postId }) {
	const list = Array.from(files || []);
	if (list.length === 0) return [];

	// Endpoint số nhiều nhận `files` (List<MultipartFile>), số ít nhận `file`.
	// Dùng đúng cái tương ứng: gửi một file vào endpoint số nhiều vẫn chạy, nhưng
	// gửi nhiều file vào endpoint số ít thì Spring chỉ nhận file đầu tiên.
	const single = list.length === 1;
	const form = toFormData({
		[single ? "file" : "files"]: single ? list[0] : list,
		type: IMAGE_TYPE_POST,
		ownerId,
		postId,
	});

	const res = await http.post(
		single ? endpoints.file.uploadFormData : endpoints.file.uploadMultipleFormData,
		form,
		{ headers: { "Content-Type": "multipart/form-data" } },
	);

	const payload = res.data?.result ?? res.data;
	const rows = Array.isArray(payload) ? payload : [payload];
	return rows.map((row) => row?.secureUrl).filter(Boolean);
}

export default uploadPostImages;
