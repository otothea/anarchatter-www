$(document).ready(function() {
        
  var hostname = (function() {
    if (parent !== window) {
      var $a = $('<a>');
      $a.prop({ href : document.referrer });
      return $a.prop('hostname').replace('www.', '');
    }
    else {
      return false;
    }
  })();
  
  if (host === hostname || host === 'false' || host === '' || ! hostname) {

    /*******************

        USER OBJECT

    *******************/

    // Create our User object   
    var user = new function User() {
      this.username = null;

      var namespace = room;
      this.namespace = namespace !== null ? namespace : '';

      // Join the room's socket namespace
      this.joinNamespace = function() {
        chat.emit('joinNamespace', { namespace : this.namespace });
      };

      // Create and register the users name
      this.initUsername = function() {
        var idArray = [],
          possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        for( var i=0; i < 5; i++ ) {
          idArray.push(possible.charAt(Math.floor(Math.random() * possible.length)));
        }
        var id = idArray.join('');

        this.username = 'Guest-' + id;
        $('#chat-username').text(this.username);
        userBox.addSelf({ username : this.username });
        chatBox.printUpdate('You have connected to the <strong>' + this.namespace + '</strong> chat room');
        chat.emit('setName', { username : this.username });
      };

      // Change the user's name
      this.changeUsername = function(newName) {
        if (typeof newName !== 'undefined' && newName !== '') {
          chat.emit('changeName', {
            username : newName,
            oldUsername : this.username
          });
        }
      };
    }


    /*******************

       CHATBOX OBJECT

    *******************/

    var chatBox = new function ChatBox() {
      // Create the chat box element
      this.el = $('#chat-box');
      
      // Print a chat message
      this.printMessage = function(data) {
        if (typeof userBox.muteList[data.id] === 'undefined') {
          var $li = $('<li>').addClass('chat-message');
          if (data.username === user.username) $li.addClass('my-message'); 
          $li.append('<span class="message-username" data-id="' + data.id + '">' + data.username + '</span>');
          $li.append('<p class="message-text" data-id="' + data.id + '">' + data.message + '</p>');
          $('#chat-list').append($li);
          $li.gemoticon();
          this.scrollChat();
        }
      };
      
      // Print a private chat message
      this.printPrivateMessage = function(data) {
        if (typeof userBox.muteList[data.fromid] === 'undefined') {
          var $li = $('<li>').addClass('chat-message private');
          $li.append('<span class="message-username" data-id="' + data.fromid + '">Private Message From ' + data.fromusername + '</span>');
          $li.append('<p class="message-text" data-id="' + data.fromid + '">' + data.message + '</p>');
          $('#chat-list').append($li);
          $li.gemoticon();
          this.scrollChat();
        }
      };

      // Print a chat message
      this.printMessageAgain = function(data) {
        if (typeof userBox.muteList[data.id] === 'undefined') {
          var $li = $('<li>').addClass('chat-message borderless');
          if (data.username === user.username) $li.addClass('my-message'); 
          $li.append('<p class="message-text">' + data.message + '</p>');
          $('#chat-list').append($li);
          $li.gemoticon();
          this.scrollChat();
        }
      };

      // Print a chat update
      this.printUpdate = function(msg) {
        var $li = $('<li>').addClass('chat-update');
        $li.html(msg);
        $('#chat-list').append($li);
        this.scrollChat();
      };

      // Auto scroll chat function
      this.scrollChat = function() {
        var inner = $('#chat-list');
        this.el.prop({ scrollTop: inner.outerHeight() });
      };
    }


    /*******************

       USERBOX OBJECT

    *******************/

    var userBox = new function UserBox() {
      // set the userbox element
      this.el = $('#user-box');

      // Initialize the muteList
      this.muteList = {};

      // Add self to user box
      this.addSelf = function(data) {
        var $li = $('<li>').addClass('user-item self');
        $li.html('<strong>' + data.username + '</strong>');

        $('#user-list').prepend($li);
        chatBox.scrollChat();
      };

      // Add self to user box
      this.changeSelf = function(data) {
        $('.user-item.self').html('<strong>' + data.username + '</strong>');
      };

      // Add user to user box
      this.addUser = function(data) {
        var $li = $('<li>').addClass('user-item');
        $li.attr('id', data.id);
        $i = $('<i>').addClass('mute icon-thumbs-down red');
        $li.append($i);
        $span = $('<span>').text(data.username);
        $li.append($span);

        $('#user-list').append($li);
        chatBox.scrollChat();
      };

      // Remove user from user box
      this.removeUser = function(data) {
        $('.user-item#' + data.id).remove();
      };

      // Change user name in user box
      this.changeUser = function(data) {
        $('.user-item#' + data.id + ' span').text(data.username);
      };
      
      // Mute the selected user
      this.muteUser = function(id) {
        $('.user-item#' + id).addClass('mute');
        this.muteList[id] = true;
      };
      
      // Unmute the selected user
      this.unmuteUser = function(id) {
        $('.user-item#' + id).removeClass('mute');
        delete this.muteList[id];
      };
    }


    /*******************

        CHAT SOCKET

    *******************/

    if (config.protocol === 'https') {
      var chat = io.connect('https://' + config.host + ':' + config.httpsPort + '/chat', { query: 'token='+jwToken, secure: true });
    }
    else {
      var chat = io.connect('http://' + config.host + ':' + config.httpPort + '/chat', { query: 'token='+jwToken });
    }
    chat.once('connect', function(socket) {

      /*******************

          CHAT EVENTS

      *******************/

      // On init chat history
      chat.on('initChatHistory', function(data) {
        chatBox.el.find('li.chat-message').remove();
        for (var i in data.chatHistory) {
          data.chatHistory[i].id = data.chatHistory[i].socketid;
          if ( ! data.chatHistory[i].again) {
            chatBox.printMessage(data.chatHistory[i]);
          }
          else {
            chatBox.printMessageAgain(data.chatHistory[i]);
          }
        }
        user.initUsername();
      })
      // On init user list
      .on('initUserList', function(data) {
        userBox.el.find('li.user-item').remove();
        for (var i in data.userList) {
          userBox.addUser(data.userList[i]);
        }
      })
      // When the user successfully changes their name
      .on('changeName', function(data) {
        data.username = data.username.trim();
        user.username = data.username;
        
        $('#chat-username').text(user.username);
        userBox.changeSelf({ username : user.username });
        chatBox.printUpdate('You have changed your name from <strong>' + data.oldUsername + '</strong> to <strong>' + user.username + '</strong>');
      })
      // On recieve chat message
      .on('recieve', function(data) {
        chatBox.printMessage(data);
      })
      // On recieve chat message from same user again
      .on('recieveAgain', function(data) {
        chatBox.printMessageAgain(data);
      })
      .on('privateMessage', function(data) {
        chatBox.printPrivateMessage(data);
      })
      // On new user joined the chat
      .on('newUser', function(data) {
        chatBox.printUpdate('<strong>' + data.username + '</strong> has joined the chat');
        userBox.addUser(data);
      })
      // On user has changed their name
      .on('changeUser', function(data) {
        chatBox.printUpdate('<strong>' + data.oldUsername + '</strong> has changed their name to <strong>' + data.username + '</strong>');
        userBox.changeUser(data);
      })
      // On user has left the chat
      .on('leaveUser', function(data) {
        chatBox.printUpdate('<strong>' + data.username + '</strong> has left the chat');
        userBox.removeUser(data);
      })
      // On pop up success message
      .on('popSuccess', function(data) {
        $('#transparent-pop form').hide();
        $('form#success-pop').html(data.html).show();
      })
      // On pop up error message
      .on('popError', function(data) {
        $('#transparent-pop form').hide();
        $('form#error-pop').html(data.html).show();
      })
      // On log in success
      .on('loginSuccess', function(data) {
        $('#transparent-pop, #transparent-pop form').fadeOut(200);
      });

      // Handle homestead form submission results
      var $homesteadForm = $('#homestead-form'),
      $homesteadFlag = $('#homestead-flag');
      chat.on('homesteadSuccess', function(data) {
        $homesteadForm.text('');
        $homesteadForm.addClass('green');
        
        var $p1 = $('<p>' + data.html + '</p>');
        $homesteadForm.append($p1);
        
        if (typeof data.embed !== 'undefined') {
          var $p2 = $('<p>');
          $p2.text(data.embed);
          $p2.css({
            'margin' : '10px 0 0 20px',
            'font-style' : 'italic'
          });
          $homesteadForm.append($p2);
        }
        
        $homesteadForm.show();
        $homesteadFlag.removeClass('green');
        $homesteadFlag.addClass('red');
      })
      .on('homesteadError', function(data) {
        $homesteadForm.addClass('red');
        $homesteadForm.html(data.html);
        $homesteadForm.show();
      });


      /*******************

        UI FUNCTIONALITY

      ********************/

      // Homestead room
      $homesteadFlag.on('click', function(e) {
        if ($(this).hasClass('show')) {
          $(this).removeClass('show');
          $homesteadForm.hide();
        }
        else {
          $(this).addClass('show');
          $homesteadForm.show();
          $('#homestead-password').focus();
        }
      });

      // Submit Homestead form
      $homesteadForm.on('submit', function(e) {
        e.preventDefault();
        var password = $('#homestead-password').val().trim(),
            host = $('#homestead-host').val().trim();

        chat.emit('addHomestead', { password : password, host : host });
        $(this).text('securing homestead...');
      });
      
      /******************/
      /*     POPUPS     */
      
        // Parse submitted video url and
        // submit if valid youtube or vimeo link
        function parseVideoUrl(data) {
          data.match(/https?:\/\/(player.|www.)?(vimeo\.com|youtu(be\.com|\.be))\/(video\/|embed\/|watch\?v=)?([A-Za-z0-9._%-]*)(\&\S+)?/);
          var match = {
            embed: null,
            url: RegExp.$2,
            id: RegExp.$5
          }
          if (match.url == 'youtube.com' || match.url == 'youtu.be') {
            $.ajax({
              url: 'https://gdata.youtube.com/feeds/api/videos/' + match.id + '?v=2',
              timeout: 5000,
              success: function(){
                match.embed = 'https://youtube.com/embed/' + match.id;
                var message = '<iframe src="' + match.embed + '" width="360" height="200" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>';
                submitChat(message, true);
              },
              error: function() {
                alert('That is not a valid YouTube url');
              }
            });
          }
          else if (match.url == 'vimeo.com') {
            $.ajax({
              url: 'https://vimeo.com/api/v2/video/' + match.id + '.json',
              timeout: 5000,
              dataType: 'jsonp',
              success: function(){
                match.embed = 'https://player.vimeo.com/video/' + match.id;
                var message = '<iframe src="' + match.embed + '" width="360" height="200" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>';
                submitChat(message, html);
              },
              error: function() { 
                alert('That is not a valid YouTube url');
              }
            });
          }
          else {
            alert('That is not a valid YouTube or Vimeo url');
          }
        }
        // On click video link button
        $('.film').on('click', function() {
          $('#transparent-pop').stop().fadeIn();
          $('#transparent-pop #film-pop').stop().fadeIn();
          $('#transparent-pop #film-pop input').focus();
        });
        // When the video link popup is submitted
        $('#film-pop').on('submit', function(e) {
          e.preventDefault();
          $('#transparent-pop').stop().fadeOut();
          $('#transparent-pop #film-pop').stop().fadeOut();
          var url = $('#film-input-pop').val().trim();
          if (url !== '' && url !== null) {
            parseVideoUrl(url);
          }
        });

        // On click link button
        $('.link').on('click', function() {
          $('#transparent-pop').stop().fadeIn();
          $('#transparent-pop #link-pop').stop().fadeIn();
          $('#transparent-pop #link-pop input').focus();
        });
        // When the link popup is submitted
        $('#link-pop').on('submit', function(e) {
          e.preventDefault();
          $('#transparent-pop').stop().fadeOut();
          $('#transparent-pop #link-pop').stop().fadeOut();
          var link = $('#link-input-pop').val().trim();
          if(/^([a-z]([a-z]|\d|\+|-|\.)*):(\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?((\[(|(v[\da-f]{1,}\.(([a-z]|\d|-|\.|_|~)|[!\$&'\(\)\*\+,;=]|:)+))\])|((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=])*)(:\d*)?)(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*|(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)){0})(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(link)) {
            var message = '<a target="new" href="' + link + '">' + link + '</a>';
            submitChat(message, true);
          }
          else {
            alert('That is not a valid link url');
          }
        });

        // On click picture link button
        $('.picture').on('click', function() {
          $('#transparent-pop').stop().fadeIn();
          $('#transparent-pop #picture-pop').stop().fadeIn();
          $('#transparent-pop #picture-pop input').focus();
        });
        // When the picture link popup is submitted
        $('#picture-pop').on('submit', function(e) {
          e.preventDefault();
          $('#transparent-pop').stop().fadeOut();
          $('#transparent-pop #picture-pop').stop().fadeOut();
          var link = $('#picture-input-pop').val().trim();
          if (config.protocol === 'https') {
            link = link.replace('http://', 'https://');
          }
          $("<img>", {
            src: link,
            error: function() {
              alert('That is not a valid image url');
            },
            load: function() {
              var message = '<a target="new" href="' + link + '"><img src="' + link + '" width="360" height="auto" /></a>';
              submitChat(message, true);
            }
          });
        });
        
        // Change username
        $(document).on('click', '.user-item.self', function(e) {
          $('#transparent-pop').stop().fadeIn();
          $('#transparent-pop #name-pop').stop().fadeIn();
          $('#transparent-pop #name-pop input').focus();
        });
        // When the name popup is submitted
        $('form#name-pop').on('submit', function(e) {
          e.preventDefault();
          var name = $('#name-input-pop').val().trim();
          
          if (name !== '') {
            $('form#name-pop').hide();
            $('form#message-pop').text('Checking username availability...').show();
            user.changeUsername(name);
          }
        });
        
        // Click transparent bg to close popups
        $(document).on('click', '#transparent-pop', function(e) {
          if ( ! $(e.target).is('#transparent-pop *')) {
            $(this).find('form').stop().fadeOut();
            $(this).stop().fadeOut();
          }
        })
        // Press escape key closes popups
        .on('keyup', function(e) {
          if (e.keyCode === 27) {
            $('#transparent-pop').find('form').stop().fadeOut();
            $('#transparent-pop').stop().fadeOut();
            $('#private-message-form').hide();
          }
        });
        
        // On click create account link
        $('a.create-account').on('click', function(e) {
          e.preventDefault();
          $('form#name-pop').fadeOut(200, function() {
            $('form#account-pop').fadeIn(200);
            $('#account-name-pop').focus();
          });
        });
        // When the create account popup is submitted
        $('form#account-pop').on('submit', function(e) {
          e.preventDefault();
          var oldName = user.username,
              name = $('#account-name-pop').val().trim(),
              pass = $('#account-password-pop').val().trim(),
              confirm = $('#account-confirm-pop').val().trim();
          
          if (name !== '' && pass !== '' && pass === confirm) {
            $('form#account-pop').hide();
            $('form#message-pop').text('Creating your account...').show();
          
            chat.emit('createAccount', { username : name, password : pass, oldUsername : oldName });
          }
        });

        // On click create account link
        $('a.login').on('click', function(e) {
          e.preventDefault();
          $('form#name-pop').fadeOut(200, function() {
            $('form#login-pop').fadeIn(200);
            $('#login-name-pop').focus();
          });
        });
        // When the login popup is submitted
        $('form#login-pop').on('submit', function(e) {
          e.preventDefault();
          var name = $('#login-name-pop').val().trim(),
              pass = $('#login-password-pop').val().trim();
          
          if (name !== '' && pass !== '') {
            chat.emit('loginAccount', {
              username : name,
              password : pass,
              oldUsername : user.username
            });
        
            $('form#login-pop').hide();
            $('form#message-pop').text('Logging you in...').show();
          }
        });
        
        // When login back button is clicked
        $('#login-pop .back-arrow').on('click', function(e) {
          e.preventDefault();
          $('#transparent-pop #login-pop').fadeOut(200, function() {
            $('#name-pop').fadeIn(200);
            $('#name-input-pop').focus();
          });
        });
        // When account back button is clicked
        $('#account-pop .back-arrow').on('click', function(e) {
          e.preventDefault();
          $('#transparent-pop #account-pop').fadeOut(200, function() {
            $('#name-pop').fadeIn(200);
            $('#name-input-pop').focus();
          });
        });
        
        // When a form is submitted
        $('#transparent-pop form').on('submit', function() {
          $('#transparent-pop input').val('');
        });
      
      /*    END POPUPS    */
      /********************/
      
      /***********************/
      /*     SUBMIT CHAT     */

        // Submit a chat message
        var submitChat = function(message, html) {
          var message = message.trim();
          if (message !== '') {
            var data = {
              message : message,
              username : user.username,
              html : html
            };

            $('#chat-input').val('');
            chat.emit('send', data);
          }
        };

        // When user presses enter in chat input
        $('#chat-input').on('keypress', function(e) {
          if (e.which === 13 && ! e.shiftKey) {
            e.preventDefault();
            submitChat($('#chat-input').val());
          }
        });

        // On send chat message
        $('#chat-form').on('submit', function(e) {
          e.preventDefault();
          submitChat($('#chat-input').val());
        });
      
      /*    END SUBMIT CHAT    */
      /*************************/
          
      /***********************/
      /*     PRIVATE CHAT    */
          
        // Submit a chat message
        var submitPrivateMessage = function(message) {
          var message = message.trim();
          if (message !== '') {
            var socketid = $('#user-options').attr('class');
            var data = {
              toid : socketid,
              tousername : $('.user-item#' + socketid).find('span').text(),
              message : message
            };

            chat.emit('privateMessage', data);
            $('#private-message-text').val('');
          }
        };
        
        // On click to private message user
        $(document).on('click', '.option-item.private-message', function() {
          var socketid = $('#user-options').attr('class');
          var name = $('.user-item#' + socketid).find('span').text();
          
          $('#private-message-form p strong').text(name);
          $('#private-message-form').show();
          $('#private-message-text').focus();
        })
        .on('submit', '#private-message-form', function(e) {
          e.preventDefault();
          var socketid = $('#user-options').attr('class');
          
          var message = $('#private-message-text').val();
          submitPrivateMessage(message);
        });
        // When user presses enter in the private chat input
        $('#private-message-text').on('keypress', function(e) {
          console.log('working');
          if (e.which === 13 && ! e.shiftKey) {
            e.preventDefault();
            var message = $('#private-message-text').val();
            submitPrivateMessage(message);
          }
        });

        // On click username in chat-box
        // select that user in the user-box
        $(document).on('click', '.message-username' ,function() {
          var id = $(this).data('id');
          $('.user-item#' + id).trigger('click');
        });
          
      /*    END PRIVATE CHAT    */
      /**************************/
      
      /************************/
      /*     USER OPTIONS     */

        // UserList options
        $(document).on('click', '.user-item', function() {
          if ( ! $(this).hasClass('self')) {
            var userOpts = $('#user-options');
            if ( ! $(this).hasClass('selected')) {
              $('.user-item').removeClass('selected');
              $(this).addClass('selected');
              userOpts.attr('class', $(this).attr('id'));
              userOpts.stop().slideDown();
            }
            else {
              $('.user-item').removeClass('selected');
              userOpts.stop().slideUp();
            }
          }
        });

        // On click to mute user
        $(document).on('click', '.option-item.mute', function() {
          var id = $('#user-options').attr('class');
          userBox.muteUser(id);
        });
        // On click to UNmute user
        $(document).on('click', '.option-item.unmute', function() {
          var id = $('#user-options').attr('class');
          userBox.unmuteUser(id);
        });
          
      /*   END USER OPTIONS    */
      /*************************/
      
      // Focus on text input
      if (embed === 'false') $('#chat-input').focus();


      /*******************

          WINDOW RESIZE

      *******************/
     
      $(window).on('resize', function() {
        // Resize chat input width
        var wrapWidth = $('#chat-wrap').outerWidth(),
            rightWidth = $('#chat-embed-icons').outerWidth(),
            newWidth = wrapWidth - rightWidth - 42;
        $('#chat-form, #chat-input').width(newWidth);
        
        // Resize chat box and user box heights
        var wrapHeight = $('#chat-wrap').outerHeight(),
            headerHeight = $('#chat-header').outerHeight(),
            controlsHeight = $('#chat-controls').outerHeight(),
            titleHeight = $('#chat-box-title').outerHeight(),
            newHeight = wrapHeight - (headerHeight + controlsHeight + titleHeight) - 23;
        chatBox.el.height(newHeight);
        userBox.el.height(newHeight);
      }).resize();
    })
    .on('connect', function(socket) {
      user.joinNamespace(); 
    });
  }
});
