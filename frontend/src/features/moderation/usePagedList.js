import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../lib/api";

// Danh sách phân trang dùng chung cho 4 màn của Trust & Safety (hàng đợi hồ sơ,
// hàng đợi khiếu nại, báo cáo của tôi, hồ sơ liên quan tới tôi). Cả bốn đều đọc
// cùng một kiểu PageResponse đã được lib/api.js chuẩn hoá về `.content`/`.hasNext`.
//
// `params` được so sánh bằng JSON thay vì tham chiếu, nên nơi gọi truyền thẳng
// object literal (`{ status }`) mà không cần useMemo — đổi bộ lọc thì tự nạp lại
// từ trang 1, còn render lại vì lý do khác thì không.
export function usePagedList(url, params = {}, { size = 20, enabled = true } = {}) {
	const [items, setItems] = useState([]);
	const [page, setPage] = useState(1);
	const [hasNext, setHasNext] = useState(false);
	const [loading, setLoading] = useState(enabled);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState(null);

	const paramsKey = JSON.stringify(params);
	// Giữ bản params mới nhất ngoài dependency để `load` chỉ đổi khi paramsKey đổi.
	const paramsRef = useRef(params);
	paramsRef.current = params;

	const load = useCallback(
		async (targetPage) => {
			const first = targetPage === 1;
			if (first) {
				setLoading(true);
				setError(null);
			} else {
				setLoadingMore(true);
			}
			try {
				const res = await api.get(url, {
					params: { ...paramsRef.current, page: targetPage, size },
				});
				const list = res?.content ?? [];
				setItems((prev) => (first ? list : [...prev, ...list]));
				setPage(targetPage);
				setHasNext(Boolean(res?.hasNext));
			} catch (e) {
				if (first) setError(e?.message || "Không tải được dữ liệu.");
				else setError(e?.message || "Không tải thêm được.");
			} finally {
				setLoading(false);
				setLoadingMore(false);
			}
		},
		// paramsKey là đại diện giá trị của params — dùng nó thay cho chính object.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[url, size, paramsKey],
	);

	useEffect(() => {
		if (!enabled) return;
		load(1);
	}, [enabled, load]);

	const loadMore = useCallback(() => {
		if (loading || loadingMore || !hasNext) return;
		load(page + 1);
	}, [hasNext, load, loading, loadingMore, page]);

	const reload = useCallback(() => load(1), [load]);

	// Cập nhật tại chỗ một phần tử sau khi hành động thành công, thay vì nạp lại
	// cả trang — giữ nguyên vị trí cuộn của kiểm duyệt viên.
	const replaceItem = useCallback((id, next) => {
		setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...next } : it)));
	}, []);

	return {
		items,
		loading,
		loadingMore,
		hasNext,
		error,
		loadMore,
		reload,
		replaceItem,
	};
}

export default usePagedList;
