import { createTheme } from '@mui/material/styles';

export const getTheme = (mode: 'light' | 'dark') => {
  const primaryMain = mode === 'light' ? '#0d9488' : '#00f2fe';
  const primaryLight = mode === 'light' ? '#14b8a6' : '#73f7ff';
  const primaryDark = mode === 'light' ? '#0f766e' : '#00a3ab';
  
  const secondaryMain = mode === 'light' ? '#0284c7' : '#4facfe';
  const secondaryLight = mode === 'light' ? '#38bdf8' : '#8cd0ff';
  const secondaryDark = mode === 'light' ? '#0369a1' : '#007cc7';

  const bgDefault = mode === 'light' ? '#f9fafb' : '#09090b';
  const bgPaper = mode === 'light' ? '#ffffff' : '#18181b';
  const sidebarBg = mode === 'light' ? '#f3f4f6' : 'rgba(9, 9, 11, 0.5)';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaryMain,
        light: primaryLight,
        dark: primaryDark,
        contrastText: mode === 'light' ? '#FFFFFF' : '#09090b',
      },
      secondary: {
        main: secondaryMain,
        light: secondaryLight,
        dark: secondaryDark,
        contrastText: '#FFFFFF',
      },
      background: {
        default: bgDefault,
        paper: bgPaper,
      },
      text: {
        primary: mode === 'light' ? '#111827' : '#f4f4f5',
        secondary: mode === 'light' ? '#4b5563' : '#a1a1aa',
      },
      divider: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
    },
    typography: {
      fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 800,
        fontSize: '2.5rem',
        letterSpacing: '-0.03em',
      },
      h2: {
        fontWeight: 800,
        fontSize: '2rem',
        letterSpacing: '-0.02em',
      },
      h3: {
        fontWeight: 700,
        fontSize: '1.5rem',
        letterSpacing: '-0.01em',
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.25rem',
      },
      h5: {
        fontWeight: 600,
        fontSize: '1.1rem',
      },
      h6: {
        fontWeight: 600,
        fontSize: '1rem',
      },
      body1: {
        fontSize: '0.975rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
            padding: '10px 20px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: 'none',
            '&.MuiButton-containedPrimary': {
              background: mode === 'light'
                ? `linear-gradient(135deg, ${primaryMain} 0%, ${primaryLight} 100%)`
                : `linear-gradient(135deg, ${primaryMain} 0%, ${secondaryMain} 100%)`,
              color: mode === 'light' ? '#FFFFFF' : '#09090b',
              '&:hover': {
                background: mode === 'light'
                  ? `linear-gradient(135deg, ${primaryDark} 0%, ${primaryMain} 100%)`
                  : `linear-gradient(135deg, ${primaryLight} 0%, ${primaryMain} 100%)`,
                boxShadow: mode === 'light'
                  ? '0 6px 20px rgba(13, 148, 136, 0.25)'
                  : '0 6px 20px rgba(0, 242, 254, 0.35)',
              },
            },
            '&.MuiButton-containedSecondary': {
              background: mode === 'light'
                ? `linear-gradient(135deg, ${secondaryMain} 0%, ${secondaryLight} 100%)`
                : `linear-gradient(135deg, ${secondaryMain} 0%, ${secondaryLight} 100%)`,
              color: '#FFFFFF',
              border: mode === 'light' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              '&:hover': {
                background: mode === 'light'
                  ? `linear-gradient(135deg, ${secondaryDark} 0%, ${secondaryMain} 100%)`
                  : `linear-gradient(135deg, ${secondaryDark} 0%, ${secondaryMain} 100%)`,
                boxShadow: mode === 'light'
                  ? '0 6px 20px rgba(2, 132, 199, 0.25)'
                  : '0 6px 20px rgba(79, 172, 254, 0.25)',
              },
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: '16px',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.05)' : '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(24, 24, 27, 0.4)',
            boxShadow: mode === 'light' 
              ? '0 4px 20px -2px rgba(0, 0, 0, 0.02)'
              : '0 4px 30px rgba(0, 0, 0, 0.2)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: mode === 'light'
                ? '0 12px 30px -4px rgba(13, 148, 136, 0.12)'
                : '0 12px 30px -4px rgba(0, 242, 254, 0.15)',
              borderColor: mode === 'light' ? 'rgba(13, 148, 136, 0.3)' : 'rgba(0, 242, 254, 0.3)',
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: sidebarBg,
            backdropFilter: 'blur(16px)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              transition: 'all 0.2s',
              backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(9,9,11,0.4)',
              '& fieldset': {
                borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.08)',
              },
              '&:hover fieldset': {
                borderColor: mode === 'light' ? 'rgba(13, 148, 136, 0.4)' : 'rgba(0, 242, 254, 0.4)',
              },
              '&.Mui-focused fieldset': {
                borderColor: primaryMain,
              },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: mode === 'light' ? '#ffffff' : '#18181b',
            backgroundImage: 'none',
            border: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: mode === 'light' ? '#ffffff' : '#18181b',
            backgroundImage: 'none',
            border: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },
  });
};
export default getTheme;

