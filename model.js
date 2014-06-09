module.exports = function Model(_config) {

  var mongo = require('mongoskin'),
      crypto = require('crypto');

  // Init the Model Object
  var DB = (function init() {
    var DB = mongo.db('mongodb://' + _config.mongo.user + ':' + _config.mongo.pass + '@' + _config.mongo.host + ':' + _config.mongo.port + '/' + _config.mongo.dbname);
    return DB;
  })();

  // Get the last 100 messages from this chat
  this.getChatHistory = function(socket, data, clients) {
    DB.collection('chat').find(
      { namespace : clients[socket.id].namespace },
      { limit : 100, sort : [['datetime', 1]] }
    ).toArray(function (err, result) {
      socket.emit('initChatHistory', { chatHistory : result });
    });
  };

  // Save chat message to DB
  this.saveChat = function(socket, data, clients) {
    DB.collection('chat').insert({
      socketid : data.id,
      username : data.username,
      message : data.message,
      namespace : clients[socket.id].namespace,
      again : data.again,
      datetime : new Date()
    }, function() {});
  };
  
  // Change user's username
  this.changeName = function(socket, data, clients) {
    DB.collection('user').find({
      username : data.username
    }).toArray(function(err, result) {
      if (typeof result !== 'undefined' && result.length === 0) {
        clients[socket.id].username = data.username;
        socket.broadcast.to(clients[socket.id].namespace).emit('changeUser', data);
        socket.emit('changeName', data);
        socket.emit('loginSuccess', data);
      }
      else {
        socket.emit('popError', { html : 'Bummer! <strong>' + data.username + '</strong> is already taken.' });
      }
    });
  };
  
  // Add homestead to DB
  this.addHomestead = function(socket, data, clients) {
    DB.collection('homestead').find({
      namespace : clients[socket.id].namespace
    }).toArray(function(err, result) {
      if (typeof result !== 'undefined' && result.length === 0) {
        DB.collection('homestead').insert({
          namespace : clients[socket.id].namespace,
          password :  hashPassword(data.password),
          host : data.host,
          datetime : new Date()
        }, function() {});
        var html = 'Congratulations! Your homestead has been secured';
        if (data.host !== "") {
          var embed = '<iframe src="' + config.protocol + '://' + _config.host + ':' + _config.currentPort() + '/embed/' + clients[socket.id].namespace + '" width="100%" height="600px"></iframe>';
          html += ' for <strong>' + data.host + '</strong>. Use this html to put this chat room in your web site:';
        }
        socket.emit('homesteadSuccess', { html : html, embed : embed });
      }
      else {
        socket.emit('homesteadError', { html : 'Bummer! <strong>' + data.namespace + '</strong> is already a homestead' });
      }
    });
  };
  
  // See if homestead is in DB
  this.getHomestead = function(req, res, data) {
    var room = req.params.room;
    var password = hashPassword(req.body.password);
    DB.collection('homestead').find({
        namespace : room
    }).toArray(function(err, result) {
        if (typeof result !== 'undefined' && result.length === 0) {
          res.render('chat', {
            title : 'Anarchatter - ' + room,
            homestead : {
              color : 'green',
              private : false,
              password : false,
              host : false
            },
            room : room,
            embed : data.embed,
            jwToken : req.jwToken
          });
        }
        else if (typeof result !== 'undefined' && result.length === 1) {
          if (password === result[0].password || result[0].password === '') {
            res.render('chat', {
              title : 'Anarchatter - ' + room,
              homestead : {
                color : 'red',
                private : true,
                password : true,
                host : result[0].host
              },
              room : room,
              embed : data.embed,
              jwToken : req.jwToken
            });
          }
          else {
            res.render('verifyChat', {
              title : 'Anarchatter - Verify Chat',
              homestead : {
                host : result[0].host
              },
              room : room,
              embed : data.embed,
              jwToken : req.jwToken
            });
          }
        }
        else {
          console.log('fuck : ' + err);
        }
      });
  };
  
  // Add homestead to DB
  this.createAccount = function(socket, data, clients) {
    DB.collection('user').find({
      username : data.username
    }).toArray(function(err, result) {
      if (typeof result !== 'undefined' && result.length === 0) {
        DB.collection('user').insert({
          username : data.username,
          password : hashPassword(data.password),
          datetime : new Date()
        }, function() {});
        var html = 'Congratulations! You are now the proud owner of username <strong>' + data.username + '</strong>';
        socket.emit('popSuccess', { html : html, username : data.username });
        socket.emit('changeName', data);
        socket.broadcast.to(clients[socket.id].namespace).emit('changeUser', data);
      }
      else {
        socket.emit('popError', { html : 'Bummer! <strong>' + data.username + '</strong> is already taken.' });
      }
    });
  };
  
  // Change user's username
  this.loginAccount = function(socket, data, clients) {
    DB.collection('user').find({
      username : data.username,
      password : hashPassword(data.password)
    }).toArray(function(err, result) {
      delete data.password;
      if (typeof result !== 'undefined' && result.length === 1) {
        clients[socket.id].username = data.username;
        socket.broadcast.to(clients[socket.id].namespace).emit('changeUser', data);
        socket.emit('changeName', data);
        socket.emit('loginSuccess');
      }
      else {
        socket.emit('popError', { html : 'The credentials you entered to not match an account' });
      }
    });
  };
  
  var hashPassword = function(pass) {
    if (typeof pass !== 'undefined' && pass !== '') {
      var sha = crypto.createHash('sha256');
      sha.update(pass, 'utf8');
      pass = sha.digest('hex');
    }
    return pass;
  };
};
