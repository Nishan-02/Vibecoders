import 'package:cloud_firestore/cloud_firestore.dart';

class UserModel {
  final String uid;
  final String email;
  final String username;
  final String anchorPhone;
  final int streak;
  final int totalSOS;
  final DateTime createdAt;

  UserModel({
    required this.uid,
    required this.email,
    required this.username,
    this.anchorPhone = '',
    this.streak = 0,
    this.totalSOS = 0,
    required this.createdAt,
  });

  factory UserModel.fromMap(Map<String, dynamic> map, String uid) {
    return UserModel(
      uid: uid,
      email: map['email'] ?? '',
      username: map['username'] ?? 'Anonymous',
      anchorPhone: map['anchorPhone'] ?? '',
      streak: map['streak'] ?? 0,
      totalSOS: map['totalSOS'] ?? 0,
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'email': email,
      'username': username,
      'anchorPhone': anchorPhone,
      'streak': streak,
      'totalSOS': totalSOS,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  UserModel copyWith({
    String? email,
    String? username,
    String? anchorPhone,
    int? streak,
    int? totalSOS,
  }) {
    return UserModel(
      uid: uid,
      email: email ?? this.email,
      username: username ?? this.username,
      anchorPhone: anchorPhone ?? this.anchorPhone,
      streak: streak ?? this.streak,
      totalSOS: totalSOS ?? this.totalSOS,
      createdAt: createdAt,
    );
  }
}
