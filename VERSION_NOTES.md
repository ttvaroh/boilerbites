# BoilerBites Version Notes

This document tracks all changes and improvements made to BoilerBites since the initial TestFlight release.

---

## Version 1.0.3 - January 24, 2026

### Performance Improvements
- **Home Screen Loading**: Dramatically improved home screen load time (reduced from 3-8 seconds to < 1 second)
  - Optimized `refreshLocations()` to use single batched query instead of 30+ sequential queries
  - Reduced database queries from 45-60+ to just 2-3 queries (95% reduction)
  - Implemented parallel query execution for location data
  - Eliminated redundant data fetching in `useLocationStatus` hook
- **Dining Hall Menu Loading**: Made menu loading nearly instant (< 100ms)
  - Added aggressive prefetching - menus prefetch when user presses dining hall card
  - Implemented meal-specific caching with keys: `locationName:date:mealType`
  - Prefetches all meals (breakfast, lunch, dinner) in parallel for instant meal navigation
  - Removed blocking loading states - always shows cached data or skeleton loaders
  - Meal navigation (breakfast → lunch → dinner) now instant from cache
  - Collection status loads in parallel with menu data
  - Cache preserved across location switches for instant switching back

### Features
- **Password Reset**: Added "Forgot Password" functionality
  - Users can request password reset from sign-in screen
  - Password reset handled via web application (https://boilerbites.vercel.app/reset-password)
  - Improved security by redirecting to web for password reset flow

### Bug Fixes
- Fixed infinite loop issue in station expansion initialization
- Fixed redundant database queries in dining hall page initialization
- Fixed timezone mismatch in daily progress calculation

### Technical
- Added detailed menu cache with meal-specific keys for instant meal navigation
- Added `prefetchLocationMenu()` method for aggressive prefetching
- Modified `switchLocation()` to preserve cache instead of clearing it
- Added performance logging for monitoring query count and load times
- Updated `.gitignore` to exclude collection ETL URLs file

---

## Version 1.0.2 - January 14, 2026

### Features
- **Swipe to Delete**: Added swipe-to-delete functionality for food entries in the diary
- **Barcode Scanning**: Added barcode scanner to quickly find products using FatSecret's barcode database
  - Scan product barcodes directly from the search bar
  - Automatically navigates to nutrition information when a product is found
  - Supports multiple barcode formats (UPC-A, EAN-13, EAN-8, Code 128, Code 39, QR codes)
- **Custom Meals**: Enhanced custom meal creation and editing features
  - Users can create custom meals by combining foods from Purdue, FatSecret, or collections
  - Meals are stored in the database and fully editable
  - Custom meals display as "Custom Meal" instead of "Collection" in search results
- **FatSecret API Integration**: Added FatSecret API integration for comprehensive food search
- **Oracle Proxy Setup**: Implemented Oracle proxy for FatSecret search functionality
- **Azure AD Authentication**: Added Azure AD (Microsoft) authentication support
- **OAuth Improvements**: Enhanced OAuth callback handling to prevent duplicate code exchange
- **Open Food Facts Integration**: Added Open Food Facts global search with rate limiting
- **FDC Food Search**: Integrated USDA FoodData Central (FDC) food search
- **Global Food Search**: Users can now search for foods globally, not just Purdue dining hall items
- **Search Improvements**: Enhanced search functionality with better filtering and results
- **Date-Based Navigation**: Added date-based search and navigation for diary and nutrition tracking
- **Meal Type Formatting**: Improved meal type display name formatting
- **Custom Food Creation**: Enhanced custom food creation with improved SQL functions
- **Menu Enhancements**: Improved menu and nutrition SQL functions
- **About Screen Updates**: Updated About screen with updates and feedback section
- **Performance Optimization**: Optimized menu data loading with single joined query

### Bug Fixes
- Fixed delete entry functionality in diary
- Fixed timestamp issues - entries now use dynamic timestamps instead of static times
- Fixed entry ordering in diary to properly sort by creation time
- Fixed infinite loop issue in authentication flow
- Fixed search functionality issues
- Fixed allergen sorting
- Removed meal availability filter
- Fixed collection item mapping
- Improved station expansion functionality

### Improvements
- Better date handling throughout the app
- Improved navigation between dates in diary and nutrition views
- Improved UI/UX for search results
- Refactored nutrition goal sourcing in DailyProgress component
- Centralized meal config and mapping logic
- Refactored dining hall menu view with hooks and components
- Refined DiningHallCard layout and grid spacing
- Added logos and enhanced dining hall features
- Show and sort meals only for main dining halls
- Refactored location status logic and added app refresh

### Technical
- Updated .gitignore to exclude SQL files in supabase-setup directory
- Improved timestamp handling to use actual current time instead of static values
- Updated Expo and dependencies
- Added iOS build scripts
- Improved build configuration

---

## Version 1.0.1 - December 15, 2025

### Features
- **Settings Screen**: Added comprehensive settings and nutrition preferences screens
- **Nutrition Goals**: Added modal for editing daily nutrition goals
- **Nutrition Goals Context**: Implemented NutritionGoals context and service integration
- **Allergen Preferences**: Added allergen preferences to nutrition settings
  - Added fish and peanut allergy support
  - Enhanced allergen filtering throughout the app
- **Profile Screen**: Added profile screen with user information
- **Support Screen**: Added support screen for user assistance
- **Pull-to-Refresh**: Added pull-to-refresh functionality to diary and home pages
- **Nutrition Caching**: Implemented nutrition and food entry caching for improved performance
- **UI Enhancements**: Updated UI components and added developer info enhancements

### Bug Fixes
- Fixed allergen sorting
- Removed meal availability filter
- Fixed collection item mapping
- Improved station expansion functionality

---

## Version 1.0.0 - October 21, 2025 (Initial TestFlight Release)

### Core Features
- **Dining Hall Menus**: View menus from all Purdue dining halls
- **Menu Search**: Search for menu items with debounced live search
- **Allergen Filtering**: Filter menu items by allergens (dairy, gluten, nuts, etc.)
- **Nutrition Tracking**: Track daily nutrition intake with food diary
- **Food Diary**: Add foods to diary with meal categorization (Breakfast, Lunch, Dinner, Snacks)
- **Daily Progress**: View daily nutrition progress toward goals
- **Favorites**: Save favorite menu items for quick access
- **Collections**: View and add collection items (pre-made meal combinations)
- **Custom Foods**: Create and edit custom food items
- **Food Entry Editing**: Edit food entries in diary (quantity, meal type)
- **Date Navigation**: Navigate between dates in diary and nutrition views
- **About Screen**: View app information and navigation

### Authentication
- User authentication system

### Technical Foundation
- Connected to Supabase database
- Menu data loading and caching
- React Native with Expo SDK 54
- NativeWind for styling
- Expo Router for navigation

### Pre-Release Development (September - October 2025)

#### Initial Development (September 2025)
- Initial project setup and mockup
- Home screen design
- Database connection and setup
- Main home screen and menu item display
- UI revamp with search and nutrition features
- TOD search filtering improvements
- Dietary tags refactoring
- Icon display improvements
- Styling updates and Expo SDK 54 upgrade
- Debounced live search and allergen filtering

#### Pre-TestFlight Features (October 2025)
- Authentication system implementation
- Favorite items functionality
- Food tracker implementation
- Daily nutrition features
- Diary and nutrition tracking UI/logic revamp
- Edit food entry page
- Favorites and collection support
- Item card layout updates
- Date-based meal navigation
- Multi-day menu loading
- Custom food creation and editing
- iOS app configuration
- Search improvements with FlashList
- Build configuration updates

---

## Version History Summary

| Version | Release Date | Key Features |
|---------|--------------|--------------|
| 1.0.3 | [Current] | Home screen & menu loading optimizations, password reset, prefetching |
| 1.0.2 | [Previous] | FatSecret API, Azure AD auth, Oracle proxy, custom meals, swipe to delete, barcode scanning, global food search, date navigation |
| 1.0.1 | [Previous] | Settings, nutrition goals, allergen preferences, pull-to-refresh, caching, UI improvements |
| 1.0.0 | Oct 21, 2025 | Initial TestFlight release |

---

## Notes

- All dates are based on commit timestamps
- Version numbers follow semantic versioning (MAJOR.MINOR.PATCH)
- TestFlight release date: October 21, 2025
- This document is maintained alongside the codebase and updated with each release

