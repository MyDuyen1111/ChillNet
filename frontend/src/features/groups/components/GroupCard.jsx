import { useNavigate } from "react-router-dom";
import { UsersThree } from "@phosphor-icons/react";
import { memberCountLabel } from "../groupUtils";

// Ô vuông trong lưới nhóm, giống lưới Khám phá của Instagram: ảnh phủ kín,
// tên + số thành viên đè trên gradient tối ở đáy, hover lộ icon nhóm.
export default function GroupCard({ group }) {
	const navigate = useNavigate();

	return (
		<button
			type="button"
			onClick={() => navigate(`/groups/${group.id}`)}
			aria-label={`Xem nhóm ${group.name}`}
			className="group relative block aspect-square w-full overflow-hidden bg-fill text-left outline-none"
		>
			{group.coverImageUrl ? (
				<img
					src={group.coverImageUrl}
					alt=""
					loading="lazy"
					className="h-full w-full object-cover"
				/>
			) : (
				<div className="h-full w-full bg-fill" />
			)}

			<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

			<div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
				<p className="line-clamp-2 text-sm font-semibold text-white">{group.name}</p>
				<p className="mt-0.5 text-xs text-white/80">{memberCountLabel(group.memberCount)}</p>
			</div>

			<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
				<UsersThree size={32} weight="fill" className="text-white" />
			</div>
		</button>
	);
}
