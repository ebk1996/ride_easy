// with firestore location for driver

import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { Container, Box, TextField, Button, Typography, AppBar, Toolbar, IconButton, CircularProgress, Paper, Grid, Snackbar, Alert } from '@mui/material'; // Added Snackbar, Alert
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CarFront, MapPin, UserCircle } from 'lucide-react'; // Using lucide-react for icons

// Theme for Material-UI
const theme = createTheme({
  typography: {
    fontFamily: 'Inter, sans-serif',
  },
  palette: {
    primary: {
      main: '#000000', // Uber black
    },
    secondary: {
      main: '#34A853', // Green for success/go
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          padding: '12px 24px',
          boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            boxShadow: '0px 6px 15px rgba(0, 0, 0, 0.2)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});

// Firebase Context
const FirebaseContext = createContext(null);

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Initialize Firebase and set up auth listener
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

    try {
      const app = initializeApp(firebaseConfig);
      const authInstance = getAuth(app);
      const dbInstance = getFirestore(app);

      setAuth(authInstance);
      setDb(dbInstance);
      setFirebaseInitialized(true);

      const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          setUserId(currentUser.uid);
        } else {
          // If no user is logged in, try to sign in anonymously
          try {
            if (typeof __initial_auth_token !== 'undefined') {
              await signInWithCustomToken(authInstance, __initial_auth_token);
            } else {
              await signInAnonymously(authInstance);
            }
            // After anonymous sign-in, onAuthStateChanged will be triggered again with the anonymous user
          } catch (error) {
            console.error("Error signing in anonymously:", error);
            // Fallback: If anonymous sign-in fails, set user to null and stop loading
            setUser(null);
            setUserId(null);
            setLoading(false);
          }
        }
        setLoading(false); // Set loading to false once auth state is determined
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
      setLoading(false);
    }
  }, []); // Run only once on component mount

  if (loading || !firebaseInitialized) {
    return (
      <ThemeProvider theme={theme}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>Loading App...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <FirebaseContext.Provider value={{ db, auth, userId }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
          <AppBar position="static" color="primary" elevation={0} sx={{ borderBottom: '1px solid #e0e0e0' }}>
            <Toolbar sx={{ justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CarFront size={32} color="#fff" />
                <Typography variant="h5" component="div" sx={{ flexGrow: 1, ml: 1, fontWeight: 'bold', color: '#fff' }}>
                  RideEase
                </Typography>
              </Box>
              {user && (
                <Button color="inherit" onClick={() => signOut(auth)} sx={{ color: '#fff' }}>
                  Logout
                </Button>
              )}
            </Toolbar>
          </AppBar>

          <Container component="main" maxWidth="md" sx={{ flexGrow: 1, py: 4 }}>
            {!user ? <AuthScreen /> : <Dashboard />}
          </Container>
        </Box>
      </FirebaseContext.Provider>
    </ThemeProvider>
  );
}

// AuthScreen Component
function AuthScreen() {
  const { auth, db } = useContext(FirebaseContext);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Save user profile to Firestore
        await setDoc(doc(db, `artifacts/${__app_id}/users/${userCredential.user.uid}/profile`, 'data'), {
          email: userCredential.user.email,
          createdAt: new Date(),
          // Add other initial user data here
        });
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        {isLogin ? 'Welcome Back!' : 'Join RideEase'}
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: 400 }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          sx={{ mb: 2 }}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 3 }}
        />
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          sx={{ mb: 2 }}
          disabled={authLoading}
        >
          {authLoading ? <CircularProgress size={24} color="inherit" /> : (isLogin ? 'Sign In' : 'Sign Up')}
        </Button>
        <Button
          fullWidth
          variant="outlined"
          color="primary"
          onClick={() => setIsLogin(!isLogin)}
          disabled={authLoading}
        >
          {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
        </Button>
      </Box>
    </Paper>
  );
}

// Dashboard Component
function Dashboard() {
  const { db, userId } = useContext(FirebaseContext);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  // Removed rideRequestStatus string, now using Snackbar for feedback
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // 'success', 'error', 'warning', 'info'

  useEffect(() => {
    if (!db || !userId) return;

    // Listen for real-time updates to the user's profile
    const profileDocRef = doc(db, `artifacts/${__app_id}/users/${userId}/profile`, 'data');
    const unsubscribe = onSnapshot(profileDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      } else {
        console.log("No user profile found!");
        setUserProfile(null); // Clear profile if it doesn't exist
      }
      setProfileLoading(false);
    }, (error) => {
      console.error("Error fetching user profile:", error);
      setProfileLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [db, userId]);

  const handleRequestRide = async () => {
    if (!db || !userId) {
      setSnackbarMessage('Please log in to request a ride.');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
      return;
    }

    setSnackbarMessage('Getting your location...');
    setSnackbarSeverity('info');
    setOpenSnackbar(true);

    // Get current geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setSnackbarMessage('Requesting ride...');
          setSnackbarSeverity('info');
          setOpenSnackbar(true);

          try {
            // Use the user's ID as the document ID for their ride request
            const rideRequestDocRef = doc(db, `artifacts/${__app_id}/public/data/rideRequests`, userId);
            await setDoc(rideRequestDocRef, {
              riderId: userId,
              pickupLocation: `Lat: ${latitude}, Lng: ${longitude}`, // Store actual coordinates
              pickupLatitude: latitude,
              pickupLongitude: longitude,
              destination: 'Destination (Placeholder)', // User would input this in a real app
              status: 'pending', // Status for driver to pick up
              timestamp: new Date(),
              riderEmail: userProfile?.email || 'N/A',
            });
            setSnackbarMessage('Ride requested successfully! Drivers have been alerted.');
            setSnackbarSeverity('success');
            setOpenSnackbar(true);
          } catch (error) {
            console.error("Error requesting ride:", error);
            setSnackbarMessage(`Failed to request ride: ${error.message}`);
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          let errorMessage = 'Unable to retrieve your location.';
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'Location access denied. Please enable location services for this app.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = 'Location information is unavailable.';
          } else if (error.code === error.TIMEOUT) {
            errorMessage = 'The request to get user location timed out.';
          }
          setSnackbarMessage(`Geolocation error: ${errorMessage}`);
          setSnackbarSeverity('error');
          setOpenSnackbar(true);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Geolocation options
      );
    } else {
      setSnackbarMessage('Geolocation is not supported by your browser.');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Welcome, {userProfile?.email || 'User'}!
        <Typography variant="body2" color="text.secondary">
          Your User ID: <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{userId || 'N/A'}</span>
        </Typography>
      </Typography>

      {profileLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading profile...</Typography>
        </Box>
      ) : (
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                <MapPin size={24} style={{ marginRight: 8 }} />
                Map View (Placeholder)
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  height: 300,
                  backgroundColor: '#e0e0e0',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#666',
                  fontSize: '1.2em',
                  fontWeight: 'bold',
                  border: '1px dashed #ccc',
                }}
              >
                Interactive Map Goes Here
              </Box>
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                sx={{ mt: 3, py: 1.5 }}
                onClick={handleRequestRide}
                startIcon={<CarFront />}
              >
                Request a Ride
              </Button>
              {/* Removed direct rideRequestStatus display, now using Snackbar */}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                <UserCircle size={24} style={{ marginRight: 8 }} />
                Your Profile
              </Typography>
              <Typography variant="body1">
                <strong>Email:</strong> {userProfile?.email || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Joined: {userProfile?.createdAt ? new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
              </Typography>
              {/* Add more profile details here */}
              <Button variant="outlined" size="small" sx={{ mt: 2 }}>Edit Profile</Button>
            </Paper>

            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Spinoff Content Ideas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                - Ride History
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                - Payment Methods
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                - Driver Mode Toggle
              </Typography>
              <Typography variant="body2" color="text.secondary">
                - Help & Support
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Snackbar for notifications */}
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;
