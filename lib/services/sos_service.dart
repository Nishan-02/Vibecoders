import 'package:geolocator/geolocator.dart';
import '../models/user_model.dart';
import 'twilio_service.dart';

class SosService {
  final TwilioService _twilio = TwilioService();

  Future<Map<String, dynamic>> triggerSOS(UserModel user) async {
    // 1. Get GPS location
    Position position = await _determinePosition();
    final mapsLink =
        'https://maps.google.com/?q=${position.latitude},${position.longitude}';

    bool callSent = false;
    bool smsSent = false;

    // 2. Trigger Twilio
    if (user.anchorPhone.isNotEmpty) {
      try {
        callSent = await _twilio.makeSOSCall(user.anchorPhone, mapsLink);
        smsSent = await _twilio.sendSms(user.anchorPhone,
            'EMERGENCY ALERT from SHIVARA! Live location: $mapsLink');
      } catch (e) {
        print('Twilio failed: $e');
      }
    }

    return {
      'mapsLink': mapsLink,
      'callSent': callSent,
      'smsSent': smsSent,
    };
  }

  Future<Position> _determinePosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return _fallbackPosition();
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.deniedForever ||
        permission == LocationPermission.denied) {
      return _fallbackPosition();
    }

    try {
      // Try to get current position with a timeout
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
    } catch (e) {
      // Fallback to last known position if current fails or times out
      final lastKnown = await Geolocator.getLastKnownPosition();
      return lastKnown ?? _fallbackPosition();
    }
  }

  Position _fallbackPosition() {
    return Position(
      latitude: 0,
      longitude: 0,
      timestamp: DateTime.now(),
      accuracy: 0,
      altitude: 0,
      heading: 0,
      speed: 0,
      speedAccuracy: 0,
      altitudeAccuracy: 0,
      headingAccuracy: 0,
    );
  }
}
