import 'package:flutter/material.dart';
import '../../services/game_firestore_service.dart';

class BreathingSyncGame extends StatefulWidget {
  const BreathingSyncGame({super.key});

  @override
  State<BreathingSyncGame> createState() => _BreathingSyncGameState();
}

class _BreathingSyncGameState extends State<BreathingSyncGame>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  int _cycles = 0;
  final _firestoreService = GameFirestoreService();
  String _breatheStatus = "INHALE";

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..addStatusListener((status) {
        if (status == AnimationStatus.completed) {
          setState(() {
            _breatheStatus = "EXHALE";
          });
          _controller.reverse();
        } else if (status == AnimationStatus.dismissed) {
          setState(() {
            _breatheStatus = "INHALE";
            _cycles++;
          });
          _controller.forward();
        }
      });

    _animation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    _controller.forward();
  }

  @override
  void dispose() {
    if (_cycles > 0) {
      _firestoreService.saveScore('Breathe Sync', _cycles);
    }
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              "Sync your breath with the flow.",
              style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.5), fontSize: 18),
            ),
            const SizedBox(height: 40),
            AnimatedBuilder(
              animation: _animation,
              builder: (context, child) {
                return Container(
                  width: 250 * _animation.value,
                  height: 250 * _animation.value,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        const Color(0xFF4ACBC9).withValues(alpha: 0.8),
                        const Color(0xFF4ACBC9).withValues(alpha: 0.1),
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF4ACBC9)
                            .withValues(alpha: 0.3 * _animation.value),
                        blurRadius: 40,
                        spreadRadius: 10,
                      )
                    ],
                  ),
                  child: Center(
                    child: Text(
                      _breatheStatus,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, letterSpacing: 5),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 60),
            Text(
              "Cycles Completed: $_cycles",
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 40),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF4ACBC9)),
              child: const Text("EXIT GAME"),
            )
          ],
        ),
      ),
    );
  }
}
