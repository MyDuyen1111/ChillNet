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
		<div className={cn("flex items-center justify-center gap-10 border-t border-line", className)}>
			{items.map(({ key, label, icon: Icon }) => {
				const active = key === value;
				return (
					<button
						key={key}
						type="button"
						onClick={() => onChange?.(key)}
						aria-current={active ? "page" : undefined}
						className={cn(
							"-mt-px flex items-center gap-1.5 border-t px-1 py-4 text-[12px] font-semibold uppercase tracking-[1px] transition-colors",
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
	);
}
