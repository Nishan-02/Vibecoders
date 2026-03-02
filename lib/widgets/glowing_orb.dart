import 'package:flutter/material.dart';

class GlowingOrb extends StatefulWidget {
  final bool isPressing;
  final double progress; // 0.0 to 1.0
  final VoidCallback onPressStart;
  final VoidCallback onPressEnd;

  const GlowingOrb({
    super.key,
    required this.isPressing,
    required this.progress,
    required this.onPressStart,
    required this.onPressEnd,
  });

  @override
  State<GlowingOrb> createState() => _GlowingOrbState();
}

class _GlowingOrbState extends State<GlowingOrb> with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _glowController;
  late Animation<double> _pulseAnim;
  late Animation<double> _glowAnim;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );

    _pulseAnim = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _glowAnim = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _glowController, curve: Curves.easeOut));
  }

  @override
  void didUpdateWidget(GlowingOrb oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isPressing) {
      _glowController.forward();
    } else {
      _glowController.reverse();
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _glowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPressStart: (_) => widget.onPressStart(),
      onLongPressEnd: (_) => widget.onPressEnd(),
      onLongPressCancel: widget.onPressEnd,
      child: AnimatedBuilder(
        animation: Listenable.merge([_pulseAnim, _glowAnim]),
        builder: (context, child) {
          final scale = widget.isPressing
              ? 1.0 + widget.progress * 0.15
              : _pulseAnim.value;
          final glowIntensity = _glowAnim.value;

          return Transform.scale(
            scale: scale,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    Color.lerp(
                      const Color(0xFFB44FFF),
                      const Color(0xFFFF2D55),
                      widget.progress,
                    )!,
                    const Color(0xFF6A0DAD).withValues(alpha: 0.6),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.5, 1.0],
                ),
                boxShadow: [
                  BoxShadow(
                    color: Color.lerp(
                      const Color(0xFFB44FFF),
                      const Color(0xFFFF2D55),
                      widget.progress,
                    )!
                        .withValues(alpha: 0.3 + glowIntensity * 0.5),
                    blurRadius: 30 + glowIntensity * 40,
                    spreadRadius: 5 + glowIntensity * 20,
                  ),
                ],
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Ring progress
                  SizedBox(
                    width: 190,
                    height: 190,
                    child: CircularProgressIndicator(
                      value: widget.progress,
                      strokeWidth: 3,
                      backgroundColor: Colors.white.withValues(alpha: 0.1),
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Color.lerp(
                          const Color(0xFFB44FFF),
                          const Color(0xFFFF2D55),
                          widget.progress,
                        )!,
                      ),
                    ),
                  ),
                  // Center text
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        widget.isPressing
                            ? '${(widget.progress * 15).toStringAsFixed(0)}s'
                            : 'HOLD',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: widget.isPressing ? 28 : 18,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 2,
                        ),
                      ),
                      if (!widget.isPressing)
                        const Text(
                          '15 seconds',
                          style: TextStyle(color: Colors.white54, fontSize: 11),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
