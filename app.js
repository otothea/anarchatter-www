//
// CONFIG & FILE SYSTEM
//

var config = require('./config/app'),
    fs = require('fs');

//
// MODEL
//

var Model = require('./model'),
    model = new Model(config);

//
// SETUP FOR SERVER
//

var express = require('express'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    app = express(),
    http = require('http'),
    jwt = require('jsonwebtoken');

//
// MIDDLEWARE
//

// Set our static page location
app.use(express.static(__dirname + '/public'));
// Session stuff
app.use(cookieParser(config.sessionSecret));
app.use(session({secret: config.sessionSecret, key: 'anarchatter.sid'}));
// Set up our Views
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
// Need this to access POST data
app.use(bodyParser());

// My HTTPS Middleware
if (config.protocol === 'https') {
  app.use(function(req, res, next) {
    if (req.secure) {
      // Good to go
      next();
    }
    else {
      // Redirect to HTTPS
      res.redirect('https://' + req.host + req.url);
    }
  });
}

// My JSON Web Token Middleware
app.use(function(req, res, next) {
  var profile = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@doe.com',
    id: 123
  };

  req.jwToken = jwt.sign(profile, config.jwtSecret, { expiresInMinutes: 60*5 })
  next();
});

//
// ROUTES/REQUESTS
//

// Render homepage
app.get('/', function(req, res) {
  res.render('index', {
    title : 'Anarchatter - Home',
    jwToken : req.jwToken
  });
});

// Render embed chat room
app.get('/embed/:room', function(req, res) {
  model.getHomestead(req, res, { embed : true });
});
// Render embed chat room
app.post('/embed/:room', function(req, res) {
  model.getHomestead(req, res, { embed : true });
});
// Render chat room
app.get('/:room', function(req, res) {
  model.getHomestead(req, res, { embed : false });
});
// Render chat room
app.post('/:room', function(req, res) {
  model.getHomestead(req, res, { embed : false });
});

//
// LISTEN SERVER
//

// Start HTTPS Web Server if needed
if (config.protocol === 'https') {
  // Require https
  var https = require('https');
  // HTTPS options
  var options = {
    key: fs.readFileSync(config.ssl.key).toString(),
    cert: fs.readFileSync(config.ssl.cert).toString()
  };
  // Start the HTTPS server
  var httpsServer = https.createServer(options, app).listen(config.httpsPort, config.host);
}

// Start HTTP Server
var httpServer = http.createServer(app).listen(config.httpPort, config.host);

//
// SOCKET.IO
//

if (config.protocol === 'https') {
  var socket = require('./socket')(httpsServer, model, config);
}
else {
  var socket = require('./socket')(httpServer, model, config);
}

//
// LOG STARTUP
//

console.log('Chat server running. Listening on ' + config.host + ':' + config.currentPort() + ' over ' + config.protocol);
