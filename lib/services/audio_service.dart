import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';

class AudioService {
  final AudioRecorder _recorder = AudioRecorder();
  StreamSubscription<Amplitude>? _amplitudeSub;
  bool _isRecording = false;

  static const double threshold = -20.0; // dBFS threshold

  Future<bool> startMonitoring(
    void Function(double amplitude) onAmplitude,
  ) async {
    final hasPermission = await _recorder.hasPermission();
    if (!hasPermission) return false;

    try {
      final tempDir = await getTemporaryDirectory();
      final path =
          '${tempDir.path}/monitor_${DateTime.now().millisecondsSinceEpoch}.m4a';
      await _recorder.start(
        const RecordConfig(encoder: AudioEncoder.aacLc),
        path: path,
      );
    } catch (e) {
      debugPrint("Audio init error: $e");
      return false;
    }

    _isRecording = true;

    // Poll amplitude every 200ms
    _amplitudeTimer =
        Timer.periodic(const Duration(milliseconds: 200), (timer) async {
      if (!_isRecording) {
        timer.cancel();
        return;
      }
      try {
        final amp = await _recorder.getAmplitude();
        onAmplitude(amp.current);
      } catch (_) {}
    });

    return true;
  }

  Timer? _amplitudeTimer;

  Future<void> stopMonitoring() async {
    _isRecording = false;
    _amplitudeTimer?.cancel();
    _amplitudeSub?.cancel();
    try {
      if (await _recorder.isRecording()) {
        await _recorder.stop();
      }
    } catch (_) {}
  }

  void dispose() {
    stopMonitoring();
    _recorder.dispose();
  }
}
