import SwiftUI

@main
struct DaybreakApp: App {
    var body: some Scene {
        WindowGroup { DaybreakWebView().ignoresSafeArea(.container, edges: .bottom).preferredColorScheme(.dark) }
    }
}
