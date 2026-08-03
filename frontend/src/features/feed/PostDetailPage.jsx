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
		<div className="mx-auto w-full max-w-2xl px-4 py-6">
			<Link
				to="/feed"
				className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
			>
				<ArrowLeft size={18} />
				Về bảng tin
			</Link>

			{status === "loading" && <PostCardSkeleton />}

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
