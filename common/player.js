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
		this.shield = params.shield || 100;
		this.shieldQuality = 0.5;
		this.shieldRegen = 0.075;

		// Set properties
		this.rebound = 0.96;
		this.radius = 15;

		// Shooting properties
		this.shooting = params.shooting || false;
		this.shootRate = 150;
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
			outside, player, angle;

		// If health is zero we're dead!
		if(this.health <= 0) { this.destroy(); }

		// Set last pos
		vec3.set(pos, this.lastPos);

		// Add rotation
		this.angle += (Math.PI / 8) * this.rotateBy;
		if(this.rotateBy) { this.registerChange('angle'); }

		// Calculate new velocity based on acceleration and thrust
		vec3.multiply(vel, accel);
		vec3.add(vel, [
			-Math.sin(this.angle) * this.thrust,
			Math.cos(this.angle) * this.thrust,
			0
		]);
		this.registerChange('velocity');

		// Calculate new position based on velocity
		vec3.add(pos, [ vel[0] * delta, vel[1] * delta, 0 ]);
		this.registerChange('pos');

		// Regenerate shield
		this.adjustShield(this.shieldRegen);
	};

	
	Player.prototype.handleCollision = function(player) {
		var collision, distance, aci, bci;

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
		this.adjustShield( -((1 - Math.abs(bci)) * 15) );
		player.adjustShield( -((1 - Math.abs(aci)) * 15) );

		// Scale velocity using impulse/forces above
		vec3.scale(collision, bci - aci, this.velocity);
		vec3.scale(collision, aci - bci, player.velocity);

		// Register velocity changes
		this.registerChange('velocity');
		player.registerChange('velocity');

		// Register event
		this.registerEvent('collision', player.id);
	};

	Player.prototype.handleHit = function(bullet) {
		var shield = this.shield;

		// Reduce shield strength until zero...
		this.adjustShield(-bullet.strength * this.shieldQuality);

		// Remove bullet
		bullet.destroy();

		// Register event
		this.registerEvent('hit', bullet.id);
	};

	Player.prototype.adjustShield = function(amount) {
		var shield = this.shield,
			floored;
		
		// Adjust shield strength
		floored = Math.floor(
			this.shield = Math.max(Math.min(100, shield + amount), 0)
		);

		// If the shield is down... hurt health!
		if(floored <= 0) {
			this.adjustHealth( -(shield - amount) );
		}

		// Inform game of strength change if there was any
		if(Math.floor(shield) !== floored) {
			this.registerChange('shield', floored);
		}
	}

	Player.prototype.adjustHealth = function(amount) {
		health = this.health;

		// When health reaches zero... kill player
		if(amount > health) { this.destroy(); }
		else {
			this.health = Math.round(Math.max(health + amount, 0));
			if(health !== this.health) { this.registerChange('health'); }
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

	exports.Player = Player;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');