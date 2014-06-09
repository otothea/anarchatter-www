Anarchatter - Chat Server
===

### Server Config:

config/app.js:

    module.exports = {
      host:       "localhost",
      httpPort:   "8080",
      httpsPort:  "8081",
      protocol:   "http",

      currentPort: function() {
        return module.exports.protocol === 'https' ? module.exports.httpsPort : module.exports.httpPort
      },

      // Optional : remove for HTTP
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

### Client Config

public/js/config/client.js:

    module.exports = {
      host:       "localhost",
      httpPort:   "8080",
      httpsPort:  "8080",
      protocol:   "http"
    }

### Access server with port 80 with apache (useful if you already have apache running websites on the server)

Enable mod_proxy:

    a2enmod proxy

/etc/apache2/sites-available/anarchatter-www:

    <VirtualHost *:80>
      ServerName localhost

      ProxyRequests Off
      ProxyPreserveHost On

      <Proxy *>
        Order deny,allow
        Allow from all
      </Proxy>

      ProxyPass / http://localhost:8080/
      ProxyPassReverse / http://localhost:8080/

      <Location />
        Order allow,deny
        Allow from all
      </Location>
    </VirtualHost>

### Access server with port 443 with apache (useful if you already have apache running websites on the server)

Enable mod_proxy and mod_ssl:

    a2enmod proxy
    a2enmod ssl

/etc/apache2/sites-available/anarchatter-www:

    <VirtualHost *:80>
      ServerName localhost

      RewriteEngine on
      RewriteCond %{HTTP_HOST} ^localhost$ [NC]
      RewriteRule ^(.*)$ https://localhost$1 [R=301,L]
    </VirtualHost>

    <IfModule mod_ssl.c>
    <VirtualHost *:443>
      ServerName anarchatter.com
      ServerAlias dev.anarchatter.com

      SSLEngine on
      SSLProxyEngine on

      SSLCertificateFile /path/to/certificate
      SSLCertificateKeyFile /path/to/private/key

      ProxyRequests Off
      ProxyPreserveHost On

      <Proxy *>
        Order deny,allow
        Allow from all
      </Proxy>

      ProxyPass / https://localhost:8081/
      ProxyPassReverse / https://localhost:8081/

      <Location />
        Order allow,deny
        Allow from all
      </Location>
    </VirtualHost>
    </IfModule>

Enable the site in apache:

    a2ensite anarchatter-www
