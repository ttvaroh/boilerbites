# BoilerBites

**Track your dining hall calories with precision and style.**

A modern iOS app for Purdue students to track nutrition from campus dining halls. Real-time menus, full nutrition data, allergen filtering, and daily calorie tracking -- all in one place.

[Website](https://boilerbites.vercel.app/) | [App Store](https://apps.apple.com/us/app/boilerbites-purdue-dining/id6754264626)

---

## Features

### Real-Time Menus
Browse what's being served right now at all 12 Purdue dining locations -- 5 dining halls, 3 Quick Bites spots, and 4 On-the-GO! locations. Menus update daily with live meal hours and station-by-station item listings.

### Nutrition Facts
Tap any item to see a complete breakdown: calories, protein, carbs, fat, fiber, sugar, sodium, serving size, and full ingredient list. Flag items with missing data directly from the app.

### Daily Tracking
Log meals throughout the day and track progress against personal calorie and macro goals. Visual progress bars for calories, protein, carbs, and fat. Entries organized by meal type with swipe-to-delete and date navigation.

### Allergen Filtering
Set allergen preferences once -- dairy, gluten, nuts, soy, eggs, shellfish, fish, peanuts -- and the app highlights flagged items across all menus and search results. Filter for vegan or vegetarian options.

### Advanced Search
Search the full menu database across all locations and dates. Filter by dining hall, meal time, calorie range, or dietary preference. Sort by any macronutrient. Live results as you type.

### Custom Foods & Meals
Add off-menu items with manual nutrition entry. Group items into reusable custom meals for one-tap logging.

### Favorites & Collections
Save frequently eaten items for quick access. Browse curated collections like high-protein picks or low-calorie options.

### Apple Health Sync
Export logged nutrition data to Apple Health. Write-only -- BoilerBites never reads your health data.

### Purdue Sign-In
Authenticate with your @purdue.edu email via Microsoft/Azure AD, or use email and password. Data syncs across devices.

---

## Tech Stack

- **React Native** with Expo
- **TypeScript**
- **Supabase** (auth, database, edge functions)
- **Expo Router** (file-based navigation)

---

## Privacy

BoilerBites only collects the data necessary to provide nutrition tracking. Health app integration is optional and export-only. Full privacy policy at [boilerbites.vercel.app/privacy](https://boilerbites.vercel.app/privacy).

---

## Support

Found a bug or have a feature request? Reach out through the in-app support screen or open an issue on this repo.

---

Built at Purdue University.
