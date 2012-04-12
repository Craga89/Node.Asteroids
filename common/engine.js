(function(exports, CLIENT) {
	var Sequence = (CLIENT ? exports : require('./sequence')).Sequence,
		Timer = (CLIENT ? exports : require('./timer')).Timer,
		Player = (CLIENT ? exports : require('./player')).Player,
		Bullet = (CLIENT ? exports : require('./bullet')).Bullet;

	function random(min, max) {
		return (Math.random() * (max - min + 1)) + min;
	}

	function arrRemove(array, from, to) {
		var rest = array.slice((to || from) + 1 || array.length);
		array.length = from < 0 ? array.length + from : from;
		return array.push.apply(array, rest);
	};

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

	/**
	 * Regiser a change to the game state for delta compression
	 */
	Game.prototype.registerChange = function(type, id, prop, val) {
		// Object sanity checks
		if(typeof this.deltaState[type] === 'undefined') { this.deltaState[type] = {}; }
		if(typeof this.deltaState[type][id] === 'undefined') { this.deltaState[type][id] = {}; }

		// Check if we're overwriting previous objects...
		if(typeof val !== 'undefined') {
			if(typeof this.deltaState[type][id] === 'undefined') { this.deltaState[type][id] = {}; }
			this.deltaState[type][id][prop] = val;
		}
		else {
			this.deltaState[type][id] = prop;
		}
	}

	/**
	 * Register an event to the game state for delta compression
	 */
	Game.prototype.registerEvent = function() {
		// Object sanity checks
		if(typeof this.deltaState.events === 'undefined') { this.deltaState.events = []; }
		this.deltaState.events.push( [].splice.call(arguments, 0) );
	}

	/**
	 * Calculcate the game state based on a delta
	 */
	Game.prototype.computeState = function(delta) {
		var state = this.state,
			entities = state.entities,
			entityCount = entities.length,
 			i = entities.length, k = 0, j,
			entity, entity2, outside, velocity,
			commands, command, timer, collisionType,
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

			// Handle shooting
			this._handleShooting(entity);
		}

		// Check for intersections and world boundaries
		entityCount = entities.length;
		for(i = 0; i < entityCount; i++) {
			if(!(entity = entities[i])) { continue; }

			// Remove entity if needed
			if(entity.remove) {
				this.registerChange('entities', entity.id, 'remove', true);
				continue;
			}

			// Compute new state and register it
			entity.computeState(delta);

			// Check if entity is heading outside the world boundaries...
			if( (outside = entity.outsideWorld(this.WIDTH, this.HEIGHT)) ) {
				velocity = entity.velocity;
				switch(entity.type) {
					case 'player':
						// Bounce players back
						if((velocity[0] > 0 && outside[0] > 0) || (velocity[0] < 0 && outside[0] < 0)) {
							velocity[0] *= -entity.rebound;
						}
						if((velocity[1] > 0 && outside[1] > 0) || (velocity[1] < 0 && outside[1] < 0)) {
							velocity[1] *= -entity.rebound;
						}
						break;

					// Remove all other objects when off-screen
					default: this.registerChange(entity.deltaScope, entity.id, 'remove', true); continue; break;
				}
			}

			// Check for collisions with other objects
			for(j = i + 1; j < entityCount; j++) {
				if(!(entity2 = entities[j]) || entity2.remove) { continue; }
				collisionType = entity.type + entity2.type;

				// Check intersection of the two objects
				if(entity.owner !== entity2.id && entity2.owner !== entity.id &&
					collisionType !== 'bulletbullet' && entity.intersects(entity2)) {
					
					// Handle different collision types
					switch(entity.type+entity2.type) {
						case 'playerbullet': entity.hit(entity2); break;
						case 'bulletplayer': entity2.hit(entity); break;
						case 'playerplayer': entity.collision(entity2); break;
					}
				}
			}

			// Add entities to new array and mapping
			newMap[ entity.id ] = newEntities.push(entity) - 1;
		}

		// Reset entities
		this.state.entities = newEntities;
		this.state.entityMap = newMap;
	};

	Game.prototype._handleShooting = function(entity) {
		if(entity.shooting) {
			this.shoot(entity);
		}
	}

	Game.prototype.shoot = function(player) {
		var state = this.state,
			pos = player.pos,
			vel = player.velocity,
			angle = player.angle,
			bullet, id;

		// Create the new bullet
		state.entityMap[id] = -1 + state.entities.push((
			bullet = new Bullet({
				id: (id = 'bullet_' + this.lastID++),
				owner: player.id,
				pos: [ pos[0], pos[1], pos[2] ],
				velocity: vec3.create([
					vel[0] + -Math.sin(angle) * 0.3,
					vel[1] + Math.cos(angle) * 0.3,
					0
				]),
				angle: angle
			},
			this)
		));

		// Register bullet
		this.registerChange(bullet.deltaScope, id, bullet.toJSON());

		return this;
	};

	Game.prototype._addPlayer = function(data) {
		var entities = this.state.entities, player;

		// Create player
		player = new Player(data, this);

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
		if(entity) { entity.destroy(); }
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
			e = entity.type === 'player' ? new Player(entity, this) :
				entity.type === 'bullet' ? new Bullet(entity, this) :
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
		var state = this.state,
			entityMap = state.entityMap,
			entities = state.entities,
			deltaEntities = delta.entities,
			events = delta.events || [],
			entity, deltaEntity,
			callbacks = this.delta.callbacks,
			callback, i, e;

		// Process events
		i = events.length;
		while((event = events[--i])) {
			console.log(event);
			if((callback = callbacks.events[ event[0] ])) {
				callback.call(this, event.pop(), event);
			}
		}

		// Process entity changes
		for(i in deltaEntities) {
			deltaEntity = deltaEntities[i];
			entity = entities[ entityMap[ i ] ];

			// If we're removing the entity... go!
			if(entity && deltaEntity.remove) {
				entity.destroy();
			}
			
			// Create new entity if we haven't seen it before
			else if(!entity) {
				entity = deltaEntity;
				
				// Make sure we aren't re-creating an entity
				if(!state.entityMap[ entity.id ]) {
					// Depending on type, instantiate.
					e = entity.type === 'player' ? new Player(entity, this) :
						entity.type === 'bullet' ? new Bullet(entity, this) :
						false;

					// Push into state entity array
					if(e) { entityMap[ entity.id ] = entities.push(e) - 1; }
				}
			}

			// Merge the delta state into our entity object
			else { entity.merge(deltaEntity, callbacks[entity.type]); }
		}
	};

	/**
	 * Setup callbacks
	 */
	Game.prototype.delta.callbacks = {
		player: {
		},
		events: {
		}
	}

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