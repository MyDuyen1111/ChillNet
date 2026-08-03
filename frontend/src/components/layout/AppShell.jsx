import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
	Bell,
	ChatCircleDots,
	House,
	SignOut,
	UsersThree,
	UserCircle,
	Users,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useAuth } from "../../lib/auth";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { displayName } from "../../lib/format";
import { cn } from "../../lib/cn";
import { Avatar, ThemeToggle } from "../ui";

const NAV = [
	{ to: "/feed", label: "Bảng tin", icon: House },
	{ to: "/friends", label: "Bạn bè", icon: Users },
	{ to: "/messages", label: "Tin nhắn", icon: ChatCircleDots },
	{ to: "/groups", label: "Nhóm", icon: UsersThree },
	{ to: "/notifications", label: "Thông báo", icon: Bell },
];

function NavItem({ to, label, icon: Icon, onClick }) {
	return (
		<NavLink
			to={to}
			onClick={onClick}
			className={({ isActive }) =>
				cn(
					"group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
					isActive
						? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
						: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
				)
			}
		>
			{({ isActive }) => (
				<>
					<Icon size={22} weight={isActive ? "fill" : "regular"} />
					<span>{label}</span>
					{isActive && (
						<motion.span
							layoutId="nav-active"
							className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-brand-500"
						/>
					)}
				</>
			)}
		</NavLink>
	);
}

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

export default function AppShell() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const unread = useUnreadCount();
	const name = displayName(user?.profile);
	const avatar = user?.profile?.avatar;

	const onLogout = () => {
		logout();
		navigate("/login", { replace: true });
	};

	return (
		<div className="mx-auto flex min-h-[100dvh] w-full max-w-[1400px]">
			{/* Desktop left rail */}
			<aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-zinc-200 px-4 py-6 dark:border-zinc-800 lg:flex">
				<Link to="/feed" className="mb-8 flex items-center gap-2 px-2">
					<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-bold text-white">
						C
					</span>
					<span className="text-lg font-bold tracking-tight">ChillNet</span>
				</Link>
				<nav className="flex flex-1 flex-col gap-1">
					{NAV.map((item) => (
						<NavItem key={item.to} {...item} />
					))}
					<NavItem to="/profile" label="Trang cá nhân" icon={UserCircle} />
				</nav>
				<div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-200 p-2.5 dark:border-zinc-800">
					<Link to="/profile">
						<Avatar src={avatar} name={name} size="md" />
					</Link>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-semibold">{name}</p>
						<p className="truncate text-xs text-zinc-500">
							@{user?.profile?.username ?? "..."}
						</p>
					</div>
					<button
						onClick={onLogout}
						aria-label="Đăng xuất"
						className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-rose-500 dark:hover:bg-zinc-800"
					>
						<SignOut size={18} />
					</button>
				</div>
			</aside>

			{/* Main column */}
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-zinc-50/80 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80 lg:px-8">
					<Link to="/feed" className="flex items-center gap-2 lg:hidden">
						<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
							C
						</span>
						<span className="font-bold">ChillNet</span>
					</Link>
					<div className="hidden lg:block" />
					<div className="flex items-center gap-1">
						<Link
							to="/notifications"
							className="relative rounded-full p-2.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
							aria-label="Thông báo"
						>
							<Bell size={20} />
							{unread > 0 && (
								<span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
									{unread > 9 ? "9+" : unread}
								</span>
							)}
						</Link>
						<ThemeToggle />
						<Link to="/profile" className="ml-1 lg:hidden">
							<Avatar src={avatar} name={name} size="sm" />
						</Link>
					</div>
				</header>

				<main className="flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">
					<Outlet />
				</main>
			</div>

			{/* Mobile bottom tab bar */}
			<nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-zinc-200 bg-white/90 px-2 py-2 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 lg:hidden">
				{NAV.map(({ to, label, icon: Icon }) => (
					<NavLink
						key={to}
						to={to}
						aria-label={label}
						className={({ isActive }) =>
							cn(
								"flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium",
								isActive
									? "text-brand-600 dark:text-brand-400"
									: "text-zinc-500 dark:text-zinc-400",
							)
						}
					>
						{({ isActive }) => (
							<>
								<Icon size={22} weight={isActive ? "fill" : "regular"} />
								{label}
							</>
						)}
					</NavLink>
				))}
			</nav>
		</div>
	);
}
