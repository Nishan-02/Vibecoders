import 'package:flutter/material.dart';
import '../models/game_model.dart';
import '../widgets/game_card.dart';
import 'leaderboard_screen.dart';
import 'games/focus_tap_game.dart';
import 'games/breathing_sync_game.dart';
import 'games/memory_calm_game.dart';
import 'games/reaction_balance_game.dart';
import 'game_screen.dart'; // The original Zen POP game

class ZenArenaScreen extends StatefulWidget {
  const ZenArenaScreen({super.key});

  @override
  State<ZenArenaScreen> createState() => _ZenArenaScreenState();
}

class _ZenArenaScreenState extends State<ZenArenaScreen> {
  final List<GameModel> games = [
    GameModel(
      id: 'zen_pop',
      name: 'Zen POP',
      description: 'Release tension by popping bubbles.',
      icon: Icons.bubble_chart_rounded,
      themeColor: const Color(0xFFB44FFF),
    ),
    GameModel(
      id: 'focus_tap',
      name: 'Focus Tap',
      description: 'Test your focus with rhythmic taps.',
      icon: Icons.ads_click_rounded,
      themeColor: const Color(0xFFFF2D55),
    ),
    GameModel(
      id: 'breathing_sync',
      name: 'Breathe Sync',
      description: 'Synchronize your breath with visual flow.',
      icon: Icons.wind_power_rounded,
      themeColor: const Color(0xFF4ACBC9),
    ),
    GameModel(
      id: 'memory_calm',
      name: 'Memory Calm',
      description: 'Enhance focus with tranquil patterns.',
      icon: Icons.grid_view_rounded,
      themeColor: const Color(0xFFFFCC00),
    ),
    GameModel(
      id: 'reaction_balance',
      name: 'Reaction Balance',
      description: 'Calibrate your reaction in balance.',
      icon: Icons.balance_outlined,
      themeColor: const Color(0xFF5856D6),
    ),
  ];

  void _onPlay(GameModel game) {
    Widget gameWidget;
    switch (game.id) {
      case 'zen_pop':
        gameWidget = const GameScreen();
        break;
      case 'focus_tap':
        gameWidget = const FocusTapGame();
        break;
      case 'breathing_sync':
        gameWidget = const BreathingSyncGame();
        break;
      case 'memory_calm':
        gameWidget = const MemoryCalmGame();
        break;
      case 'reaction_balance':
        gameWidget = const ReactionBalanceGame();
        break;
      default:
        gameWidget = const GameScreen();
    }

    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => gameWidget),
    );
  }

  void _onLeaderboard(GameModel game) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) =>
            LeaderboardScreen(gameName: game.name, themeColor: game.themeColor),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 30),
              const Text(
                "Zen Arena",
                style: TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -1.5,
                  color: Colors.white,
                ),
              ),
              const Text(
                "Choose a micro-intervention to refocus.",
                style: TextStyle(color: Colors.white54, fontSize: 16),
              ),
              const SizedBox(height: 30),
              Expanded(
                child: ListView.builder(
                  itemCount: games.length,
                  physics: const BouncingScrollPhysics(),
                  itemBuilder: (context, index) {
                    return GameCard(
                      game: games[index],
                      onPlay: () => _onPlay(games[index]),
                      onLeaderboard: () => _onLeaderboard(games[index]),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
