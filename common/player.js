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
	function Player(params, game) {
		var player = this;

		// Internal properties
		this._game = game;

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
		var id = this.id,
			pos = this.pos,
			vel = this.velocity,
			accel = this.acceleration,
			thrust = this.thrust,
			outside, player;

		// If health is zero we're dead!
		if(this.health <= 0) { this.destroy(); }

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

		// Register delta changes
		this._registerChange('pos', pos);
		this._registerChange('velocity', vel);
		this._registerChange('angle', this.angle);
		this._registerChange('shield', this.shield);
	};

	Player.prototype.collision = function(player) {
		var collision, distance, aci, bci, type;

		/*
		 * Calculate difference vector based on each entities position.
		 * Scale the result by the combined radius of each object
		 */
		collision = vec3.subtract(this.pos, player.pos, vec3.create());
		distance = vec3.length(collision);

		// Make sure the distance is within bounds and normalize collision vector
		if(distance === 0) { collision = vec3.create([ 1, 1, 0 ]); }
		vec3.normalize(collision);

		// Calculate impulses via dot product
		aci = vec3.dot(this.velocity, collision);
		bci = vec3.dot(player.velocity, collision);

		// Adjust shield strengths
		type = this.shield < 1 ? 'adjustHealth' : 'adjustShield';
		this[type](- (1 - Math.abs(bci) * 5) );
		player[type](- (1 - Math.abs(aci) * 5) );

		// Scale velocity using impulse/forces above
		vec3.scale(collision, bci - aci, this.velocity);
		vec3.scale(collision, aci - bci, player.velocity);
	};

	Player.prototype.hit = function(bullet) {
		// Reduce shield strength until zero...
		this.adjustShield(-bullet.strength * this.shieldQuality);

		// Shield is down, take away health and set shield to zero
		if(this.shield <= 0) {
			this.adjustHealth(-bullet.strength);
		}

		// Remove bullet
		bullet.destroy();
	};

	Player.prototype.adjustShield = function(amount) {
		this._registerChange('shield', (this.shield = Math.max(this.shield + amount, 0)));
	}

	Player.prototype.adjustHealth = function(amount) {
		if(amount > this.health) {
			this.destroy();
		}
		else {
			this._registerChange('health', (this.health = Math.max(this.health + amount, 0)));
		}
	}

	Player.prototype.destroy = function() {
		this.health = this.shield = 0;
		this.remove = true;

		this._registerChange('remove', true);
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