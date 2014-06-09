if(typeof String.prototype.trim !== 'function') {
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, ''); 
  }
}

$(document).on('submit', '#room-form', function(e) {
  e.preventDefault();
  var newRoom = $('#room-input').val().trim();

  if (newRoom != '') {
    window.location.href = '/' + newRoom;
  }
});
