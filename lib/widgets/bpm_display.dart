import 'package:flutter/material.dart';

class BPMDisplay extends StatelessWidget {
  final double bpm;
  final bool isDetected;

  const BPMDisplay({super.key, required this.bpm, required this.isDetected});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          isDetected ? bpm.toStringAsFixed(0) : '--',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 72,
            fontWeight: FontWeight.w900,
            letterSpacing: -2,
            fontFamily: 'Courier', // Data-style font for BPM
          ),
        ),
        const Text(
          "BPM",
          style: TextStyle(
            color: Colors.white38,
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: 2,
          ),
        ),
        const SizedBox(height: 24),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          child: Text(
            isDetected
                ? "HOLD STEADY. BREATHE CALMLY."
                : "PLACE FINGER OVER CAMERA",
            key: ValueKey(isDetected),
            style: TextStyle(
              color: isDetected
                  ? Colors.redAccent.withOpacity(0.6)
                  : Colors.white24,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.5,
            ),
          ),
        ),
      ],
    );
  }
}
