(function(exports, CLIENT) {
	// Import modules as needed
	if(!CLIENT) {
		require('./glmatrix.min.js');
		Timer = require('./timer').Timer;
	}

	/**
	 * Player class
	 *
	 * Represent an object within the game
	 */
	function Player(params) {
		var player = this;
		params = params || defaults;

		// Main properties
		this.id = params.id;
		this.type = 'player';
		this.bot = params.bot || false;

		// Vectors
		this.pos = vec3.create(params.pos);
		this.lastPos = vec3.create(params.lastPos || params.pos);
		this.velocity = vec3.create(params.velocity || [ 0.15, 0.15, 0 ]);
		this.acceleration = vec3.create(params.acceleration || [0.99, 0.99, 0 ]);
		this.thrust = params.thrust || 0;

		// Angle properties
		this.rotateBy = params.rotate || 0;
		this.angle = params.angle || 0;

		// Health and shield properties
		this.health = params.health || 100;
		this.radius = params.radius || 15;
		this.shield = params.shield || 100;
		this.shieldQuality = params.shieldQuality || 0.8;
		this.shieldRegen = 1.0035;

		// Reound propeties
		this.rebound = 0.96;

		// Shooting properties
		this.shooting = params.shooting || false;
		this.shootRate = 150;

		// Removal flag
		this.remove = params.remove || false;
	};

	Player.prototype.computeState = function(delta) {
		var pos = this.pos,
			vel = this.velocity,
			accel = this.acceleration,
			thrust = this.thrust,
			outside, player;

		// Set last pos
		vec3.set(pos, this.lastPos);

		// Add rotation
		this.angle += (Math.PI / 8) * this.rotateBy;

		// Calculate new velocity based on acceleration and thrust
		vec3.multiply(vel, accel);
		vec3.add(vel, [
			-Math.sin(this.angle) * this.thrust,
			Math.cos(this.angle) * this.thrust,
			0
		]);

		// Regenerate shield (maximum 100%)
		this.shield *= this.shieldRegen;
		if(this.shield > 100) { this.shield = 100; }

		// Calculate new position based on velocity
		vec3.add(pos, [ vel[0] * delta, vel[1] * delta, 0 ]);
	};

	Player.prototype.toJSON = function() {
		var copy = {}, prop;
		for(var i in this) {
			if(this.hasOwnProperty(i) && i[0] !== '_') {
				prop = this[i];
				copy[i] = prop.toJSON ? prop.toJSON() :
					prop.buffer ? [prop[0], prop[1], prop[2]] :
					prop;
			}
		}

		return copy;
	};

	Player.prototype.distanceTo = function(entity) {
		return vec3.dist(this.pos, entity.pos);
	};

	Player.prototype.intersects = function(entity) {
		return this.distanceTo(entity) < (this.radius + entity.radius);
	};

	Player.prototype.overlap = function(entity) {
		return this.radius + entity.radius - this.distanceTo(entity);
	};

	Player.prototype.handleCmd = function(cmd) {
		// Handle shooting
		if(!isNaN(cmd.space)) { this.shoot(cmd.space); }

		// Rotate on left/right
		if(!isNaN(cmd.left) || !isNaN(cmd.right)) {
			this.rotate(cmd.left ? -0.35 : cmd.right ? 0.35 : 0);
		}

		// Thrust on up/down
		if(!isNaN(cmd.up)) {
			this.move(cmd.up ? 0.02 : 0);
		}
	}

	Player.prototype.move = function(amount) {
		this.thrust = amount;
	};

	Player.prototype.rotate = function(value) {
		this.rotateBy = value;
	};

	Player.prototype.shoot = function(bool) {
		this.shooting = !!bool;
	}

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