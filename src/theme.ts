import { theme as antdTheme, type ThemeConfig } from "antd";
import existingTheme from "./theme-assets/theme.json";
import { runtimeThemeColors } from "./theme-assets/theme-values";

const baseTheme = existingTheme as ThemeConfig;

export function createTheme(darkMode: boolean): ThemeConfig {
  return {
    ...baseTheme,
    algorithm: darkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      ...baseTheme.token,
      colorBgLayout: darkMode ? runtimeThemeColors.dark.layout : runtimeThemeColors.light.layout,
      colorBgContainer: darkMode ? runtimeThemeColors.dark.container : runtimeThemeColors.light.container,
      colorBorder: darkMode ? runtimeThemeColors.dark.border : runtimeThemeColors.light.border,
      colorPrimary: darkMode ? runtimeThemeColors.dark.primary : runtimeThemeColors.light.primary,
      colorPrimaryBg: darkMode ? runtimeThemeColors.dark.primaryBg : baseTheme.token?.colorPrimaryBg,
      colorPrimaryBgHover: darkMode ? runtimeThemeColors.dark.primaryBgHover : baseTheme.token?.colorPrimaryBgHover,
      colorPrimaryBorder: darkMode ? runtimeThemeColors.dark.primaryBorder : baseTheme.token?.colorPrimaryBorder,
      colorPrimaryBorderHover: darkMode ? runtimeThemeColors.dark.primaryBorderHover : baseTheme.token?.colorPrimaryBorderHover,
      colorPrimaryText: darkMode ? runtimeThemeColors.dark.primaryText : baseTheme.token?.colorPrimaryText,
      colorPrimaryTextHover: darkMode ? runtimeThemeColors.dark.primaryTextHover : baseTheme.token?.colorPrimaryTextHover,
      colorText: darkMode ? runtimeThemeColors.dark.text : baseTheme.token?.colorText,
      colorTextSecondary: darkMode
        ? runtimeThemeColors.dark.textSecondary
        : baseTheme.token?.colorTextSecondary,
      colorTextTertiary: darkMode
        ? runtimeThemeColors.dark.textTertiary
        : baseTheme.token?.colorTextTertiary,
      fontFamily: "var(--ty-font-text)",
      fontFamilyCode: "var(--ty-font-code)",
      borderRadius: 6,
      borderRadiusLG: 8,
    },
    components: {
      ...(baseTheme.components ?? {}),
      Layout: {
        bodyBg: darkMode ? runtimeThemeColors.dark.layout : runtimeThemeColors.light.layout,
        headerBg: darkMode ? runtimeThemeColors.dark.container : runtimeThemeColors.light.container,
        siderBg: darkMode ? runtimeThemeColors.dark.container : runtimeThemeColors.light.container,
      },
      Button: {
        ...baseTheme.components?.Button,
        defaultColor: darkMode ? runtimeThemeColors.dark.text : baseTheme.components?.Button?.defaultColor,
        defaultHoverColor: darkMode ? runtimeThemeColors.dark.primaryTextHover : baseTheme.components?.Button?.defaultHoverColor,
        defaultBorderColor: darkMode ? runtimeThemeColors.dark.buttonBorder : baseTheme.components?.Button?.defaultBorderColor,
        primaryColor: darkMode ? runtimeThemeColors.dark.buttonSurface : runtimeThemeColors.light.container,
        solidTextColor: darkMode ? runtimeThemeColors.dark.buttonSurface : baseTheme.components?.Button?.solidTextColor,
      },
      Input: {
        ...baseTheme.components?.Input,
        hoverBg: darkMode ? runtimeThemeColors.dark.inputHover : baseTheme.components?.Input?.hoverBg,
      },
      Tabs: {
        ...baseTheme.components?.Tabs,
        inkBarColor: runtimeThemeColors.accent,
        itemActiveColor: runtimeThemeColors.accent,
        itemHoverColor: runtimeThemeColors.accent,
        itemSelectedColor: runtimeThemeColors.accent,
      },
      Tag: {
        ...baseTheme.components?.Tag,
        defaultBg: darkMode ? runtimeThemeColors.dark.primaryBgHover : baseTheme.components?.Tag?.defaultBg,
        defaultColor: darkMode ? runtimeThemeColors.dark.textSecondary : baseTheme.components?.Tag?.defaultColor,
        fontSizeSM: 12,
      },
    },
  };
}
