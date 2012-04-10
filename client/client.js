// Setup socket.io connection
var socket = io.connect('http://localhost:3050');

// Setup game, renderer and input handler
var player = null,
	totalSkew = 0;

var game = new Game();
var renderer = new Renderer({
	id: 'game',
	game: game
});

var input = new Input({
	game: game,
	socket: socket
});

// Setup on tick callback
game.onTick = function(date) {
	// Sample our inputs
	//input.sample(date);
}

var sampleTimer = new Timer(game.TICK_RATE, function(date) {
	input.sample(date);
})



// Get initial game state
socket.on('start', function(data) {
	console.log('recv state', data.state);

	// Load initial game state
	game.load(data.state);

	// Calculate initial skew
	var startDelta = (new Date()).valueOf() - data.state.timeStamp;

	// Start game and input sampler
	//game.start(startDelta);
	sampleTimer.start();
	cmdTicker.start();

	// Start the renderer
	renderer.render();

	// join the game
	socket.emit('join', {
		name: 'Craig' + Math.floor(Math.random() * 100)
	});
});

// Load game state when recieved
socket.on('state', function(data) {
	game.load(data.state);
});

// A new client has joined
socket.on('join', function(data) {
	console.log('recv join', data);

	var p = game.join(data.name, data.player);

	// If it's me, store the reference
	if(data.isMe === true) {
		game.me = (player = p).id;
	}
});

// A client as left the game
socket.on('leave', function(data) {
	console.log('recv leave', data);

	game.leave(data.name);
});

// Keep the local game state in sync with the server
socket.on('sync', function(data) {
	// Calculate how we've come out of sync from the server
	var updateDelta = data.lastUpdate - game.state.timeStamp;

	// Keep track of the overall skew
	totalSkew += updateDelta;

	// If the skew is too large, get the real state from the server
	if(Math.abs(totalSkew) > game.MAX_LATENCY) {
		game.interpolate = updateDelta;

		socket.emit('state');
		totalSkew = 0;
	}
});

socket.on('error', function(data) {
	if(data.code === err.NICKINUSE) {
		console.error('recv error', 'Nickname in use!');
	}
	else {
		console.error('recv error', data);
	}
})


// Setup user command ticker
var cmdTicker = new Timer(game.CMD_RATE, function(date) {
	var data = input.flushSamples();

	data.length && socket.emit('usercmd', { id: player.id, cmd: data }, function() {
		game.queueCommand(data);
	});
});