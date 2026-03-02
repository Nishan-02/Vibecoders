import 'package:flutter/material.dart';
import '../models/game_model.dart';
import '../services/game_firestore_service.dart';

class GameCard extends StatelessWidget {
  final GameModel game;
  final VoidCallback onPlay;
  final VoidCallback onLeaderboard;

  const GameCard({
    super.key,
    required this.game,
    required this.onPlay,
    required this.onLeaderboard,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF161621),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: game.themeColor.withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: game.themeColor.withValues(alpha: 0.1),
            blurRadius: 15,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: game.themeColor.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(game.icon, color: game.themeColor, size: 28),
              ),
              const SizedBox(width: 15),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      game.name,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      game.description,
                      style:
                          const TextStyle(color: Colors.white54, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          FutureBuilder<int>(
            future: GameFirestoreService().getUserBestScore(game.name),
            builder: (context, snapshot) {
              return Text(
                "BEST SCORE: ${snapshot.hasData ? snapshot.data : '-'}",
                style: TextStyle(
                  color: game.themeColor,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                  fontSize: 12,
                ),
              );
            },
          ),
          const SizedBox(height: 15),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: onPlay,
                  icon: const Icon(Icons.play_arrow_rounded, size: 18),
                  label: const Text("PLAY"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: game.themeColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              IconButton.outlined(
                onPressed: onLeaderboard,
                icon: const Icon(Icons.leaderboard_rounded),
                style: OutlinedButton.styleFrom(
                  side:
                      BorderSide(color: game.themeColor.withValues(alpha: 0.3)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
