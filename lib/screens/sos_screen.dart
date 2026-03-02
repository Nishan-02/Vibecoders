import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../services/sos_service.dart';
import '../services/audio_service.dart';
import '../widgets/particle_field.dart';

class SosScreen extends StatefulWidget {
  const SosScreen({super.key});

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen> with TickerProviderStateMixin {
  final SosService _sosService = SosService();
  final AudioService _audioService = AudioService();

  bool _sosSent = false;
  bool _loading = false;
  String? _mapsLink;
  bool _callSent = false;
  bool _smsSent = false;

  // Countdown for auto-send
  int _countdownSeconds = 5;
  Timer? _countdownTimer;
  bool _isCountdownActive = true;

  // Particle chaos level 0.0 = calm, 1.0 = chaotic
  double _chaos = 1.0;

  // Background color lerp
  late AnimationController _bgController;
  late Animation<Color?> _bgAnim;

  @override
  void initState() {
    super.initState();
    _bgController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );
    _bgAnim = ColorTween(
      begin: const Color(0xFF2A0010),
      end: const Color(0xFF0A0A1E),
    ).animate(CurvedAnimation(parent: _bgController, curve: Curves.easeInOut));

    _startCountdown();
    _startAudioMonitoring();
  }

  void _startCountdown() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        if (_countdownSeconds > 0) {
          _countdownSeconds--;
        } else {
          _isCountdownActive = false;
          _countdownTimer?.cancel();
          _triggerSOS();
        }
      });
    });
  }

  void _cancelSos() {
    _countdownTimer?.cancel();
    Navigator.pop(context);
  }

  Future<void> _triggerSOS() async {
    setState(() => _loading = true);
    final userProvider = context.read<UserProvider>();
    final user = userProvider.user;
    if (user == null) {
      setState(() {
        _loading = false;
      });
      return;
    }

    try {
      final results = await _sosService.triggerSOS(user);
      final mapsLink = results['mapsLink'] as String;
      final callSent = results['callSent'] as bool;
      final smsSent = results['smsSent'] as bool;

      await userProvider.incrementTotalSOS();

      // Log to sos_events collection (matches User Rule)
      await FirebaseFirestore.instance.collection('sos_events').add({
        'userId': user.uid,
        'userEmail': user.email,
        'username': user.username,
        'mapsLink': mapsLink,
        'callSent': callSent,
        'smsSent': smsSent,
        'timestamp': FieldValue.serverTimestamp(),
      });

      if (!mounted) return;
      setState(() {
        _sosSent = true;
        _loading = false;
        _mapsLink = mapsLink;
        _callSent = callSent;
        _smsSent = smsSent;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _sosSent = true;
      });
    }
  }

  void _startAudioMonitoring() async {
    await _audioService.startMonitoring((amplitude) {
      if (!mounted) return;
      _updateChaosFromAmplitude(amplitude);
    });
  }

  void _updateChaosFromAmplitude(double amplitude) {
    // amplitude is in dBFS: typically -100 (silent) to 0 (max)
    // If > -20dB (exhale detected), reduce chaos
    if (amplitude > AudioService.threshold) {
      final newChaos = (_chaos - 0.05).clamp(0.0, 1.0);
      setState(() => _chaos = newChaos);
      if (_chaos < 0.3) _bgController.forward();

      // PASSIVE REACTION: If user calms down significantly, cancel auto-SOS
      if (_chaos < 0.1 && _isCountdownActive) {
        _countdownTimer?.cancel();
        setState(() {
          _isCountdownActive = false;
        });
        // We don't pop immediately so they see the "Calmed Down" state
      }
    } else {
      // Slowly drift back toward chaos
      if (_chaos < 1.0) {
        setState(() => _chaos = (_chaos + 0.005).clamp(0.0, 1.0));
      }
      if (_chaos > 0.3) _bgController.reverse();
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _audioService.dispose();
    _bgController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _bgAnim,
      builder: (context, child) {
        return Scaffold(
          backgroundColor: _bgAnim.value ?? const Color(0xFF2A0010),
          body: Stack(
            children: [
              // Particle field background
              Positioned.fill(child: ParticleField(chaos: _chaos)),

              // Content
              SafeArea(
                child: Column(
                  children: [
                    // Header
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 16,
                      ),
                      child: Row(
                        children: [
                          IconButton(
                            icon: const Icon(
                              Icons.close,
                              color: Colors.white54,
                            ),
                            onPressed: () => Navigator.pop(context),
                          ),
                          const Expanded(
                            child: Text(
                              '🚨 SOS ACTIVE',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Color(0xFFFF2D55),
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                                letterSpacing: 3,
                              ),
                            ),
                          ),
                          const SizedBox(width: 48),
                        ],
                      ),
                    ),

                    // Breathing instruction
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Breathing text
                          AnimatedOpacity(
                            opacity: _chaos > 0.4 ? 1.0 : 0.5,
                            duration: const Duration(milliseconds: 500),
                            child: Column(
                              children: [
                                Text(
                                  _chaos > 0.6
                                      ? 'Breathe slowly.'
                                      : _chaos > 0.3
                                          ? 'Good... keep going.'
                                          : '✨ You\'re calming down',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 26,
                                    fontWeight: FontWeight.w300,
                                    letterSpacing: 1,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _chaos > 0.4
                                      ? 'Exhale slowly into mic'
                                      : 'Breathe in... breathe out...',
                                  style: const TextStyle(
                                    color: Colors.white54,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 48),

                          // Chaos meter
                          _buildChaosMeter(),

                          const SizedBox(height: 40),

                          // Countdown UI
                          if (_isCountdownActive) _buildCountdownUI(),

                          // SOS status
                          _buildSosStatus(),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCountdownUI() {
    return Column(
      children: [
        Stack(
          alignment: Alignment.center,
          children: [
            SizedBox(
              width: 120,
              height: 120,
              child: CircularProgressIndicator(
                value: _countdownSeconds / 5,
                strokeWidth: 4,
                color: const Color(0xFFFF2D55),
                backgroundColor: Colors.white10,
              ),
            ),
            Text(
              '$_countdownSeconds',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 48,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
        const SizedBox(height: 32),
        const Text(
          'SENDING AUTOMATICALLY',
          style: TextStyle(
            color: Colors.white54,
            fontSize: 12,
            letterSpacing: 2,
          ),
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: _cancelSos,
          style: TextButton.styleFrom(
            backgroundColor: Colors.white.withOpacity(0.1),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(30),
            ),
          ),
          child: const Text(
            'CANCEL I\'M OKAY',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildChaosMeter() {
    return Column(
      children: [
        const Text(
          'CALM LEVEL',
          style: TextStyle(
            color: Colors.white38,
            fontSize: 10,
            letterSpacing: 3,
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: 200,
          child: LinearProgressIndicator(
            value: 1.0 - _chaos,
            backgroundColor: Colors.white12,
            valueColor: AlwaysStoppedAnimation<Color>(
              Color.lerp(
                const Color(0xFFFF2D55),
                const Color(0xFFB44FFF),
                1.0 - _chaos,
              )!,
            ),
            minHeight: 6,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '${((1.0 - _chaos) * 100).toInt()}%',
          style: const TextStyle(color: Colors.white38, fontSize: 11),
        ),
      ],
    );
  }

  Widget _buildSosStatus() {
    if (_loading) {
      return const Column(
        children: [
          CircularProgressIndicator(color: Color(0xFFFF2D55), strokeWidth: 2),
          SizedBox(height: 12),
          Text(
            'Sending SOS...',
            style: TextStyle(color: Colors.white54, fontSize: 13),
          ),
        ],
      );
    }

    final user = context.read<UserProvider>().user;
    final hasAnchor = user?.anchorPhone.isNotEmpty ?? false;

    if (_sosSent) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 32),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.black38,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: (hasAnchor ? const Color(0xFFFF2D55) : Colors.amber)
                .withOpacity(0.4),
          ),
        ),
        child: Column(
          children: [
            Icon(
              hasAnchor
                  ? Icons.check_circle_outline
                  : Icons.warning_amber_rounded,
              color: hasAnchor ? const Color(0xFFFF2D55) : Colors.amber,
              size: 36,
            ),
            const SizedBox(height: 10),
            Text(
              hasAnchor ? '🚨 SOS Cloud Alert Enabled' : '⚠️ No Anchor Set',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildStatusChip('CALL', _callSent, Icons.phone_callback),
                const SizedBox(width: 8),
                _buildStatusChip('SMS', _smsSent, Icons.message),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              hasAnchor
                  ? 'Cloud Dispatch for ${user?.anchorPhone}'
                  : 'Add an Anchor contact in Zen Home to send automated alerts.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white54, fontSize: 12),
            ),
            if (hasAnchor && _mapsLink != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'LINK: $_mapsLink',
                  style: TextStyle(
                    color: const Color(0xFFB44FFF).withOpacity(0.8),
                    fontSize: 9,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ],
        ),
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildStatusChip(String label, bool success, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: success
            ? Colors.green.withOpacity(0.1)
            : const Color(0xFFFF2D55).withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: success
              ? Colors.green.withOpacity(0.3)
              : const Color(0xFFFF2D55).withOpacity(0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(success ? Icons.check_circle : Icons.error_outline,
              size: 14,
              color: success ? Colors.green : const Color(0xFFFF2D55)),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: success ? Colors.green : const Color(0xFFFF2D55),
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
