# 🍽️ Boiler Bites

**Track your dining hall calories with precision and style**

A modern React Native app built with Expo that helps Purdue students track their nutrition from campus dining halls. Features real-time menu data, advanced search capabilities, and comprehensive nutrition tracking.

## ✨ Features

### 🔐 Authentication
- **Supabase Integration**: Secure user authentication with email/password
- **Azure OAuth**: Purdue email sign-in with Microsoft Azure
- **Session Management**: Persistent login with automatic token refresh
- **Profile Management**: User profiles with sign-out functionality

### 🔍 Advanced Search
- **Real-time Search**: Debounced live search with instant results
- **Smart Filtering**: Filter by dining hall, meal time, dietary preferences, and calorie range
- **Allergen Exclusion**: Filter out items containing specific allergens
- **Meal Availability**: Show only items available for current meal time
- **Client-side Caching**: Fast search results with intelligent caching

### 📊 Nutrition Tracking
- **Detailed Nutrition Facts**: Complete macronutrient and micronutrient breakdown
- **Circular Progress Charts**: Visual macro breakdown with SVG charts
- **Ingredient Information**: Comprehensive ingredient lists and allergen data
- **Daily Progress**: Track daily nutrition goals and progress

### 🎨 Modern UI/UX
- **Dark Theme**: Beautiful dark interface with Purdue Gold accents
- **Responsive Design**: Optimized for all screen sizes
- **Smooth Animations**: Fluid transitions and micro-interactions
- **Accessibility**: Screen reader support and proper touch targets

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/boilerbites.git
   cd boilerbites
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env-example .env
   ```
   
   Edit `.env` with your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on your device**
   - **iOS**: Press `i` in terminal or scan QR code with Camera app
   - **Android**: Press `a` in terminal or scan QR code with Expo Go
   - **Web**: Press `w` in terminal

## 🏗️ Project Structure

```
boilerbites/
├── app/                          # Expo Router pages
│   ├── (tabs)/                   # Tab navigation screens
│   │   ├── index.tsx             # Home screen
│   │   ├── diary.tsx             # Nutrition tracking
│   │   ├── search.tsx            # Menu search
│   │   └── profile.tsx           # User profile
│   ├── signin.tsx                # Sign in screen
│   ├── signup.tsx                # Sign up screen
│   ├── onboarding.tsx           # Onboarding flow
│   └── _layout.tsx              # Root layout
├── components/                   # Reusable UI components
│   ├── BackgroundTemplate.tsx   # App background wrapper
│   ├── MenuItemCard.tsx         # Menu item display
│   ├── ItemSearch.tsx           # Search filters
│   └── ...
├── contexts/                     # React Context providers
│   └── AuthContext.tsx           # Authentication context
├── lib/                         # Utility libraries
│   ├── supabase.ts              # Supabase client
│   ├── api.ts                   # API utilities
│   └── MenuDataContext.tsx      # Menu data context
├── services/                     # Business logic
│   └── searchService.tsx        # Search functionality
└── assets/                      # Static assets
    ├── images/                  # App images and logos
    └── fonts/                   # Custom fonts
```

## 🔧 Configuration

### Supabase Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Enable Authentication** in your Supabase dashboard
3. **Configure Azure OAuth** (optional):
   - Go to Authentication > Providers
   - Enable Azure provider
   - Add your Azure app registration details
4. **Set up your database** using the provided SQL scripts in `lib/supabase-setup/`

### Azure Authentication (Optional)

For Purdue email authentication, follow the detailed setup guide in `AZURE_AUTH_SETUP.md`.

## 📱 Development

### Available Scripts

```bash
# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web

# Type checking
npm run type-check

# Lint code
npm run lint
```

### Code Style

- **TypeScript**: Full type safety throughout the app
- **ESLint**: Code linting with React Native rules
- **Prettier**: Automatic code formatting
- **Tailwind CSS**: Utility-first styling with NativeWind

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📦 Building for Production

### iOS

```bash
# Build for iOS
npx expo build:ios

# Or use EAS Build
npx eas build --platform ios
```

### Android

```bash
# Build for Android
npx expo build:android

# Or use EAS Build
npx eas build --platform android
```

## 🚀 Deployment

### EAS Build (Recommended)

1. **Install EAS CLI**
   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Configure EAS**
   ```bash
   eas build:configure
   ```

3. **Build for production**
   ```bash
   eas build --platform all
   ```

### App Store Deployment

1. **Configure app.json** with your app details
2. **Build production version** using EAS Build
3. **Submit to App Store** using EAS Submit

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style and patterns
- Write tests for new features
- Update documentation as needed
- Use conventional commit messages
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Purdue University** for dining hall data and support
- **Supabase** for backend services and authentication
- **Expo** for the amazing React Native development platform
- **React Native Community** for excellent libraries and tools

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/boilerbites/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/boilerbites/discussions)
- **Email**: support@boilerbites.app

## 🔗 Links

- **Website**: [boilerbites.app](https://boilerbites.app)
- **Documentation**: [docs.boilerbites.app](https://docs.boilerbites.app)
- **API Reference**: [api.boilerbites.app](https://api.boilerbites.app)

---

**Made with ❤️ for Purdue students**
