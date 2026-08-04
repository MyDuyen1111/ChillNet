import { Link } from "react-router-dom";
import { Avatar, Skeleton, buttonClasses } from "../../../components/ui";
import { useAuth } from "../../../lib/auth";
import { displayName } from "../../../lib/format";
import { useSuggestedFriends } from "../hooks/useSuggestedFriends";
import SuggestionRow from "./SuggestionRow";

const FOOTER_LINKS = ["Giới thiệu", "Trợ giúp", "Quyền riêng tư", "Điều khoản"];

// Instagram's right rail: "who am I", "who should I follow", legal footer.
// Only visible at `xl` and up, per the feed layout contract.
export default function FeedSidebar() {
	const { user } = useAuth();
	const profile = user?.profile;
	const name = displayName(profile);
	const { suggestions, status } = useSuggestedFriends();

	return (
		<aside className="sticky top-[30px] hidden h-fit w-[320px] shrink-0 xl:block">
			<div className="flex items-center gap-3">
				<Link to="/profile" className="shrink-0">
					<Avatar src={profile?.avatar} name={name} size="md" />
				</Link>
				<div className="min-w-0 flex-1">
					<Link to="/profile" className="block truncate text-sm font-semibold text-ink">
						{profile?.username || name}
					</Link>
						{/* Same guard as the profile header: without a real name this line
					    would just repeat the username above it. */}
					{name !== profile?.username && (
						<p className="truncate text-xs text-muted">{name}</p>
					)}
				</div>
				<Link to="/profile" className={buttonClasses({ variant: "link", size: "sm" })}>
					Chuyển
				</Link>
			</div>

			<div className="mt-6 flex items-center justify-between">
				<span className="text-sm font-semibold text-muted">Gợi ý cho bạn</span>
				<Link to="/friends" className={buttonClasses({ variant: "link", size: "sm" })}>
					Xem tất cả
				</Link>
			</div>

			<div className="mt-3 space-y-3">
				{status === "loading" &&
					Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="flex items-center gap-3">
							<Skeleton className="h-11 w-11 rounded-full" />
							<div className="flex-1 space-y-1.5">
								<Skeleton className="h-3 w-24" />
								<Skeleton className="h-2.5 w-16" />
							</div>
						</div>
					))}

				{status === "ready" && suggestions.length === 0 && (
					<p className="text-xs text-muted">Chưa có gợi ý kết bạn nào.</p>
				)}

				{status === "ready" &&
					suggestions.map((s) => <SuggestionRow key={s.userId} suggestion={s} />)}
			</div>

			<footer className="mt-8 space-y-3 text-[11px] leading-relaxed text-faint">
				<p className="flex flex-wrap gap-x-1.5 gap-y-1">
					{FOOTER_LINKS.map((label, i) => (
						<span key={label}>
							{label}
							{i < FOOTER_LINKS.length - 1 && <span className="ml-1.5">·</span>}
						</span>
					))}
				</p>
				<p>© 2026 CHILLNET</p>
			</footer>
		</aside>
	);
}
