var io = require('socket.io').listen(3050),
	Level = require('./level').Level,
	Game = require('../common/engine').Game,
	err = require('../common/errors').err,
	sequence = require('../common/sequence').Sequence;

// Setup game and level instances
var game = new Game();

// Fake lag
var fakeLag = 0;

// Set low log level to get rid of debug messages
io.set('log level', 1);

// Load the generated level game state
game.load( Level.generate(game) );

// Set tick callback
game.onTick = function(){
	// Send delta snapshot
	io.sockets.emit('delta', {
		timeStamp: Date.now(),
		state: game.deltaState
	});
}

// Initialise game loop
game.start();

// Add some random players
var count = 0;
game.schedule(function() {
	var t = this.addBot('Bot'+(Math.floor(Math.random() * 100) / 100));

	return count++ < 6
},
1000, true);


// Setup connection handler
io.sockets.on('connection', function(socket) {
	var timeSync, player = null;

	// Emit start event
	socket.emit('start', {
		state: game.save()
	});

	// Send state on request
	socket.on('state', function() {
		socket.emit('state', {
			state: game.save()
		});
	});

	socket.on('join', function(data) {
		console.log('revc join', data);

		// Make sure player doesn't already exist
		if(game.playerExists(data.name)) {
			socket.emit('error', {
				code: err.NICKINUSE,
				error: 'Name already in use'
			});

			return;
		}

		// Join the game and apply timeStamp
		data.player = player = game.join(data.name);
		data.timeStamp = Date.now();

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
	 *   Queue commands upon recieval
	 */
	socket.on('usercmd', function(data) {
		game.queueCommand(data.id, data.cmd);
	});
});