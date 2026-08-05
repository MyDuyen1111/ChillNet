import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { WarningCircle, X } from "@phosphor-icons/react";
import { EmptyState } from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import PostCard from "./components/PostCard";
import PostCardSkeleton from "./components/PostCardSkeleton";

// Bài viết mở dạng popup đè lên trang đang xem (feed, hồ sơ, nhóm...). Chỉ được
// render khi location state có `background` — xem PostLink và App.jsx.
//
// Không dùng components/ui/Modal vì Modal có padding + tiêu đề riêng, còn panel
// bài viết cần tràn viền để ảnh dính sát mép như Instagram.
export default function PostDetailModal() {
	const { postId } = useParams();
	const navigate = useNavigate();
	const reduce = useReducedMotion();
	const [post, setPost] = useState(null);
	const [status, setStatus] = useState("loading"); // loading | ready | error

	// Đóng = lùi lại một bước lịch sử, nên URL tự quay về trang nền.
	const close = useCallback(() => navigate(-1), [navigate]);

	useEffect(() => {
		let alive = true;
		setStatus("loading");
		api.get(endpoints.post.byId(postId))
			.then((result) => {
				if (!alive) return;
				setPost(result);
				setStatus("ready");
			})
			.catch(() => {
				if (alive) setStatus("error");
			});
		return () => {
			alive = false;
		};
	}, [postId]);

	useEffect(() => {
		const onKey = (e) => e.key === "Escape" && close();
		document.addEventListener("keydown", onKey);
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = "";
		};
	}, [close]);

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
			<motion.div
				className="absolute inset-0 bg-black/65"
				initial={reduce ? false : { opacity: 0 }}
				animate={{ opacity: 1 }}
				onClick={close}
			/>

			<button
				type="button"
				onClick={close}
				aria-label="Đóng"
				className="absolute top-4 right-4 z-20 text-white/90 transition-opacity hover:opacity-60"
			>
				<X size={24} />
			</button>

			<motion.div
				role="dialog"
				aria-modal="true"
				aria-label="Chi tiết bài viết"
				initial={reduce ? false : { opacity: 0, scale: 0.97 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.15, ease: "easeOut" }}
				className="relative z-10 w-full max-w-[1100px]"
			>
				{status === "loading" && <PostCardSkeleton />}

				{status === "error" && (
					<div className="rounded-xl bg-surface p-8">
						<EmptyState
							icon={WarningCircle}
							title="Không tìm thấy bài viết"
							description="Bài viết có thể đã bị xoá hoặc bạn không có quyền xem."
						/>
					</div>
				)}

				{status === "ready" && post && <PostCard post={post} detail onDeleted={close} />}
			</motion.div>
		</div>,
		document.body,
	);
}
