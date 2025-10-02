# 🍽️ Boiler Bites

**Track your dining hall calories with precision and style**

A modern React Native app built with Expo that helps Purdue students track their nutrition from campus dining halls. Features real-time menu data, advanced search capabilities, and comprehensive nutrition tracking.

## ✨ Features

### 🔐 Authentication
- **Supabase Integration**: Secure user authentication with email/password
- **Session Management**: Persistent login with automatic token refresh
- **Profile Management**: User profiles with sign-out functionality
- **Onboarding Flow**: Smooth user experience for new users

### 🏠 Home Screen
- **Dining Hall Cards**: Visual cards for each campus dining hall (Wiley, Earhart, Ford, Windsor, Hillenbrand)
- **Real-time Status**: Live meal hours and availability indicators
- **Quick Navigation**: Direct access to each dining hall's menu
- **Meal Time Detection**: Automatic detection of current meal period

### 🔍 Advanced Search
- **Real-time Search**: Debounced live search with instant results
- **Smart Filtering**: Filter by dining hall, meal time, dietary preferences, and calorie range
- **Allergen Exclusion**: Filter out items containing specific allergens
- **Meal Availability**: Show only items available for current meal time
- **Sorting Options**: Sort by calories, protein, carbs, or fat content

### 📊 Nutrition Tracking (Stats/Diary)
- **Daily Progress**: Visual progress bars for calories and macronutrients
- **Meal Organization**: Group food entries by meal type (Breakfast, Lunch, Dinner, Snacks, Other)
- **Swipe-to-Delete**: Intuitive gesture-based food entry removal
- **Date Navigation**: Browse nutrition data for any date with previous/next day navigation
- **Macro Breakdown**: Detailed protein, carbs, and fat tracking with visual indicators

### 🍽️ Menu & Item Details
- **Comprehensive Item Info**: Complete nutrition facts, ingredients, and allergen information
- **Favorites System**: Save frequently eaten items for quick access
- **Add to Tracker**: One-tap food logging with quantity selection
- **Station Organization**: Items grouped by dining hall stations

### 🎨 Modern UI/UX
- **Dark Theme**: Beautiful dark interface with Purdue Gold accents
- **Smooth Animations**: Fluid transitions using React Native Reanimated
- **Gesture Support**: Swipe gestures for intuitive interactions
- **Responsive Design**: Optimized for all screen sizes
- **Custom Typography**: Sora font family for clean, modern text

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
│   │   ├── index.tsx             # Home screen with dining halls
│   │   ├── diary.tsx             # Nutrition tracking (Stats)
│   │   ├── search.tsx            # Menu search
│   │   └── profile.tsx           # User profile
│   ├── dining-hall/[name].tsx    # Individual dining hall pages
│   ├── nutrition/[itemId].tsx    # Food item details
│   ├── missing-nutrition/[itemId].tsx # Missing nutrition fallback
│   ├── signin.tsx                # Sign in screen
│   ├── signup.tsx                # Sign up screen
│   └── _layout.tsx              # Root layout with providers
├── components/                   # Reusable UI components
│   ├── BackgroundTemplate.tsx   # App background wrapper
│   ├── MenuItemCard.tsx         # Menu item display cards
│   ├── FoodEntryCard.tsx        # Swipeable food entry cards
│   ├── DailyProgress.tsx        # Nutrition progress visualization
│   ├── ItemSearch.tsx           # Search filters and controls
│   ├── SortBy.tsx               # Sorting options
│   ├── IngredientsAndAllergens.tsx # Ingredient display
│   └── OnboardingComponent.tsx  # User onboarding
├── contexts/                     # React Context providers
│   └── AuthContext.tsx           # Authentication and user data
├── lib/                         # Utility libraries
│   ├── supabase.ts              # Supabase client configuration
│   ├── api.ts                   # API utilities
│   ├── MenuDataContext.tsx      # Menu data context
│   ├── timezone-utils.ts        # Timezone handling
│   └── supabase-setup/          # Database setup scripts
│       ├── db-setup.ts          # Menu data population
│       ├── populate-menu.sql    # SQL for menu data
│       ├── daily-nutrition.sql  # Nutrition tracking setup
│       └── search.sql           # Search optimization
├── services/                     # Business logic
│   └── searchService.tsx        # Search functionality
├── assets/                      # Static assets
│   ├── images/                  # App images and logos
│   │   ├── logos/              # Dining hall logos
│   │   └── icons/              # App icons
│   └── fonts/                   # Custom fonts
└── examples/                    # Documentation and examples
    ├── database-schema.sql      # Database schema reference
    ├── menu-api-sample.xml      # Sample menu data
    └── styling.jsx              # UI component examples
```

## 🗄️ Database Schema

### Core Tables
- **`item`**: Food items with nutrition data, allergens, and dietary flags
- **`food_entry`**: User food consumption tracking with meal categorization
- **`user_daily_nutrition`**: Daily nutrition goals and progress tracking
- **`favorite_item`**: User's saved favorite food items
- **`location`**: Dining hall locations
- **`day_menu`**: Daily menu schedules
- **`day_meal`**: Meal periods and hours
- **`day_station`**: Dining hall stations
- **`day_station_item`**: Items available at each station

### Key Features
- **Nutrition Tracking**: Complete macronutrient and micronutrient data
- **Meal Categorization**: Food entries organized by meal type (0-4)
- **Allergen Management**: Comprehensive allergen tracking and filtering
- **Favorites System**: User-specific food item preferences
- **Real-time Updates**: Live menu data with automatic refresh

## 🔧 Configuration

### Supabase Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Enable Authentication** in your Supabase dashboard
3. **Set up your database** using the provided SQL scripts in `lib/supabase-setup/`
4. **Configure Row Level Security (RLS)** for user data protection

### Database Setup Scripts

Run these SQL scripts in your Supabase SQL editor:

1. **`lib/supabase-setup/populate-menu.sql`** - Menu data population
2. **`lib/supabase-setup/daily-nutrition.sql`** - Nutrition tracking setup
3. **`lib/supabase-setup/search.sql`** - Search optimization indexes
4. **`lib/supabase-setup/menu-updater.sql`** - Automated menu updates

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

# Lint code
npm run lint

# Populate menu data
npm run populate-menu

# Update today's menu
npm run populate-today
```

### Key Dependencies

- **Expo SDK 54**: React Native development platform
- **Expo Router**: File-based navigation
- **Supabase**: Backend-as-a-Service
- **React Native Reanimated**: Smooth animations
- **React Native Gesture Handler**: Touch gestures
- **NativeWind**: Tailwind CSS for React Native
- **Expo Haptics**: Tactile feedback
- **React Native SVG**: Vector graphics

### Code Style

- **TypeScript**: Full type safety throughout the app
- **ESLint**: Code linting with React Native rules
- **Prettier**: Automatic code formatting
- **Tailwind CSS**: Utility-first styling with NativeWind
- **Custom Fonts**: Sora font family for typography

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