import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class GameFirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Collection: user_games
  // userId: string
  // username: string
  // gameName: string
  // score: number
  // timestamp: timestamp

  Future<void> saveScore(String gameName, int score) async {
    final user = _auth.currentUser;
    if (user == null) return;

    // First check if this is a new best score for THIS user and THIS game
    final bestScoreDoc = await _db
        .collection('user_games')
        .where('userId', isEqualTo: user.uid)
        .where('gameName', isEqualTo: gameName)
        .orderBy('score', descending: true)
        .limit(1)
        .get();

    bool shouldSave = true;
    if (bestScoreDoc.docs.isNotEmpty) {
      int currentBest = bestScoreDoc.docs.first.data()['score'] ?? 0;
      if (score <= currentBest) {
        shouldSave = false;
      }
    }

    if (shouldSave) {
      final userDoc = await _db.collection('users').doc(user.uid).get();
      final username = userDoc.exists
          ? (userDoc.data()?['username'] ?? 'Anonymous')
          : 'Anonymous';

      await _db.collection('user_games').add({
        'userId': user.uid,
        'username': username,
        'gameName': gameName,
        'score': score,
        'timestamp': FieldValue.serverTimestamp(),
      });
    }
  }

  Stream<QuerySnapshot> getLeaderboard(String gameName) {
    return _db
        .collection('user_games')
        .where('gameName', isEqualTo: gameName)
        .orderBy('score', descending: true)
        .limit(10)
        .snapshots();
  }

  Future<int> getUserBestScore(String gameName) async {
    final user = _auth.currentUser;
    if (user == null) return 0;

    final bestScoreDoc = await _db
        .collection('user_games')
        .where('userId', isEqualTo: user.uid)
        .where('gameName', isEqualTo: gameName)
        .orderBy('score', descending: true)
        .limit(1)
        .get();

    if (bestScoreDoc.docs.isNotEmpty) {
      return bestScoreDoc.docs.first.data()['score'] ?? 0;
    }
    return 0;
  }
}
