import { useEffect, useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import IconButton from "./IconButton";

// Flips the `.dark` class on <html> and persists the choice. The initial class
// is applied by the inline script in index.html (before first paint).
export default function ThemeToggle() {
	const [dark, setDark] = useState(() =>
		document.documentElement.classList.contains("dark"),
	);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", dark);
		localStorage.setItem("chillnet-theme", dark ? "dark" : "light");
	}, [dark]);

	return (
		<IconButton
			onClick={() => setDark((d) => !d)}
			label={dark ? "Chế độ sáng" : "Chế độ tối"}
		>
			{dark ? <Sun size={20} /> : <Moon size={20} />}
		</IconButton>
	);
}
