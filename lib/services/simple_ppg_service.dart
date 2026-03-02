import 'dart:async';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';

class SimplePPGService {
  CameraController? _controller;
  bool _isProcessing = false;
  bool _fingerDetected = false;
  double _avgRed = 0.0;

  final StreamController<bool> _fingerStateController =
      StreamController<bool>.broadcast();
  Stream<bool> get fingerStateStream => _fingerStateController.stream;

  final StreamController<double> _intensityController =
      StreamController<double>.broadcast();
  Stream<double> get intensityStream => _intensityController.stream;

  Future<void> initialize(List<CameraDescription> cameras) async {
    if (cameras.isEmpty) return;

    _controller = CameraController(
      cameras[0],
      ResolutionPreset.low,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.yuv420,
    );

    await _controller!.initialize();
    await _controller!.setFlashMode(FlashMode.torch);

    _controller!.startImageStream((CameraImage image) {
      if (_isProcessing) return;
      _isProcessing = true;
      _processImage(image);
      _isProcessing = false;
    });
  }

  void _processImage(CameraImage image) {
    // Basic red channel extraction from YUV format
    // In YUV, we can check the U and V planes or just the Y (brightness)
    // For simple finger detection: high red means the plane is saturated with blood backlight
    // A quick hack: If it's very red, the Y plane average is actually quite high due to the torch
    // and the U/V planes would show specific shifts.
    // However, a simpler way for a "hackathon" version:
    // Just sum up a small portion of the Y plane and check if it's within a "flesh" brightness range with torch on.

    double totalY = 0;
    final bytes = image.planes[0].bytes;
    final int step = (bytes.length / 100).floor(); // Sample 1% of pixels

    for (int i = 0; i < bytes.length; i += step) {
      totalY += bytes[i];
    }

    _avgRed = totalY / (bytes.length / step);

    // Finger over lens with torch usually results in high brightness (red light passing through)
    // but filtered by blood. If the camera is covered, values are consistent.
    bool detected =
        _avgRed > 150; // Threshold for "very bright red" under torch

    if (detected != _fingerDetected) {
      _fingerDetected = detected;
      _fingerStateController.add(_fingerDetected);
    }

    _intensityController.add(_avgRed);
  }

  Future<void> stop() async {
    if (_controller != null) {
      await _controller!.setFlashMode(FlashMode.off);
      await _controller!.stopImageStream();
      await _controller!.dispose();
      _controller = null;
    }
  }

  void dispose() {
    _fingerStateController.close();
    _intensityController.close();
  }
}
