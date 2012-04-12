var playerID = null,
	totalSkew = 0;

// Setup socket.io connection
var socket = io.connect('http://192.168.1.68:3050');

// Setup game
var game = new Game();

// Setup renderer
var renderer = new Renderer({
	id: 'game',
	game: game
});

// Setup sound manager
soundManager.url = '/js/client/swf';
soundManager.flashVersion = 9;
//soundManager.useHTML5Audio = true;
soundManager.useFlashBlock = false;
soundManager.onready(function() {
	console.log('Soundmanager ready');
});

// Setup event handler
var handler = new EventHandler();

// Setup input handler
var input = new Input({
	game: game,
	renderer: renderer
});

// Setup user command ticker
var sampleTicker = new Timer(game.CMD_RATE, function(date) {
	input.sample();
});

// Setup user command ticker
var cmdTicker = new Timer(game.CMD_RATE, function(date) {
	var data = input.flushSamples();

	// Only send data if we have any
	if(data.length) {
		// Send the user command
		socket.emit('usercmd',
			{ id: playerID, timeStamp: Date.now(), cmd: data }
		);

		// Queue the command (Client side prediction takes place)
		game.queueCommand(playerID, data);
	}
});


// Get initial game state
socket.on('start', function(data) {
	console.log('recv state', data.state);

	// Calculate initial skew
	var startDelta = Date.now() - data.state.timeStamp;

	// Load initial game state
	game.load(data.state, false);

	// Start game and renderer
	//renderer.start();

	// join the game
	socket.emit('join', {
		name: 'Craig' + Math.floor(Math.random() * 100)
	});
});

// A new client has joined
socket.on('join', function(data) {
	console.log('recv join', data);

	// Join the game
	var p = game.join(data.name, data.player);

	// If it's me, store the reference
	if(data.isMe === true) {
		playerID = data.name;
		game.me = p;
	}

	// Start the input sampler
	sampleTicker.start();
	cmdTicker.start();
});

// A client as left the game
socket.on('leave', function(data) {
	console.log('recv leave', data);

	game.leave(data.name);
});

// Load game state when recieved
socket.on('state', function(data) {
	game.load(data.state);
});

// Merge game delta when recieved
socket.on('delta', function(data) {
	game.delta(data.state);
	renderer.render();
});

// Handle errors
socket.on('error', function(data) {
	if(data.code === err.NICKINUSE) {
		console.error('recv error', 'Nickname in use!');
	}
	else {
		console.error('recv error');
		console.log(data);
	}
})