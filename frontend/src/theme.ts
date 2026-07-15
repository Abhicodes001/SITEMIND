import { createTheme } from '@mui/material/styles';

export const getTheme = (mode: 'light' | 'dark') => {
  const primaryMain = mode === 'light' ? '#D90000' : '#8DB355';
  const primaryLight = mode === 'light' ? '#FF4D4D' : '#AFD476';
  const primaryDark = mode === 'light' ? '#A30000' : '#6D913A';
  
  const secondaryMain = mode === 'light' ? '#FFEA93' : '#000000';
  const secondaryLight = mode === 'light' ? '#FFF2C2' : '#222222';
  const secondaryDark = mode === 'light' ? '#CCA43B' : '#000000';

  const bgDefault = mode === 'light' ? '#FAFAFA' : '#000000';
  const bgPaper = mode === 'light' ? '#FFFFFF' : '#000000';
  const sidebarBg = mode === 'light' ? '#F3F4F6' : '#000000';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaryMain,
        light: primaryLight,
        dark: primaryDark,
        contrastText: mode === 'light' ? '#FFFFFF' : '#000000',
      },
      secondary: {
        main: secondaryMain,
        light: secondaryLight,
        dark: secondaryDark,
        contrastText: mode === 'light' ? '#111827' : '#FFFFFF',
      },
      background: {
        default: bgDefault,
        paper: bgPaper,
      },
      text: {
        primary: mode === 'light' ? '#111827' : '#F9FAFB',
        secondary: mode === 'light' ? '#4B5563' : '#9CA3AF',
      },
      divider: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
    },
    typography: {
      fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
        fontSize: '2.5rem',
        letterSpacing: '-0.02em',
      },
      h2: {
        fontWeight: 700,
        fontSize: '2rem',
        letterSpacing: '-0.01em',
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.5rem',
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
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '10px',
            padding: '8px 16px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: 'none',
            '&.MuiButton-containedPrimary': {
              background: mode === 'light'
                ? `linear-gradient(135deg, ${primaryMain} 0%, ${primaryLight} 100%)`
                : `linear-gradient(135deg, ${primaryMain} 0%, ${primaryLight} 100%)`,
              color: mode === 'light' ? '#FFFFFF' : '#000000',
              '&:hover': {
                background: mode === 'light'
                  ? `linear-gradient(135deg, ${primaryDark} 0%, ${primaryMain} 100%)`
                  : `linear-gradient(135deg, ${primaryDark} 0%, ${primaryMain} 100%)`,
                boxShadow: mode === 'light'
                  ? '0 6px 20px rgba(217, 0, 0, 0.25)'
                  : '0 6px 20px rgba(141, 179, 85, 0.25)',
              },
            },
            '&.MuiButton-containedSecondary': {
              background: mode === 'light'
                ? `linear-gradient(135deg, ${secondaryMain} 0%, ${secondaryLight} 100%)`
                : `linear-gradient(135deg, ${secondaryMain} 0%, ${secondaryLight} 100%)`,
              color: mode === 'light' ? '#111827' : '#FFFFFF',
              border: mode === 'light' ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
              '&:hover': {
                background: mode === 'light'
                  ? `linear-gradient(135deg, ${secondaryDark} 0%, ${secondaryMain} 100%)`
                  : `linear-gradient(135deg, #111111 0%, #000000 100%)`,
                boxShadow: mode === 'light'
                  ? '0 6px 20px rgba(255, 234, 147, 0.25)'
                  : '0 6px 20px rgba(0, 0, 0, 0.25)',
                borderColor: mode === 'light' ? 'transparent' : 'rgba(255, 255, 255, 0.4)',
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
            border: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.05)' : '1px solid rgba(255, 255, 255, 0.05)',
            backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.6)',
            boxShadow: mode === 'light' 
              ? '0 4px 20px -2px rgba(0, 0, 0, 0.03), 0 2px 8px -1px rgba(0, 0, 0, 0.02)'
              : '0 4px 20px -2px rgba(0, 0, 0, 0.2), 0 2px 8px -1px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: mode === 'light'
                ? '0 12px 30px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)'
                : '0 12px 30px -4px rgba(0, 0, 0, 0.4), 0 4px 12px -2px rgba(0, 0, 0, 0.2)',
              borderColor: mode === 'light' ? 'rgba(217, 0, 0, 0.2)' : 'rgba(141, 179, 85, 0.2)',
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: sidebarBg,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              transition: 'all 0.2s',
              '& fieldset': {
                borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)',
              },
              '&:hover fieldset': {
                borderColor: mode === 'light' ? 'rgba(217, 0, 0, 0.5)' : 'rgba(141, 179, 85, 0.5)',
              },
              '&.Mui-focused fieldset': {
                borderColor: primaryMain,
              },
            },
          },
        },
      },
    },
  });
};
export default getTheme;
