import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../../services/game_firestore_service.dart';

class FocusTapGame extends StatefulWidget {
  const FocusTapGame({super.key});

  @override
  State<FocusTapGame> createState() => _FocusTapGameState();
}

class _FocusTapGameState extends State<FocusTapGame> {
  int _score = 0;
  bool _isActive = false;
  double _targetX = 0.5;
  double _targetY = 0.5;
  final Random _random = Random();
  final _firestoreService = GameFirestoreService();

  void _spawnTarget() {
    setState(() {
      _targetX = _random.nextDouble() * 0.7 + 0.15;
      _targetY = _random.nextDouble() * 0.6 + 0.2;
      _isActive = true;
    });
  }

  void _handleTap() {
    if (!_isActive) return;
    setState(() {
      _score++;
      _isActive = false;
    });
    Future.delayed(const Duration(milliseconds: 300), _spawnTarget);
  }

  @override
  void initState() {
    super.initState();
    _spawnTarget();
  }

  @override
  void dispose() {
    if (_score > 0) {
      _firestoreService.saveScore('Focus Tap', _score);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: Stack(
        children: [
          Positioned(
            top: 60,
            left: 24,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.arrow_back_ios, color: Colors.white70),
                ),
                const SizedBox(height: 20),
                const Text("Focus Tap",
                    style:
                        TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
                Text("SCORE: $_score",
                    style: const TextStyle(
                        color: Color(0xFFFF2D55),
                        fontSize: 24,
                        fontWeight: FontWeight.w900)),
              ],
            ),
          ),
          if (_isActive)
            Positioned(
              left: MediaQuery.of(context).size.width * _targetX - 40,
              top: MediaQuery.of(context).size.height * _targetY - 40,
              child: GestureDetector(
                onTap: _handleTap,
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF2D55).withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                    border:
                        Border.all(color: const Color(0xFFFF2D55), width: 3),
                    boxShadow: [
                      BoxShadow(
                          color: const Color(0xFFFF2D55).withValues(alpha: 0.5),
                          blurRadius: 20),
                    ],
                  ),
                  child: const Center(
                      child: Icon(Icons.ads_click, color: Colors.white)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
