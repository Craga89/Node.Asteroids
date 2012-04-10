var io = require('socket.io').listen(3050),
	Level = require('./level').Level,
	Game = require('../common/engine').Game,
	err = require('../common/errors').err,
	sequence = require('../common/sequence').Sequence;

// Setup game and level instances
var game = new Game();
var level = new Level({
	width: game.WIDTH,
	height: game.HEIGHT
});

// Set low log level to get rid of debug messages
io.set('log level', 1);

// Load the generated level game state
game.load( level.generate() );

// Set tick callback
game.onTick = function() {
	io.sockets.emit('state', {
		timeStamp: (Date.now()).valueOf(),
		state: game.save()
	});
}

// Initialise game loop
game.start();

// Setup connection handler
io.sockets.on('connection', function(socket) {
	var timeSync, player = null;

	socket.emit('start', {
		state: game.save()
	});

	socket.on('state', function() {
		socket.emit('state', {
			state: game.save()
		});
	});

	socket.on('join', function(data) {
		console.log('revc join', data);

		// Make sure player doesn't already exist
		if(player && game.playerExists(player.id) > -1) {
			socket.emit('error', {
				code: err.NICKINUSE,
				error: 'Name already in use'
			});

			return;
		}

		// Join the game and apply timeStamp
		data.player = player = game.join(data.name);
		data.timeStamp = new Date();

		// Broadcast new player to others
		socket.broadcast.emit('join', data);

		// Set flag and emit join
		data.isMe = true;
		socket.emit('join', data);
	});

	socket.on('disconnect', function(data) {
		console.log('recv disconnect', data);

		game.leave(player.id);

		socket.broadcast.emit('leave', {
			name: player.id,
			timeStamp: Date.now()
		});
	});

	/**
	 * Movement actions
	 */
	socket.on('usercmd', function(data, ack) {
		// Queue the commands
		game.queueCommand(data.id, data.cmd);

		// Acknowledge receipt
		ack();
	});
});