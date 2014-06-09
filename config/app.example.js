module.exports = {
  host:       "localhost",
  httpPort:   "8080",
  httpsPort:  "8081",
  protocol:   "http",

  currentPort: (function() {
    return module.exports.protocol === 'https' ? module.exports.httpsPort : module.exports.httpPort
  })(),

  ssl: {
    key:  "/path/to/priate/key",
    cert: "/path/to/certificate"
  },

  sessionSecret:  "CHANGEME",
  jwtSecret:      "CHANGEME",

  mongo: {
    host:   "localhost",
    port:   "27017",
    dbname: "changeme",
    user:   "changeme",
    pass:   "changeme"
  }
}
