import { theme as antdTheme, type ThemeConfig } from "antd";
import existingTheme from "./theme-assets/theme.json";

const baseTheme = existingTheme as ThemeConfig;

export function createTheme(darkMode: boolean): ThemeConfig {
  return {
    ...baseTheme,
    algorithm: darkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      ...baseTheme.token,
      colorBgLayout: darkMode ? "#111214" : "#f5f5f5",
      colorBgContainer: darkMode ? "#18191c" : "#ffffff",
      colorBorder: darkMode ? "#34353a" : "#e5e5e5",
      colorPrimary: darkMode ? "#d7d8dc" : "#2d2e33",
      colorPrimaryBg: darkMode ? "#232428" : baseTheme.token?.colorPrimaryBg,
      colorPrimaryBgHover: darkMode ? "#2b2c31" : baseTheme.token?.colorPrimaryBgHover,
      colorPrimaryBorder: darkMode ? "#44464d" : baseTheme.token?.colorPrimaryBorder,
      colorPrimaryBorderHover: darkMode ? "#666972" : baseTheme.token?.colorPrimaryBorderHover,
      colorPrimaryText: darkMode ? "#f1f1f3" : baseTheme.token?.colorPrimaryText,
      colorPrimaryTextHover: darkMode ? "#ffffff" : baseTheme.token?.colorPrimaryTextHover,
      colorText: darkMode ? "rgba(255, 255, 255, 0.92)" : baseTheme.token?.colorText,
      colorTextSecondary: darkMode
        ? "rgba(255, 255, 255, 0.68)"
        : baseTheme.token?.colorTextSecondary,
      colorTextTertiary: darkMode
        ? "rgba(255, 255, 255, 0.48)"
        : baseTheme.token?.colorTextTertiary,
      fontFamily: "var(--ty-font-text)",
      fontFamilyCode: "var(--ty-font-code)",
      borderRadius: 6,
      borderRadiusLG: 8,
    },
    components: {
      ...(baseTheme.components ?? {}),
      Layout: {
        bodyBg: darkMode ? "#111214" : "#f5f5f5",
        headerBg: darkMode ? "#18191c" : "#ffffff",
        siderBg: darkMode ? "#18191c" : "#ffffff",
      },
      Button: {
        ...baseTheme.components?.Button,
        defaultColor: darkMode ? "rgba(255, 255, 255, 0.92)" : baseTheme.components?.Button?.defaultColor,
        defaultHoverColor: darkMode ? "#ffffff" : baseTheme.components?.Button?.defaultHoverColor,
        defaultBorderColor: darkMode ? "#3b3d43" : baseTheme.components?.Button?.defaultBorderColor,
        primaryColor: darkMode ? "#18191c" : "#ffffff",
        solidTextColor: darkMode ? "#18191c" : baseTheme.components?.Button?.solidTextColor,
      },
      Input: {
        ...baseTheme.components?.Input,
        hoverBg: darkMode ? "#202126" : baseTheme.components?.Input?.hoverBg,
      },
      Tabs: {
        ...baseTheme.components?.Tabs,
        inkBarColor: "#F36A4B",
        itemActiveColor: "#F36A4B",
        itemHoverColor: "#F36A4B",
        itemSelectedColor: "#F36A4B",
      },
      Tag: {
        ...baseTheme.components?.Tag,
        defaultBg: darkMode ? "#2b2c31" : baseTheme.components?.Tag?.defaultBg,
        defaultColor: darkMode ? "rgba(255, 255, 255, 0.68)" : baseTheme.components?.Tag?.defaultColor,
        fontSizeSM: 12,
      },
    },
  };
}
