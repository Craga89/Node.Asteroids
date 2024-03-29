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
	 * Represent aa player within the game
	 */
	function Player(subclass) {
		// Merge Entity defaults with subclasses
		Entity._merge(Player, subclass.defaults, Player.defaults, subclass.defaults);
	}

	// Defaults
	Player.defaults = {
		'type': 'player',
		'subtype': 'player',
 
		'acceleration': [0.99, 0.99, 0 ],
		'thrust': 0,
		'angularVel': 0,
		'turnSpeed': Math.PI / 12,
		
		'shield': 100,
		'shieldMax': 100,
		'shieldQuality': 0.5,
		'shieldRegen': 0.065,
		'shieldPause': 0,

		'kills': 0,

		'weapon': 'Bullet',
		'shooting': false,
		'shootRate': 150,

		'bulletStrength': 30,
		'bulletRange': 200,
		
		'radius': 18
	};

	// Inherit from Entity
	Player.prototype = new Entity(Player);
	Player.prototype._super = Entity.prototype;
	Player.prototype.constructor = Player;

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
		this.angle += this.angularVel;
		this.registerChange('angle');

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

	Player.prototype.handleHit = function(bullet) {
		var shield = this.shield,
			amount = bullet.strength * this.shieldQuality,
			owner;

		// Set the shield
		this.adjustShield(-amount, false);

		// Register a change if we killed a player
		if(this.shield === 0) {
			owner = this._game.getPlayerById(bullet.owner);
			owner.registerChange('kills', ++owner.kills);

			this.destroy(bullet.owner);
		}

		// Also add a brief pause to shield regen
		this.shieldPause += (1 - ((shield - amount) / shield)) * 300;

		// Remove bullet
		bullet.destroy();

		// Register event
		this.registerEvent('hit', bullet.id);
	};

	Player.prototype.setShield = function(val, destroy) {
		if(val !== this.shield) {
			this.shield = val;
			this.registerChange('shield', Math.floor(val));

			// Die if the shield is set to zero
			if(destroy !== false && this.shield <= 0) { this.destroy(); }
		}
	};

	Player.prototype.adjustShield = function(amount, destroy) {
		var newShield = this.shield + amount;

		// Set shield strength
		this.setShield(
			Math.max(Math.min(this.shieldMax, newShield), 0), destroy
		);
	};

	Player.prototype.move = function(amount) {
		this.thrust = amount;
	};

	Player.prototype.rotate = function(value) {
		this.angle = value;
	};

	Player.prototype.setAngularVel = function(val) {
		this.angularVel = val;
	}

	Player.prototype.shoot = function(delta) {
		var game = this._game,
			pos = this.pos,
			vel = this.velocity,
			angle = this.angle,
			id = 'bullet_' + this.id + '_' + game.lastID++,
			bullet, pf;

		// Create the new bullet
		game.queueEntity(
			bullet = new Bullet({
				id: id,
				owner: this.id,
				pos: this.estimateNextPos(delta || 1), // Use future position
				velocity: vec3.create([
					vel[0] - Math.sin(angle) * 0.3,
					vel[1] + Math.cos(angle) * 0.3,
					0
				]),
				angle: angle,
				range: this.bulletRange,
				strength: this.bulletStrength
			},
			game)
		);

		// Register bullet and event
		bullet.registerChange( bullet.toJSON() );
		bullet.registerEvent('shoot', this.id);

		return this;
	};


	function User(params, game) {
		this._game = game;

		// Set our parameters
		this.setup(params);
	}

	// Defaults
	User.defaults = {
		'subtype': 'user'
	};

	// Inherit from Entity
	User.prototype = new Player(User);
	User.prototype._super = Player.prototype;
	User.prototype.constructor = User;

	// Command handler
	User.prototype.handleCmd = function(cmd) {
		var player = this;

		// Handle shooting
		if(!isNaN(cmd.space)) {
			if((this.shooting = cmd.space)) {
				this._game.schedule(function(timeStamp, delta) {
					if(player.shooting) { player.shoot(delta, timeStamp); }
					return !!player.shooting && !player.remove;
				},
				200, true);

				player.shoot(); // Fire off a single shot immediately
			}
		}

		// Rotate on left/right
		if(!isNaN(cmd.left) || !isNaN(cmd.right)) {
			this.setAngularVel((cmd.left ? -1 : cmd.right ? 1 : 0) * this.turnSpeed);
		}

		// Thrust on up/down
		if(!isNaN(cmd.up)) {
			this.move(cmd.up ? 0.01 : 0);
		}
	}

	

	function Bot(params, game) {
		this._game = game;

		// Set our parameters
		this.setup(params);
	}

	// Defaults
	Bot.defaults = {
		'subtype': 'bot',
 
		'velocity': [ 0, 0, 0],
		'turnSpeed': Math.PI / 6,
		'accuracy': 1,

		'following': false,

		'range': 400,
		'followRange': 600
	};

	// Inherit from Entity
	Bot.prototype = new Player(Bot);
	Bot.prototype._super = Player.prototype;
	Bot.prototype.constructor = Bot;

	Bot.prototype.computeState = function(delta) {
		var player = this._game.getPlayerById('Craig');
		if(player) { this.follow(delta, player); }

		this._super.computeState.call(this, delta);
	}

	Bot.prototype.follow = function(delta, entity) {
		// Calculate the distance between the two entities
		var bot = this,
			dPos = vec3.subtract(this.pos, entity.pos, vec3.create()),
			dTotal = vec3.length(dPos),
			targetAngle, shoot,
			runaway = false;

		// Check if the target is within the bot range
		if(dTotal <= (this.thrust ? this.range : this.followRange)){
			// Determine target angle (run away or follow)
			targetAngle = Math.atan2(dPos[1], dPos[0]) + Math.PI / 2;
			if(entity.shield > this.shield) { runaway = true; targetAngle = -targetAngle; }

			// Grade into the new angle
			if(this.angle !== targetAngle) {
				// Add rotation
				theta = (this.angle < targetAngle ? 1 : -1) * this.turnSpeed;
				
				if((theta / this.angle) < this.accuracy) { this.angle = targetAngle; }
				else { this.angle += theta; };
 
				this.registerChange('angle');
			}

			// Match thrust ( or full thrust if running away!)
			this.thrust = 0.01 * Math.min(1, runaway ? 1 : (dTotal / this.range) * 2);

			// Set flag
			shoot = true;
		}

		// Reset thrust and shooting flag
		else { this.thrust = 0; shoot = false; }
	}

	exports = CLIENT ? (exports.Players = {}) : exports;
	exports.User = User;
	exports.Bot = Bot;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');
