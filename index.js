const express = require('express');
const fs = require('fs');
const path = require('path')
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors'); // Import the cors package

const placesRoutes = require('./routes/places-routes');
const userRoutes = require('./routes/users-routes');
const HttpError = require('./models/http-error');

require('dotenv').config();


const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.4qunfnr.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;
const app = express();


// Middleware to parse JSON bodies
app.use(bodyParser.json());

app.use('/uploads/images',express.static(path.join('uploads','images')));
// app.use(express.static(path.join('public')));


// Enable CORS for your frontend URL
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  
    next();
  });

// Routes
app.use('/api/places', placesRoutes);
app.use('/api/users', userRoutes);

// app.use((req, res, next) => {
//     res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
//   });


// Handle unknown routes
app.use((req, res, next) => {
    const error = new HttpError('Could not find the route', 404);
    throw error;
});

// Global error handling
app.use((error, req, res, next) => {
    if(req.file){
        fs.unlink(req.file.path,err => {
            console.log(err);
        });
    }
    if (res.headersSent) {
        return next(error);
    }
    res.status(error.code || 500);
    res.json({ message: error.message || 'An unknown error occurred', statusCode: error.code || 500 });
});

// Connect to MongoDB and start the server
mongoose.connect(url)
    .then(() => {
        app.listen(process.env.PORT || 3000, () => {
            console.log('Connected successfully and server is running on port 3000');
        });
    })
    .catch(err => {
        console.error('Database connection error:', err);
    });
