import { ThemeToggle } from "../../components/ui";

// Asymmetric split: brand panel (left, desktop only) + form column (right).
export default function AuthLayout({ children, title, subtitle }) {
	return (
		<div className="grid min-h-[100dvh] lg:grid-cols-2">
			{/* Brand panel */}
			<div className="relative hidden overflow-hidden lg:block">
				<img
					src="https://picsum.photos/seed/chillnet-friends/1200/1600"
					alt=""
					className="absolute inset-0 h-full w-full object-cover"
				/>
				<div className="absolute inset-0 bg-gradient-to-br from-brand-700/90 via-brand-800/85 to-zinc-950/90" />
				<div className="relative flex h-full flex-col justify-between p-12 text-white">
					<div className="flex items-center gap-2">
						<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-xl font-bold backdrop-blur">
							C
						</span>
						<span className="text-xl font-bold tracking-tight">ChillNet</span>
					</div>
					<div className="max-w-md space-y-4">
						<h1 className="text-4xl font-bold leading-tight tracking-tight">
							Kết nối. Chia sẻ. Chill.
						</h1>
						<p className="text-base text-white/80">
							Nơi bạn đăng khoảnh khắc, trò chuyện với bạn bè và tham gia những
							cộng đồng hợp gu.
						</p>
					</div>
					<p className="text-sm text-white/50">
						© {new Date().getFullYear()} ChillNet
					</p>
				</div>
			</div>

			{/* Form column */}
			<div className="relative flex items-center justify-center px-6 py-12">
				<div className="absolute right-4 top-4">
					<ThemeToggle />
				</div>
				<div className="w-full max-w-sm">
					<div className="mb-8 lg:hidden">
						<span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white">
							C
						</span>
					</div>
					<h2 className="text-2xl font-bold tracking-tight">{title}</h2>
					{subtitle && <p className="mt-1.5 text-sm text-zinc-500">{subtitle}</p>}
					<div className="mt-8">{children}</div>
				</div>
			</div>
		</div>
	);
}
