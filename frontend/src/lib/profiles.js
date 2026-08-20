import api from "./api";
import endpoints from "./endpoints";

// Nhiều endpoint của social-service chỉ trả về id (FollowResponse, Friendship,
// UserBlock...), nên mọi danh sách người dùng đều phải tự lấy hồ sơ.
//
// profile-service có sẵn GET /internal/users/batch nhận nhiều id một lượt,
// nhưng gateway chỉ để lộ nó ở `/profile/internal/**` — ngoài tiền tố
// `/api/v1` mà client dùng — nên từ trình duyệt không gọi tới được. Ở đây gọi
// song song từng id và bỏ qua id nào hỏng: một hồ sơ bị xoá không được phép
// làm trắng cả danh sách.
export async function fetchProfiles(ids) {
	const unique = [...new Set((ids || []).filter(Boolean))];
	if (unique.length === 0) return new Map();
	const settled = await Promise.allSettled(
		unique.map((id) => api.get(endpoints.profile.byId(id))),
	);
	const map = new Map();
	unique.forEach((id, i) => {
		if (settled[i].status === "fulfilled") map.set(id, settled[i].value);
	});
	return map;
}

export default fetchProfiles;
