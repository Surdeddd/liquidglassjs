import UIKit

struct OracleShape: Decodable, Identifiable, Sendable {
    let id: String
    let x: Double
    let y: Double
    let width: Double
    let height: Double
    let radius: Double
}

struct OracleScene: Decodable, Sendable {
    let id: String
    let family: String
    let background: String
    let backgroundOffset: Double
    let material: String
    let container: String
    let shapes: [OracleShape]
    let tint: String?
    let spacing: Double?
    let symbols: [String]?
    let selectedIndex: Int?
    let symbol: String?
}

private struct OracleCatalog: Decodable {
    let scenes: [OracleScene]
}

struct OracleCommand: Codable, Equatable, Sendable {
    let scene: String
    let appearance: String
    let nonce: String
}

struct OracleRequest {
    let scene: OracleScene?
    let dark: Bool
    let backdrop: UIImage?
    let nonce: String

    static let scenes = loadScenes()

    static var directory: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }

    static func current() -> OracleRequest {
        let defaults = UserDefaults.standard
        return make(command: OracleCommand(
            scene: defaults.string(forKey: "scene") ?? "",
            appearance: defaults.string(forKey: "appearance") ?? "light",
            nonce: ""
        ))
    }

    static func make(command: OracleCommand) -> OracleRequest {
        let scene = scenes.first { $0.id == command.scene }
        let backdrop = scene.flatMap { loadBackdrop(file: $0.background) }
        return OracleRequest(scene: scene, dark: command.appearance == "dark", backdrop: backdrop, nonce: command.nonce)
    }

    static func pendingCommand() -> OracleCommand? {
        guard let data = try? Data(contentsOf: directory.appendingPathComponent("request.json")) else { return nil }
        return try? JSONDecoder().decode(OracleCommand.self, from: data)
    }

    static func acknowledge(nonce: String, rendered: Bool) {
        let body = "{\"nonce\":\"\(nonce)\",\"rendered\":\(rendered)}"
        try? Data(body.utf8).write(to: directory.appendingPathComponent("ready.json"), options: .atomic)
    }

    private static func loadScenes() -> [OracleScene] {
        guard
            let url = Bundle.main.url(forResource: "scenes", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let catalog = try? JSONDecoder().decode(OracleCatalog.self, from: data)
        else { return [] }
        return catalog.scenes
    }

    private static func loadBackdrop(file: String) -> UIImage? {
        guard
            let url = Bundle.main.url(forResource: file, withExtension: nil, subdirectory: "backgrounds"),
            let data = try? Data(contentsOf: url)
        else { return nil }
        return UIImage(data: data, scale: 3)
    }
}
