import { cn } from "../../lib/cn";

/**
 * Instagram's profile tab strip: uppercase 12px labels with wide tracking, an
 * optional glyph, and a 1px rule that slides on top of the active tab. Sits on
 * a hairline top border and centres itself.
 *
 * items: [{ key, label, icon?: PhosphorIcon }]
 */
export default function Tabs({ items, value, onChange, className }) {
	return (
		// Hai lớp thay vì một: lớp ngoài giữ đường kẻ và cho cuộn ngang, lớp trong
		// `w-max mx-auto` để dải tab vẫn nằm giữa khi vừa khung nhưng KHÔNG bị cắt
		// mất tab đầu tiên khi tràn. `justify-center` cộng `overflow-x-auto` trên
		// cùng một thẻ sẽ cắt cả hai đầu — trang cá nhân có 4 tab nên trên điện
		// thoại hẹp là tràn thật, không phải giả định.
		<div className={cn("overflow-x-auto border-t border-line", className)}>
			<div className="mx-auto flex w-max items-center gap-6 px-4 sm:gap-10">
				{items.map(({ key, label, icon: Icon }) => {
					const active = key === value;
					return (
						<button
							key={key}
							type="button"
							onClick={() => onChange?.(key)}
							aria-current={active ? "page" : undefined}
							className={cn(
								"-mt-px flex shrink-0 items-center gap-1.5 border-t px-1 py-4 text-[12px] font-semibold uppercase tracking-[1px] transition-colors",
								active
									? "border-ink text-ink"
									: "border-transparent text-muted hover:text-ink",
							)}
						>
							{Icon && <Icon size={12} weight={active ? "fill" : "regular"} />}
							{label}
						</button>
					);
				})}
			</div>
		</div>
	);
}
