// SPDX-License-Identifier: AGPL-3.0-only
import AVFoundation
import Foundation

/// Bounded PCM playback for the approved app preview; no audio files are created.
final class PreviewSpeaker {
  private let engine = AVAudioEngine()
  private let player = AVAudioPlayerNode()
  private let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: 16000, channels: 1, interleaved: false)!
  private var pending = 0
  init() throws {
    try AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
    try AVAudioSession.sharedInstance().setActive(true)
    engine.attach(player)
    engine.connect(player, to: engine.mainMixerNode, format: format)
    try engine.start()
    player.play()
  }
  func enqueue(_ encoded: String) throws {
    guard encoded.count <= 44000, let data = Data(base64Encoded: encoded), !data.isEmpty, data.count <= 32768, data.count % 2 == 0 else { throw SpeakerError.invalid }
    guard pending < 6, let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(data.count / 2)), let channel = buffer.floatChannelData?[0] else { return }
    buffer.frameLength = buffer.frameCapacity
    let bytes = [UInt8](data)
    for index in 0..<Int(buffer.frameLength) { channel[index] = Float(Int16(bitPattern: UInt16(bytes[index * 2]) | UInt16(bytes[index * 2 + 1]) << 8)) / 32768 }
    pending += 1
    player.scheduleBuffer(buffer) { [weak self] in DispatchQueue.main.async { self?.pending = max(0, (self?.pending ?? 1) - 1) } }
  }
  func stop() { player.stop(); engine.stop(); pending = 0; try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation) }
  private enum SpeakerError: Error { case invalid }
}
