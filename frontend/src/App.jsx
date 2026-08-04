import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import RouteErrorBoundary from "./components/layout/RouteErrorBoundary";
import Spinner from "./components/ui/Spinner";

// Auth screens are part of the foundation (eager). Feature pages are lazy so a
// route only loads its own chunk — and so parallel work on one feature never
// blocks the others.
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";

const FeedPage = lazy(() => import("./features/feed/FeedPage"));
const PostDetailPage = lazy(() => import("./features/feed/PostDetailPage"));
const FriendsPage = lazy(() => import("./features/friends/FriendsPage"));
const ChatPage = lazy(() => import("./features/chat/ChatPage"));
const GroupsPage = lazy(() => import("./features/groups/GroupsPage"));
const GroupDetailPage = lazy(() => import("./features/groups/GroupDetailPage"));
const NotificationsPage = lazy(() => import("./features/notifications/NotificationsPage"));
const ProfilePage = lazy(() => import("./features/profile/ProfilePage"));

function PageFallback() {
	return (
		<div className="flex min-h-[50vh] items-center justify-center">
			<Spinner size={26} className="text-muted" />
		</div>
	);
}

export default function App() {
	const location = useLocation();

	return (
		<RouteErrorBoundary resetKey={location.pathname}>
			<Suspense fallback={<PageFallback />}>
				<Routes>
					<Route path="/login" element={<LoginPage />} />
					<Route path="/register" element={<RegisterPage />} />

					<Route
						element={
							<ProtectedRoute>
								<AppShell />
							</ProtectedRoute>
						}
					>
						<Route index element={<Navigate to="/feed" replace />} />
						<Route path="/feed" element={<FeedPage />} />
						<Route path="/post/:postId" element={<PostDetailPage />} />
						<Route path="/friends" element={<FriendsPage />} />
						<Route path="/messages" element={<ChatPage />} />
						<Route path="/messages/:conversationId" element={<ChatPage />} />
						<Route path="/groups" element={<GroupsPage />} />
						<Route path="/groups/:groupId" element={<GroupDetailPage />} />
						<Route path="/notifications" element={<NotificationsPage />} />
						<Route path="/profile" element={<ProfilePage />} />
						<Route path="/profile/:userId" element={<ProfilePage />} />
					</Route>

					<Route path="*" element={<Navigate to="/feed" replace />} />
				</Routes>
			</Suspense>
		</RouteErrorBoundary>
	);
}
