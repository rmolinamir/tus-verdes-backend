// The Cloud Functions for Firebase SDK to create Cloud Functions, setup triggers and node module packages.
const functions = require('firebase-functions');
const JSON = require('circular-json');
const cors = require('cors')({ origin: true });
const axios = require('axios');

// Authenticate with admin privileges through the Firebase Admin SDK 
const admin = require("firebase-admin");

// Fetch the service account key JSON file contents
const serviceAccount = require("./serviceAccountKey.json");

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL
});

// As an admin, the app has access to read and write all data, regardless of Security Rules
const db = admin.database();
// Setting up database references
const prices = db.ref('prices');
const lastUpdate = db.ref('lastUpdate');

let pricesData;
let lastUpdateData;

prices.on("value", (snapshot) => {
    return pricesData = snapshot.val();
}, (error) => {
    return console.log("The read failed: " + error.code);
});

lastUpdate.on("value", (snapshot) => {
    return lastUpdateData = snapshot.val();
}, (error) => {
    return console.log("The read failed: " + error.code);
});

exports.prices = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        if (req.method !== "GET") { // Only accept GET requests
            return res.status(500).json({
                message: "Not allowed"
            });
        }
        const timeDifference = new Date () - new Date(lastUpdateData);
        /**
         * If the time difference is bigger than 300000 milliseconds (5 minutes),
         * the server will fetch data from axios, save the data to the database and 
         * return that data to the application to render those results.
         * Otherwise, the server will result the data saved in the Firebase Database,
         * to avoid too many external URL requests, and also speed up fetching.
         */
        if (timeDifference > 300000) { 
            return axios.get('https://localbitcoins.com/bitcoinaverage/ticker-all-currencies/')
                .then( response => {
                    lastUpdate.set(Date ());
                    res.status(200).send(response.data);
                    return prices.set(response.data, (error) => {
                        if (error) {
                            // The write failed...
                            console.log(error); // Firebase logging
                            return res.status(500).json({
                                error: 'Something went wrong.'
                            });
                        } 
                        return null;
                    });
                })
                .catch(error => {
                    console.log(error) // Firebase logging
                    return res.status(500).json({
                        error: 'Something went wrong.'
                    });
                });
        } else {
            return res.status(200).send(pricesData);
        }
    });
});
