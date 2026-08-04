import { Component } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import Button from "../ui/Button";

// Without this, anything a page throws unmounts the whole tree and the user is
// left staring at a blank white screen. The most common cause is a lazy chunk
// that fails to load (dev re-optimise, a deploy that replaced the old hashes,
// or a flaky network), which is why the recovery action is a hard reload.
export default class RouteErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { failed: false };
	}

	static getDerivedStateFromError() {
		return { failed: true };
	}

	componentDidCatch(error) {
		// Keep the real stack in the console; the UI stays deliberately plain.
		console.error("[ChillNet] Trang gặp lỗi:", error);
	}

	componentDidUpdate(prevProps) {
		// A failed route should not poison the next one the user navigates to.
		if (this.state.failed && prevProps.resetKey !== this.props.resetKey) {
			this.setState({ failed: false });
		}
	}

	render() {
		if (!this.state.failed) return this.props.children;

		return (
			<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
				<div className="flex h-[62px] w-[62px] items-center justify-center rounded-full border-2 border-ink">
					<ArrowClockwise size={26} weight="light" />
				</div>
				<div className="space-y-1">
					<h2 className="text-[22px] font-light text-ink">Không tải được trang</h2>
					<p className="text-sm text-muted">
						Có lỗi xảy ra khi mở phần này. Hãy tải lại trang để thử lại.
					</p>
				</div>
				<Button variant="primary" onClick={() => window.location.reload()}>
					Tải lại
				</Button>
			</div>
		);
	}
}
