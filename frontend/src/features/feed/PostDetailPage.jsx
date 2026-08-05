import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, WarningCircle } from "@phosphor-icons/react";
import { Button, EmptyState } from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import PostCard from "./components/PostCard";
import PostCardSkeleton from "./components/PostCardSkeleton";

export default function PostDetailPage() {
	const { postId } = useParams();
	const navigate = useNavigate();
	const [post, setPost] = useState(null);
	const [status, setStatus] = useState("loading"); // loading | ready | error

	const load = useCallback(async () => {
		setStatus("loading");
		try {
			const result = await api.get(endpoints.post.byId(postId));
			setPost(result);
			setStatus("ready");
		} catch {
			setStatus("error");
		}
	}, [postId]);

	useEffect(() => {
		load();
	}, [load]);

	return (
		<div className="px-4 pt-4 md:pt-[30px]">
			<Link
				to="/feed"
				className="mx-auto mb-4 flex max-w-[1100px] items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
			>
				<ArrowLeft size={18} />
				Về bảng tin
			</Link>

			{status === "loading" && (
				<div className="mx-auto max-w-[1100px]">
					<PostCardSkeleton />
				</div>
			)}

			{status === "error" && (
				<EmptyState
					icon={WarningCircle}
					title="Không tìm thấy bài viết"
					description="Bài viết có thể đã bị xoá hoặc bạn không có quyền xem."
					action={
						<Button variant="secondary" size="sm" onClick={() => navigate("/feed")}>
							Về bảng tin
						</Button>
					}
				/>
			)}

			{status === "ready" && post && (
				<PostCard post={post} detail onDeleted={() => navigate("/feed")} />
			)}
		</div>
	);
}
