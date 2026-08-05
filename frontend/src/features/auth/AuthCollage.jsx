// Minh hoạ cho cột trái màn đăng nhập: cụm ảnh nghiêng kiểu Instagram (ba thẻ
// story, bong bóng emoji, huy hiệu, trái tim, avatar có vòng story). Vẽ hoàn
// toàn bằng SVG nên không cần asset ảnh và tự co giãn theo cột.
//
// Các mảng nền dùng gradient cố định (giống ảnh thật), còn những chi tiết đóng
// vai trò "giấy trắng" thì lấy var(--ig-surface)/(--ig-line) để đổi màu theo
// dark mode cùng phần còn lại của app.
export default function AuthCollage({ className }) {
	return (
		<svg
			viewBox="0 0 560 460"
			className={className}
			role="img"
			aria-label="Ảnh minh hoạ những khoảnh khắc được chia sẻ trên ChillNet"
		>
			<defs>
				<linearGradient id="cl-left" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="#34d399" />
					<stop offset="55%" stopColor="#f472b6" />
					<stop offset="100%" stopColor="#fb7185" />
				</linearGradient>
				<linearGradient id="cl-right" x1="1" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#818cf8" />
					<stop offset="100%" stopColor="#f0abfc" />
				</linearGradient>
				<linearGradient id="cl-center" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="#f09433" />
					<stop offset="50%" stopColor="#dc2743" />
					<stop offset="100%" stopColor="#bc1888" />
				</linearGradient>
				<linearGradient id="cl-heart" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="#ff5f6d" />
					<stop offset="100%" stopColor="#e1306c" />
				</linearGradient>
				<linearGradient id="cl-ring" x1="0" y1="1" x2="1" y2="0">
					<stop offset="0%" stopColor="#f09433" />
					<stop offset="50%" stopColor="#dc2743" />
					<stop offset="100%" stopColor="#bc1888" />
				</linearGradient>
				<linearGradient id="cl-avatar" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="#86efac" />
					<stop offset="100%" stopColor="#34d399" />
				</linearGradient>
				<path
					id="cl-heart-path"
					d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
				/>
			</defs>

			{/* Thẻ trái */}
			<g transform="rotate(-11 132 258)">
				<rect x="47" y="128" width="170" height="260" rx="22" fill="url(#cl-left)" />
				<rect x="59" y="146" width="44" height="5" rx="2.5" fill="#fff" opacity="0.95" />
				<rect x="108" y="146" width="44" height="5" rx="2.5" fill="#fff" opacity="0.4" />
				<rect x="157" y="146" width="44" height="5" rx="2.5" fill="#fff" opacity="0.4" />
				<rect x="59" y="352" width="120" height="14" rx="7" fill="#fff" opacity="0.85" />
				<use
					href="#cl-heart-path"
					transform="translate(184 344) scale(1.2)"
					fill="none"
					stroke="#fff"
					strokeWidth="1.8"
				/>
			</g>

			{/* Thẻ phải */}
			<g transform="rotate(10 430 258)">
				<rect x="345" y="128" width="170" height="260" rx="22" fill="url(#cl-right)" />
				<rect x="357" y="146" width="44" height="5" rx="2.5" fill="#fff" opacity="0.95" />
				<rect x="406" y="146" width="44" height="5" rx="2.5" fill="#fff" opacity="0.4" />
				<rect x="455" y="146" width="44" height="5" rx="2.5" fill="#fff" opacity="0.4" />
				<rect x="357" y="352" width="120" height="14" rx="7" fill="#fff" opacity="0.85" />
				<use
					href="#cl-heart-path"
					transform="translate(482 344) scale(1.2)"
					fill="none"
					stroke="#fff"
					strokeWidth="1.8"
				/>
			</g>

			{/* Thẻ giữa — đứng thẳng và cao hơn hai thẻ bên */}
			<g>
				<rect x="196" y="48" width="190" height="360" rx="26" fill="url(#cl-center)" />
				<rect x="208" y="68" width="54" height="5" rx="2.5" fill="#fff" opacity="0.95" />
				<rect x="268" y="68" width="54" height="5" rx="2.5" fill="#fff" opacity="0.4" />
				<rect x="328" y="68" width="54" height="5" rx="2.5" fill="#fff" opacity="0.4" />
				<rect x="210" y="370" width="118" height="16" rx="8" fill="#fff" opacity="0.9" />
				<use
					href="#cl-heart-path"
					transform="translate(342 362) scale(1.3)"
					fill="none"
					stroke="#fff"
					strokeWidth="1.7"
				/>
			</g>

			{/* Bong bóng emoji */}
			<g transform="translate(96 6)">
				<circle cx="26" cy="54" r="7" fill="var(--ig-surface)" />
				<rect
					width="152"
					height="50"
					rx="25"
					fill="var(--ig-surface)"
					stroke="var(--ig-line)"
				/>
				<text x="22" y="34" fontSize="24">
					🔮
				</text>
				<text x="62" y="34" fontSize="24">
					👀
				</text>
				<text x="102" y="34" fontSize="24">
					🍕
				</text>
			</g>

			{/* Huy hiệu "bạn thân" */}
			<g transform="translate(392 148)">
				<rect width="96" height="44" rx="22" fill="#21c063" />
				<path
					transform="translate(12 10) scale(1)"
					fill="#fff"
					d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21.02 7 14.14 2 9.27l7.1-1.01L12 2z"
				/>
				<path
					transform="translate(58 10)"
					d="M6 9l6 6 6-6"
					fill="none"
					stroke="#fff"
					strokeWidth="2.4"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</g>

			{/* Trái tim lớn góc dưới trái */}
			<use
				href="#cl-heart-path"
				transform="translate(4 296) scale(3.4)"
				fill="url(#cl-heart)"
			/>

			{/* Avatar có vòng story góc dưới phải */}
			<g transform="translate(500 322)">
				<circle r="38" fill="url(#cl-ring)" />
				<circle r="32" fill="var(--ig-surface)" />
				<circle r="28" fill="url(#cl-avatar)" />
			</g>
		</svg>
	);
}
