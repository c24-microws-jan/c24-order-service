const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Resilient = require('resilient');
const consul = require('resilient-consul');

// Define some default values if not set in environment
const PORT = process.env.PORT || 3000;
const SHUTDOWN_TIMEOUT = process.env.SHUTDOWN_TIMEOUT || 10000;
const SERVICE_CHECK_HTTP = process.env.SERVICE_CHECK_HTTP || '/healthcheck';

// Init resilient
var client = Resilient();

client.use(consul({
  service: 'c24-order-couchdb',
  servers: ['http://46.101.245.190:8500', 'http://46.101.132.55:8500', 'http://46.101.193.82:8500'],
  onlyHealthy: true,
}));

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
  client.get('/order/_all_docs', function(err, rs) {
    console.log('Error: ', err);
    res.json(rs.body.rows);
  });
});

app.get('/:id', function (req, res) {
  var id = req.params.id;
  client.get('/order/' + id , function(err, rs) {
    if (err) {
      console.log('Error: ', err);
    }
    res.json(rs.body);
  });
});

app.post('/', function (req, res) {
  console.log('Boooooooody', req.body);
  if (Object.keys(req.body).length === 0) {
    res.status(400).end();
    return;
  }
  client.post( { path: '/order/', data: req.body }, function(error, rs) {
    if (error) {
      console.log('Error:', error);
      res.status(500).end();
    }
    res.status(201).json(rs.body.id);
    });
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
