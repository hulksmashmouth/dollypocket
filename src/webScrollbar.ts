import { Platform } from 'react-native';
import { colors } from './theme';

// Native iOS/Android give apps no API to recolor scrollbars — iOS's
// ScrollView `indicatorStyle` only supports 'default'/'black'/'white', and
// Android exposes nothing at all. The web build (what the Pi kiosk actually
// runs, via Chromium) is a real browser page, so genuine scrollbar CSS
// works there. No-op on native.
export function injectWebScrollbarStyles(): void {
  if (Platform.OS !== 'web') return;

  const style = document.createElement('style');
  style.textContent = `
    * {
      scrollbar-color: ${colors.accent} ${colors.bg};
    }
    *::-webkit-scrollbar {
      width: 14px;
      height: 14px;
    }
    *::-webkit-scrollbar-track {
      background: ${colors.bg};
    }
    *::-webkit-scrollbar-thumb {
      background: ${colors.accent};
      border-top: 2px solid ${colors.bevelLight};
      border-left: 2px solid ${colors.bevelLight};
      border-bottom: 2px solid ${colors.bevelDark};
      border-right: 2px solid ${colors.bevelDark};
    }
    *::-webkit-scrollbar-corner {
      background: ${colors.bg};
    }
  `;
  document.head.appendChild(style);
}
