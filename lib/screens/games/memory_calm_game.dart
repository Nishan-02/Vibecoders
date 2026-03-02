import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../../services/game_firestore_service.dart';

class MemoryCalmGame extends StatefulWidget {
  const MemoryCalmGame({super.key});

  @override
  State<MemoryCalmGame> createState() => _MemoryCalmGameState();
}

class _MemoryCalmGameState extends State<MemoryCalmGame> {
  int _score = 0;
  List<int> _sequence = [];
  List<int> _userSequence = [];
  bool _showingSequence = false;
  final Random _random = Random();
  final _firestoreService = GameFirestoreService();

  void _nextRound() {
    setState(() {
      _sequence.add(_random.nextInt(4));
      _userSequence = [];
      _showSequence();
    });
  }

  Future<void> _showSequence() async {
    setState(() => _showingSequence = true);
    for (int i = 0; i < _sequence.length; i++) {
      await Future.delayed(const Duration(milliseconds: 600));
      // Trigger temporary highlight
    }
    setState(() => _showingSequence = false);
  }

  void _handleTap(int index) {
    if (_showingSequence) return;
    setState(() {
      _userSequence.add(index);
      if (_userSequence.last != _sequence[_userSequence.length - 1]) {
        // Game Over!
        if (_score > 0) _firestoreService.saveScore('Memory Calm', _score);
        Navigator.pop(context);
        return;
      }

      if (_userSequence.length == _sequence.length) {
        _score++;
        _nextRound();
      }
    });
  }

  @override
  void initState() {
    super.initState();
    _nextRound();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text("Memory Calm",
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
            Text("SCORE: $_score",
                style: const TextStyle(color: Color(0xFFFFCC00), fontSize: 24)),
            const SizedBox(height: 50),
            GridView.count(
              shrinkWrap: true,
              crossAxisCount: 2,
              padding: const EdgeInsets.all(40),
              mainAxisSpacing: 20,
              crossAxisSpacing: 20,
              children: List.generate(4, (index) {
                return GestureDetector(
                  onTap: () => _handleTap(index),
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFCC00).withValues(alpha: 0.1),
                      border: Border.all(color: const Color(0xFFFFCC00)),
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }
}
