# 🍽️ BoilerBites

**Track your dining hall calories with precision and style**

A modern React Native app built with Expo that helps Purdue students track their nutrition from campus dining halls. Features real-time menu data, advanced search capabilities, comprehensive nutrition tracking, and seamless authentication with Purdue email accounts.

---

## ✨ Features

### 🔐 Authentication
- **Dual Authentication Methods**:
  - **Email/Password**: Traditional sign-up and sign-in
  - **Azure AD OAuth**: Sign in with Purdue.edu email accounts (Microsoft/Azure AD)
- **Session Management**: Persistent login with automatic token refresh
- **Profile Management**: User profiles with secure password reset (email users only)
- **Onboarding Flow**: Smooth user experience for new users

### 🏠 Home Screen
- **Dining Hall Cards**: Visual cards for each campus dining hall (Wiley, Earhart, Ford, Windsor, Hillenbrand)
- **Real-time Status**: Live meal hours and availability indicators
- **Quick Navigation**: Direct access to each dining hall's menu
- **Meal Time Detection**: Automatic detection of current meal period

### 🔍 Advanced Search
- **Multi-Database Search**: Search across FatSecret nutrition database
- **Real-time Search**: Debounced live search with instant results
- **Smart Filtering**: Filter by dining hall, meal time, dietary preferences, and calorie range
- **Allergen Exclusion**: Filter out items containing specific allergens
- **Meal Availability**: Show only items available for current meal time
- **Sorting Options**: Sort by calories, protein, carbs, or fat content

### 📊 Nutrition Tracking (Diary)
- **Daily Progress**: Visual progress bars for calories and macronutrients
- **Meal Organization**: Group food entries by meal type (Breakfast, Lunch, Dinner, Snacks, Other)
- **Swipe-to-Delete**: Intuitive gesture-based food entry removal
- **Date Navigation**: Browse nutrition data for any date with previous/next day navigation
- **Macro Breakdown**: Detailed protein, carbs, and fat tracking with visual indicators
- **Custom Food Entries**: Add custom foods with full nutrition information

### 🍽️ Menu & Item Details
- **Comprehensive Item Info**: Complete nutrition facts, ingredients, and allergen information
- **Favorites System**: Save frequently eaten items for quick access
- **Add to Tracker**: One-tap food logging with quantity selection
- **Station Organization**: Items grouped by dining hall stations
- **Missing Nutrition Reporting**: Report items with missing nutrition data

### 🎨 Modern UI/UX
- **Dark Theme**: Beautiful dark interface with Purdue Gold accents
- **Smooth Animations**: Fluid transitions using React Native Reanimated
- **Gesture Support**: Swipe gestures for intuitive interactions
- **Responsive Design**: Optimized for all screen sizes
- **Custom Typography**: Sora font family for clean, modern text

---

## 🏗️ Architecture

### System Overview

```
┌─────────────┐
│  Mobile App │
│  (Expo/RN)  │
└──────┬──────┘
       │
       ├─── Authentication ───► Supabase Auth ───► Azure AD (Purdue.edu)
       │
       ├─── Menu Data ────────► Supabase Database
       │
       ├─── Food Search ──────► Supabase Edge Function
       │                          │
       │                          └──► Oracle Cloud Proxy Server
       │                                  │
       │                                  └──► FatSecret API
       │
       └─── User Data ─────────► Supabase Database
```

### Key Components

1. **Mobile App (React Native/Expo)**
   - Frontend built with Expo Router for navigation
   - NativeWind (Tailwind CSS) for styling
   - React Context for state management

2. **Supabase Backend**
   - **Authentication**: Handles email/password and Azure AD OAuth
   - **Database**: PostgreSQL for menu data, user profiles, and nutrition tracking
   - **Edge Functions**: Serverless functions for API proxying

3. **Oracle Cloud Infrastructure** 🆕
   - **Proxy Server**: Free-tier VM instance with static IP
   - **Purpose**: Proxies FatSecret API calls (required due to IP whitelisting)
   - **Benefits**: 
     - Static IP address for FatSecret API whitelisting
     - Keeps API credentials secure on server
     - Completely free (Oracle Cloud Always Free tier)
   - **Location**: Hosts FatSecret authentication and API proxy

4. **FatSecret API**
   - External nutrition database
   - Requires IP whitelisting (handled by Oracle Cloud proxy)
   - Provides comprehensive food nutrition data

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **Expo CLI** (installed globally or via npx)
- **iOS Simulator** (for iOS development) or **Android Studio** (for Android development)
- **Supabase Account** (free tier works)
- **Azure Account** (for Purdue.edu authentication - optional)
- **Oracle Cloud Account** (free tier - for FatSecret proxy)

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
   
   Edit `.env` with your credentials:
   ```env
   # Supabase Configuration
   EXPO_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Azure AD Configuration (for Purdue.edu authentication)
   EXPO_PUBLIC_AZURE_CLIENT_ID=your-azure-client-id
   EXPO_PUBLIC_AZURE_TENANT_ID=your-azure-tenant-id
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on your device**
   - **iOS**: Press `i` in terminal or scan QR code with Camera app
   - **Android**: Press `a` in terminal or scan QR code with Expo Go
   - **Web**: Press `w` in terminal

---

## 🔧 Configuration

### 1. Supabase Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Get your credentials**:
   - Go to Settings → API
   - Copy Project URL and anon key
3. **Set up your database** using the provided SQL scripts in `lib/supabase-setup/`
4. **Configure Row Level Security (RLS)** for user data protection

#### Database Setup Scripts

Run these SQL scripts in your Supabase SQL editor (in order):

1. **`lib/supabase-setup/populate-menu.sql`** - Menu data population and schema
2. **`lib/supabase-setup/daily-nutrition.sql`** - Nutrition tracking setup
3. **`lib/supabase-setup/search.sql`** - Search optimization indexes

### 2. Oracle Cloud Proxy Setup 🆕

**Why Oracle Cloud?**
- FatSecret API requires IP whitelisting
- Supabase Edge Functions don't have static IPs
- Oracle Cloud Free Tier provides a static IP for free
- Keeps API credentials secure on the server

**Quick Setup Steps:**

1. **Create Oracle Cloud Account** (if you don't have one)
   - Sign up at [cloud.oracle.com](https://cloud.oracle.com/)
   - Free tier includes 2 VMs with static IPs

2. **Create VM Instance**
   - Follow the complete guide: [ORACLE_CLOUD_SETUP.md](./ORACLE_CLOUD_SETUP.md)
   - Choose "Always Free Eligible" shape (A1.Flex or E2.1.Micro)
   - Note your instance's public IP address

3. **Deploy Proxy Server**
   - SSH into your Oracle Cloud instance
   - Deploy the proxy server from `proxy-server/` directory
   - Configure FatSecret credentials in `.env` on the server
   - Start the server with PM2

4. **Whitelist IP in FatSecret**
   - Go to FatSecret Developer Portal → API Keys → IP Restrictions
   - Add your Oracle Cloud IP in format: `YOUR_IP/32`
   - Example: `170.9.249.196/32`

5. **Configure Supabase Edge Function**
   - Set Oracle proxy URL as Supabase secret:
     ```bash
     supabase secrets set ORACLE_PROXY_URL=http://YOUR_ORACLE_IP:3000
     ```
   - The Edge Function (`supabase/functions/fatsecret-proxy/index.ts`) will automatically use this

**Detailed Guides:**
- **Complete Setup**: [ORACLE_CLOUD_SETUP.md](./ORACLE_CLOUD_SETUP.md)
- **Next Steps**: [ORACLE_PROXY_NEXT_STEPS.md](./ORACLE_PROXY_NEXT_STEPS.md)
- **Alternative Options**: [FREE_PROXY_OPTIONS.md](./FREE_PROXY_OPTIONS.md)

**Architecture Flow:**
```
Mobile App → Supabase Edge Function → Oracle Cloud Proxy → FatSecret API
```

### 3. Azure AD Authentication Setup (Purdue.edu)

Enable Purdue students to sign in with their @purdue.edu email accounts.

**Quick Setup:**

1. **Register App in Azure AD**
   - Go to [portal.azure.com](https://portal.azure.com)
   - Create new app registration
   - Configure redirect URI: `https://[YOUR_SUPABASE_PROJECT].supabase.co/auth/v1/callback`
   - Add API permissions: `openid`, `profile`, `email`, `User.Read`

2. **Configure Supabase**
   - Go to Supabase Dashboard → Authentication → Providers
   - Enable Azure provider
   - Add Azure Client ID, Client Secret, and Tenant ID

3. **Configure Redirect URLs**
   - In Supabase: Add `boilerbites://auth/callback`
   - In Azure: Add Supabase callback URL

**Complete Guide**: See [AZURE_AUTH_SETUP.md](./AZURE_AUTH_SETUP.md) for detailed step-by-step instructions.

---

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

# Populate menu data (3 days ahead)
npm run populate-menu

# Update today's menu
npm run populate-today
```

### Key Dependencies

- **Expo SDK 54**: React Native development platform
- **Expo Router**: File-based navigation
- **Supabase**: Backend-as-a-Service (Auth, Database, Edge Functions)
- **React Native Reanimated**: Smooth animations
- **React Native Gesture Handler**: Touch gestures
- **NativeWind**: Tailwind CSS for React Native
- **Expo Web Browser**: OAuth authentication handling
- **Expo Linking**: Deep link handling

### Code Style

- **TypeScript**: Full type safety throughout the app
- **ESLint**: Code linting with React Native rules
- **Tailwind CSS**: Utility-first styling with NativeWind
- **Custom Fonts**: Sora font family for typography

---

## 🏗️ Project Structure

```
boilerbites/
├── app/                          # Expo Router pages
│   ├── (tabs)/                   # Tab navigation screens
│   │   ├── index.tsx             # Home screen with dining halls
│   │   ├── diary.tsx             # Nutrition tracking (Diary)
│   │   ├── search.tsx            # Menu search
│   │   └── profile.tsx           # User profile
│   ├── auth/                     # Authentication routes
│   │   └── callback.tsx         # OAuth callback handler
│   ├── dining-hall/[name].tsx    # Individual dining hall pages
│   ├── nutrition/[itemId].tsx   # Food item details
│   ├── missing-nutrition/[itemId].tsx # Missing nutrition fallback
│   ├── custom-food/              # Custom food management
│   ├── signin.tsx                # Sign in screen
│   ├── signup.tsx                # Sign up screen
│   └── _layout.tsx               # Root layout with providers
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
│   ├── AuthContext.tsx          # Authentication and user data
│   ├── NutritionCacheContext.tsx # Nutrition data caching
│   └── NutritionGoalsContext.tsx # User nutrition goals
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
│   ├── fatsecretAuth.ts         # FatSecret authentication (legacy)
│   └── searchService.tsx        # Search functionality
├── supabase/                     # Supabase configuration
│   └── functions/               # Edge Functions
│       ├── fatsecret-proxy/     # FatSecret API proxy (via Oracle)
│       │   └── index.ts         # Edge Function code
│       └── get-ip/              # Utility function for IP detection
├── proxy-server/                 # Oracle Cloud proxy server
│   ├── server.js                # Node.js proxy server
│   ├── package.json             # Server dependencies
│   └── README.md                # Proxy server setup guide
├── assets/                      # Static assets
│   ├── images/                  # App images and logos
│   │   ├── logos/              # Dining hall logos
│   │   └── icons/              # App icons
│   └── fonts/                   # Custom fonts
└── examples/                    # Documentation and examples
    ├── database-schema.sql      # Database schema reference
    ├── menu-api-sample.xml      # Sample menu data
    └── collection-api-graphql.txt # API examples
```

---

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

---

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

### Production Checklist

Before deploying to production:

- [ ] Update all environment variables
- [ ] Configure Oracle Cloud proxy server (if using FatSecret)
- [ ] Set up Azure AD app registration (if using Purdue.edu auth)
- [ ] Configure Supabase production project
- [ ] Set up proper redirect URLs in Azure and Supabase
- [ ] Test authentication flow on real devices
- [ ] Verify Oracle Cloud proxy is accessible
- [ ] Set up monitoring and error tracking
- [ ] Review security settings (RLS, API keys, etc.)

---

## 📚 Documentation

### Setup Guides

- **[Oracle Cloud Setup](./ORACLE_CLOUD_SETUP.md)**: Complete guide for setting up the FatSecret proxy server
- **[Oracle Proxy Next Steps](./ORACLE_PROXY_NEXT_STEPS.md)**: Post-setup configuration and testing
- **[Azure Auth Setup](./AZURE_AUTH_SETUP.md)**: Complete Azure AD OAuth configuration for Purdue.edu
- **[Proxy Server Guide](./PROXY_SERVER_GUIDE.md)**: General proxy server documentation
- **[Free Proxy Options](./FREE_PROXY_OPTIONS.md)**: Alternative proxy hosting options

### Architecture Documents

- **[Security Migration Summary](./SECURITY_MIGRATION_SUMMARY.md)**: Security improvements and migrations
- **[Supabase IP Solution](./SUPABASE_IP_SOLUTION.md)**: IP whitelisting solutions

---

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

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Purdue University** for dining hall data and support
- **Supabase** for backend services and authentication
- **Oracle Cloud** for free-tier infrastructure hosting
- **Expo** for the amazing React Native development platform
- **React Native Community** for excellent libraries and tools

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/boilerbites/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/boilerbites/discussions)
- **Email**: support@boilerbites.app

---

## 🔗 Links

- **Website**: [boilerbites.app](https://boilerbites.app)
- **Documentation**: [docs.boilerbites.app](https://docs.boilerbites.app)
- **API Reference**: [api.boilerbites.app](https://api.boilerbites.app)

---

**Made with ❤️ for Purdue students**
