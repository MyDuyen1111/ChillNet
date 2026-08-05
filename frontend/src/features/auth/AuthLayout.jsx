import AuthCollage from "./AuthCollage";

// Khung dùng chung cho màn đăng nhập / đăng ký, bám sát trang logged-out mới
// của Instagram: hai cột ngăn nhau bằng một đường kẻ dọc — trái là hero
// (wordmark + headline + cụm ảnh), phải là form — và một dải footer chạy hết
// chiều ngang ở dưới cùng. Dưới `lg` cột hero bị ẩn, chỉ còn form một cột.
const FOOTER_LINKS = [
	"Giới thiệu",
	"Blog",
	"Việc làm",
	"Trợ giúp",
	"API",
	"Quyền riêng tư",
	"Điều khoản",
	"Vị trí",
	"Phổ biến",
	"ChillNet Lite",
	"ChillNet AI",
];

function Wordmark({ className }) {
	return (
		<span className={className} style={{ fontFamily: "var(--font-script)" }}>
			ChillNet
		</span>
	);
}

export default function AuthLayout({ children }) {
	return (
		<div className="flex min-h-[100dvh] flex-col bg-surface">
			<main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-5 lg:flex-row lg:px-8">
				<section className="hidden flex-1 flex-col pt-14 pr-12 pb-10 lg:flex">
					<Wordmark className="text-[46px] leading-none text-ink" />
					<h2 className="mt-10 max-w-[540px] text-[38px] leading-[1.35] font-normal tracking-tight text-ink">
						Hãy xem các khoảnh khắc thường ngày của{" "}
						<span className="bg-gradient-to-r from-[#ff5e62] via-[#e1306c] to-[#c13584] bg-clip-text text-transparent">
							bạn thân
						</span>{" "}
						nhé.
					</h2>
					<AuthCollage className="mt-4 w-full max-w-[540px]" />
				</section>

				<div aria-hidden className="hidden w-px shrink-0 bg-line lg:block" />

				{/* Từ `lg` trở lên cột form căn giữa theo chiều dọc so với cột hero
				    bên trái (cột hero mới là thứ quyết định chiều cao của main). */}
				<section className="flex w-full flex-col py-10 lg:w-[470px] lg:shrink-0 lg:justify-center lg:py-14 lg:pl-14">
					<div className="mx-auto w-full max-w-[400px]">
						<Wordmark className="mb-8 block text-center text-[42px] leading-none text-ink lg:hidden" />
						{children}
					</div>
				</section>
			</main>

			<footer className="mx-auto w-full max-w-[1180px] px-5 pt-6 pb-8 lg:px-8">
				<ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted">
					{FOOTER_LINKS.map((label) => (
						<li key={label}>{label}</li>
					))}
				</ul>
				<p className="mt-4 text-center text-xs text-muted">
					Tiếng Việt · © {new Date().getFullYear()} CHILLNET
				</p>
			</footer>
		</div>
	);
}
