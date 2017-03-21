var watson  = require('./watson');
var express = require('express');
var app     = express();
var port    = process.env.PORT || 8080;

var server  = app.listen(port, function () {
  var host  = server.address().address;
  var port  = server.address().port;
  console.log("Application is running at http://%s:%s", host, port)
});

app.use('/', express.static('public'));
app.use('/audio', express.static('audio'));

var io = require('socket.io')(server);
var ss = require('socket.io-stream');
io.on('connection', function (socket) {
  console.log("Connected");

  var context = {};
  socket.on('sendmsg', function (data) {
    watson.message(data.message, context, function(err, res){
      if(!err){
        // console.log(res);
        context = res.context;
        if (Array.isArray(res.output.text))
          conversation_response = res.output.text[0].trim();
        else conversation_response = undefined;

        if(conversation_response){
          if(data.type == 'audio'){
            var payload = {
              user    : "System",
              message : conversation_response,
              ts      : (new Date()).getTime(),
              type    : data.type,
            };
            var filename = 'msg'+payload.ts+'.wav';
            watson.text(conversation_response, filename, function() {
              payload.url = '/audio/'+filename;
              socket.emit('replymsg', payload);
            });
          } else {
            socket.emit('replymsg', {
              user    : "System",
              message : conversation_response,
              ts      : (new Date()).getTime()
            });
          }
        }
      }
    })
  });

  ss(socket).on('audio', function(stream, data) {
    watson.speech(stream, function(err){
      console.log('Error:', err);
    }, function(res){
      var transcript = res;
      socket.emit('audiomsg', {message: transcript, ts: data.ts});
      // console.log(JSON.stringify(res, null, 2));
    })
  });

});
