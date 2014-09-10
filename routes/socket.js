
var io;
exports.initialize = function(server){
    io = require('socket.io').listen(server);
    io.sockets.on('connection', function (socket) {
        console.log('socket connected successfully');
        socket.on('widgetupdated', function (data) {
            socket.broadcast.emit('widgetupdated' + data.widgetId, data);
        });

        socket.on('widgetcreated', function (data) {
            socket.broadcast.emit('widgetcreated' + data.dashboardId, data);
        });
        socket.on('widgetremoved', function (data) {
            socket.broadcast.emit('widgetremoved' + data.widgetId, data);
        });
	});
}