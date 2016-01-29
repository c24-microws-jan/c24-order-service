const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Define some default values if not set in environment
const PORT = process.env.PORT || 3000;
const SHUTDOWN_TIMEOUT = process.env.SHUTDOWN_TIMEOUT || 10000;
const SERVICE_CHECK_HTTP = process.env.SERVICE_CHECK_HTTP || '/healthcheck';

// Create a new express app
const app = express();

// Enable JSON body parsing
app.use(bodyParser.json());

// Add CORS headers
app.use(cors());

// Add health check endpoint
app.get(SERVICE_CHECK_HTTP, function (req, res) {
  res.json({ message: 'OK' });
});

// Add all other service routes
app.get('/', function (req, res) {
  console.log('GET /');
  res.send('Hello World');
});

app.post('/', function (req, res) {
  console.log('POST /', JSON.stringify(req.body));
  res.status(201).end();
});

// Start the server
const server = app.listen(PORT);

console.log(`Service listening on port ${PORT} ...`);




////////////// GRACEFUL SHUTDOWN CODE ////

const gracefulShutdown = function () {
  console.log('Received kill signal, shutting down gracefully.');

  // First we try to stop the server smoothly
  server.close(function () {
    console.log('Closed out remaining connections.');
    process.exit();
  });

  // After SHUTDOWN_TIMEOUT we will forcefully kill the process in case it's still running
  setTimeout(function () {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit();
  }, SHUTDOWN_TIMEOUT);
};

// listen for TERM signal .e.g. kill
process.on('SIGTERM', gracefulShutdown);

// listen for INT signal e.g. Ctrl-C
process.on('SIGINT', gracefulShutdown);
