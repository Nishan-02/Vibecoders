import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class TwilioService {
  final String accountSid = 'ACce658050964302521faffb3568ed42';
  final String authToken = '736af548adb0a27fe9106700e8e127e1';
  final String twilioNumber =
      '+1662716052'; // Use the exact string provided by the user

  String _formatPhoneNumber(String phone) {
    // Remove all non-numeric characters
    final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');

    // India Handling
    if (digits.length == 10) {
      return '+91$digits';
    }

    // If it already has 12 digits and starts with 91, just prepend +
    if (digits.length == 12 && digits.startsWith('91')) {
      return '+$digits';
    }

    return phone.startsWith('+') ? phone : '+$digits';
  }

  Future<bool> makeSOSCall(String toPhoneNumber, String mapsLink) async {
    final formattedTo = _formatPhoneNumber(toPhoneNumber);

    debugPrint('--- TWILIO SOS ATTEMPT ---');
    debugPrint('FROM (Twilio Num): $twilioNumber');
    debugPrint('TO (Anchor Num): $formattedTo');

    final String url =
        'https://api.twilio.com/2010-04-01/Accounts/$accountSid/Calls.json';

    // Simple TwiML to say the message
    final String twiml = '''
      <Response>
        <Say voice="alice">EMERGENCY ALERT from SHIVARA. Your contact is in distress and has triggered an SOS. Please check your messages immediately for their live location. I repeat, this is an emergency.</Say>
        <Pause length="1"/>
        <Say>Emergency alert from Shivara. Check your messages. Thank you.</Say>
      </Response>
    ''';

    final response = await http.post(
      Uri.parse(url),
      headers: {
        'Authorization':
            'Basic ' + base64Encode(utf8.encode('$accountSid:$authToken')),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: {
        'To': formattedTo,
        'From': twilioNumber,
        'Twiml': twiml.trim(),
      },
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      debugPrint('Twilio Call Success: ${response.statusCode}');
      return true;
    } else {
      debugPrint(
          'TWILIO FATAL ERROR [${response.statusCode}]: ${response.body}');
      // Common issues:
      // 1. Invalid From Number (check if +1662716052 is missing a digit)
      // 2. Unverified To Number (Trial accounts must verify the destination number first)
      // 3. Geo-Permissions (India must be enabled in your Twilio Console)
      return false;
    }
  }

  Future<bool> sendSms(String toPhoneNumber, String message) async {
    final formattedTo = _formatPhoneNumber(toPhoneNumber);
    final String url =
        'https://api.twilio.com/2010-04-01/Accounts/$accountSid/Messages.json';

    final response = await http.post(
      Uri.parse(url),
      headers: {
        'Authorization':
            'Basic ' + base64Encode(utf8.encode('$accountSid:$authToken')),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: {
        'To': formattedTo,
        'From': twilioNumber,
        'Body': message,
      },
    );

    return response.statusCode == 201 || response.statusCode == 200;
  }
}
