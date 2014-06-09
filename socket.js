module.exports = function(server, model, config) {
  var cookieParser = require('cookie-parser'),
      connect = require('connect'),
      socketioJwt = require('socketio-jwt');
    
  // Initialize Websockets
  var io = require('socket.io').listen(server);

  // Authorize with express sessionID
  io.set('authorization', socketioJwt.authorize({
    secret: config.jwtSecret,
    handshake: true
  }));

  // Initialize array of clients
  var clients = {};
  var rooms = {};

  // Initialize Chat Namespace
  var chat = io
  // Add to chat namespace
  .of('/chat')
  // When a socket connects
  .on('connection', function(socket) {
    // Create new client
    // add express session id
    clients[socket.id] = {
      socket : socket
    };

    // On join chat namespace
    socket.on('joinNamespace', function(data) {
      // Create new room
      // if it doesn't exist
      if (typeof rooms[data.namespace] === 'undefined') {
        rooms[data.namespace] = {};
      }
      
      // Add namespace to client
      clients[socket.id].namespace = data.namespace;
      // Add socket id to the client
      clients[socket.id].id = socket.id;
      // Join the namespace room
      socket.join(data.namespace);

      // Get user list
      var userList = io.of('/chat').clients(data.namespace);
      // Create public user list
      var userListPublic = [];
      
      // For each user in this namespace
      // add them to the public user list
      for (var i in userList) {
        if (typeof userList[i] !== 'undefined') {
          var user = {};
          user.username = clients[userList[i].id].username;
          user.id = clients[userList[i].id].id;
          if (typeof user.username !== 'undefined') {
            userListPublic.push(user);
          }
        }
      }
      // Send init user list message
      // with the public user list
      socket.emit('initUserList', { userList : userListPublic });

      // Get the chat history
      model.getChatHistory(socket, {}, clients);

      // Update any sockets
      // on the index page
      updateIndex();
    });

    // Get the user's name
    socket.on('setName', function(data) {
      console.log(data.username + ' connected to chat');
      clients[socket.id].username = data.username;
      data.id = socket.id;
      socket.broadcast.to(clients[socket.id].namespace).emit('newUser', data);
    })
    // Change the user's name
    .on('changeName', function(data) {
      data.id = socket.id;
      model.changeName(socket, data, clients);
    });

    // Send a message
    socket.on('send', function(data) {
      // Strip html tags unless html is set
      if (typeof(data.html) === 'undefined') {
        data.message = data.message.replace(/(<([^>]+)>)/ig,"")
      }
      // Turn line break into <br/>
      data.message = data.message.replace(/\r?\n/g, '<br />');
      data.id = socket.id;
      
      // Check name against the last name sent
      var namespace = clients[socket.id].namespace;
      if (rooms[namespace].lastMessageName !== data.username) {
        chat.to(clients[socket.id].namespace).emit('recieve', data);
        data.again = false;
      }
      else {
        chat.to(clients[socket.id].namespace).emit('recieveAgain', data);
        data.again = true;
      }
      rooms[namespace].lastMessageName = data.username;

      // Log chat to DB
      model.saveChat(socket, data, clients);
    });
    
    // Send Private Message
    socket.on('privateMessage', function(data) {
      data.message = data.message.replace(/(<([^>]+)>)/ig,"").replace(/\r?\n/g, '<br />');
      data.fromid = socket.id;
      data.fromusername = clients[socket.id].username;
      clients[data.toid].socket.emit("privateMessage", data);
    });
    
    // Secure a homestead
    socket.on('addHomestead', function(data) {
      model.addHomestead(socket, data, clients);
    });
    
    // Create an account
    socket.on('createAccount', function(data) {
      data.id = socket.id;
      model.createAccount(socket, data, clients);
    });
    
    // Login to account
    socket.on('loginAccount', function(data) {
      data.id = socket.id;
      model.loginAccount(socket, data, clients);
    });

    // On disconnect
    socket.on('disconnect', function() {
      // Remove user from chat room user list
      chat.to(clients[socket.id].namespace).emit('leaveUser', {
        username : clients[socket.id].username,
        id : socket.id
      });
      // Remove user from clients array
      delete clients[socket.id];

      // Update any sockets
      // on the index page
      updateIndex();
    });
  });

  // Initialize Index Namespace
  var index = io
  // Add to chat namespace
  .of('/index')
  // When a socket connects
  .on('connection', function(socket) {
    // Get list of all rooms
    var roomList = typeof(io.rooms) != 'undefined' ? Object.keys(io.rooms) : [];
    // Create empty public array
    var roomListPublic = [];
    // For each room in roomList
    for (var i in roomList) {
      // Split the room name at '/'
      var r = roomList[i].split('/');
      // Create new room obj
      var room = {};
      // Add the room namespace
      room.namespace = r[2];
      // Add the number of chatters
      room.count = io.of('/chat').clients(room.username).length;
      // If the name is defined, push it to
      // the public room list array
      if (typeof room.namespace !== 'undefined') {
        roomListPublic.push(room);
      }
    }
    // Send the public room list
    // to the sockets on '/index'
    socket.emit('initRoomList', { roomList : roomListPublic });
  });

  // Initialize VerifyChat Namespace
  var verifyChat = io
  // Add to chat namespace
  .of('/verifyChat')
  // When a socket connects
  .on('connection', function(socket) {
    socket.on('verifyChat', function(data) {
      model.verifyHomestead(data);
    });
  });


  /*******************

    HELPER FUNCTIONS

  *******************/
 
  // Use this function to resend the updated
  // chat room info to the index page
  var updateIndex = function() {
    // Get list of all rooms
    var roomList = typeof(io.rooms) != 'undefined' ? Object.keys(io.rooms) : [];
    // Create empty public array
    var roomListPublic = [];
    // For each room in roomList
    for (var i in roomList) {
      // Split the room name at '/'
      var r = roomList[i].split('/');
      // Create new room obj
      var room = {};
      // Add the room namespace
      room.namespace = r[2];
      // Add the number of chatters
      room.count = io.of('/chat').clients(room.username).length;
      // If the name is defined, push it to
      // the public room list array
      if (typeof room.namespace !== 'undefined') {
        roomListPublic.push(room);
      }
    }
    // Send the public room list
    // to the sockets on '/index'
    index.emit('initRoomList', { roomList : roomListPublic });
  };
};
