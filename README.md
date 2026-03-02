# Resonance
### Build Calm. Train Focus. Stay Safe.

**Resonance** is a professional Flutter-based mental health resilience and cognitive training application designed for the modern user. By combining somatosensory grounding, sensor-driven emergency detection, and cognitive training games, Resonance provides a proactive sanctuary for mental well-being and personal safety.

---

## 2️⃣ Problem Statement
The current digital landscape often lacks immediate, frictionless tools for mental self-regulation. Users facing high-stress environments or sudden panic attacks frequently experience:
- **Rising Stress Levels**: Difficulty in breaking the stress cycle through quick, accessible interventions.
- **Panic Situations**: Inability to call for help effectively during high-adrenaline emergencies.
- **Lack of Feedback**: A disconnect between analytical data and tangible, real-time bio-feedback.
- **Engagement Gaps**: Traditional wellness apps often fail to sustain long-term focus through engaging systems.

---

## 3️⃣ Solution Overview
Resonance addresses these challenges through a cohesive architecture of support:
- **Daily Focus Orb (Habit Reinforcement)**: A somatosensory interface that requires consistent physical focus to strengthen grounding habits.
- **SOS Shield (Emergency Detection)**: A kinetic, shake-to-trigger system that utilizes Twilio cloud communication to alert designated anchors instantly.
- **Zen Arena (Cognitive Training)**: A competitive gaming module designed to train cognitive agility and calm under pressure.
- **Per-Game Leaderboards (Community)**: A Firestore-backed competitive layer that fosters engagement and consistency in mental training.
- **Heart Rate Monitor (Biofeedback)**: Camera-based PPG analysis for real-time physiological stress tracking.

---

## 4️⃣ Core Features
- **🔐 Secure Authentication**: Integrated with Firebase Authentication for private user profiles.
- **🧘 Daily Focus Habit Builder**: Somatic grounding through a 15-second "Focus Orb" session.
- **🚨 SOS Shield with Shake Detection**: Kinetic triggering of automated cloud calls and location alerts.
- **🎮 Zen Arena Multi-Game Architecture**: A modular game engine hosting multiple cognitive focus challenges.
- **🏆 Per-Game Leaderboards**: Real-time Firestore-backed ranking system with high-speed query performance.
- **❤️ Camera-Based Heart Rate Monitoring**: PPG-inspired pulse detection using camera/torch biofeedback.
- **📍 Location Integration**: Real-time emergency geo-coordinates sharing via Google Maps.
- **🔄 Scalable Modular Architecture**: Clean, service-based backend abstraction.

---

## 5️⃣ Technical Architecture
Built with scalability and resilience in mind:

### **Frontend**
- **Flutter (Android/iOS)**: A high-performance, cross-platform engine ensuring 60fps animations.
- **Provider State Management**: A robust, reactive state architecture handling real-time data flow.

### **Backend**
- **Firebase Authentication**: Industry-standard identity management.
- **Cloud Firestore**: A NoSQL document database for high-concurrency leaderboard and event logging.
- **Twilio API Integration**: Cloud-based automated voice call and SMS dispatch.

### **Architecture Design**
- **Feature-Based Modular Structure**: Decoupled modules for SOS, Gaming, and Biofeedback.
- **Service Layer Abstraction**: Clean separation between UI and business logic (e.g., `TwilioService`, `ShakeService`).
- **Real-Time Data Pipelines**: Optimized Firestore queries for sub-second leaderboard updates.

---

## 6️⃣ Database Structure (Firestore)
- **`users`**: Stores user profiles, progress stats, and anchor contact information.
- **`game_scores`**: A collection tracking high scores across the Zen Arena games.
- **`sos_events`**: A searchable log of emergency triggers, location data, and alert success statuses.

---

## 7️⃣ Project Structure
```bash
lib/
  ├── models/     # Data entities (User, Score, SOS Event)
  ├── providers/  # Global state and business logic controllers
  ├── screens/    # Feature views (Home, Zen Arena, SOS, Pulse)
  ├── services/   # Hardware & API abstractions (Twilio, PPG, Shake)
  ├── widgets/    # Reusable UI components (Focus Orb, Stat Tiles)
  └── main.dart   # App entry point and theme configuration
```
*This structure ensures that new games and safety features can be plugged in without refactoring core logic.*

---

## 8️⃣ Current Status
- **Core Architecture**: Production-ready and fully integrated.
- **Zen Arena**: Multi-game engine functional with initial cognitive games.
- **Leaderboard System**: High-speed Firestore implementation complete.
- **SOS Shield**: Cloud calling and location sharing tested and active.
- **PPG Module**: Preliminary pulse detection scaffolded with torch integration.
- **Refinement**: Ongoing iterations on PPG signal filtering and haptic breathing sync.

---

## 9️⃣ Future Enhancements
- **Advanced PPG Refinement**: Implementing frequency-domain analysis for higher pulse precision.
- **Anti-Cheat Validation**: Server-side leaderboard score verification.
- **Tournament Mode**: Scheduled competitive focus events.
- **Achievements & XP system**: Long-term gamification for mental health streaks.
- **AI Stress Prediction**: Machine learning-driven analysis of focus patterns.

---

## 🔟 Installation Instructions
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-repo/resonance.git
    ```
2.  **Firebase Configuration**:
    -   Add your `google-services.json` (Android) to the `android/app` directory.
3.  **Install Dependencies**:
    ```bash
    flutter pub get
    ```
4.  **Launch Application**:
    ```bash
    flutter run
    ```

---

## 1️⃣1️⃣ Team Vision
**Resonance is not just an app — it is a step toward proactive mental resilience.** We believe technology should not just track our state, but actively train our minds to remain steady in an increasingly chaotic world.

---
© 2026 Resonance Team. Built for the Hackmatrix Hackathon.
