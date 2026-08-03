import {
	Cake,
	GenderIntersex,
	Globe,
	Info,
	MapPin,
	Phone,
	CalendarBlank,
} from "@phosphor-icons/react";
import { Card, EmptyState } from "../../../components/ui";
import { formatDate, genderLabel } from "./profileUtils";

function Row({ icon: Icon, label, children }) {
	return (
		<div className="flex items-start gap-3 px-5 py-3.5">
			<span className="mt-0.5 text-zinc-400 dark:text-zinc-500">
				<Icon size={20} />
			</span>
			<div className="min-w-0">
				<p className="text-xs text-zinc-500">{label}</p>
				<p className="break-words text-sm font-medium text-zinc-800 dark:text-zinc-100">
					{children}
				</p>
			</div>
		</div>
	);
}

// Detailed profile information pulled straight from ProfileResponse.
export default function AboutTab({ profile }) {
	const location = [profile.city, profile.country].filter(Boolean).join(", ");
	const website = profile.website;
	const rows = [
		profile.bio && { key: "bio", icon: Info, label: "Tiểu sử", value: profile.bio },
		profile.gender && {
			key: "gender",
			icon: GenderIntersex,
			label: "Giới tính",
			value: genderLabel(profile.gender),
		},
		profile.dob && {
			key: "dob",
			icon: Cake,
			label: "Ngày sinh",
			value: formatDate(profile.dob),
		},
		location && { key: "loc", icon: MapPin, label: "Sống tại", value: location },
		profile.phoneNumber && {
			key: "phone",
			icon: Phone,
			label: "Số điện thoại",
			value: profile.phoneNumber,
		},
		profile.createdAt && {
			key: "joined",
			icon: CalendarBlank,
			label: "Đã tham gia",
			value: formatDate(profile.createdAt),
		},
	].filter(Boolean);

	if (rows.length === 0 && !website) {
		return (
			<EmptyState
				icon={Info}
				title="Chưa có thông tin"
				description="Người dùng này chưa cập nhật thông tin giới thiệu."
			/>
		);
	}

	return (
		<Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
			{rows.map((r) => (
				<Row key={r.key} icon={r.icon} label={r.label}>
					{r.value}
				</Row>
			))}
			{website && (
				<Row icon={Globe} label="Website">
					<a
						href={/^https?:\/\//i.test(website) ? website : `https://${website}`}
						target="_blank"
						rel="noreferrer noopener"
						className="text-brand-600 hover:underline dark:text-brand-400"
					>
						{website}
					</a>
				</Row>
			)}
		</Card>
	);
}
