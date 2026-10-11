import Foundation
import SwiftUI
import AlarmKit
import AppIntents
import ActivityKit

struct WakeMetadata: AlarmMetadata { var sessionID: String }
struct SavedAlarm: Codable {
    var id: UUID
    var sessionID: String
    var kind: String
    var at: Double
    var scheduledAt: Double
    var configJSON: String
    var ordinal: Int
}

enum AlarmFailure: LocalizedError {
    case denied, invalid, unknownSession
    var errorDescription: String? {
        switch self {
        case .denied: return "Allow Daybreak alarms in iPhone Settings before scheduling."
        case .invalid: return "The alarm configuration is invalid."
        case .unknownSession: return "The native alarm session was not found. Re-arm it from Tonight."
        }
    }
}

@MainActor
final class AlarmService {
    static let shared = AlarmService()
    private let key = "daybreak.nativeAlarms"
    private(set) var saved: [SavedAlarm] = []
    init() { if let data = UserDefaults.standard.data(forKey: key), let items = try? JSONDecoder().decode([SavedAlarm].self, from: data) { saved = items } }
    private func persist() { if let data = try? JSONEncoder().encode(saved) { UserDefaults.standard.set(data, forKey: key) } }
    func authorize() async throws {
        if AlarmManager.shared.authorizationState == .notDetermined { _ = try await AlarmManager.shared.requestAuthorization() }
        guard AlarmManager.shared.authorizationState == .authorized else { throw AlarmFailure.denied }
    }
    private func number(_ config: [String: Any], _ key: String, _ fallback: Double, _ range: ClosedRange<Double>) -> Double {
        min(range.upperBound, max(range.lowerBound, (config[key] as? NSNumber)?.doubleValue ?? fallback))
    }
    private func flag(_ config: [String: Any], _ key: String) -> Bool { config[key] as? Bool ?? false }
    private func add(sessionID: String, kind: String, at: Double, scheduledAt: Double, config: [String: Any], ordinal: Int = 0) async throws {
        guard UUID(uuidString: sessionID) != nil, at.isFinite, at > Date().timeIntervalSince1970*1000 else { throw AlarmFailure.invalid }
        let id = UUID()
        let stop = AlarmButton(text: "Quiet & open mission", textColor: .white, systemImageName: "sun.max")
        let presentation = AlarmPresentation.Alert(title: kind == "checkin" ? "Daybreak: still awake?" : "Daybreak: a gentler morning", stopButton: stop)
        let attributes = AlarmAttributes<WakeMetadata>(presentation: AlarmPresentation(alert: presentation), metadata: WakeMetadata(sessionID: sessionID), tintColor: .orange)
        let sound = try SoundPreparation.prepare(config: config, id: id)
        let configuration = AlarmManager.AlarmConfiguration<WakeMetadata>.alarm(
            schedule: .fixed(Date(timeIntervalSince1970: at/1000)),
            attributes: attributes,
            stopIntent: QuietWakeIntent(alarmID: id.uuidString),
            sound: .named(sound)
        )
        let data = try JSONSerialization.data(withJSONObject: config)
        let item = SavedAlarm(id: id, sessionID: sessionID, kind: kind, at: at, scheduledAt: scheduledAt, configJSON: String(decoding: data, as: UTF8.self), ordinal: ordinal)
        // Persist the mapping before the alarm can become visible to its Stop intent.
        saved.append(item); persist()
        do { _ = try await AlarmManager.shared.schedule(id: id, configuration: configuration) }
        catch { saved.removeAll { $0.id == id }; persist(); throw error }
    }
    func schedule(sessionID: String, at: Double, config: [String: Any]) async throws {
        try await authorize()
        // Install the full new suite before removing an existing suite.
        let old = saved
        do {
            try await add(sessionID: sessionID, kind: "primary", at: at, scheduledAt: at, config: config)
            if flag(config, "followups") {
                let quiet = number(config,"quietSeconds",90,15...300)
                let delay = number(config,"followupSeconds",120,30...600)
                let limit = Int(number(config,"repeatLimit",3,1...5))
                for n in 1...limit {
                    try await add(sessionID: sessionID, kind: "followup", at: at+Double(n)*(quiet+delay)*1000, scheduledAt: at, config: config, ordinal: n)
                }
            }
        } catch {
            try? cancel(sessionID: sessionID)
            throw error
        }
        for item in old { try cancel(item: item) }
    }
    private func cancel(item: SavedAlarm) throws {
        // A fired alarm may already be stopped/removed by the system. Only clear our
        // record if it is absent or cancellation succeeds.
        let exists = try AlarmManager.shared.alarms.contains { $0.id == item.id }
        if exists { try AlarmManager.shared.cancel(id: item.id) }
        saved.removeAll { $0.id == item.id }; persist()
        let sound = FileManager.default.urls(for:.libraryDirectory,in:.userDomainMask)[0].appendingPathComponent("Sounds/daybreak-\(item.id.uuidString).wav")
        try? FileManager.default.removeItem(at:sound)
    }
    func cancel(sessionID: String? = nil) throws {
        for item in saved.filter({ sessionID == nil || $0.sessionID == sessionID }) { try cancel(item: item) }
    }
    func sync(sessionID: String, state: String, deadline: Double?, config: [String: Any], followups: Int) async throws {
        let items = saved.filter { $0.sessionID == sessionID }
        let scheduledAt = items.first?.scheduledAt ?? Date().timeIntervalSince1970*1000
        let old = items.filter { $0.kind != "primary" }
        let quiet = number(config,"quietSeconds",90,15...300)
        let delay = number(config,"followupSeconds",120,30...600)
        let limit = Int(number(config,"repeatLimit",3,1...5))
        if ["complete","skipped","expired"].contains(state) { try cancel(sessionID: sessionID); return }
        guard let deadline = deadline, deadline.isFinite else { return }
        var target: Double?
        var kind = "followup"
        switch state {
        case "mission", "quiet", "checkin": if flag(config,"followups") && followups < limit { target = deadline+delay*1000 }
        case "waiting-checkin":
            // The check-in is visible in the foreground at deadline. The OS backup
            // sounds after the response window if it was abandoned or the app closed.
            if flag(config,"followups") && followups < limit { target = deadline+(quiet+delay)*1000; kind = "checkin" }
        case "waiting-followup", "snoozed": target = deadline
        default: break
        }
        if let target = target {
            let first = max(target,Date().timeIntervalSince1970*1000+1500)
            let firstOrdinal = state == "snoozed" ? followups : followups+1
            try await add(sessionID:sessionID,kind:kind,at:first,scheduledAt:scheduledAt,config:config,ordinal:firstOrdinal)
            // Preserve backup reminders even if the app is force-closed.
            if flag(config,"followups") && firstOrdinal < limit {
                for n in 1...(limit-firstOrdinal) {
                    try await add(sessionID:sessionID,kind:"followup",at:first+Double(n)*(quiet+delay)*1000,scheduledAt:scheduledAt,config:config,ordinal:firstOrdinal+n)
                }
            }
        }
        for item in old { try cancel(item:item) }
    }
    func interaction(alarmID: String) throws -> [String: Any]? {
        guard let id = UUID(uuidString: alarmID), let item = saved.first(where:{$0.id == id}),
              let data = item.configJSON.data(using:.utf8), let config = try JSONSerialization.jsonObject(with:data) as? [String:Any] else { return nil }
        let event: [String:Any] = ["type":"alarm","sessionId":item.sessionID,"kind":item.kind,"scheduledAt":item.scheduledAt,"config":config,"at":Date().timeIntervalSince1970*1000,"alarmID":item.id.uuidString,"ordinal":item.ordinal]
        let pending = try JSONSerialization.data(withJSONObject:event)
        UserDefaults.standard.set(pending,forKey:"daybreak.pendingInteraction")
        // No follow-up cancellation here: quieting is not successful completion.
        NotificationCenter.default.post(name: .daybreakInteraction, object:nil)
        return event
    }
    func pendingInteraction() -> [String:Any]? {
        guard let data=UserDefaults.standard.data(forKey:"daybreak.pendingInteraction") else{return nil}
        return try? JSONSerialization.jsonObject(with:data) as? [String:Any]
    }
    func acknowledgeInteraction() { UserDefaults.standard.removeObject(forKey:"daybreak.pendingInteraction") }
}

extension Notification.Name { static let daybreakInteraction = Notification.Name("daybreakInteraction") }

struct QuietWakeIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Quiet and open Daybreak"
    static var openAppWhenRun = true
    @Parameter(title: "Alarm identifier") var alarmID: String
    init() { alarmID = "" }
    init(alarmID: String) { self.alarmID = alarmID }
    func perform() async throws -> some IntentResult {
        _ = try await AlarmService.shared.interaction(alarmID: alarmID)
        return .result()
    }
}
