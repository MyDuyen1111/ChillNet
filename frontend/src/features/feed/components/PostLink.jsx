import { Link, useLocation } from "react-router-dom";

// Mọi lối vào trang chi tiết bài viết đều đi qua đây. Ngoài việc trỏ tới
// /post/:id, nó nhét location hiện tại vào state dưới khoá `background` —
// App.jsx thấy khoá này thì giữ nguyên trang nền và mở bài viết dạng popup đè
// lên, đúng cách Instagram làm.
//
// Vào thẳng URL (mở tab mới, F5, dán link) sẽ không có state này, nên vẫn rơi
// về trang chi tiết đầy đủ như trước.
export default function PostLink({ postId, children, ...props }) {
	const location = useLocation();
	return (
		<Link to={`/post/${postId}`} state={{ background: location }} {...props}>
			{children}
		</Link>
	);
}
