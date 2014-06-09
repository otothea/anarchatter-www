
/*******************

   RoomBox Object

*******************/

function RoomBox() {
  this.el = $('#chat-box');
  
  // Print a chat message
  this.printRoom = function(data) {
    var $a = $('<a href="/' + data.namespace + '">').append($('<li class="room-item">'));
    $a.find('li').html('<b>' + data.namespace + '</b> - ' + data.count + ' users chatting');
    $('#chat-list').append($a);
    this.scrollRoom();
  }

  // Auto scroll chat function
  this.scrollRoom = function() {
    this.el.prop({ scrollTop: this.el.prop("scrollHeight") - this.el.height() });
  };
}
var roomBox = new RoomBox();


/*******************

    Index Events

*******************/

if (config.protocol === 'https') {
  var index = io.connect('https://' + config.host + ':' + config.httpsPort + '/index', { secure: true, query: 'token='+jwToken });
}
else {
  var index = io.connect('http://' + config.host + ':' + config.httpPort + '/index', { query: 'token='+jwToken });
}        
index.once('connect', function(socket) {
  // On init chat history
  index.on('initRoomList', function(data) {
    roomBox.el.find('li').remove();
    var rList = data.roomList
    for (var i in rList) {
      roomBox.printRoom(rList[i]);
    }
  });

  $(window).on('resize', function() {
    // Resize chat box height
    var wrapHeight = $('#chat-wrap').outerHeight(),
        headerHeight = $('#chat-header').outerHeight(),
        titleHeight = $('#chat-box-title').outerHeight();
    roomBox.el.height(wrapHeight - (headerHeight + titleHeight) - 35);
  }).resize();
});
