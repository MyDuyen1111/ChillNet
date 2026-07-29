import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import Spinner from "../ui/Spinner";

// Gate for authenticated areas. Shows a splash while the session hydrates, then
// redirects to /login (preserving where the user was heading).
export default function ProtectedRoute({ children }) {
	const { isAuthenticated, booting } = useAuth();
	const location = useLocation();

	if (booting) {
		return (
			<div className="flex min-h-[100dvh] items-center justify-center">
				<Spinner size={28} className="text-muted" />
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" replace state={{ from: location }} />;
	}

	return children;
}
