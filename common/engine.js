(function(exports, CLIENT) {
	var Sequence = (CLIENT ? exports : require('./sequence')).Sequence,
		Timer = (CLIENT ? exports : require('./timer')).Timer,
		Player = (CLIENT ? exports : require('./player')).Player,
		Bullet = (CLIENT ? exports : require('./bullet')).Bullet;

	function random(min, max) {
		return (Math.random() * (max - min + 1)) + min;
	}

	function Game() {
		var game = this;

		/* Constants */
		this.WIDTH = 640;
		this.HEIGHT = 480;
		this.STATES = 300;
		this.TICK_RATE = Math.round(1000 / 30);
		this.CMD_RATE = Math.round(1000 / 30);
		this.TRANSFER_RATE = 0.05;
		this.STATE_BUFFER_TIME = 1000;
		this.MAX_LATENCY = 100;

		// State specific
		this.state = { entities: [], entityMap: {} };
		this.deltaState = {};
		this.stateBuffer = [];
		this.updateCount = 0;

		// User command buffer
		this.commandBuffer = {};

		// Trackers
		this.me = null;
		this.lastID = 0;

		// Setup accurate game timer
		this.timer = new Timer(this.TICK_RATE, function(date) {
			game.update(date);
			game.onTick && game.onTick(date);
		});

		// Setup client smooth timer
		this.smoothTimer = new Timer(this.SMOOTH_TIME);

		// Setup callbacks
		this.onTick = undefined;
	};

	Game.prototype.update = function(timeStamp) {
		var delta = timeStamp - this.state.timeStamp;

		// Compute new state and update state count
		this.computeState(delta);
		this.updateCount++;
	};

	/**
	 * Starts the game engine
	 */
	Game.prototype.start = function(skew) {
		console.log('Starting game...');
		this.timer.start(skew);
	};

	Game.prototype.stop = function() {
		this.timer.stop();
	};

	Game.prototype.queueCommand = function(id, data) {
		return (this.commandBuffer[id] = (this.commandBuffer[id] || []).concat(data)), this;
	};

	Game.prototype.computeState = function(delta) {
		var game = this,
			state = this.state,
			entities = state.entities,
			entityCount = entities.length,
 			i = entities.length, k = 0, j,
			entity, entity2, outside, velocity,
			commands, command, timer,
			newEntities = [], newMap = {};

		// Reset the delta state
		this.deltaState = {};

		// Set the state timestamp
		state.timeStamp = this.state.timeStamp + delta;

		// Execute user commands first
		entityCount = entities.length;
		while((entity = entities[--i])) {
			if(!(commands = this.commandBuffer[ entity.id ])) { continue; }

			// Execute user commands
			while((command = commands.shift())) {
				entity.handleCmd(command);
			}

			// Check if player is shooting and produce bullet
			timer = entity._shootTimer;
			if(entity.shooting) {
				// Setup timer if not already
				if(!timer) {
					entity._shootTimer = new Timer(entity.shootRate, function(date) {
						game.shoot(this);
					});
				}

				// Start it and fire initial shot}
				entity._shootTimer.start(0, entity, !!timer);
			}
			else { timer && timer.stop(); }
		}

		// Check for intersections and world boundaries
		entityCount = entities.length;
		for(i = 0; i < entityCount; i++) {
			if(!(entity = entities[i])) { continue; }

			// Check if health is zero, and kill
			if(entity.health <= 0) { entity.remove = true; }

			// Remove entity if needed
			if(entity.remove) { continue; }

			// Compute new state and register it
			entity.computeState(delta);

			// Check if entity is heading outside the world boundaries...
			if( (outside = entity.outsideWorld(this.WIDTH, this.HEIGHT)) ) {
				velocity = entity.velocity;
				
				// Bounce back players
				if(entity.type === 'player') {
					if((velocity[0] > 0 && outside[0] > 0) || (velocity[0] < 0 && outside[0] < 0)) {
						velocity[0] *= -entity.rebound;
					}
					if((velocity[1] > 0 && outside[1] > 0) || (velocity[1] < 0 && outside[1] < 0)) {
						velocity[1] *= -entity.rebound;
					}
				}

				// Remove bullets
				else if(entity.type === 'bullet') { continue; }
			}

			// Check for collisions with other objects
			for(j = i + 1; j < entityCount; j++) {
				if(!(entity2 = entities[j]) || entity2.remove) { continue; }

				// If two players or a player and another players bullet are colliding...
				if(entity.type+entity2.type !== 'bulletbullet' &&
					entity.owner !== entity2.id && entity2.owner !== entity.id &&
					entity.intersects(entity2)
				) {
					this[ (entity.type+entity2.type === 'playerplayer' ? '_player' : '_bullet') + 'Collision'](
						entity, entity2
					);
				}
			}

			// Add entities to new array and mapping
			newMap[ entity.id ] = newEntities.push(entity) - 1;
		}

		// Reset entities
		this.state.entities = newEntities;
		this.state.entityMap = newMap;
	};

	Game.prototype.shoot = function(player) {
		var state = this.state,
			pos = player.pos,
			vel = player.velocity,
			angle = player.angle,
			bullet, id;

		// Create the new bullet
		state.entityMap[id] = -1 + state.entities.push(
			new Bullet({
				id: (id = 'bullet_' + this.lastID),
				owner: player.id,
				pos: [ pos[0], pos[1], pos[2] ],
				velocity: vec3.create([
					vel[0] + -Math.sin(angle) * 0.3,
					vel[1] + Math.cos(angle) * 0.3,
					0
				]),
				angle: angle
			})
		);
	};

	Game.prototype.calculateDelta = function() {
		var state = this.game.state,
			entities = state.entities,
			i = entities.length, entity;

		while((entity = entities[--i])) {

		}
	}

	Game.prototype._playerCollision = function(player, player2) {
		var collision, distance, aci, bci, effect;

		/*
		 * Calculate difference vector based on each entities position.
		 * Scale the result by the combined radius of each object
		 */
		collision = vec3.subtract(player.pos, player2.pos, vec3.create());
		distance = vec3.length(collision);

		// Make sure the distance is within bounds and normalize collision vector
		if(distance === 0) { collision = vec3.create([ 1, 1, 0 ]); }
		vec3.normalize(collision);

		// Calculate impulses via dot product
		aci = vec3.dot(player.velocity, collision);
		bci = vec3.dot(player2.velocity, collision);

		// Adjust shield strengths
		effect = player.shield < 1 ? 'health' : 'shield';
		player[effect] -= 1 - Math.abs(bci) * 5;
		player2[effect] -= 1 - Math.abs(aci) * 5;

		// Scale velocity using impulse/forces above
		vec3.scale(collision, bci - aci, player.velocity);
		vec3.scale(collision, aci - bci, player2.velocity);
	};

	Game.prototype._bulletCollision = function(entity, entity2) {
		var player = entity.type === 'player' ? entity : entity2,
			bullet = player === entity ? entity2 : entity;

		// Reduce shield strength until zero...
		player.shield -= bullet.strength * player.shieldQuality;
		if(player.shield < 0) {
			// Shield is down, take away health
			player.health -= bullet.strength - player.shield;

			player.shield = 0;
		}

		// Remove bullet
		bullet.remove = true;
	}

	Game.prototype._addPlayer = function(data) {
		var entities = this.state.entities, player;

		// Create player
		player = new Player(data);

		// Push entity onto state
		this.state.entityMap[ data.id ] = this.state.entities.push(player) - 1

		// Find the next closest slot available and map it
		return player;
	};

	Game.prototype.join = function(id, data) {
		return this._addPlayer(data || {
			id: id,
			pos: vec3.create([
				random(0, this.WIDTH),
				random(0, this.HEIGHT),
				0
			]),
			angle: random(0, Math.PI / 2)
		});
	};

	Game.prototype.addBot = function(id) {
		return this._addPlayer({
			id: id,
			bot: true,
			pos: vec3.create([
				random(0, this.WIDTH),
				random(0, this.HEIGHT),
				0
			]),
			angle: random(0, Math.PI / 2)
		});
	};

	Game.prototype.leave = function(id) {
		var entity = this.playerExists(id);

		// If entity exists, set remove flag
		if(entity) { entity.remove = true; }
	}

	/**
	 * Save the game state.
	 * @return {object} JSON of the game state
	 */
	Game.prototype.save = function() {
		var serialized = {
			entities: [],
			entityMap: {},
			timeStamp: this.state.timeStamp,
			callbacks: this.callbacks
		},
		entities = this.state.entities,
		i = entities.length;

		// Duplicate our state
		while(entities[--i]) {
			serialized.entities.push( entities[i].toJSON() );
			serialized.entityMap[ entities[i].id ] = i;
		}

		return serialized;
	};

	/**
	 * Load the game state.
	 * @param {object} state JSON of the game state
	 */
	Game.prototype.load = function(state) {
		var entities = state.entities,
			entityMap = state.entityMap,
			me, me2, i = -1, j,
			stateBuffer = this.stateBuffer,
			state, entity, len, me, e;

		// Push the state onto the buffer
		len = stateBuffer.push(state);
		if(len > (this.STATE_BUFFER_TIME / this.TICK_RATE)) { stateBuffer.shift(); }

		// Setup new state
		this.state = state = {
			entities: [],
			entityMap: {},
			timeStamp: state.timeStamp.valueOf()
		}

		while(entities[++i]) {
			entity = entities[i];

			// Depending on type, instantiate.
			e = entity.type === 'player' ? new Player(entity) :
				entity.type === 'bullet' ? new Bullet(entity) :
				false;

			// If it was a vlid entity type...
			if(e) {
				// Push into state entity array
				state.entityMap[ entity.id ] = state.entities.push(e) - 1;

				// If it was "me", reset the game reference
				if(this.me && this.me.id === entity.id) { this.me = e; }
			}
		}
	};


	/**
	 * Process a delta snapshot
	 */
	Game.prototype.delta = function(delta) {
		var entities = this.state.entities,
			deltaEntities = delta.entities,
			entity, deltaEntity,
			i = -1;

		// Process entity changes
		while(entities[++i]) {
			if(!(deltaEntity = deltaEntities[ (entity = entities[i]).id ])) { continue; }

			for(i in deltaEntity) {
				
			}
		}
	};

	Game.prototype.entityExists = function(id) {
		return this.state.entities[ this.state.entityMap[id] ] || false;
	};

	Game.prototype.playerExists = function(id) {
		var entity = this.state.entities[ this.state.entityMap[id] ];
		return entity && entity.type === 'player' ? entity : false;
	}


	/* Callbacks */
	var noop = function() {}
	Game.prototype.callbacks
	Game.prototype.conFire = noop;
	Game.prototype.onCollision = noop;
	Game.prototype.onHit = noop;
	Game.prototype.onDeath = noop;
	

	exports.Game = Game;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');