import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_contacts/flutter_contacts.dart';
import 'package:vibration/vibration.dart';
import 'package:permission_handler/permission_handler.dart';
import '../providers/user_provider.dart';
import '../services/shake_service.dart';
import '../widgets/glowing_orb.dart';
import 'sos_screen.dart';
import 'heart_rate_screen.dart';
import 'zen_arena_screen.dart';
import '../services/permission_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  // Orb hold tracking
  Timer? _holdTimer;
  Timer? _vibrateTimer;
  bool _isPressing = false;
  double _holdProgress = 0.0;
  static const int _holdDurationSeconds = 15;
  bool _streakSuccess = false;

  // Streak animation
  late AnimationController _successAnimCtrl;
  late Animation<double> _successAnim;

  @override
  void initState() {
    super.initState();
    _successAnimCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _successAnim = CurvedAnimation(
      parent: _successAnimCtrl,
      curve: Curves.elasticOut,
    );

    // Start shake detection (Sensor Integration - Wildcard 1)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ShakeService>().startListening(_onSosTriggered);
    });
  }

  @override
  void dispose() {
    _holdTimer?.cancel();
    _vibrateTimer?.cancel();
    _successAnimCtrl.dispose();
    context.read<ShakeService>().stopListening();
    super.dispose();
  }

  bool _isSosActive = false;

  void _onSosTriggered() {
    if (!mounted || _isSosActive) return;
    _isSosActive = true;
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => const SosScreen()))
        .then((_) => _isSosActive = false);
  }

  void _startHold() {
    setState(() {
      _isPressing = true;
      _holdProgress = 0.0;
      _streakSuccess = false;
    });

    // Haptic Feedback for Breathing Sync (Wildcard 1)
    _vibrateTimer = Timer.periodic(const Duration(seconds: 4), (timer) async {
      final hasVibrator = await Vibration.hasVibrator();
      if (hasVibrator == true) {
        // Inhale vibrate
        Vibration.vibrate(duration: 1500);
      }
    });

    int elapsed = 0;
    _holdTimer = Timer.periodic(const Duration(milliseconds: 100), (t) {
      elapsed += 100;
      final progress = elapsed / (_holdDurationSeconds * 1000);
      if (progress >= 1.0) {
        t.cancel();
        _vibrateTimer?.cancel();
        _onHoldComplete();
      } else {
        setState(() => _holdProgress = progress);
      }
    });
  }

  void _endHold() {
    if (!_isPressing) return;
    _holdTimer?.cancel();
    _vibrateTimer?.cancel();
    Vibration.cancel();
    setState(() {
      _isPressing = false;
      _holdProgress = 0.0;
    });
  }

  Future<void> _onHoldComplete() async {
    final userProvider = context.read<UserProvider>();
    await userProvider.incrementStreak();
    setState(() {
      _isPressing = false;
      _streakSuccess = true;
    });
    _successAnimCtrl.forward(from: 0);
    Vibration.vibrate(pattern: [0, 200, 100, 200, 100, 400]);
    await Future.delayed(const Duration(seconds: 3));
    if (mounted) setState(() => _streakSuccess = false);
  }

  Future<void> _selectAnchor() async {
    // Use permission_handler for more reliable state detection
    final status = await Permission.contacts.status;

    if (status.isDenied || status.isPermanentlyDenied) {
      final request = await [
        Permission.contacts,
        Permission.phone,
      ].request();

      if (request[Permission.contacts]?.isGranted != true) {
        if (mounted) {
          PermissionService.showDeniedDialog(context, 'Contacts');
        }
        return;
      }
    }

    // Refresh contacts list
    final contacts = await FlutterContacts.getContacts(withProperties: true);
    if (!mounted) return;

    final currentAnchor = context.read<UserProvider>().user?.anchorPhone ?? '';

    String searchQuery = '';

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A2E),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      builder: (ctx) => StatefulBuilder(builder: (context, setModalState) {
        List<Contact> filteredContacts = contacts.where((c) {
          final query = searchQuery.toLowerCase().replaceAll(RegExp(r'\D'), '');
          final nameMatch =
              c.displayName.toLowerCase().contains(searchQuery.toLowerCase());
          final phoneMatch = c.phones.any(
              (p) => p.number.replaceAll(RegExp(r'\D'), '').contains(query));
          return nameMatch || (query.isNotEmpty && phoneMatch);
        }).toList();

        return SizedBox(
          height: MediaQuery.of(ctx).size.height * 0.8,
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(24),
                child: Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Select Anchor',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(ctx),
                      icon: const Icon(Icons.close, color: Colors.white38),
                    ),
                  ],
                ),
              ),

              // Search Bar
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                child: TextField(
                  onChanged: (val) {
                    setModalState(() {
                      searchQuery = val;
                    });
                  },
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: "Search contacts...",
                    hintStyle: const TextStyle(color: Colors.white24),
                    prefixIcon:
                        const Icon(Icons.search, color: Color(0xFFB44FFF)),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.05),
                    contentPadding: const EdgeInsets.all(16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),

              Expanded(
                child: filteredContacts.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.person_off_outlined,
                                color: Colors.white.withOpacity(0.1), size: 64),
                            const SizedBox(height: 16),
                            Text(
                              contacts.isEmpty
                                  ? 'No contacts found'
                                  : 'No results for "$searchQuery"',
                              style: const TextStyle(
                                  color: Colors.white54, fontSize: 16),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.only(top: 16, bottom: 32),
                        itemCount: filteredContacts.length,
                        itemBuilder: (_, i) {
                          final c = filteredContacts[i];
                          final phone =
                              c.phones.isNotEmpty ? c.phones.first.number : '';
                          // Clean up formatting for comparison
                          final isSelected = phone.replaceAll(
                                      RegExp(r'\D'), '') ==
                                  currentAnchor.replaceAll(RegExp(r'\D'), '') &&
                              phone.isNotEmpty;

                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 24, vertical: 8),
                            leading: CircleAvatar(
                              backgroundColor: isSelected
                                  ? const Color(0xFFB44FFF).withOpacity(0.2)
                                  : const Color(0xFFB44FFF).withOpacity(0.1),
                              child: Text(
                                (c.displayName.isNotEmpty
                                        ? c.displayName[0]
                                        : '?')
                                    .toUpperCase(),
                                style: TextStyle(
                                    color: isSelected
                                        ? Colors.white
                                        : const Color(0xFFB44FFF),
                                    fontWeight: FontWeight.bold),
                              ),
                            ),
                            title: Text(
                              c.displayName,
                              style: TextStyle(
                                  color: isSelected
                                      ? const Color(0xFFB44FFF)
                                      : Colors.white,
                                  fontWeight: isSelected
                                      ? FontWeight.w900
                                      : FontWeight.bold),
                            ),
                            subtitle: Text(
                              phone,
                              style: const TextStyle(
                                  color: Colors.white54, fontSize: 12),
                            ),
                            trailing: isSelected
                                ? const Icon(Icons.check_circle,
                                    color: Color(0xFFB44FFF), size: 28)
                                : null,
                            onTap: () async {
                              Navigator.pop(ctx);
                              await context
                                  .read<UserProvider>()
                                  .updateAnchorPhone(phone);
                            },
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<UserProvider>().user;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0F0B1E), // Soft dark purple
              Color(0xFF0B0F1A), // Soft dark blue
              Color(0xFF07070F), // Very dark near-black depth
            ],
          ),
        ),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Floating background glow 1
            Positioned(
              top: -80,
              left: -50,
              child: Container(
                width: 250,
                height: 250,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF6C3FFF).withOpacity(0.08),
                ),
              ),
            ),
            // Floating background glow 2
            Positioned(
              bottom: 100,
              right: -40,
              child: Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF3F6CFF).withOpacity(0.06),
                ),
              ),
            ),

            SafeArea(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    child: ConstrainedBox(
                      constraints:
                          BoxConstraints(minHeight: constraints.maxHeight),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          // Top Group: Header & Stats Dashboard
                          Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Padding(
                                padding:
                                    const EdgeInsets.fromLTRB(24, 24, 24, 8),
                                child: Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            _getDynamicWelcome(),
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 26,
                                              fontWeight: FontWeight.w900,
                                              letterSpacing: -1,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          const Text(
                                            "Resonance helps you build calm, focus, and safety.",
                                            style: TextStyle(
                                              color: Colors.white38,
                                              fontSize: 12,
                                              letterSpacing: 0.5,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Row(
                                      children: [
                                        GestureDetector(
                                          onTap: () {
                                            context
                                                .read<UserProvider>()
                                                .logout();
                                          },
                                          child: Container(
                                            padding: const EdgeInsets.all(12),
                                            decoration: BoxDecoration(
                                              color: Colors.white
                                                  .withOpacity(0.05),
                                              shape: BoxShape.circle,
                                              border: Border.all(
                                                  color: Colors.white12),
                                            ),
                                            child: const Icon(Icons.logout,
                                                color: Colors.white54,
                                                size: 20),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        GestureDetector(
                                          onTap: _selectAnchor,
                                          child: _buildAnchorButton(
                                              user?.anchorPhone.isEmpty ??
                                                  true),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              _buildStreakBar(user?.streak ?? 0),

                              // Quick Stats Grid
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 24.0),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: _buildStatTile(
                                        "TOTAL SOS",
                                        "${user?.totalSOS ?? 0}",
                                        Icons.emergency_outlined,
                                        const Color(0xFFFF2D55),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: _buildStatTile(
                                        "ANCHOR",
                                        (user?.anchorPhone.isEmpty ?? true)
                                            ? "NOT SET"
                                            : "ACTIVE",
                                        Icons.security_outlined,
                                        Colors.blueAccent,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: _buildStatTile(
                                        "ZEN LEVEL",
                                        (user?.streak ?? 0) > 5
                                            ? "ADEPTS"
                                            : "NOVICE",
                                        Icons.auto_awesome_outlined,
                                        const Color(0xFFB44FFF),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                              _buildHowItWorks(),
                            ],
                          ),

                          // Middle Section: Session Orb
                          Stack(
                            alignment: Alignment.center,
                            children: [
                              Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Text(
                                    "DAILY FOCUS SESSION",
                                    style: TextStyle(
                                      color: Colors.white24,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 3,
                                    ),
                                  ),
                                  const SizedBox(height: 24),
                                  GlowingOrb(
                                    isPressing: _isPressing,
                                    progress: _holdProgress,
                                    onPressStart: _startHold,
                                    onPressEnd: _endHold,
                                  ),
                                  const SizedBox(height: 24),
                                  const Text(
                                    "Hold steadily for 15 seconds to build your\ndaily focus streak.",
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: Colors.white24,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w400,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  const SizedBox(height: 24),
                                  AnimatedSwitcher(
                                    duration: const Duration(milliseconds: 300),
                                    child: Text(
                                      _isPressing
                                          ? 'Inhale deep... Exhale slow'
                                          : 'HOLD TO BREATHE',
                                      key: ValueKey(_isPressing),
                                      style: const TextStyle(
                                        color: Colors.white38,
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 3,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              if (_streakSuccess)
                                ScaleTransition(
                                  scale: _successAnim,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 40, vertical: 30),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF1A1A2E),
                                      borderRadius: BorderRadius.circular(32),
                                      border: Border.all(
                                          color: const Color(0xFFB44FFF)
                                              .withOpacity(0.5)),
                                      boxShadow: [
                                        BoxShadow(
                                          color: const Color(0xFFB44FFF)
                                              .withOpacity(0.2),
                                          blurRadius: 30,
                                          spreadRadius: 5,
                                        )
                                      ],
                                    ),
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.auto_awesome,
                                            color: Color(0xFFB44FFF), size: 50),
                                        const SizedBox(height: 16),
                                        const Text(
                                          'CALM STORED',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontSize: 22,
                                            fontWeight: FontWeight.w900,
                                            letterSpacing: 2,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Day ${user?.streak ?? 0} streak preserved',
                                          style: const TextStyle(
                                              color: Colors.white38,
                                              fontSize: 13),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                          ),

                          // Bottom Section: Navigation Quick Cards & Disclaimer
                          Padding(
                            padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: _ActionCard(
                                        label: "ZEN ARENA",
                                        icon: Icons.sports_esports,
                                        color: const Color(0xFFB44FFF),
                                        onTap: () => Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                              builder: (_) =>
                                                  const ZenArenaScreen()),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: _ActionCard(
                                        label: "SOS SHIELD",
                                        icon: Icons.emergency_share,
                                        color: const Color(0xFFFF2D55),
                                        onTap: () => Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                              builder: (_) =>
                                                  const SosScreen()),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: _ActionCard(
                                        label: "PULSE",
                                        icon: Icons.favorite,
                                        color: Colors.redAccent,
                                        onTap: () => Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                              builder: (_) =>
                                                  const HeartRateScreen()),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 24),
                                const Text(
                                  "Resonance is a wellness support tool and not a replacement for medical care.",
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: Colors.white12,
                                    fontSize: 9,
                                    letterSpacing: 0.2,
                                  ),
                                ),
                                const SizedBox(height: 8),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatTile(
      String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          Icon(icon, color: color.withOpacity(0.6), size: 20),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w900,
              fontFamily: 'Courier', // Give it a dashboard/data feel
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white24,
              fontSize: 9,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStreakBar(int streak) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white12),
      ),
      child: Row(
        children: [
          const Text('🔥', style: TextStyle(fontSize: 24)),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$streak DAY FOCUS',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                  ),
                ),
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: LinearProgressIndicator(
                    value: (streak % 7) / 7.0,
                    backgroundColor: Colors.white10,
                    color: const Color(0xFFB44FFF),
                    minHeight: 4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnchorButton(bool isEmpty) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isEmpty
            ? const Color(0xFFFF2D55).withOpacity(0.1)
            : Colors.white.withOpacity(0.05),
        shape: BoxShape.circle,
        border: Border.all(
          color: isEmpty
              ? const Color(0xFFFF2D55).withOpacity(0.5)
              : Colors.white12,
          width: isEmpty ? 2 : 1,
        ),
        boxShadow: isEmpty
            ? [
                BoxShadow(
                  color: const Color(0xFFFF2D55).withOpacity(0.2),
                  blurRadius: 10,
                  spreadRadius: 2,
                )
              ]
            : null,
      ),
      child: Icon(
        Icons.anchor,
        color: isEmpty ? const Color(0xFFFF2D55) : const Color(0xFFB44FFF),
        size: 20,
      ),
    );
  }

  String _getDynamicWelcome() {
    final hour = DateTime.now().hour;
    if (hour < 12) return "Welcome back.";
    if (hour < 17) return "Stay steady today.";
    return "Your calm starts here.";
  }

  Widget _buildHowItWorks() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.01),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
        ),
        child: Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            title: const Text(
              "HOW RESONANCE WORKS",
              style: TextStyle(
                color: Colors.white38,
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
              ),
            ),
            iconColor: Colors.white24,
            collapsedIconColor: Colors.white24,
            childrenPadding: EdgeInsets.zero,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                child: Column(
                  children: [
                    _buildStepRow(
                      "Daily Focus",
                      "Hold the orb for 15 seconds to strengthen your mental focus habit.",
                      const Color(0xFFB44FFF),
                    ),
                    const SizedBox(height: 16),
                    _buildStepRow(
                      "SOS Shield",
                      "Shake your phone in emergency. Your location is logged instantly.",
                      const Color(0xFFFF2D55),
                    ),
                    const SizedBox(height: 16),
                    _buildStepRow(
                      "Zen Arena",
                      "Train your mind with calming competitive games.",
                      Colors.amberAccent,
                    ),
                    const SizedBox(height: 16),
                    _buildStepRow(
                      "Heart Rate Check",
                      "Use your camera to monitor and slow your pulse.",
                      Colors.blueAccent,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepRow(String title, String desc, Color color) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 8,
          height: 8,
          margin: const EdgeInsets.only(top: 4),
          decoration: BoxDecoration(
            color: color.withOpacity(0.6),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: color.withOpacity(0.3),
                blurRadius: 4,
                spreadRadius: 1,
              )
            ],
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: color.withOpacity(0.8),
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                desc,
                style: const TextStyle(
                  color: Colors.white38,
                  fontSize: 11,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ActionCard extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ActionCard({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 100,
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: color.withOpacity(0.1)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w900,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
