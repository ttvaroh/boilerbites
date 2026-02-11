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
