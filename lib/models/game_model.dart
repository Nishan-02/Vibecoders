import 'package:flutter/material.dart';

class GameModel {
  final String id;
  final String name;
  final String description;
  final IconData icon;
  final Color themeColor;
  final String route;
  int bestScore;

  GameModel({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.themeColor,
    this.route = '',
    this.bestScore = 0,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'bestScore': bestScore,
    };
  }
}
