(function(exports, CLIENT) {
	var defaults,
		header = CLIENT ? document.querySelector('header') : null;

	// Import vec3 class if needed
	if(!CLIENT) { require('./glmatrix.min.js'); }

	/**
	 * Player class
	 *
	 * Represent an object within the game
	 */
	function Player(params) {
		params = params || defaults;

		this.id = params.id;
		this.type = 'player';

		this.pos = vec3.create(params.pos);
		this.lastPos = vec3.create(params.lastPos || params.pos);
		this.velocity = vec3.create(params.velocity || [ 0.15, 0.15, 0 ]);
		this.acceleration = vec3.create(params.acceleration || [0.96, 0.96, 0 ]);
		this.thrust = vec3.create(params.thrust);

		this.radius = params.radius || 10;
		this.angle = params.angle || 0;

		this.mass = 10;
		this.rebound = 0.96;

		this.remove = false;
	};

	Player.prototype.computeState = function(delta) {
		var pos = this.pos,
			vel = this.velocity,
			accel = this.acceleration,
			thrust = this.thrust,
			outside, player;

		// Set last pos
		vec3.set(pos, this.lastPos);

		// Calculate new velocity based on acceleration
		console.log( vec3.str(thrust) )
		vec3.multiply(vel, accel);
		vec3.add(vel, thrust);
		

		// Calculate new position based on velocity
		vec3.add(pos, [ vel[0] * delta, vel[1] * delta, 0 ]);
	};

	Player.prototype.toJSON = function() {
		var copy = {}, prop;
		for(var i in this) {
			if(this.hasOwnProperty(i)) {
				prop = this[i];
				copy[i] = prop.toJSON ? prop.toJSON() :
					prop.buffer ? [prop[0], prop[1], prop[2]] :
					prop;
			}
		}

		return copy;
	};

	Player.prototype.handleCmd = function(cmd) {
		this.move(cmd);
	}
	
/*
		'87' : 1, '38': 1, // Up
		'83' : 2, '40': 2, // Down
		'65' : 3, '37': 3, // Left
		'68' : 4, '39': 4, // Right
*/
	Player.prototype.move = function(data) {
		this.thrust[0] =
			data.left === 1 ? -0.05 :
			data.right === 1 ? 0.05 :
			data.right === 0 || data.left === 0 ? 0 :
			this.thrust[0];

		this.thrust[1] =
			data.up === 1 ? -0.05 :
			data.down === 1 ? 0.05 : 0;
	}

	Player.prototype.rotate = function(radians) {
		this.angle += radians;
	};

	Player.prototype.distanceTo = function(entity) {
		return vec3.dist(this.pos, entity.pos);
	};

	Player.prototype.intersects = function(entity) {
		return this.distanceTo(entity) < (this.radius + entity.radius);
	};

	Player.prototype.outsideWorld = function(width, height) {
		var r = this.radius,
			minX = this.pos[0] < r, maxX = this.pos[0] + r > width,
			minY = this.pos[1] < r, maxY = this.pos[1] + r > height;

		// If any of the conditions are true... return array
		if(minX || maxX || minY || maxY) {
			return [
				minX ? -1 : maxX ? 1 : 0,
				minY ? -1 : maxY ? 1 : 0
			];
		}

		return false;
	}

	exports.Player = Player;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');