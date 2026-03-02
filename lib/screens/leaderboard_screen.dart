import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/game_firestore_service.dart';
import '../widgets/leaderboard_tile.dart';

class LeaderboardScreen extends StatelessWidget {
  final String gameName;
  final Color themeColor;

  const LeaderboardScreen({
    super.key,
    required this.gameName,
    required this.themeColor,
  });

  @override
  Widget build(BuildContext context) {
    final currentUserId = FirebaseAuth.instance.currentUser?.uid;

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      appBar: AppBar(
        title: Text("$gameName Leaderboard"),
        backgroundColor: Colors.transparent,
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: GameFirestoreService().getLeaderboard(gameName),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
            return const Center(
              child: Text(
                'No scores yet. Be the first!',
                style: TextStyle(color: Colors.white54),
              ),
            );
          }

          final scores = snapshot.data!.docs;

          return ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            itemCount: scores.length,
            physics: const BouncingScrollPhysics(),
            itemBuilder: (context, index) {
              final doc = scores[index];
              final data = doc.data() as Map<String, dynamic>;
              final userId = data['userId'] ?? '';
              final username = data['username'] ?? 'Anonymous';
              final score = data['score'] ?? 0;

              return LeaderboardTile(
                rank: index + 1,
                username: username,
                score: score,
                isCurrentUser: userId == currentUserId,
                themeColor: themeColor,
              );
            },
          );
        },
      ),
    );
  }
}
