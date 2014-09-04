
var io;
exports.initialize = function(server){
    io = require('socket.io').listen(server);
    io.sockets.on('connection', function (socket) {
        //_socket = s;
        console.log('socket connected successfully');
        socket.on('widgetupdated', function (data) {
            console.log('widgetupdated');
            console.log(data);
            socket.broadcast.emit('widgetupdated', data);
        });

        socket.on('widgetcreated', function (data) {
            console.log('widgetcreated');
            console.log(data);
            socket.broadcast.emit('widgetcreated', data);
        });
	});
}
// exports.emitEvent = function(eventName, data){
// 	//console.log(data);
//     _socket.broadcast.emit(eventName, data);
// }
