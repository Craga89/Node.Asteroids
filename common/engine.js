(function(exports, CLIENT) {
	var Timer = (CLIENT ? exports : require('./timer')).Timer,
		Player = (CLIENT ? exports : require('./player')).Player,
		Bullet = (CLIENT ? exports : require('./bullet')).Bullet;

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

		// User command buffers
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
		var state = this.state,
			entities = state.entities,
			entityCount = entities.length,
 			i = entities.length, k = 0, j,
			entity, entity2, outside, velocity,
			commands, command,
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
			if(entity.shooting) { this.shoot(entity); }
		}

		// Check for entity intersections
		entityCount = entities.length;
		for(i = 0; i < entityCount; i++) {
			if(!(entity = entities[i])) { continue; }

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
				if(!(entity2 = entities[j])) { continue; }

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

	Game.prototype._playerCollision = function(player, player2) {
		var collision, distance, aci, bci;

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

		// Scale velocity using impulse/forces above
		vec3.scale(collision, bci - aci, player.velocity);
		vec3.scale(collision, aci - bci, player2.velocity);
	};

	Game.prototype._bulletCollision = function(entity, entity2) {
		var player = entity.type === 'player' ? entity : entity2,
			bullet = player === entity ? entity2 : entity;

		// Reduce shield strength until zero...
		player.shield -= bullet.strength;
		if(player.shield < 0) {
			player.shield = 0.01;

			// Shield is down, take away health
			player.health -= bullet.strength;
		}

		// Remove bullet
		bullet.remove = true;

		console.log('BULLET HIT, SHIELD AT', player.shield + '%', player.id)
	}

	Game.prototype._transferAreas = function(entity, entity2) {
		var big = entity2.radius > entity.radius ? entity2 : entity,
			small = big === entity ? entity2 : entity,
			diff = big.overlap(small) * this.TRANSFER_RATE;

		// Transfer the areas
		big.transferArea(diff);
		small.transferArea(-diff);

		// Check if smallest one is dead
		if(small.radius <= 1) {
			console.log(small.id + ' is dead!');
			small.remove = true;
		}
	};

	Game.prototype.calculateDelta = function() {
		var state = this.game.state,
			entities = state.entities,
			i = entities.length, entity;

		while((entity = entities[--i])) {
			
		}
	}

	Game.prototype.join = function(id, data) {
		var entities = this.state.entities, player, i = 0;

		function random(min, max) {
			return (Math.random() * (max - min + 1)) + min;
		}

		player = new Player(data || {
			id: id,
			pos: vec3.create([
				random(0, this.WIDTH),
				random(0, this.HEIGHT),
				0
			]),
			angle: random(0, Math.PI / 2)
		});

		// Push entity onto state
		this.state.entityMap[ id ] = this.state.entities.push(player) - 1

		// Find the next closest slot available and map it
		return player;
	};

	Game.prototype.leave = function(id) {
		var entity = this.playerExists(id);

		// If entity exists, set remove flag and delete map
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
			timeStamp: this.state.timeStamp
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
	Game.prototype.load = function(state, overwrite) {
		var entities = state.entities,
			entityMap = state.entityMap,
			me, me2, i = -1, j,
			stateBuffer = this.stateBuffer,
			state, entity, len, me, e;

		// Push the state onto the buffer
		len = stateBuffer.push(state);
		if(len > (this.STATE_BUFFER_TIME / this.TICK_RATE)) { stateBuffer.shift(); }

		// Correction is disabled, do a hard load (overwrite state)
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

	Game.prototype.entityExists = function(id) {
		return this.state.entities[ this.state.entityMap[id] ] || false;
	};

	Game.prototype.playerExists = function(id) {
		var entity = this.state.entities[ this.state.entityMap[id] ];
		return entity && entity.type === 'player' ? entity : false;
	}

	exports.Game = Game;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');