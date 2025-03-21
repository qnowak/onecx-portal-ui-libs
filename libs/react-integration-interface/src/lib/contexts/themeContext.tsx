import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CurrentThemeTopic, Theme } from '@onecx/integration-interface';
import { CONFIG_KEY } from '../model/config-key.model';
import { useConfiguration } from './configurationContext';

const defaultThemeServerUrl = 'http://portal-theme-management:8080';

const ThemeContext = createContext<any>(null);

/**
 * Needs to be used within ThemeContext
 */
const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { config, isInitialized } = useConfiguration();
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null);
  const baseUrlV1 = './portal-api';
  const currentTheme$ = useMemo(() => new CurrentThemeTopic(), []);
  const getThemeHref = (themeId: string): string => {
    const themeServerUrl =
      config?.[CONFIG_KEY.TKIT_PORTAL_THEME_SERVER_URL] ||
      defaultThemeServerUrl;
    return `${themeServerUrl}/themes/${themeId}/${themeId}.min.css`;
  };

  const loadAndApplyTheme = async (themeName: string) => {
    if (!isInitialized) {
      console.log('Configuration is not initialized yet.');
      return;
    }

    const theme = await loadTheme(themeName);
    if (theme) {
      await apply(theme);
      setCurrentTheme(theme);
    }
  };

  const loadTheme = async (themeName: string): Promise<Theme | null> => {
    try {
      const response = await fetch(
        `${baseUrlV1}/internal/themes/${encodeURIComponent(themeName)}`
      );
      const theme = await response.json();
      return theme;
    } catch (error) {
      console.error('Failed to load theme:', error);
      return null;
    }
  };

  const apply = async (theme: Theme): Promise<void> => {
    console.log(`🎨 Applying theme: ${theme.name}`);
    await currentTheme$.publish(theme);
    if (theme.properties) {
      Object.values(theme.properties).forEach((group) => {
        for (const [key, value] of Object.entries(group)) {
          document.documentElement.style.setProperty(`--${key}`, value);
        }
      });
    }
  };
  const contextValue = useMemo(
    () => ({
      currentTheme,
      apply,
      loadAndApplyTheme,
      getThemeHref,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentTheme]
  );

  useEffect(() => {
    return () => {
      currentTheme$.destroy();
    };
  }, [currentTheme$]);
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export { ThemeProvider, useTheme };
