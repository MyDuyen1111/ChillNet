import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
	BookOpen,
	Flag,
	Gear,
	Heart,
	House,
	List,
	MagnifyingGlass,
	Moon,
	PaperPlaneTilt,
	PlusSquare,
	ShieldCheck,
	SignOut,
	Sun,
	Users,
	UsersThree,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useAuth } from "../../lib/auth";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { displayName } from "../../lib/format";
import { cn } from "../../lib/cn";
import { Avatar } from "../ui";

// Instagram's rail order. `badge` marks the item that carries the unread pill.
//
// "Tìm kiếm" trỏ tới /search (tìm toàn cục qua profile/post/group); /friends là
// một mục riêng vì nó quản lý quan hệ của chính mình chứ không phải tìm kiếm.
const NAV = [
	{ to: "/feed", label: "Trang chủ", icon: House },
	{ to: "/search", label: "Tìm kiếm", icon: MagnifyingGlass },
	{ to: "/friends", label: "Bạn bè", icon: Users },
	{ to: "/groups", label: "Nhóm", icon: UsersThree },
	{ to: "/messages", label: "Tin nhắn", icon: PaperPlaneTilt },
	{ to: "/notifications", label: "Thông báo", icon: Heart, badge: true },
];

// The phone tab bar shows five destinations; notifications live in the top bar.
// Bạn bè bị bỏ ra khỏi thanh dưới cho đỡ chật — vào được từ trang Tìm kiếm.
const MOBILE_NAV = ["/feed", "/search", "/groups", "/messages"];

function useUnreadCount() {
	const [count, setCount] = useState(0);
	useEffect(() => {
		let alive = true;
		const load = () =>
			api
				.get(endpoints.notification.unreadCount)
				.then((r) => alive && setCount(typeof r === "number" ? r : (r?.count ?? 0)))
				.catch(() => {});
		load();
		const id = setInterval(load, 30000);
		return () => {
			alive = false;
			clearInterval(id);
		};
	}, []);
	return count;
}

function useDarkMode() {
	const [dark, setDark] = useState(() =>
		document.documentElement.classList.contains("dark"),
	);
	useEffect(() => {
		document.documentElement.classList.toggle("dark", dark);
		localStorage.setItem("chillnet-theme", dark ? "dark" : "light");
	}, [dark]);
	return [dark, () => setDark((d) => !d)];
}

function Badge({ count }) {
	if (!count) return null;
	return (
		<span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-like px-1 text-[11px] font-semibold leading-none text-white">
			{count > 9 ? "9+" : count}
		</span>
	);
}

// Below xl the rail is a 73px icon strip; at xl it opens up and the labels
// appear. On the inbox it stays an icon strip at every width.
const railShell = (compact) =>
	cn(
		"flex h-12 w-12 items-center justify-center gap-4 rounded-full text-base text-ink transition-colors hover:bg-hover",
		!compact && "xl:h-auto xl:w-auto xl:justify-start xl:p-3",
	);
const railLabel = (compact) => (compact ? "hidden" : "hidden truncate xl:block");

/**
 * One rail row. Instagram animates the glyph with a small press-scale, turns it
 * solid when active, and bolds the label.
 */
function RailItem({ to, label, icon: Icon, compact, badge, onClick, as = "link" }) {
	const reduce = useReducedMotion();
	const body = (isActive) => (
		<>
			<span className="relative">
				<motion.span
					whileTap={reduce ? undefined : { scale: 0.9 }}
					className="block"
				>
					<Icon size={24} weight={isActive ? "fill" : "regular"} />
				</motion.span>
				{badge}
			</span>
			<span className={cn(railLabel(compact), isActive && "font-bold")}>{label}</span>
		</>
	);

	const shell = railShell(compact);

	if (as === "button") {
		return (
			<button type="button" onClick={onClick} title={label} className={shell}>
				{body(false)}
			</button>
		);
	}

	return (
		<NavLink to={to} title={label} className={shell}>
			{({ isActive }) => body(isActive)}
		</NavLink>
	);
}

/** The "Thêm" popover: settings, theme, sign out. */
function MoreMenu({ compact, onLogout, isAdmin }) {
	const [open, setOpen] = useState(false);
	const [dark, toggleDark] = useDarkMode();
	const ref = useRef(null);
	const reduce = useReducedMotion();

	useEffect(() => {
		if (!open) return;
		const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
		const onKey = (e) => e.key === "Escape" && setOpen(false);
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const row =
		"flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm text-ink transition-colors hover:bg-hover";

	return (
		<div ref={ref} className="relative">
			<AnimatePresence>
				{open && (
					<motion.div
						initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 4, scale: 0.98 }}
						transition={{ duration: 0.15, ease: "easeOut" }}
						className="absolute bottom-full left-0 mb-2 w-[266px] overflow-hidden rounded-xl bg-surface p-2 shadow-[0_4px_12px_rgba(0,0,0,0.15)] ring-1 ring-line"
					>
						<Link to="/settings" onClick={() => setOpen(false)} className={row}>
							Cài đặt <Gear size={18} />
						</Link>
						<Link to="/my-reports" onClick={() => setOpen(false)} className={row}>
							Báo cáo của tôi <Flag size={18} />
						</Link>
						{isAdmin && (
							<Link
								to="/admin/moderation"
								onClick={() => setOpen(false)}
								className={row}
							>
								Kiểm duyệt <ShieldCheck size={18} />
							</Link>
						)}
						<Link
							to="/policies/community"
							onClick={() => setOpen(false)}
							className={row}
						>
							Tiêu chuẩn cộng đồng <BookOpen size={18} />
						</Link>
						<button type="button" onClick={toggleDark} className={row}>
							Chuyển chế độ {dark ? <Sun size={18} /> : <Moon size={18} />}
						</button>
						<div className="my-1 h-px bg-line" />
						<button type="button" onClick={onLogout} className={row}>
							Đăng xuất <SignOut size={18} />
						</button>
					</motion.div>
				)}
			</AnimatePresence>
			<RailItem
				as="button"
				label="Thêm"
				icon={List}
				compact={compact}
				onClick={() => setOpen((o) => !o)}
			/>
		</div>
	);
}

export default function AppShell() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const unread = useUnreadCount();
	const name = displayName(user?.profile);
	const avatar = user?.profile?.avatar;
	const isAdmin = Boolean(user?.roles?.includes("ROLE_ADMIN"));

	// Instagram narrows the rail to icons whenever the page owns the full width
	// (the inbox), so the conversation list gets its space back.
	const compact = location.pathname.startsWith("/messages");

	const onLogout = async () => {
		// `logout` revoke token ở identity-service rồi mới trả về; nó tự nuốt lỗi
		// mạng nên chỉ cần chờ để không điều hướng giữa chừng.
		await logout();
		navigate("/login", { replace: true });
	};
	const onCreate = () => navigate("/feed?create=1");

	const railWidth = compact ? "w-[73px]" : "w-[73px] xl:w-[245px]";
	const mainOffset = compact ? "md:pl-[73px]" : "md:pl-[73px] xl:pl-[245px]";

	return (
		<div className="min-h-[100dvh] bg-canvas text-ink">
			{/* Desktop / tablet rail */}
			<aside
				className={cn(
					"fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-surface px-3 pb-5 pt-2 md:flex",
					railWidth,
				)}
			>
				<Link
					to="/feed"
					className="mb-5 flex h-[73px] items-center px-3"
					aria-label="ChillNet"
				>
					<span
						className={cn(
							"text-2xl leading-none tracking-tight",
							compact ? "hidden" : "hidden xl:block",
						)}
						style={{ fontFamily: "var(--font-script)" }}
					>
						ChillNet
					</span>
					{/* Collapsed mark. Deliberately NOT the script face: Grand Hotel's
					    capital C reads as a lowercase "e" on its own, so the compact
					    rail uses a plain sans letter, the way Instagram swaps its
					    wordmark for the camera glyph. */}
					<span
						className={cn(
							"h-[26px] w-[26px] text-center text-2xl font-bold leading-[26px]",
							compact ? "block" : "block xl:hidden",
						)}
					>
						C
					</span>
				</Link>

				<nav className="flex flex-1 flex-col gap-1.5">
					{NAV.map(({ to, label, icon, badge }) => (
						<RailItem
							key={to}
							to={to}
							label={label}
							icon={icon}
							compact={compact}
							badge={badge ? <Badge count={unread} /> : null}
						/>
					))}
					<RailItem
						as="button"
						label="Tạo"
						icon={PlusSquare}
						compact={compact}
						onClick={onCreate}
					/>
					<NavLink to="/profile" title="Trang cá nhân" className={railShell(compact)}>
						{({ isActive }) => (
							<>
								<span
									className={cn(
										"rounded-full",
										isActive &&
											"ring-2 ring-ink ring-offset-2 ring-offset-surface",
									)}
								>
									<Avatar src={avatar} name={name} size="xs" />
								</span>
								<span
									className={cn(
										railLabel(compact),
										isActive && "font-bold",
									)}
								>
									Trang cá nhân
								</span>
							</>
						)}
					</NavLink>
				</nav>

				<MoreMenu compact={compact} onLogout={onLogout} isAdmin={isAdmin} />
			</aside>

			{/* Phone top bar */}
			<header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-line bg-surface px-4 md:hidden">
				<Link to="/feed" className="text-2xl" style={{ fontFamily: "var(--font-script)" }}>
					ChillNet
				</Link>
				<div className="flex items-center gap-5">
					<Link to="/notifications" aria-label="Thông báo" className="relative">
						<Heart size={24} />
						<Badge count={unread} />
					</Link>
					<button type="button" onClick={onCreate} aria-label="Tạo bài viết">
						<PlusSquare size={24} />
					</button>
				</div>
			</header>

			<main className={cn("pb-[50px] md:pb-0", mainOffset)}>
				<Outlet />
			</main>

			{/* Phone tab bar */}
			<nav className="fixed bottom-0 left-0 right-0 z-30 flex h-[50px] items-center justify-around border-t border-line bg-surface md:hidden">
				{MOBILE_NAV.map((to) => {
					const item = NAV.find((n) => n.to === to);
					const Icon = item.icon;
					return (
						<NavLink key={to} to={to} aria-label={item.label} className="p-2">
							{({ isActive }) => (
								<Icon size={24} weight={isActive ? "fill" : "regular"} />
							)}
						</NavLink>
					);
				})}
				<NavLink to="/profile" aria-label="Trang cá nhân" className="p-2">
					{({ isActive }) => (
						<span
							className={cn(
								"block rounded-full",
								isActive && "ring-2 ring-ink ring-offset-1 ring-offset-surface",
							)}
						>
							<Avatar src={avatar} name={name} size="xs" />
						</span>
					)}
				</NavLink>
			</nav>
		</div>
	);
}
