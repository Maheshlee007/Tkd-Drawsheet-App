# 🚀 Project Roadmap & Progress Tracker

This document outlines the planned features and improvements to make the application more professional, feature-rich, and robust. We will use this as a checklist to track our implementation progress.

---

### 🏆 **Tournament & Competition Features**

- [ ] **Google Authentication**: Implement of Google Authentication.-->Completed
- [ ] **Double-Elimination Bracket**: Implement a loser's bracket for a second chance.-->optional
- [ ] **Round-Robin & Pool Play**: Allow for pool play in initial rounds before advancing to a single-elimination bracket.
- [ ] **Multi-Division Management**: Manage a single "Event" containing multiple tournament brackets (e.g., by age, weight, rank).--have to 
- [ ] **Team Competitions**: Add support for teams/clubs, including team points and team-based formats.-->optional.

---

### 👤 **User Management & Roles**

- [ ] **Role-Based Access Control (RBAC)**:
    - [ ] Super Admin
    - [ ] Tournament Organizer
    - [ ] Scorekeeper
    - [ ] Participant/User
- [ ] **User Profiles & History**: Track match history, win/loss records, and stats across all tournaments.

---

### 🚀 **Live & Real-Time Capabilities**

- [ ] **Live Scoreboard View**: A public-facing, real-time scoreboard with live score updates via WebSockets.
- [ ] **Mat/Ring Assignment**: Allow organizers to assign matches to physical mats/rings.
- [ ] **Push Notifications**: Alert participants about upcoming matches via web push or SMS.

---

### 🛠️ **Technical & Architectural Enhancements**

- [ ] **Comprehensive Testing Suite**:
    - [ ] Unit Tests (Jest/Vitest)
    - [ ] Integration Tests
    - [ ] End-to-End (E2E) Tests (Cypress/Playwright)
- [ ] **CI/CD Pipeline**: Set up GitHub Actions for automated testing and builds.
- [ ] **API and Backend Refinements**:
    - [ ] API Documentation (Swagger/OpenAPI)
    - [ ] Refactor backend to a more organized service layer.

---

### ✨ **UI/UX & Quality-of-Life Improvements**

- [ ] **Bulk Participant Import**: Allow organizers to upload a CSV or Excel file for participants.
- [ ] **Internationalization (i18n)**: Support multiple languages in the UI.
- [ ] **Accessibility (a11y) Audit**: Ensure the app is fully accessible.
- [ ] **Printable Match Slips**: Generate printable slips for each match.
