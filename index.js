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
  servers: ['http://46.101.245.190:8500'],
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
  console.log('Calling Couch!');
  // res.send('Hello World');
  client.get('/order/_all_docs', function(err, rs) {
    console.log('Error: ', err);
    res.send(rs.body);
  });
});

app.get('/:id', function (req, res) {
  var id = req.params.id;
  console.log('GET ', req.params.id);
  console.log('Calling Couch!');
  client.get('/order/' + id , function(err, rs) {
    if (err) {
      console.log('Error: ', err);
    }
    res.send(rs.body.rows);
  });
});

app.post('/', function (req, res) {
  client.post( { path: '/order/', data: req.body }, function(error, rs) {
    if (error) {
      console.log('Error:', error);
      res.status(500).end();
    }
    console.log('rs', rs);
    res.status(201).send(rs.body.id);
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
