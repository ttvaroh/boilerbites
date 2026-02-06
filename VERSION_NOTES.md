# BoilerBites Version Notes

This document tracks all changes and improvements made to BoilerBites since the initial TestFlight release.

---

## Version 1.0.4 - 28 January 2026

### Features
- **Edit Goals from Stats Screen**: Added edit button to Today's Progress card on the diary/stats screen
  - Users can now edit their daily nutrition goals directly from the progress card
  - Opens the same goal editing modal used in nutrition preferences
  - Quick access to goal adjustments without navigating to settings
- **Reusable Goal Editing Modal**: Created shared EditGoalsModal component
  - Unified goal editing experience across stats screen and nutrition preferences
  - Consistent color scheme matching Today's Progress card design
  - Improved code maintainability with shared component
- **Streamlined Nutrition Preferences**: Refined nutrition preferences screen
  - Removed daily goals section (now accessible from stats screen)
  - Focused screen on allergen and dietary preferences only
  - Cleaner, more focused user experience
- **Global Search from Missing Nutrition**: Added "Find Nutrition Globally" button to missing nutrition page
  - Users can search for similar items when nutrition info is unavailable
  - Automatically pre-fills search with item name
  - Seamless navigation to global search with results ready

### UI/UX Improvements
- Enhanced Today's Progress card with edit button in bottom-right corner
- Improved modal color scheme to match Today's Progress card (gray-800 background, purdueGold accents)
- Updated macro input colors in goal editing modal (blue for protein, green for carbs, red for fat)
- Better visual hierarchy in nutrition preferences screen

### Technical
- Extracted EditGoalsModal into reusable component
- Added query parameter support to global search page for pre-filled searches
- Refactored nutrition preferences to use shared modal component
- Improved state management for goal editing across screens

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
- **Vegan & Vegetarian Preferences**: Added vegan and vegetarian dietary preferences
  - Users can select vegan or vegetarian preferences in nutrition settings
  - Items that don't match preferences are automatically greyed out (but remain clickable) on dining hall and search screens
  - Preferences stored as `vegan_preference` and `vegetarian_preference` in database
  - Visual indicator shows "Contains allergen" for items that don't match preferences
- **Allergen Marking System**: Enhanced allergen filtering with visual indicators
  - Items containing user's allergens are now marked and darkened on dining hall screens
  - Items remain clickable but visually indicate potential allergen concerns
  - Works consistently across dining hall menus and search screens
  - Grey warning indicator displays "Contains allergen" for marked items
- **Auto-Filter in Search**: Search screen automatically applies dietary preferences
  - Search screen automatically selects vegan, vegetarian, and gluten-free filters based on user preferences
  - Filters are pre-populated when opening search screen
  - Seamless integration with existing allergen exclusion system
- **Password Reset**: Added "Forgot Password" functionality
  - Users can request password reset from sign-in screen
  - Password reset handled via web application (https://boilerbites.vercel.app/reset-password)
  - Improved security by redirecting to web for password reset flow

### Bug Fixes
- Fixed infinite loop issue in station expansion initialization
- Fixed redundant database queries in dining hall page initialization
- Fixed timezone mismatch in daily progress calculation
- Fixed nutrition preferences screen initialization order issues

### UI/UX Improvements
- Redesigned nutrition preferences screen for better usability
  - Removed large hero section, replaced with compact card
  - Optimized spacing to show save button without scrolling
  - Made allergen preference cards more compact while maintaining readability
- Improved nutrition preferences screen navigation
  - Automatically routes back after successful save
  - Better user feedback with toast notifications

### Technical
- Added detailed menu cache with meal-specific keys for instant meal navigation
- Added `prefetchLocationMenu()` method for aggressive prefetching
- Modified `switchLocation()` to preserve cache instead of clearing it
- Added performance logging for monitoring query count and load times
- Updated `.gitignore` to exclude collection ETL URLs file
- Added `vegan_preference` and `vegetarian_preference` columns to `nutrition_preferences` table
- Enhanced `itemContainsIntolerance()` utility to check vegan/vegetarian preferences
- Updated allergen marking logic to work with both allergen arrays and boolean flags

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
| 1.0.4 | [Current] | Edit goals from stats screen, reusable goal editing modal, streamlined nutrition preferences, global search from missing nutrition |
| 1.0.3 | [Previous] | Home screen & menu loading optimizations, vegan/vegetarian preferences, allergen marking, auto-filter in search, password reset, prefetching |
| 1.0.2 | [Previous] | FatSecret API, Azure AD auth, Oracle proxy, custom meals, swipe to delete, barcode scanning, global food search, date navigation |
| 1.0.1 | [Previous] | Settings, nutrition goals, allergen preferences, pull-to-refresh, caching, UI improvements |
| 1.0.0 | Oct 21, 2025 | Initial TestFlight release |

---

## Notes

- All dates are based on commit timestamps
- Version numbers follow semantic versioning (MAJOR.MINOR.PATCH)
- TestFlight release date: October 21, 2025
- This document is maintained alongside the codebase and updated with each release

