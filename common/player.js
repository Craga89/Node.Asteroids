(function(exports, CLIENT) {
	var Entity = (CLIENT ? exports : require('./entity')).Entity,
		Sequence = (CLIENT ? exports : require('./sequence')).Sequence,
		Timer = (CLIENT ? exports : require('./timer')).Timer,
		Bullet = (CLIENT ? exports : require('./bullet')).Bullet;

	// Import modules as needed
	if(!CLIENT) { require('./glmatrix.min.js'); }

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
		this.shieldQuality = 0.5;
		this.shieldRegen = 0.075;

		// Reound propeties
		this.rebound = 0.96;

		// Shooting properties
		this.shooting = params.shooting || false;
		this.shootRate = 150;

		// Removal flag
		this.remove = params.remove || false;
	};

	// Inherit from Entity
	Player.prototype = new Entity();
	Player.prototype._super = Entity.prototype;
	Player.prototype.constructor = Player;

	// Merge properties
	Player._mergeProps = Entity._mergeProps.concat([
		'bot', 'thrust', 'rotateBy', 'angle', 'health',
		'shield', 'shieldQuality', 'shieldRegen', 'rebound',
		'shooting', 'shootRate'
	]);

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
		this.shield += this.shieldRegen;
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

	exports.Player = Player;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');