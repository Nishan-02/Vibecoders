import 'package:flutter/foundation.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class UserProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  UserModel? _user;

  UserModel? get user => _user;
  bool get isLoggedIn => _user != null;

  UserProvider() {
    _initUser();
  }

  Future<void> _initUser() async {
    final firebaseUser = FirebaseAuth.instance.currentUser;
    if (firebaseUser != null) {
      final doc = await FirebaseFirestore.instance
          .collection('users')
          .doc(firebaseUser.uid)
          .get();
      if (doc.exists) {
        _user = UserModel.fromMap(doc.data()!, firebaseUser.uid);
        notifyListeners();
      }
    }
  }

  Future<void> setUser(UserModel? user) async {
    _user = user;
    notifyListeners();
  }

  Future<void> updateAnchorPhone(String phone) async {
    if (_user == null) return;
    _user = _user!.copyWith(anchorPhone: phone);
    await FirebaseFirestore.instance
        .collection('users')
        .doc(_user!.uid)
        .update({'anchorPhone': phone});
    notifyListeners();
  }

  Future<void> incrementStreak() async {
    if (_user == null) return;
    final newStreak = _user!.streak + 1;
    _user = _user!.copyWith(streak: newStreak);
    await FirebaseFirestore.instance
        .collection('users')
        .doc(_user!.uid)
        .update({'streak': newStreak});
    notifyListeners();
  }

  Future<void> incrementTotalSOS() async {
    if (_user == null) return;
    final newTotal = _user!.totalSOS + 1;
    _user = _user!.copyWith(totalSOS: newTotal);
    await FirebaseFirestore.instance
        .collection('users')
        .doc(_user!.uid)
        .update({'totalSOS': newTotal});
    notifyListeners();
  }

  void logout() {
    _user = null;
    _authService.logout();
    notifyListeners();
  }
}
