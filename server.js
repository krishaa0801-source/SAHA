const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to serve static files (HTML, CSS, JS, images)
app.use(express.static(__dirname));

// Catch-all route to serve the main HTML file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`=========================================`);
});