import 'package:flutter/material.dart';

class PulseCircle extends StatefulWidget {
  final bool isDetected;
  final double bpm;

  const PulseCircle({super.key, required this.isDetected, required this.bpm});

  @override
  State<PulseCircle> createState() => _PulseCircleState();
}

class _PulseCircleState extends State<PulseCircle>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: _calculateDuration(widget.bpm),
    );

    _scaleAnimation = Tween<double>(begin: 0.5, end: 1.0)
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
    _opacityAnimation = Tween<double>(begin: 0.8, end: 0.0)
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeIn));

    if (widget.isDetected) {
      _controller.repeat();
    }
  }

  Duration _calculateDuration(double bpm) {
    if (bpm <= 0) return const Duration(milliseconds: 1000);
    return Duration(milliseconds: (60000 / bpm).round());
  }

  @override
  void didUpdateWidget(PulseCircle oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isDetected != oldWidget.isDetected) {
      if (widget.isDetected) {
        _controller.repeat();
      } else {
        _controller.stop();
      }
    }

    if (widget.bpm != oldWidget.bpm && widget.bpm > 0) {
      _controller.duration = _calculateDuration(widget.bpm);
      if (widget.isDetected) {
        _controller.repeat();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Stack(
          alignment: Alignment.center,
          children: [
            // Outer glow ring
            Container(
              width: 250 * _scaleAnimation.value,
              height: 250 * _scaleAnimation.value,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.redAccent.withOpacity(_opacityAnimation.value),
                  width: 4,
                ),
              ),
            ),
            // Inner pulsing core
            Container(
              width: 150,
              height: 150,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    Colors.red.withOpacity(0.8),
                    Colors.red.withOpacity(0.2),
                    Colors.red.withOpacity(0.05),
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.red.withOpacity(_isPulsing ? 0.3 : 0.1),
                    blurRadius: 20 * _scaleAnimation.value,
                    spreadRadius: 10 * _scaleAnimation.value,
                  ),
                ],
              ),
              child: child,
            ),
          ],
        );
      },
      child: Center(
        child: Icon(
          Icons.favorite,
          color: widget.isDetected ? Colors.white : Colors.white24,
          size: 48,
        ),
      ),
    );
  }

  bool get _isPulsing => widget.isDetected;
}
