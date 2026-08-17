import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AdminRoute from "./components/layout/AdminRoute";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import RouteErrorBoundary from "./components/layout/RouteErrorBoundary";
import Spinner from "./components/ui/Spinner";

// Auth screens are part of the foundation (eager). Feature pages are lazy so a
// route only loads its own chunk — and so parallel work on one feature never
// blocks the others.
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import VerifyEmailPage from "./features/auth/VerifyEmailPage";

const FeedPage = lazy(() => import("./features/feed/FeedPage"));
const PostDetailPage = lazy(() => import("./features/feed/PostDetailPage"));
const PostDetailModal = lazy(() => import("./features/feed/PostDetailModal"));
const FriendsPage = lazy(() => import("./features/friends/FriendsPage"));
const ChatPage = lazy(() => import("./features/chat/ChatPage"));
const GroupsPage = lazy(() => import("./features/groups/GroupsPage"));
const GroupDetailPage = lazy(() => import("./features/groups/GroupDetailPage"));
const NotificationsPage = lazy(() => import("./features/notifications/NotificationsPage"));
const ProfilePage = lazy(() => import("./features/profile/ProfilePage"));
const MyReportsPage = lazy(() => import("./features/moderation/MyReportsPage"));
const CommunityPolicyPage = lazy(() => import("./features/policies/CommunityPolicyPage"));
const PrivacyPolicyPage = lazy(() => import("./features/policies/PrivacyPolicyPage"));
const ModerationQueuePage = lazy(() => import("./features/admin/ModerationQueuePage"));
const CaseDetailPage = lazy(() => import("./features/admin/CaseDetailPage"));
const AppealsPage = lazy(() => import("./features/admin/AppealsPage"));

function PageFallback() {
	return (
		<div className="flex min-h-[50vh] items-center justify-center">
			<Spinner size={26} className="text-muted" />
		</div>
	);
}

export default function App() {
	const location = useLocation();

	// Instagram mở bài viết dạng popup đè lên trang đang xem: URL đổi sang
	// /post/:id nhưng nền vẫn là feed/hồ sơ/nhóm. PostLink gắn location cũ vào
	// state.background; ở đây ta cho <Routes> khớp theo location cũ đó rồi render
	// thêm popup chồng lên. Vào thẳng URL thì không có state → rơi về trang đầy đủ.
	const background = location.state?.background;

	return (
		<RouteErrorBoundary resetKey={location.pathname}>
			<Suspense fallback={<PageFallback />}>
				<Routes location={background || location}>
					<Route path="/login" element={<LoginPage />} />
					<Route path="/register" element={<RegisterPage />} />
					<Route path="/verify-email" element={<VerifyEmailPage />} />

					{/* Chính sách là tài liệu tĩnh và nằm NGOÀI ProtectedRoute: người
					    chưa đăng nhập, và nhất là người đang bị hạn chế tài khoản,
					    vẫn phải đọc được luật và cách khiếu nại. */}
					<Route path="/policies/community" element={<CommunityPolicyPage />} />
					<Route path="/policies/privacy" element={<PrivacyPolicyPage />} />

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
						<Route path="/my-reports" element={<MyReportsPage />} />

						{/* Khu vực kiểm duyệt. AdminRoute chỉ ẩn giao diện — mọi endpoint
						    tương ứng đều còn @PreAuthorize("hasRole('ADMIN')") ở service. */}
						<Route
							path="/admin/moderation"
							element={
								<AdminRoute>
									<ModerationQueuePage />
								</AdminRoute>
							}
						/>
						<Route
							path="/admin/moderation/:caseId"
							element={
								<AdminRoute>
									<CaseDetailPage />
								</AdminRoute>
							}
						/>
						<Route
							path="/admin/appeals"
							element={
								<AdminRoute>
									<AppealsPage />
								</AdminRoute>
							}
						/>
					</Route>

					<Route path="*" element={<Navigate to="/feed" replace />} />
				</Routes>

				{background && (
					<Routes>
						<Route path="/post/:postId" element={<PostDetailModal />} />
					</Routes>
				)}
			</Suspense>
		</RouteErrorBoundary>
	);
}
