# 🥋 Tournament Bracket Manager

A comprehensive web application for creating, managing, and tracking tournament brackets, specifically designed for Taekwondo competitions but adaptable for any single-elimination tournament format.

## ✨ Features

### 🏆 Tournament Management
- **Create Tournaments**: Generate single-elimination brackets with customizable names and rounds
- **Smart Seeding**: Choose from random, ordered, or as-entered participant seeding
- **Dynamic Participant Management**: Add/remove participants even after bracket generation
- **Special Tournament Sizes**: Optimized handling for 5, 6, and 7 participant tournaments
- **Bye Handling**: Automatic bye distribution for non-power-of-2 participant counts

### 🎯 Match Scoring & Results
- **Taekwondo-Specific Scoring**: Complete support for WT (World Taekwondo) scoring rules
- **Win Methods**: 
  - PTF (Point Final Score)
  - PTG (Point Gap) 
  - DSQ (Disqualification)
  - PUN (Punitive Declaration)
  - RSC (Referee Stop Contest)
  - WDR (Withdrawal)
  - DQB (Disqualification for Unsportsmanlike Behavior)
  - DQBOTH (Both Players Disqualified)
- **Round-by-Round Scoring**: Track multiple rounds with detailed scoring
- **Match History**: Complete audit trail of all match updates
- **Tiebreaker Management**: Handle ties with extra rounds or punitive decisions

### 📊 Visualization & Export
- **Interactive Bracket Display**: Clean, responsive bracket visualization
- **Canvas Rendering**: High-quality bracket graphics with SVG export
- **PDF Export**: Professional tournament brackets with customizable headers
- **Medal Podium**: Visual representation of final standings
- **Statistics Dashboard**: Comprehensive tournament analytics
- **Live Feed**: Real-time tournament progress tracking

### 📱 User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dark/Light Mode**: Customizable theme support
- **Real-time Updates**: Live bracket updates as matches are completed
- **Search & Navigation**: Quick participant search and bracket navigation
- **Toast Notifications**: User-friendly feedback for all actions

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Radix UI** for accessible component primitives
- **Wouter** for lightweight routing
- **Framer Motion** for animations
- **Zustand** for state management
- **React Query** for server state management

### Backend & Database
- **Express.js** server
- **PostgreSQL** with Drizzle ORM
- **Passport.js** for authentication
- **Session management** with connect-pg-simple

### Development Tools
- **TypeScript** for type safety
- **ESLint** for code quality
- **PostCSS** and **Autoprefixer**
- **Zod** for runtime validation

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tournament-bracket-manager.git
   cd tournament-bracket-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/tournament_db
   SESSION_SECRET=your_session_secret_here
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Run database migrations
   npm run db:migrate
   
   # Optional: Seed with sample data
   npm run db:seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── BracketDisplay.tsx
│   ├── MatchScoringModal.tsx
│   └── ...
├── pages/              # Application pages
│   ├── Home.tsx
│   ├── CreateTournament.tsx
│   ├── ViewTournament.tsx
│   └── ...
├── store/              # Zustand state management
│   └── useTournamentStore.ts
├── hooks/              # Custom React hooks
│   ├── useTournament.ts
│   └── useBracketPDF.ts
├── lib/                # Utility libraries
│   ├── bracketUtils.ts
│   └── utils.ts
├── types/              # TypeScript type definitions
└── assets/             # Static assets
```

## 🎮 Usage

### Creating a Tournament

1. Navigate to "Create Tournament"
2. Add participant names (one per line or comma-separated)
3. Choose seeding method:
   - **Random**: Participants randomly shuffled
   - **Ordered**: Participants seeded by rank (first = #1 seed)
   - **As-entered**: Participants seeded in entry order
4. Set tournament name and number of rounds
5. Click "Generate Bracket"

### Managing Matches

1. Click on any match in the bracket
2. Enter scores for each round
3. Select win method (PTF, PTG, DSQ, etc.)
4. Add optional comments for tiebreakers
5. Confirm results to advance winner

### Exporting Results

- **PDF Export**: Professional bracket sheets with custom headers
- **Statistics**: Detailed analytics and final standings
- **Canvas Export**: High-resolution bracket images

## 🔧 Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking

# Database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Drizzle Studio
```

## 🏅 Tournament Rules Support

### Taekwondo Specific Features
- **WT Rules Compliance**: Follows World Taekwondo competition rules
- **Scoring Systems**: Support for both point-stop and continuous scoring
- **Technical Validation**: Automatic validation of scores and win methods
- **Disqualification Tracking**: Comprehensive DQ reason tracking
- **Round Management**: Flexible round configuration (1-5 rounds)

### General Tournament Features
- **Single Elimination**: Standard knockout tournament format
- **Bye Management**: Smart bye distribution in first round
- **Flexible Sizing**: Support for any number of participants
- **Real-time Updates**: Live bracket progression

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style and TypeScript patterns
- Add tests for new features
- Update documentation as needed
- Ensure responsive design compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **World Taekwondo** for competition rule specifications
- **Radix UI** for accessible component primitives
- **shadcn/ui** for beautiful component designs
- **Vercel** for deployment platform
- **Vite** for excellent development experience

## 📞 Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Check existing documentation
- Review the troubleshooting guide

## 🔄 Version History

### v1.0.0
- Initial release with full tournament management
- Taekwondo-specific scoring and rules
- PDF export and statistics
- Responsive design and mobile support

---

**Built with ❤️ for the martial arts community**
