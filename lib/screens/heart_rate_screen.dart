import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:vibration/vibration.dart';
import '../services/simple_ppg_service.dart';
import '../widgets/pulse_circle.dart';
import '../widgets/bpm_display.dart';

class HeartRateScreen extends StatefulWidget {
  const HeartRateScreen({super.key});

  @override
  State<HeartRateScreen> createState() => _HeartRateScreenState();
}

class _HeartRateScreenState extends State<HeartRateScreen> {
  final SimplePPGService _ppgService = SimplePPGService();
  bool _isDetected = false;
  double _currentBPM = 82;
  double _targetBPM = 85;
  Timer? _simulationTimer;
  Timer? _stabilizeTimer;
  bool _isStabilizing = false;
  int _secondsRemaining = 10;
  bool _isScanning = true;

  @override
  void initState() {
    super.initState();
    _startPPSensors();
  }

  Future<void> _startPPSensors() async {
    final cameras = await availableCameras();
    if (cameras.isNotEmpty) {
      await _ppgService.initialize(cameras);
      _ppgService.fingerStateStream.listen((detected) {
        setState(() {
          _isDetected = detected;
          if (_isDetected) {
            _startSimulation();
          } else {
            _stopSimulation();
          }
        });
      });
    }
  }

  void _startSimulation() {
    if (_simulationTimer != null) return;

    _targetBPM = 82 + Random().nextDouble() * 13; // 82 to 95
    _currentBPM =
        _targetBPM + (Random().nextDouble() * 5 - 2.5); // Slightly jittery
    _secondsRemaining = 10;
    _isStabilizing = false;

    _simulationTimer =
        Timer.periodic(const Duration(milliseconds: 800), (timer) {
      if (!_isDetected) return;

      setState(() {
        if (!_isStabilizing) {
          _currentBPM += (Random().nextDouble() * 2 - 1.0); // Drift
        } else {
          // Stabilization towards 70-85 range
          _currentBPM = _currentBPM * 0.95 +
              _targetBPM * 0.05 +
              (Random().nextDouble() * 1.0 - 0.5); // Calm variance
        }

        // Clip BPM
        if (_currentBPM < 50) _currentBPM = 60;
        if (_currentBPM > 120) _currentBPM = 100;

        // Haptic feedback for each simulated pulse beat (roughly)
        Vibration.vibrate(duration: 30, amplitude: 50);
      });
    });

    _stabilizeTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!_isDetected) return;

      setState(() {
        if (_secondsRemaining > 0) {
          _secondsRemaining--;
        } else if (!_isStabilizing) {
          _isStabilizing = true;
          _targetBPM =
              68 + Random().nextDouble() * 12; // Lower to 68-80 after 10s
        }
      });
    });
  }

  void _stopSimulation() {
    _simulationTimer?.cancel();
    _simulationTimer = null;
    _stabilizeTimer?.cancel();
    _stabilizeTimer = null;
    _isScanning = true;
  }

  @override
  void dispose() {
    _ppgService.stop();
    _simulationTimer?.cancel();
    _stabilizeTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      appBar: AppBar(
        title: const Text('HEART RATE',
            style: TextStyle(
                letterSpacing: 2, fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: Stack(
        children: [
          // Background Glow
          Positioned.fill(
            child: AnimatedContainer(
              duration: const Duration(seconds: 2),
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.center,
                  radius: 1.5,
                  colors: [
                    (_isDetected
                        ? Colors.red.withOpacity(0.15)
                        : Colors.transparent),
                    const Color(0xFF0A0A0F),
                  ],
                ),
              ),
            ),
          ),

          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                PulseCircle(isDetected: _isDetected, bpm: _currentBPM),
                const SizedBox(height: 100),
                BPMDisplay(bpm: _currentBPM, isDetected: _isDetected),
                const SizedBox(height: 60),

                // Footer Text
                if (_isDetected)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 40),
                    child: LinearProgressIndicator(
                      value: _isStabilizing
                          ? 1.0
                          : (10 - _secondsRemaining) / 10.0,
                      backgroundColor: Colors.white10,
                      color: Colors.redAccent,
                    ),
                  ),
              ],
            ),
          ),

          if (!_isDetected)
            Positioned(
              bottom: 60,
              left: 0,
              right: 0,
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0.0, end: 1.0),
                duration: const Duration(milliseconds: 800),
                builder: (context, value, child) {
                  return Opacity(
                    opacity: value,
                    child: const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(horizontal: 40),
                        child: Text(
                          "Please place your finger GENTLY over the flash and camera lens.",
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white38, fontSize: 13),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
