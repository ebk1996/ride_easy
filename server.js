// Import necessary modules
const express = require('express');
const admin = require('firebase-admin'); // Firebase Admin SDK for backend operations
const cors = require('cors'); // For handling Cross-Origin Resource Sharing

// Initialize Express app
const app = express();
const port = 3001; // Port for the Express server

// Middleware
app.use(cors()); // Enable CORS for all routes, allowing your React app to connect
app.use(express.json()); // Enable JSON body parsing for incoming requests

// IMPORTANT: Initialize Firebase Admin SDK
// You need to replace 'path/to/your/serviceAccountKey.json' with the actual path
// to your Firebase service account key file.
// You can generate this file from your Firebase project settings -> Service accounts.
// Keep this file secure and do not expose it publicly.
try {
  const serviceAccount = require('./serviceAccountKey.json'); // Path to your service account key

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // You might need to specify your databaseURL if you're using Realtime Database
    // databaseURL: "https://<YOUR_PROJECT_ID>.firebaseio.com"
  });

  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK. Make sure serviceAccountKey.json is correctly configured and accessible.');
  console.error(error);
  process.exit(1); // Exit if Firebase initialization fails
}


const db = admin.firestore(); // Get a Firestore instance

// Define the App ID from your Canvas environment.
// In a real-world scenario, you might pass this as an environment variable.
// For this example, we'll use a placeholder.
const APP_ID = 'default-app-id'; // Replace with your actual __app_id from Canvas if known

// --- API Endpoints ---

// GET /api/ride-requests
// Fetches all pending ride requests from Firestore
app.get('/api/ride-requests', async (req, res) => {
  try {
    // Reference to the public rideRequests collection
    const rideRequestsRef = db.collection(`artifacts/${APP_ID}/public/data/rideRequests`);
    // Query for documents where status is 'pending'
    const snapshot = await rideRequestsRef.where('status', '==', 'pending').get();

    if (snapshot.empty) {
      console.log('No pending ride requests found.');
      return res.status(200).json([]);
    }

    const rideRequests = [];
    snapshot.forEach(doc => {
      rideRequests.push({
        id: doc.id, // The document ID is the rider's userId
        ...doc.data()
      });
    });

    console.log(`Fetched ${rideRequests.length} pending ride requests.`);
    res.status(200).json(rideRequests);
  } catch (error) {
    console.error('Error fetching ride requests:', error);
    res.status(500).json({ error: 'Failed to fetch ride requests', details: error.message });
  }
});

// POST /api/ride-requests/:id/accept
// Allows a driver to accept a specific ride request
app.post('/api/ride-requests/:id/accept', async (req, res) => {
  const rideRequestId = req.params.id; // The rider's userId
  const { driverId, driverName, driverVehicle } = req.body; // Driver details from the request body

  if (!driverId || !driverName || !driverVehicle) {
    return res.status(400).json({ error: 'Driver ID, name, and vehicle are required.' });
  }

  try {
    const rideRequestRef = db.collection(`artifacts/${APP_ID}/public/data/rideRequests`).doc(rideRequestId);
    const doc = await rideRequestRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Ride request not found.' });
    }

    // Update the status to 'accepted' and add driver details
    await rideRequestRef.update({
      status: 'accepted',
      driverId: driverId,
      driverName: driverName,
      driverVehicle: driverVehicle,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp() // Use server timestamp
    });

    console.log(`Ride request ${rideRequestId} accepted by driver ${driverName}.`);
    res.status(200).json({ message: 'Ride request accepted successfully.', rideRequestId });
  } catch (error) {
    console.error(`Error accepting ride request ${rideRequestId}:`, error);
    res.status(500).json({ error: 'Failed to accept ride request', details: error.message });
  }
});

// POST /api/ride-requests/:id/complete
// Allows a driver to mark a ride request as completed
app.post('/api/ride-requests/:id/complete', async (req, res) => {
  const rideRequestId = req.params.id;

  try {
    const rideRequestRef = db.collection(`artifacts/${APP_ID}/public/data/rideRequests`).doc(rideRequestId);
    const doc = await rideRequestRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Ride request not found.' });
    }

    // Update the status to 'completed'
    await rideRequestRef.update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Ride request ${rideRequestId} marked as completed.`);
    res.status(200).json({ message: 'Ride request completed successfully.', rideRequestId });
  } catch (error) {
    console.error(`Error completing ride request ${rideRequestId}:`, error);
    res.status(500).json({ error: 'Failed to complete ride request', details: error.message });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Express backend listening at http://localhost:${port}`);
  console.log('To run this server:');
  console.log('1. Ensure you have Node.js installed.');
  console.log('2. Create a new directory for this backend (e.g., "uber-backend").');
  console.log('3. Save this code as "server.js" inside that directory.');
  console.log('4. Run `npm init -y` in your terminal within that directory.');
  console.log('5. Install dependencies: `npm install express firebase-admin cors`');
  console.log('6. Download your Firebase service account key (JSON file) from Firebase Console -> Project settings -> Service accounts.');
  console.log('7. Place the downloaded JSON file (e.g., "serviceAccountKey.json") in the same directory as "server.js".');
  console.log('8. Update the `require(\'./serviceAccountKey.json\')` path if your file name is different.');
  console.log('9. Run the server: `node server.js`');
  console.log('10. Ensure your Firebase project has Firestore enabled and the necessary security rules allow writes to `artifacts/{appId}/public/data/rideRequests`.');
});
