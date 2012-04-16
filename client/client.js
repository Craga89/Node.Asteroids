var playerID = null,
	totalSkew = 0,
	timer;

// Setup socket.io connection
var socket = io.connect('http://192.168.1.68:3050');

// Setup event handler
var handler = new EventHandler({
	start: function() {

	},

	collision: function(id, id2) {
		var entity = this.getEntityById(id),
			entity2 = this.getEntityById(id2),
			warning = document.getElementById('warning');

		if(entity.subtype === 'player' ||
			entity2.subtype === 'player') {
			soundManager.play('collision');
		}

		warning.style.display = 'none';
	},

	collisionwarning: function(id, who, when) {
		var warning = document.getElementById('warning');

		warning.style.display = 'block';
		warning.innerHTML = 'Warning! Collision with ' + who + 'in ' + (when) + ' seconds!';
		
		clearTimeout(timer);
		setTimeout(function() { warning.style.display = 'none'; }, 4000);
	},

	powerup: function(player) {
		soundManager.play('powerup');
	},

	hit: function(bullet) {
		soundManager.play('hit');
	},

	shoot: function() {
		soundManager.play('laser');
	},

	destroy: function(id) {
		var entity = this.getEntityById(id);
		
		if(entity && entity.type === 'player') {
			soundManager.play('death');
		}
	}
});

// Setup game
var game = new Game(handler);

// Setup renderer
var renderer = new Renderer({
	id: 'game',
	game: game
});

// Setup sound manager
soundManager.url = '/js/client/swf';
soundManager.flashVersion = 9;
soundManager.useHTML5Audio = false;
soundManager.useFlashBlock = false;
soundManager.useHighPerformance = true;
soundManager.useFastPolling = true;
soundManager.onready(function() {
	soundManager.createSound({
		id: 'collision',
		url: '/audio/collision.mp3',
		autoLoad: true,
		multiShotEvents:true,
		volume: 100
	});

	soundManager.createSound({
		id: 'laser',
		url: '/audio/laser.mp3',
		autoLoad: true,
		multiShotEvents:true,
		volume: 50
	});

	soundManager.createSound({
		id: 'hit',
		url: '/audio/boom.mp3',
		autoLoad: true,
		multiShotEvents:true,
		volume: 50
	});

	soundManager.createSound({
		id: 'powerup',
		url: '/audio/powerup.mp3',
		autoLoad: true,
		multiShotEvents:true,
		volume: 80
	});

	soundManager.createSound({
		id: 'death',
		url: '/audio/hit2.mp3',
		autoLoad: true,
		multiShotEvents:true,
		volume: 80
	});
});

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
	console.log(data.state);

	// Start game and renderer
	//game.start();
	//renderer.start();

	// join the game
	socket.emit('join', {
		name: 'Craig'
	});

	// Fire start event
	handler.fire('start');
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