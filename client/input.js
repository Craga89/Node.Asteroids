(function(exports) {
	var KEYMAP = {
		'8': 'backspace', // Backspace
		'13': 'enter', // Enter key
		'27': 'escape', // Escape key
		'32': 'space', // Space bar
		'87' : 'up', '38': 'up', // Up
		'83' : 'down', '40': 'down', // Down
		'65' : 'left', '37': 'left', // Left
		'68' : 'right', '39': 'right' // Right
	},
	CLICKMAP = {
		'0': 'mouse1',
		'1': 'mouse2',
		'2': 'mouse3'
	}

	function Input(params) {
		var self = this;

		// References
		this.game = params.game;
		this.renderer = params.renderer;

		// Setup key state map and buffer
		this.keyState = {};
		this.keyDown = {}
		this.sampleBuffer = [];

		// Add mouse move events
		window.addEventListener('keydown', function(event) {
			var key = KEYMAP[event.keyCode];
			if(key && !self.keyDown[key]) {
				self.keyState[key] = self.keyDown[key] = 1;
			}

			if(key) { event.preventDefault(); }
		});
		window.addEventListener('keyup', function(event) {
			var key = KEYMAP[event.keyCode];
			if(key) {
				self.keyState[key] = self.keyDown[key] = 0;
				event.preventDefault();
			}
		});

		window.addEventListener('mousedown', function(event) {
			var key = CLICKMAP[event.button];
			if(key && !self.keyDown[key]) {
				self.keyState[key] = self.keyDown[key] = self.translateEvent(event);
			}

			if(key) { event.preventDefault(); }
		});
		window.addEventListener('mouseup', function(event) {
			var key = CLICKMAP[event.button];
			if(key) {
				self.keyState[key] = self.keyDown[key] = self.translateEvent(event);
				event.preventDefault();
			}
		});

		// Disable right-click menu
		//window.oncontextmenu = function() { return false; }
	};

	Input.KEYMAP = KEYMAP;

	Input.prototype.translateEvent = function(event) {
		return [
			event.pageX - renderer.canvas.offsetLeft,
			event.pageY - renderer.canvas.offsetTop
		]
	}

	Input.prototype.sample = function() {
		var buffer = this.sampleBuffer;

		// Push key state onto the fixed length buffer
		for(i in this.keyState) { buffer.push( this.keyState ); break; }
		if(buffer.length > 100) { buffer.shift(); }

		// Reset keyState
		this.keyState = {};
	};

	Input.prototype.flushSamples = function() {
		var temp = this.sampleBuffer;
		return this.sampleBuffer = [], temp;
	};

	exports.Input = Input;

}(window));