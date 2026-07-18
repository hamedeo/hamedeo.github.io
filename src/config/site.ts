import type { SiteConfig, ThemeConfig, SettingsConfig, UmamiAnalyticsConfig, AnalyticsConfig } from "../types";

export const SITE: SiteConfig = {
  website: "https://hamedeo.github.io/",
  author: "Hamed Abdollahi",
  title: "Hamed Abdollahi | Mechanical Engineer",
  desc: "Mechanical engineer focused on product development, CAD design, GD&T, CAE, validation analysis, and thermo-fluid systems for the high-tech and energy industries in the Netherlands.",
  ogImage: "/og-image-HamedeoA.png",
  postPerPage: 5,
  favicon: "/favicon.svg",
  lang: "en",
};

export const THEME_CONFIG: ThemeConfig = {
    lightAndDark: true,
    themeLight: "light_default",
    themeDark: "dark_black",
};

export const SETTINGS: SettingsConfig = {
    showTagsInNavbar: true,
    showRSSInFooter: true,
    addDevToolsInProduction: true,
};

const umami: UmamiAnalyticsConfig = {
    websiteId: "", // e.g., 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    src: "https://cloud.umami.is/script.js", // Default Umami cloud script URL
}

export const ANALYTICS: AnalyticsConfig = {
    // Google Analytics 4 Measurement ID (e.g., 'G-XXXXXXXXXX')
    ga4Id: "G-F494WFEY7C",
    // Umami Analytics configuration
    umami: umami
};
