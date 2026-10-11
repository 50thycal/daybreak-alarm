import SwiftUI
import WebKit
import UIKit
import VisionKit
import AVFoundation

struct DaybreakWebView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> WebController { WebController() }
    func updateUIViewController(_ uiViewController: WebController, context: Context) {}
}

@MainActor
final class WebController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, DataScannerViewControllerDelegate {
    private var web: WKWebView!
    private var loaded = false
    private var scannerRequestID: String?
    private var observer: NSObjectProtocol?
    private var webRoot: URL?

    override func viewDidLoad() {
        super.viewDidLoad()
        let content = WKUserContentController()
        content.add(self, name:"daybreak")
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = content
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        web = WKWebView(frame:.zero,configuration:configuration)
        web.navigationDelegate = self
        web.isOpaque = false
        web.backgroundColor = UIColor(red:17/255,green:23/255,blue:19/255,alpha:1)
        view = web
        observer = NotificationCenter.default.addObserver(forName:.daybreakInteraction,object:nil,queue:.main) { [weak self] _ in
            Task { @MainActor in self?.deliverPending() }
        }
        guard let root = Bundle.main.url(forResource:"Web",withExtension:nil), FileManager.default.fileExists(atPath:root.appendingPathComponent("index.html").path) else {
            web.loadHTMLString("<h1>Prepare Daybreak first</h1><p>Run npm run ios:prepare from the repository root, then regenerate the Xcode project.</p>",baseURL:nil)
            return
        }
        webRoot = root
        web.loadFileURL(root.appendingPathComponent("index.html"),allowingReadAccessTo:root)
    }
    deinit { if let observer = observer { NotificationCenter.default.removeObserver(observer) } }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        // Only packaged, offline files may access the native alarm bridge.
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if (url.isFileURL && url.standardizedFileURL.path.hasPrefix((webRoot?.path ?? "__invalid__")+"/")) || url.scheme == "about" { decisionHandler(.allow) }
        else { decisionHandler(.cancel); if navigationAction.navigationType == .linkActivated && url.scheme == "https" { UIApplication.shared.open(url) } }
    }
    func userContentController(_ userContentController: WKUserContentController,didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let sourceURL = message.frameInfo.request.url,
              sourceURL.isFileURL, sourceURL.standardizedFileURL.path.hasPrefix((webRoot?.path ?? "__invalid__")+"/"),
              let body = message.body as? [String:Any], let id = body["id"] as? String, let action = body["action"] as? String else { return }
        Task { @MainActor in
            do {
                switch action {
                case "ready": loaded = true; reply(id,result:["native":true]); deliverPending()
                case "schedule":
                    guard let sessionID = body["sessionId"] as? String, let at = body["at"] as? Double, let config = body["config"] as? [String:Any] else { throw AlarmFailure.invalid }
                    try await AlarmService.shared.schedule(sessionID:sessionID,at:at,config:config)
                    reply(id,result:["scheduled":true])
                case "sync":
                    guard let sessionID = body["sessionId"] as? String, let state = body["state"] as? String, let config = body["config"] as? [String:Any] else { throw AlarmFailure.invalid }
                    try await AlarmService.shared.sync(sessionID:sessionID,state:state,deadline:body["deadline"] as? Double,config:config,followups:body["followups"] as? Int ?? 0)
                    reply(id,result:["updated":true])
                case "cancelAll": try AlarmService.shared.cancel(); UserDefaults.standard.removeObject(forKey:"daybreak.pendingInteraction"); reply(id,result:["cancelled":true])
                case "acknowledge": AlarmService.shared.acknowledgeInteraction(); reply(id,result:["acknowledged":true])
                case "scanQR": try await openScanner(requestID:id)
                case "export": try shareExport(body); reply(id,result:["presented":true])
                case "printQR": try printQR(body); reply(id,result:["presented":true])
                default: throw AlarmFailure.invalid
                }
            } catch { reply(id,error:error.localizedDescription) }
        }
    }
    private func reply(_ id: String, result: Any = NSNull(), error: String? = nil) {
        web.callAsyncJavaScript("window.daybreakNativeReply(id, result, error)",arguments:["id":id,"result":result,"error":error as Any? ?? NSNull()],in:nil,in:.page) { _ in }
    }
    private func deliverPending() {
        guard loaded, let event = AlarmService.shared.pendingInteraction() else { return }
        web.callAsyncJavaScript("await window.daybreakNativeEvent(event)",arguments:["event":event],in:nil,in:.page) { _ in }
    }
    private func openScanner(requestID: String) async throws {
        if AVCaptureDevice.authorizationStatus(for:.video) == .notDetermined { _ = await AVCaptureDevice.requestAccess(for:.video) }
        guard DataScannerViewController.isSupported, DataScannerViewController.isAvailable else {
            throw NSError(domain:"Daybreak",code:1,userInfo:[NSLocalizedDescriptionKey:"Camera scanning is unavailable. Enable camera access in Settings, then try again."])
        }
        guard scannerRequestID == nil else { throw AlarmFailure.invalid }
        let scanner = DataScannerViewController(recognizedDataTypes:[.barcode(symbologies:[.qr])],qualityLevel:.balanced,recognizesMultipleItems:false,isHighFrameRateTrackingEnabled:false,isPinchToZoomEnabled:true,isGuidanceEnabled:true,isHighlightingEnabled:true)
        scanner.delegate = self
        let cancel = UIButton(type:.system)
        cancel.setTitle("Cancel scan",for:.normal)
        cancel.backgroundColor = .black.withAlphaComponent(0.65)
        cancel.tintColor = .white
        cancel.layer.cornerRadius = 12
        cancel.translatesAutoresizingMaskIntoConstraints = false
        cancel.addTarget(self,action:#selector(cancelScan),for:.touchUpInside)
        scanner.overlayContainerView.addSubview(cancel)
        NSLayoutConstraint.activate([cancel.leadingAnchor.constraint(equalTo:scanner.overlayContainerView.leadingAnchor,constant:20),cancel.bottomAnchor.constraint(equalTo:scanner.overlayContainerView.safeAreaLayoutGuide.bottomAnchor,constant:-20),cancel.widthAnchor.constraint(equalToConstant:140),cancel.heightAnchor.constraint(equalToConstant:48)])
        scannerRequestID = requestID
        scanner.isModalInPresentation = true
        present(scanner,animated:true) {
            do { try scanner.startScanning() }
            catch { self.cancelScan() }
        }
    }
    @objc private func cancelScan() {
        (presentedViewController as? DataScannerViewController)?.stopScanning()
        dismiss(animated:true)
        if let id = scannerRequestID { reply(id,error:"Scan cancelled.") }
        scannerRequestID = nil
    }
    func dataScanner(_ dataScanner: DataScannerViewController,didAdd addedItems:[RecognizedItem],allItems:[RecognizedItem]) {
        guard let id = scannerRequestID else { return }
        for item in addedItems {
            if case .barcode(let code) = item, let value = code.payloadStringValue {
                scannerRequestID = nil; dataScanner.stopScanning(); dismiss(animated:true);reply(id,result:value);return
            }
        }
    }
    private func shareExport(_ body: [String:Any]) throws {
        guard let name = body["name"] as? String, ["daybreak-records.json","daybreak-records.csv","daybreak-wake-code.png"].contains(name), let content = body["content"] as? String else { throw AlarmFailure.invalid }
        let data: Data
        if body["isData"] as? Bool == true {
            guard let base64 = content.split(separator:",",maxSplits:1).last, let decoded = Data(base64Encoded:String(base64)) else { throw AlarmFailure.invalid }
            data = decoded
        } else { data = Data(content.utf8) }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        try data.write(to:url,options:.atomic)
        let controller = UIActivityViewController(activityItems:[url],applicationActivities:nil)
        controller.popoverPresentationController?.sourceView = view
        controller.popoverPresentationController?.sourceRect = CGRect(x:view.bounds.midX,y:view.bounds.midY,width:1,height:1)
        present(controller,animated:true)
    }
    private func printQR(_ body: [String:Any]) throws {
        guard let raw = body["data"] as? String,let b64 = raw.split(separator:",",maxSplits:1).last,let data = Data(base64Encoded:String(b64)),let image = UIImage(data:data) else { throw AlarmFailure.invalid }
        let controller = UIPrintInteractionController.shared
        controller.printingItem = image
        controller.present(animated:true)
    }
}
