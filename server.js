// server.js

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const { check, validationResult } = require('express-validator');

const app = express();

// Configure session middleware
app.use(
    session({
        secret: 'secret-key',
        resave: false,
        saveUninitialized: true,
    })
);

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '5xqnsZfx@sql',
    database: 'learning_management',
});

// Connect to MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL as id ' + connection.threadId);
});

// Serve static files from the default directory
app.use(express.static(__dirname));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Define User representation
const User = {
    tableName: 'users',
    createUser: function (newUser, callback) {
        connection.query('INSERT INTO ' + this.tableName + ' SET ?', newUser, callback);
    },
    getUserByUsername: function (username, callback) {
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE username = ?', [username], callback);
    },
    getUserByEmail: function (email, callback) {
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE email = ?', [email], callback);
    },
};

// Registration route
app.post('/register', async (req, res) => {
    const { username, password, full_name, email } = req.body;

    // Validate input
    if (!username || !password || !email || !full_name) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // Check if the username or email already exists
    User.getUserByUsername(username, (err, users) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (users.length > 0) return res.status(400).json({ error: 'Username already exists.' });

        User.getUserByEmail(email, async (err, emails) => {
            if (err) return res.status(500).json({ error: 'Database error.' });
            if (emails.length > 0) return res.status(400).json({ error: 'Email already exists.' });

            // Hash the password and create the new user
            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = {
                username,
                password: hashedPassword,
                full_name,
                email,
            };

            User.createUser(newUser, (err) => {
                if (err) return res.status(500).json({ error: 'Error creating user.' });
                res.status(201).json({ success: 'Registration successful.' });
            });
        });
    });
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    User.getUserByUsername(username, (err, users) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (users.length === 0) return res.status(401).json({ error: 'Invalid username or password.' });

        const user = users[0];

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) return res.status(500).json({ error: 'Error during password check.' });
            if (isMatch) {
                // Set session and redirect
                req.session.user = user;
                res.status(200).json({ success: 'Login successful.' });
            } else {
                res.status(401).json({ error: 'Invalid username or password.' });
            }
        });
    });
});

// Route to get user information (e.g., for the dashboard)
app.get('/get-user-info', (req, res) => {
    if (!req.session.user) {
        return res.status(403).json({ error: 'User not logged in.' });
    }

    res.json({
        username: req.session.user.username,
        full_name: req.session.user.full_name,
        email: req.session.user.email,
    });
});
// route for getting all courses
// Define a route to get all courses
// Endpoint to fetch all courses
app.get('/courses', (req, res) => {
    connection.query('SELECT * FROM courses', (err, results) => {
        if (err) {
            console.error('Error fetching courses:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        res.json(results); // Return all courses as JSON
    });
});
//details
app.get('/courses/:id', (req, res) => {
    const courseId = req.params.id; // Get course ID from URL parameter

    connection.query('SELECT * FROM courses WHERE id = ?', [courseId], (err, results) => {
        if (err) {
            console.error('Error fetching course details:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Course not found' }); // Handle course not found
        }

        res.json(results[0]); // Return course details
    });
});
//--------------------------------------------------------//
//-- Get user info--//
app.get('/get-user-info', (req, res) => {
    if (!req.session.user) {
        return res.status(403).json({ error: 'User not logged in.' });
    }

    // Return the user's information from the session
    res.json({
        username: req.session.user.username,
        full_name: req.session.user.full_name,
    });
});
//-----------------------------------------------------//
app.post('/enroll-course', (req, res) => {
    const userId = req.session.user.id; // Get the user ID from the session
    const { course_id, course_name } = req.body; // Get course details from the request body

    const query = 'INSERT INTO my_courses (user_id, course_id, course_name) VALUES (?, ?, ?)';

    connection.query(query, [userId, course_id, course_name], (err) => {
        if (err) {
            console.error('Error enrolling in course:', err);
            return res.status(500).json({ error: 'Error enrolling in course' });
        }

        res.json({ success: 'Successfully enrolled in the course' });
    });
});

app.delete('/drop-course', (req, res) => {
    const userId = req.session.user.id; // Get the user ID from the session
    const { course_id } = req.body; // Get course ID from the request body

    const query = 'DELETE FROM my_courses WHERE user_id = ? AND course_id = ?';

    connection.query(query, [userId, course_id], (err) => {
        if (err) {
            console.error('Error dropping course:', err);
            return res.status(500).json({ error: 'Error dropping course' });
        }

        res.json({ success: 'Successfully dropped the course' });
    });
});

// Get enrolled courses//
// Endpoint to fetch all courses
app.get('/enrolled_courses', (req, res) => {
    connection.query('SELECT * FROM my_courses', (err, results) => {
        if (err) {
            console.error('Error fetching enrolled courses:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        res.json(results); // Return all courses as JSON
    });
});

//-----------------------------------------------------//
// Endpoint to get courses for a specific user
// Endpoint to get selected courses for the logged-in user
app.get('/my-courses', (req, res) => {
    const userId = req.session.user.id; // Retrieve user ID from the session

    const query = 'SELECT course_id, course_name FROM my_courses WHERE user_id = ?';

    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user courses:', err);
            return res.status(500).json({ error: 'Error fetching courses' });
        }

        res.json(results); // Return selected courses for the user
    });
});
// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
