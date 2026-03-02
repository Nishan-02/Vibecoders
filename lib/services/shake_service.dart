import 'dart:async';
import 'dart:math';
import 'package:sensors_plus/sensors_plus.dart';

typedef SosCallback = void Function();

class ShakeService {
  static const Duration _cooldown = Duration(seconds: 10);

  StreamSubscription<UserAccelerometerEvent>? _subscription;
  DateTime? _shakeStarted;
  DateTime? _lastTrigger;
  SosCallback? _onSosTriggered;

  void startListening(SosCallback onSosTriggered) {
    _onSosTriggered = onSosTriggered;
    // Use userAccelerometerEventStream() to ignore gravity (correct for sensors_plus ^4.0.2)
    _subscription = userAccelerometerEventStream().listen(_onAccelerometer);
  }

  void stopListening() {
    _subscription?.cancel();
    _subscription = null;
    _shakeStarted = null;
  }

  void _onAccelerometer(UserAccelerometerEvent event) {
    // Magnitude without gravity
    final magnitude = sqrt(
      event.x * event.x + event.y * event.y + event.z * event.z,
    );

    // Adjusted threshold for more sensitive detection (12.0 is easier than 15.0 for users in distress)
    if (magnitude > 12.0) {
      final now = DateTime.now();

      // Cooldown check
      if (_lastTrigger != null && now.difference(_lastTrigger!) < _cooldown) {
        return;
      }

      if (_shakeStarted == null) {
        _shakeStarted = now;
      } else if (now.difference(_shakeStarted!) >=
          const Duration(milliseconds: 800)) {
        // Reduced sustain duration to 800ms for faster SOS triggering in distress
        _lastTrigger = now;
        _shakeStarted = null;
        _onSosTriggered?.call();
      }
    } else {
      _shakeStarted = null;
    }
  }

  void dispose() {
    stopListening();
  }
}
