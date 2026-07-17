export type WhatsNewFeature = {
  icon: string; // Ionicons name
  text: string;
};

export type WhatsNewEntry = {
  version: string;
  title: string;
  subtitle?: string;
  features: WhatsNewFeature[];
  ctaButton?: {
    label: string;
    route: string;
    icon?: string;
  };
};

export const whatsNewEntries: WhatsNewEntry[] = [
  {
    version: "1.0.7",
    title: "Diary Edit Fix",
    subtitle: "Open and delete food entries from the diary again",
    features: [
      {
        icon: "journal",
        text: "Fixed a bug where editing or deleting a diary food entry showed \"Food entry not found\"",
      },
      {
        icon: "trash",
        text: "You can open any diary entry and remove it from the edit screen as expected",
      },
    ],
    ctaButton: {
      label: "Go to Diary",
      route: "/(tabs)/diary",
      icon: "arrow-forward",
    },
  },
  {
    version: "1.0.6",
    title: "Faster & Smarter Favorites",
    subtitle: "See when your favorites are served and enjoy a snappier app",
    features: [
      {
        icon: "heart",
        text: "Favorites now has a dedicated Upcoming tab with dining hall, meal, and date details",
      },
      {
        icon: "flash",
        text: "Menus load faster with instant switching between meals",
      },
      {
        icon: "search",
        text: "Search loads results in pages—scroll to load more items without waiting for everything at once",
      },
    ],
    ctaButton: {
      label: "View Favorites",
      route: "/favorites",
      icon: "arrow-forward",
    },
  },
  {
    version: "1.0.5",
    title: "Health App Connections",
    subtitle: "Sync your nutrition data with your favorite health apps",
    features: [
      {
        icon: "fitness",
        text: "Sync your food log to Apple Health or Fitbit",
      },
      {
        icon: "leaf",
        text: "Ingredients section now correctly displays all ingredients",
      },
      {
        icon: "shield-checkmark",
        text: "Updated privacy policy and Terms of Service",
      },
    ],
    ctaButton: {
      label: "Explore Health Connections",
      route: "/health-connections",
      icon: "arrow-forward",
    },
  },
];
