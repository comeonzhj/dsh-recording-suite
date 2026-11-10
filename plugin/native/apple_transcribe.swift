//
// apple_transcribe.swift — Recording Suite Apple Speech helper.
//
// Compiled on demand by the Host plugin:
//   xcrun swiftc -O -o <storage>/bin/apple_transcribe native/apple_transcribe.swift \
//     -Xlinker -sectcreate -Xlinker __TEXT -Xlinker __info_plist \
//     -Xlinker native/apple_transcribe_info.plist
//
// Usage:
//   apple_transcribe <16k-mono-wav> [language] [timeoutSeconds]
//
// stdout (single line JSON, always):
//   {"ok":true,"text":"..."}
//   {"ok":false,"error":"...","code":"..."}
//
// Exit code: 0 on success, 1 on failure, 2 on bad usage.
//
// Two engines, chosen at runtime:
//
//   * macOS 26+ — SpeechAnalyzer + SpeechTranscriber. This is the offline file
//     transcription API; it needs the language model asset, but it does NOT go
//     through the SFSpeechRecognizer TCC prompt.
//   * older macOS — SFSpeechURLRecognitionRequest. This path needs the Speech
//     Recognition TCC grant; a bare command-line process can be aborted by TCC
//     before it can report an error, so the Host surfaces the actionable
//     system-settings guidance (see plugin/host/asr.mjs).
//
// The helper never touches the microphone: it only reads the WAV path given on
// the command line. The Host enforces the overall timeout; the helper also
// stops itself after `timeoutSeconds` to avoid a stuck analyzer.
//

import AVFAudio
import Foundation
import Speech

#if canImport(Darwin)
import Darwin
#endif

struct HelperError: Error {
    let code: String
    let message: String

    init(_ code: String, _ message: String) {
        self.code = code
        self.message = message
    }
}

func emit(_ payload: [String: Any]) -> Never {
    if let data = try? JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys]),
       let line = String(data: data, encoding: .utf8) {
        print(line)
    } else {
        print("{\"ok\":false,\"error\":\"failed to encode helper output\",\"code\":\"OUTPUT_ENCODE\"}")
    }
    fflush(stdout)
    exit((payload["ok"] as? Bool == true) ? 0 : 1)
}

func succeed(_ text: String) -> Never {
    emit(["ok": true, "text": text])
}

func fail(_ code: String, _ message: String) -> Never {
    emit(["ok": false, "error": message, "code": code])
}

func cleanTranscript(_ text: String) -> String {
    var result = text.trimmingCharacters(in: .whitespacesAndNewlines)
    // The analyzer inserts spaces between Chinese words and before full-width
    // punctuation; remove the ones that make Markdown read badly.
    let patterns = [
        "(?<=[\\p{Han}])\\s+(?=[\\p{Han}])",
        "\\s+(?=[，。！？；：、）】》」』])",
        "(?<=[（【《「『])\\s+",
        " +(?=[,.!?;:])",
    ]
    for pattern in patterns {
        result = result.replacingOccurrences(of: pattern, with: "", options: .regularExpression)
    }
    return result.trimmingCharacters(in: .whitespacesAndNewlines)
}

/* ---------------------------------------------------------- modern engine */

@available(macOS 26.0, *)
func modernTranscribe(audioURL: URL, language: String) async throws -> String {
    let requested = Locale(identifier: language)
    guard let locale = await SpeechTranscriber.supportedLocale(equivalentTo: requested) else {
        let supported = await SpeechTranscriber.supportedLocales
            .prefix(12)
            .map { $0.identifier(.bcp47) }
            .joined(separator: ", ")
        throw HelperError(
            "LOCALE_UNSUPPORTED",
            "Apple Speech 不支持语言 \"\(language)\"。可用语言示例：\(supported)。"
        )
    }
    guard SpeechTranscriber.isAvailable else {
        throw HelperError(
            "TRANSCRIBER_UNAVAILABLE",
            "SpeechTranscriber 当前不可用。请确认系统版本支持 Apple 端侧语音模型，并在系统设置中下载对应语言。"
        )
    }

    let transcriber = SpeechTranscriber(locale: locale, preset: .transcription)
    let status = await AssetInventory.status(forModules: [transcriber])
    switch status {
    case .unsupported:
        throw HelperError(
            "MODEL_UNSUPPORTED",
            "系统没有语言 \"\(locale.identifier(.bcp47))\" 的端侧语音模型。请在 系统设置 > 通用 > 键盘 > 听写 中添加该语言，或改用 OpenAI 兼容 ASR。"
        )
    case .downloading:
        throw HelperError(
            "MODEL_DOWNLOADING",
            "语言模型正在下载，请稍后重试。"
        )
    case .installed:
        break
    case .supported:
        // The language model exists in the catalog but is not installed yet.
        // `SpeechAnalyzer.start` would wait forever for it, so install it first
        // and let the helper timeout bound a slow download.
        FileHandle.standardError.write("apple_transcribe: installing speech model for \(locale.identifier(.bcp47))…\n".data(using: .utf8)!)
        guard let request = try await AssetInventory.assetInstallationRequest(supporting: [transcriber]) else {
            throw HelperError(
                "MODEL_NOT_INSTALLED",
                "语言 \(locale.identifier(.bcp47)) 的端侧语音模型尚未安装，且系统没有提供下载请求。请在 系统设置 > 通用 > 键盘 > 听写 中添加该语言，或改用 OpenAI 兼容 ASR。"
            )
        }
        do {
            try await request.downloadAndInstall()
        } catch {
            throw HelperError(
                "MODEL_DOWNLOAD_FAILED",
                "下载语言 \(locale.identifier(.bcp47)) 的端侧语音模型失败：\(error.localizedDescription)。请连接网络后重试，或在 系统设置 > 通用 > 键盘 > 听写 中手动添加该语言。"
            )
        }
        FileHandle.standardError.write("apple_transcribe: speech model installed\n".data(using: .utf8)!)
    @unknown default:
        break
    }

    guard let audioFile = try? AVAudioFile(forReading: audioURL) else {
        throw HelperError("AUDIO_UNREADABLE", "无法读取音频文件：\(audioURL.lastPathComponent)。请确认它是有效的 WAV。")
    }

    let analyzer = SpeechAnalyzer(modules: [transcriber])
    try await analyzer.start(inputAudioFile: audioFile, finishAfterFile: true)

    var text = ""
    // `finishAfterFile: true` ends the analyzer when the file is consumed, so
    // the result sequence completes without an explicit finalize call.
    for try await result in transcriber.results {
        text += String(result.text.characters)
    }

    let cleaned = cleanTranscript(text)
    if cleaned.isEmpty {
        throw HelperError("EMPTY_TRANSCRIPT", "Apple Speech 没有识别到文本；音频可能是静音或过短。")
    }
    return cleaned
}

/* ---------------------------------------------------------- legacy engine */

func authorizationGuidance(_ status: SFSpeechRecognizerAuthorizationStatus) -> String {
    switch status {
    case .denied:
        return
            "Apple Speech 权限被拒绝。请打开 系统设置 > 隐私与安全性 > 语音识别，允许 DeepSeek Harness（或启动 Host 的终端）访问后重试。"
    case .restricted:
        return
            "语音识别在此 Mac 上受到限制（屏幕使用时间 / MDM）。请检查 系统设置 > 隐私与安全性 > 语音识别。"
    case .notDetermined:
        return
            "语音识别权限未确定。请打开 系统设置 > 隐私与安全性 > 语音识别，允许 DeepSeek Harness（或启动 Host 的终端）访问后重试。"
    default:
        return "语音识别授权状态不可用（status=\(status.rawValue)）。"
    }
}

func legacyTranscribe(audioURL: URL, language: String) async throws -> String {
    let status = await withCheckedContinuation { (continuation: CheckedContinuation<SFSpeechRecognizerAuthorizationStatus, Never>) in
        SFSpeechRecognizer.requestAuthorization { continuation.resume(returning: $0) }
    }
    guard status == .authorized else {
        throw HelperError("NOT_AUTHORIZED", authorizationGuidance(status))
    }
    guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: language)) else {
        throw HelperError("LOCALE_UNSUPPORTED", "SFSpeechRecognizer 不支持语言 \"\(language)\"。")
    }
    guard recognizer.isAvailable else {
        throw HelperError("RECOGNIZER_UNAVAILABLE", "SFSpeechRecognizer 暂时不可用，请稍后重试。")
    }

    let request = SFSpeechURLRecognitionRequest(url: audioURL)
    request.shouldReportPartialResults = false
    request.taskHint = .dictation
    if recognizer.supportsOnDeviceRecognition {
        request.requiresOnDeviceRecognition = true
    }

    return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<String, Error>) in
        var resumed = false
        recognizer.recognitionTask(with: request) { result, error in
            guard !resumed else { return }
            if let error = error as NSError? {
                resumed = true
                continuation.resume(
                    throwing: HelperError(
                        "SPEECH_ERROR",
                        "Speech framework 错误：\(error.localizedDescription) (domain=\(error.domain), code=\(error.code))"
                    )
                )
                return
            }
            guard let result = result, result.isFinal else { return }
            resumed = true
            let text = cleanTranscript(result.bestTranscription.formattedString)
            if text.isEmpty {
                continuation.resume(
                    throwing: HelperError("EMPTY_TRANSCRIPT", "Speech framework 没有识别到文本；音频可能是静音或过短。")
                )
            } else {
                continuation.resume(returning: text)
            }
        }
    }
}

/* -------------------------------------------------------------------- main */

@main
struct AppleSpeechHelper {
    static func main() async {
        let arguments = CommandLine.arguments
        guard arguments.count >= 2 else {
            fail("BAD_USAGE", "usage: apple_transcribe <wav-path> [language] [timeoutSeconds]")
        }
        let audioPath = arguments[1]
        let language = arguments.count >= 3 && !arguments[2].isEmpty ? arguments[2] : "zh-CN"
        let timeoutSeconds: Double = {
            if arguments.count >= 4, let value = Double(arguments[3]), value > 0 { return value }
            return 300
        }()

        guard FileManager.default.fileExists(atPath: audioPath) else {
            fail("AUDIO_NOT_FOUND", "音频文件不存在：\(audioPath)")
        }
        let audioURL = URL(fileURLWithPath: audioPath)

        do {
            let text = try await withThrowingTaskGroup(of: String.self) { group in
                group.addTask {
                    if #available(macOS 26.0, *), SpeechTranscriber.isAvailable {
                        return try await modernTranscribe(audioURL: audioURL, language: language)
                    }
                    return try await legacyTranscribe(audioURL: audioURL, language: language)
                }
                group.addTask {
                    // `Task.sleep` is cancellable; leaving the group cancels it.
                    try await Task.sleep(nanoseconds: UInt64(timeoutSeconds * 1_000_000_000))
                    throw HelperError("TIMEOUT", "Apple Speech 转写在 \(Int(timeoutSeconds)) 秒内没有完成。")
                }
                defer { group.cancelAll() }
                guard let first = try await group.next() else {
                    throw HelperError("SPEECH_ERROR", "Apple Speech 没有返回结果。")
                }
                return first
            }
            succeed(text)
        } catch let error as HelperError {
            fail(error.code, error.message)
        } catch {
            fail("SPEECH_ERROR", "Apple Speech 转写失败：\(error.localizedDescription)")
        }
    }
}
