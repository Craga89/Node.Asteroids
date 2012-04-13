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
		this.subtype = params.subtype || 'player';

		// Vectors
		this.pos = vec3.create(params.pos);
		this.lastPos = vec3.create(params.lastPos || params.pos);
		this.velocity = vec3.create(params.velocity);
		this.acceleration = vec3.create(params.acceleration || [0.99, 0.99, 0 ]);
		this.thrust = params.thrust || 0;

		// Angle properties
		this.rotateBy = params.rotate || 0;
		this.angularVel = (Math.PI / 8);
		this.angle = params.angle || 0;

		// Health and shield properties
		this.shield = params.shield || 100;
		this.shieldMax = params.shieldMax || 100;
		this.shieldQuality = 0.5;
		this.shieldRegen = 0.075;
		this.shieldPause = params.shieldPause || 0;

		// Weapon properties
		this.weapon = 'Bullet';
		this.shooting = params.shooting || false;
		this.shootRate = 150;

		// Bullet properties
		this.bulletStrength = 30;
		this.bulletRange = 200;

		// Set properties
		this.rebound = 0.96;
		this.radius = 18;
	};

	// Inherit from Entity
	Player.prototype = new Entity();
	Player.prototype._super = Entity.prototype;
	Player.prototype.constructor = Player;

	// Merge properties
	Player._mergeProps = Entity._mergeProps.concat([
		'thrust', 'rotateBy', 'angle',
		'shield', 'shieldQuality', 'shieldRegen', 'rebound',
		'shooting', 'shootRate', 'angularVel', 'bulletStrength',
		'bulletRange', 'shieldPause', 'shieldMax'
	]);

	Player.prototype.computeState = function(delta) {
		var id = this.id,
			pos = this.pos,
			vel = this.velocity,
			accel = this.acceleration,
			thrust = this.thrust,
			outside, player, angle;

		// Set last pos
		vec3.set(pos, this.lastPos);

		// Add rotation
		this.angle += this.angularVel * this.rotateBy;
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

		// Regenerate shield or reduce pause counter
		if((this.shieldPause -= delta) <= 0) {
			this.shieldPause = 0;

			// Don't regenerate above 100%
			if(this.shield <= 100) {
				this.adjustShield(this.shieldRegen);
			}
		}
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
		var shield = this.shield,
			amount = bullet.strength * this.shieldQuality;

		// If shield is zero and we got hit... die!
		if((shield - amount) <= 0) { this.destroy(); }

		// Reduce shield strength until zero...
		else{ this.adjustShield(-amount); }

		// Also add a brief pause to shield regen
		this.shieldPause += (1 - ((shield - amount) / shield)) * 300;

		// Remove bullet
		bullet.destroy();

		// Register event
		this.registerEvent('hit', bullet.id);
	};

	Player.prototype.setShield = function(val) {
		if(val !== this.shield) {
			this.shield = val;
			this.registerChange('shield', Math.floor(val));
		}
	};

	Player.prototype.adjustShield = function(amount) {
		var newShield = this.shield + amount;

		// Set shield strength
		this.setShield(
			Math.max(Math.min(this.shieldMax, newShield), 0)
		);
	};

	Player.prototype.move = function(amount) {
		this.thrust = amount;
	};

	Player.prototype.rotate = function(value) {
		this.rotateBy = value;
	};

	Player.prototype.shoot = function() {
		var game = this._game,
			state = game.state,
			pos = this.pos,
			vel = this.velocity,
			angle = this.angle,
			id = 'bullet_' + game.lastID++,
			bullet;

		// Create the new bullet
		state.entityMap[id] = -1 + state.entities.push((
			bullet = new Bullet({
				id: id,
				owner: this.id,
				pos: [ pos[0], pos[1], pos[2] ],
				velocity: vec3.create([
					vel[0] + -Math.sin(angle) * 0.3,
					vel[1] + Math.cos(angle) * 0.3,
					0
				]),
				angle: angle,
				range: this.bulletRange,
				strength: this.bulletStrength
			},
			game)
		));

		// Register bullet and event
		bullet.registerChange( bullet.toJSON() );
		bullet.registerEvent('shoot', this.id);

		return this;
	};


	Player.prototype.handleCmd = function(cmd) {
		var player = this;

		// Handle shooting
		if(!isNaN(cmd.space)) {
			if((this.shooting = cmd.space)) {
				this._game.schedule(function() {
					console.log('shooting!', player);
					if(player.shooting) { player.shoot(); }
					return !!player.shooting;
				},
				200, true);

				player.shoot(); // Fire off a single shot immediately
			}
		}

		// Rotate on left/right
		if(!isNaN(cmd.left) || !isNaN(cmd.right)) {
			this.rotate(cmd.left ? -0.35 : cmd.right ? 0.35 : 0);
		}

		// Thrust on up/down
		if(!isNaN(cmd.up)) {
			this.move(cmd.up ? 0.01 : 0);
		}
	}

	exports.Player = Player;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');