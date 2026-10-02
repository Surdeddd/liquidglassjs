import SwiftUI

@main
struct OracleApp: App {
    var body: some Scene {
        WindowGroup {
            OracleHost()
        }
    }
}

struct OracleHost: View {
    @State private var request = OracleRequest.current()
    @State private var command: OracleCommand?

    var body: some View {
        OracleRoot(request: request)
            .id(request.nonce)
            .task {
                while !Task.isCancelled {
                    if let next = OracleRequest.pendingCommand(), next != command {
                        command = next
                        request = OracleRequest.make(command: next)
                    }
                    try? await Task.sleep(for: .milliseconds(100))
                }
            }
            .task(id: request.nonce) {
                guard !request.nonce.isEmpty else { return }
                try? await Task.sleep(for: .milliseconds(700))
                OracleRequest.acknowledge(nonce: request.nonce, rendered: request.scene != nil)
            }
    }
}

struct OracleRoot: View {
    let request: OracleRequest

    var body: some View {
        ZStack(alignment: .topLeading) {
            OracleBackdropView(image: request.backdrop, offset: request.scene?.backgroundOffset ?? 0)
            if let scene = request.scene {
                OracleGlassLayer(scene: scene)
            }
        }
        .frame(width: 402, height: 874, alignment: .topLeading)
        .ignoresSafeArea()
        .preferredColorScheme(request.dark ? .dark : .light)
        .statusBarHidden(true)
        .persistentSystemOverlays(.hidden)
        .transaction { $0.disablesAnimations = true }
    }
}

struct OracleBackdropView: View {
    let image: UIImage?
    let offset: Double

    var body: some View {
        ZStack(alignment: .topLeading) {
            Rectangle().fill(offset > 0 ? Color.black : Color.white)
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .interpolation(.none)
                    .frame(width: 402, height: 874)
                    .offset(x: offset)
            }
        }
        .frame(width: 402, height: 874)
        .clipped()
    }
}

struct OracleGlassLayer: View {
    let scene: OracleScene

    var body: some View {
        switch scene.container {
        case "merge":
            GlassEffectContainer(spacing: scene.spacing ?? 0) {
                OracleShapes(scene: scene)
            }
            .frame(width: 402, height: 874, alignment: .topLeading)
        case "tabview":
            OracleTabBar(scene: scene)
        case "button":
            OracleGlassButton(scene: scene)
        default:
            OracleShapes(scene: scene)
        }
    }
}

struct OracleShapes: View {
    let scene: OracleScene

    var body: some View {
        ZStack(alignment: .topLeading) {
            ForEach(scene.shapes) { shape in
                Color.clear
                    .frame(width: shape.width, height: shape.height)
                    .glassEffect(scene.glass, in: .rect(cornerRadius: shape.radius, style: .continuous))
                    .position(x: shape.x + shape.width / 2, y: shape.y + shape.height / 2)
            }
        }
        .frame(width: 402, height: 874, alignment: .topLeading)
    }
}

struct OracleTabBar: View {
    let scene: OracleScene

    var body: some View {
        TabView(selection: .constant(scene.selectedIndex ?? 0)) {
            ForEach(Array((scene.symbols ?? []).enumerated()), id: \.offset) { index, symbol in
                Tab(value: index) {
                    Color.clear
                } label: {
                    Image(systemName: symbol)
                }
            }
        }
        .frame(width: 402, height: 874)
    }
}

struct OracleGlassButton: View {
    let scene: OracleScene

    var body: some View {
        ZStack(alignment: .topLeading) {
            if let shape = scene.shapes.first {
                Button {} label: {
                    Image(systemName: scene.symbol ?? "sparkles")
                        .font(.system(size: 23, weight: .semibold))
                        .frame(width: shape.width, height: shape.height)
                }
                .buttonStyle(.glass)
                .position(x: shape.x + shape.width / 2, y: shape.y + shape.height / 2)
            }
        }
        .frame(width: 402, height: 874, alignment: .topLeading)
    }
}

extension OracleScene {
    var glass: Glass {
        switch material {
        case "clear":
            .clear
        case "tinted":
            .regular.tint(Color(oracleHex: tint ?? "#ffffff"))
        default:
            .regular
        }
    }
}

extension Color {
    init(oracleHex: String) {
        let digits = oracleHex.hasPrefix("#") ? String(oracleHex.dropFirst()) : oracleHex
        let value = UInt64(digits, radix: 16) ?? 0
        self.init(
            .sRGB,
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }
}
