import Cocoa
import Metal
import GhosttyKit

public class AizenTerminalSurfaceView: NSView, TerminalDelegate {
    private var terminal: GhosttyTerminal?
    private var metalLayer: CAMetalLayer?

    public override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        setupMetalRenderer()
        setupTerminal()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupMetalRenderer() {
        self.wantsLayer = true
        self.metalLayer = CAMetalLayer()
        self.layer = self.metalLayer
        self.metalLayer?.device = MTLCreateSystemDefaultDevice()
        self.metalLayer?.pixelFormat = .bgra8Unorm
        self.metalLayer?.framebufferOnly = true
        self.metalLayer?.frame = self.layer!.frame
    }

    private func setupTerminal() {
        self.terminal = GhosttyTerminal(delegate: self)
        // In a real implementation, we would connect this to a PTY.
    }

    public func onDraw(frame: GhosttyKit.Frame) {
        // Render the frame using the metalLayer
    }

    public func onTitleUpdate(title: String) {
        // Update window title
    }
}
