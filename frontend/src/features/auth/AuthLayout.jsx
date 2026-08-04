// Khung dùng chung cho màn đăng nhập / đăng ký, bám sát Instagram Web: một
// cột hẹp căn giữa màn hình, hộp form viền mảnh, hộp phụ chuyển trang bên
// dưới, và dòng bản quyền cuối cùng.
export default function AuthLayout({ children, footer }) {
	return (
		<div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4 py-8">
			<div className="flex w-full max-w-[350px] flex-col gap-2.5">
				<div className="border border-line bg-surface px-10 py-10">
					<h1
						className="mb-8 text-center text-[42px] leading-none text-ink"
						style={{ fontFamily: "var(--font-script)" }}
					>
						ChillNet
					</h1>
					{children}
				</div>
				{footer && (
					<div className="border border-line bg-surface py-5 text-center text-sm text-ink">
						{footer}
					</div>
				)}
				<p className="pt-2 text-center text-xs text-muted">
					© {new Date().getFullYear()} CHILLNET
				</p>
			</div>
		</div>
	);
}
