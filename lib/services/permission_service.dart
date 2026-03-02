import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/material.dart';

class PermissionService {
  static Future<bool> requestLocation() async {
    final status = await Permission.location.request();
    return status.isGranted;
  }

  static Future<bool> requestMicrophone() async {
    final status = await Permission.microphone.request();
    return status.isGranted;
  }

  static Future<bool> requestContacts() async {
    final status = await Permission.contacts.request();
    return status.isGranted;
  }

  static Future<bool> requestPhone() async {
    final status = await Permission.phone.request();
    return status.isGranted;
  }

  static Future<Map<String, bool>> requestAll() async {
    final results = await [
      Permission.location,
      Permission.microphone,
      Permission.contacts,
      Permission.phone,
    ].request();

    return {
      'location': results[Permission.location]?.isGranted ?? false,
      'microphone': results[Permission.microphone]?.isGranted ?? false,
      'contacts': results[Permission.contacts]?.isGranted ?? false,
      'phone': results[Permission.phone]?.isGranted ?? false,
    };
  }

  static void showDeniedDialog(BuildContext context, String permissionName) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A2E),
        title: Text(
          '$permissionName Permission Denied',
          style: const TextStyle(color: Colors.white),
        ),
        content: Text(
          'Some features require $permissionName permission to work properly. '
          'You can enable it in Settings.',
          style: const TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(
              'Cancel',
              style: TextStyle(color: Color(0xFFB44FFF)),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              openAppSettings();
            },
            child: const Text(
              'Open Settings',
              style: TextStyle(color: Color(0xFFB44FFF)),
            ),
          ),
        ],
      ),
    );
  }
}
