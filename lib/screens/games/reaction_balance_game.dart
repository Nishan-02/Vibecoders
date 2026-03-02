import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../../services/game_firestore_service.dart';

class ReactionBalanceGame extends StatefulWidget {
  const ReactionBalanceGame({super.key});

  @override
  State<ReactionBalanceGame> createState() => _ReactionBalanceGameState();
}

class _ReactionBalanceGameState extends State<ReactionBalanceGame> {
  int _score = 0;
  bool _ready = false;
  Stopwatch _stopwatch = Stopwatch();
  final Random _random = Random();
  final _firestoreService = GameFirestoreService();

  void _startRound() {
    setState(() => _ready = false);
    Future.delayed(Duration(seconds: 2 + _random.nextInt(3)), () {
      if (mounted) {
        setState(() => _ready = true);
        _stopwatch.start();
      }
    });
  }

  void _onTap() {
    if (!_ready) return;
    _stopwatch.stop();
    setState(() {
      _score += (1000 - _stopwatch.elapsedMilliseconds).clamp(0, 1000);
      _stopwatch.reset();
      _startRound();
    });
  }

  @override
  void initState() {
    super.initState();
    _startRound();
  }

  @override
  void dispose() {
    if (_score > 0) {
      _firestoreService.saveScore('Reaction Balance', _score);
    }
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
            const Text("Reaction Balance",
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
            Text("TOTAL POINTS: $_score",
                style: const TextStyle(color: Color(0xFF5856D6), fontSize: 24)),
            const SizedBox(height: 60),
            GestureDetector(
              onTap: _onTap,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 250,
                height: 250,
                decoration: BoxDecoration(
                  color: _ready ? const Color(0xFF5856D6) : Colors.white10,
                  shape: BoxShape.circle,
                  boxShadow: [
                    if (_ready)
                      BoxShadow(
                          color: const Color(0xFF5856D6).withValues(alpha: 0.5),
                          blurRadius: 40)
                  ],
                ),
                child: Center(
                  child: Text(
                    _ready ? "TAP NOW!" : "WAIT...",
                    style: TextStyle(
                      color: _ready ? Colors.white : Colors.white24,
                      fontWeight: FontWeight.bold,
                      fontSize: 24,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
