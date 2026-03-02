import 'dart:math';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<User?> get authStateChanges => _auth.authStateChanges();

  User? get currentUser => _auth.currentUser;

  String _generateRandomUsername() {
    final adjectives = [
      'Silent',
      'Zen',
      'Calm',
      'Pure',
      'Bright',
      'Golden',
      'Mystic',
      'Healed'
    ];
    final nouns = [
      'Spirit',
      'Soul',
      'Path',
      'Flow',
      'Mind',
      'Heart',
      'Wave',
      'Light'
    ];
    final random = Random();

    String adj = adjectives[random.nextInt(adjectives.length)];
    String noun = nouns[random.nextInt(nouns.length)];
    int number = random.nextInt(900) + 100; // 100-999

    return '$adj$noun$number';
  }

  Future<UserModel?> login(String email, String password) async {
    try {
      final UserCredential result = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      return await _getUser(result.user!.uid);
    } catch (e) {
      rethrow;
    }
  }

  Future<UserModel?> signup(String email, String password) async {
    try {
      final UserCredential result = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      final UserModel newUser = UserModel(
        uid: result.user!.uid,
        email: email,
        username: _generateRandomUsername(),
        createdAt: DateTime.now(),
      );
      await _firestore
          .collection('users')
          .doc(newUser.uid)
          .set(newUser.toMap());
      return newUser;
    } catch (e) {
      rethrow;
    }
  }

  Future<UserModel?> _getUser(String uid) async {
    final doc = await _firestore.collection('users').doc(uid).get();
    if (doc.exists) {
      return UserModel.fromMap(doc.data()!, uid);
    }
    return null;
  }

  Future<void> logout() async {
    await _auth.signOut();
  }
}
