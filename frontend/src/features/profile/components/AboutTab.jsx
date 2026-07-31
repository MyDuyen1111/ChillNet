import {
	Cake,
	GenderIntersex,
	Globe,
	IdentificationCard,
	Info,
	MapPin,
	Phone,
	CalendarBlank,
} from "@phosphor-icons/react";
import { EmptyState } from "../../../components/ui";
import { formatDate, genderLabel } from "./profileUtils";

function Row({ icon: Icon, label, children }) {
	return (
		<div className="flex items-center gap-3 py-3.5">
			<Icon size={18} className="shrink-0 text-muted" />
			<span className="w-32 shrink-0 text-sm text-muted">{label}</span>
			<span className="min-w-0 flex-1 break-words text-sm text-ink">{children}</span>
		</div>
	);
}

// Detailed profile information pulled straight from ProfileResponse, laid out
// as a flat row list rather than a coloured card.
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
				icon={IdentificationCard}
				title="Chưa có thông tin"
				description="Người dùng này chưa cập nhật thông tin giới thiệu."
			/>
		);
	}

	return (
		<div className="divide-y divide-line">
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
						className="text-accent-strong hover:underline"
					>
						{website}
					</a>
				</Row>
			)}
		</div>
	);
}
