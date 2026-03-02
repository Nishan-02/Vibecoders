import 'dart:math';
import 'package:flutter/material.dart';

class Particle {
  double x;
  double y;
  double vx;
  double vy;
  double radius;
  double opacity;
  Color color;

  Particle({
    required this.x,
    required this.y,
    required this.vx,
    required this.vy,
    required this.radius,
    required this.opacity,
    required this.color,
  });
}

class ParticleField extends StatefulWidget {
  final double chaos; // 0.0 (calm) to 1.0 (chaotic)

  const ParticleField({super.key, required this.chaos});

  @override
  State<ParticleField> createState() => _ParticleFieldState();
}

class _ParticleFieldState extends State<ParticleField>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final List<Particle> _particles = [];
  final Random _random = Random();
  static const int _particleCount = 80;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat();

    _controller.addListener(_updateParticles);
  }

  void _initParticles(Size size) {
    if (_particles.isNotEmpty) return;
    for (int i = 0; i < _particleCount; i++) {
      _particles.add(_createParticle(size));
    }
  }

  Particle _createParticle(Size size) {
    final angle = _random.nextDouble() * 2 * pi;
    final speed = 0.5 + _random.nextDouble() * 3.0;
    return Particle(
      x: _random.nextDouble() * size.width,
      y: _random.nextDouble() * size.height,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      radius: 1.5 + _random.nextDouble() * 3.0,
      opacity: 0.3 + _random.nextDouble() * 0.7,
      color: _random.nextBool()
          ? const Color(0xFFB44FFF)
          : const Color(0xFFFF2D55),
    );
  }

  void _updateParticles() {
    if (!mounted) return;
    final size = MediaQuery.of(context).size;
    _initParticles(size);

    setState(() {
      for (var p in _particles) {
        final chaosMultiplier = 0.2 + widget.chaos * 2.0;
        p.x += p.vx * chaosMultiplier;
        p.y += p.vy * chaosMultiplier;

        // Bounce off edges
        if (p.x < 0 || p.x > size.width) {
          p.vx = -p.vx;
          p.x = p.x.clamp(0, size.width);
        }
        if (p.y < 0 || p.y > size.height) {
          p.vy = -p.vy;
          p.y = p.y.clamp(0, size.height);
        }

        // Chaos: random velocity perturbation
        if (widget.chaos > 0.3) {
          p.vx += (_random.nextDouble() - 0.5) * widget.chaos * 0.5;
          p.vy += (_random.nextDouble() - 0.5) * widget.chaos * 0.5;
          // Clamp velocity
          p.vx = p.vx.clamp(-5.0, 5.0);
          p.vy = p.vy.clamp(-5.0, 5.0);
        }
      }
    });
  }

  @override
  void dispose() {
    _controller.removeListener(_updateParticles);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = Size(constraints.maxWidth, constraints.maxHeight);
        _initParticles(size);
        return CustomPaint(
          painter: _ParticlePainter(_particles, widget.chaos),
          size: size,
        );
      },
    );
  }
}

class _ParticlePainter extends CustomPainter {
  final List<Particle> particles;
  final double chaos;

  _ParticlePainter(this.particles, this.chaos);

  @override
  void paint(Canvas canvas, Size size) {
    for (var p in particles) {
      final paint = Paint()
        ..color = p.color.withValues(alpha: p.opacity * (0.3 + chaos * 0.7))
        ..maskFilter = MaskFilter.blur(
          BlurStyle.normal,
          chaos > 0.5 ? 4.0 : 2.0,
        );
      canvas.drawCircle(Offset(p.x, p.y), p.radius, paint);
    }

    // Draw connecting lines between nearby particles when chaotic
    if (chaos > 0.4) {
      final linePaint = Paint()
        ..strokeWidth = 0.5
        ..style = PaintingStyle.stroke;
      for (int i = 0; i < particles.length; i++) {
        for (int j = i + 1; j < particles.length; j++) {
          final dx = particles[i].x - particles[j].x;
          final dy = particles[i].y - particles[j].y;
          final distance = sqrt(dx * dx + dy * dy);
          if (distance < 60) {
            linePaint.color = const Color(
              0xFFB44FFF,
            ).withValues(alpha: (1 - distance / 60) * chaos * 0.3);
            canvas.drawLine(
              Offset(particles[i].x, particles[i].y),
              Offset(particles[j].x, particles[j].y),
              linePaint,
            );
          }
        }
      }
    }
  }

  @override
  bool shouldRepaint(_ParticlePainter oldDelegate) => true;
}
