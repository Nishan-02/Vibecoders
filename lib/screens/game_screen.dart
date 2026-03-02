import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:vibration/vibration.dart';
import '../services/game_firestore_service.dart';

class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  final List<Bubble> _bubbles = [];
  final Random _random = Random();
  final _firestoreService = GameFirestoreService();
  int _score = 0;
  late Timer? _spawnTimer;
  late Timer? _updateTimer;

  @override
  void initState() {
    super.initState();
    _startSpawner();
    _startUpdater();
  }

  void _saveGameScore() {
    if (_score > 0) {
      _firestoreService.saveScore('Zen POP', _score);
    }
  }

  void _startSpawner() {
    _spawnTimer = Timer.periodic(const Duration(milliseconds: 1200), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        _bubbles.add(
          Bubble(
            id: DateTime.now().millisecondsSinceEpoch,
            x: _random.nextDouble() * 0.8 + 0.1,
            y: 1.1,
            size: _random.nextDouble() * 40 + 40,
            color: Colors.primaries[_random.nextInt(Colors.primaries.length)]
                .withValues(alpha: 0.6),
            speed: _random.nextDouble() * 0.005 + 0.003,
          ),
        );
      });
    });
  }

  void _startUpdater() {
    _updateTimer = Timer.periodic(const Duration(milliseconds: 16), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        for (var bubble in _bubbles) {
          bubble.y -= bubble.speed;
        }
        _bubbles.removeWhere((b) => b.y < -0.2);
      });
    });
  }

  void _pop(Bubble bubble) async {
    final hasVibrator = await Vibration.hasVibrator();
    if (hasVibrator == true) {
      Vibration.vibrate(duration: 30);
    }
    setState(() {
      _bubbles.remove(bubble);
      _score++;
    });
  }

  @override
  void dispose() {
    _saveGameScore();
    _spawnTimer?.cancel();
    _updateTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: Stack(
        children: [
          // Background Gradient
          Container(
            decoration: const BoxDecoration(
              gradient: RadialGradient(
                center: Alignment(0, -0.5),
                radius: 1.5,
                colors: [
                  Color(0xFF1A1A2F),
                  Color(0xFF0A0A0F),
                ],
              ),
            ),
          ),

          // Header
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child:
                        const Icon(Icons.arrow_back_ios, color: Colors.white70),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    "Zen POP",
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -1,
                    ),
                  ),
                  const Text(
                    "Release your tension by popping the bubbles.",
                    style: TextStyle(color: Colors.white54, fontSize: 16),
                  ),
                ],
              ),
            ),
          ),

          // Game Canvas
          ..._bubbles.map((bubble) {
            return Positioned(
              left: MediaQuery.of(context).size.width * bubble.x -
                  (bubble.size / 2),
              top: MediaQuery.of(context).size.height * bubble.y -
                  (bubble.size / 2),
              child: GestureDetector(
                onTap: () => _pop(bubble),
                child: TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0.0, end: 1.0),
                  duration: const Duration(milliseconds: 400),
                  builder: (context, value, child) {
                    return Transform.scale(
                      scale: value,
                      child: Container(
                        width: bubble.size,
                        height: bubble.size,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: bubble.color,
                          boxShadow: [
                            BoxShadow(
                              color: bubble.color.withValues(alpha: 0.3),
                              blurRadius: 15,
                              spreadRadius: 2,
                            ),
                          ],
                          border: Border.all(
                            color: Colors.white24,
                            width: 1,
                          ),
                        ),
                        child: Center(
                          child: Container(
                            width: bubble.size * 0.3,
                            height: bubble.size * 0.3,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withValues(alpha: 0.1),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            );
          }),

          // Score Overlay
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white10,
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: Colors.white12),
                ),
                child: Text(
                  "POPPED: $_score",
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class Bubble {
  final int id;
  final double x;
  double y;
  final double size;
  final Color color;
  final double speed;

  Bubble({
    required this.id,
    required this.x,
    required this.y,
    required this.size,
    required this.color,
    required this.speed,
  });
}
