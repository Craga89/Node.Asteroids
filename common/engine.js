(function(exports, CLIENT) {
	var Sequence = (CLIENT ? exports : require('./sequence')).Sequence,
		Timer = (CLIENT ? exports : require('./timer')).Timer,
		Players = (CLIENT ? exports.Players : require('./player')),
		Bullet = (CLIENT ? exports : require('./bullet')).Bullet,
		Asteroid = (CLIENT ? exports : require('./asteroid')).Asteroid,
		Powerups = (CLIENT ? exports.Powerups : require('./powerup'));

	function random(min, max) {
		return (Math.random() * (max - min + 1)) + min;
	}

	function arrRemove(array, from, to) {
		var rest = array.slice((to || from) + 1 || array.length);
		array.length = from < 0 ? array.length + from : from;
		return array.push.apply(array, rest);
	};

	function Game(handler) {
		var game = this;

		/* Constants */
		this.WIDTH = 2500;
		this.HEIGHT = 2500;
		this.STATES = 300;
		this.TICK_RATE = Math.round(1000 / 30);
		this.CMD_RATE = Math.round(1000 / 30);
		this.TRANSFER_RATE = 0.05;
		this.STATE_BUFFER_TIME = this.TICK_RATE * 3;
		this.MAX_LATENCY = 100;

		// State specific
		this.state = { entities: [], entityMap: {} };
		this.deltaState = {};
		this.stateBuffer = [];
		this.updateCount = 0;

		// Buffers
		this.entityBuffer = [];
		this.commandBuffer = {};
		this.scheduleBuffer = [];
		this.collisionBuffer = {};

		// Trackers
		this.me = null;
		this.lastID = 0;

		// Setup accurate game timer
		this.timer = new Timer(this.TICK_RATE, function(date) {
			game.update(date);
			game.onTick && game.onTick(date);
		});

		// Event handler
		this.eventHandler = handler || { fire: function() {} }
	};

	Game.instanceMap = {
		'player': {
			'user': Players.User,
			'bot': Players.Bot
		},
		'object': {
			'asteroid': Asteroid
		},
		'bullet': {
			'bullet': Bullet
		},
		'powerup': {
			'shield': Powerups.Shield,
			'shieldup': Powerups.ShieldUp
		}
	};

	Game.prototype._instantiateType = function(type, subtype, entity) {
		var constr = (Game.instanceMap[type] || {})[subtype];

		// Depending on type, instantiate.
		return constr ? new constr(entity, this) : false;
	}

	Game.prototype._instantiate = function(entity) {
		return this._instantiateType(entity.type, entity.subtype, entity);
	}

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

	Game.prototype.schedule = function(callback, ms, repeat) {
		callback._ms = ms || 0; callback._timeStamp = Date.now();
		this.scheduleBuffer.push([ callback, ms || 0, repeat ]);
	};

	Game.prototype.queueCommand = function(id, data) {
		var buffer = this.commandBuffer;
		
		if(typeof buffer[id] === 'undefined') { buffer[id] = []; }
		buffer[id] = buffer[id].concat(data);

		return this;
	};

	/**
	 * Regiser a change to the game state for delta compression
	 */
	Game.prototype.registerChange = function(type, id, prop, val) {
		var delta = this.deltaState;

		// Object sanity checks
		if(typeof delta[type] === 'undefined') { delta[type] = {}; }
		if(typeof delta[type][id] === 'undefined') { delta[type][id] = {}; }

		// Check if we're overwriting previous objects...
		if(typeof val !== 'undefined') {
			// If not defined... define it
			if(typeof delta[type][id] === 'undefined') { delta[type][id] = {}; }
			delta[type][id][prop] = val;
		}
		else {
			delta[type][id] = prop;
		}
	}

	/**
	 * Register an event to the game state for delta compression
	 */
	Game.prototype.registerEvent = function(event) {
		var delta = this.deltaState;

		// Push object onto the array
		if(typeof delta.events === 'undefined') { delta.events = []; }
		delta.events.push(event);
	}

	/**
	 * Calculcate the game state based on a delta
	 */
	Game.prototype.computeState = function(delta) {
		var state = this.state,
			schedule = this.scheduleBuffer,
			entities = state.entities,
			entityBuffer = this.entityBuffer,
			entityCount, entity, entity2, outside, 
			commands, command, collisionType,
			ongoingSchedules = [], newEntities = [],
			newMap = {}, i, result, j, task, colDelta;

		// Reset the delta state
		this.deltaState = {};

		// Set the state timestamp
		state.timeStamp = this.state.timeStamp + delta;

		// Add any buffered entities
		i = entityBuffer.length;
		while((entity = entityBuffer[--i])) {
			state.entityMap[ entity.id ] = entities.push( entityBuffer.shift() ) - 1;
		}

		// Execute user commands first
		i = entities.length;
		while((entity = entities[--i])) {
			if(!(commands = this.commandBuffer[ entity.id ])) { continue; }

			// Execute user commands
			while((command = commands.shift())) {
				entity.handleCmd(command);
			}
		}

		// Execute scheduled changes
		i = schedule.length;
		while((task = schedule[--i])) {
			result = (task[1] -= delta) <= 0 ? task[0].call(this, Date.now(), delta) : true;
			if(task[1] > 0 || (task[2] && result !== false && (task[1] = task[0]._ms))) {
				ongoingSchedules.push(task);
			}
		}
		this.scheduleBuffer = ongoingSchedules;

		// Check for intersections and world boundaries
		entityCount = entities.length;
		for(i = 0; i < entityCount; i++) {
			if(!(entity = entities[i])) { continue; }

			// Remove entity if needed
			if(entity.remove) { continue;}

			// Check for collisions with other objects
			for(j = i + 1; j < entityCount; j++) {
				if(!(entity2 = entities[j]) || entity2.remove) { continue; }
				collisionType = entity.type + entity2.type;

				/**
				 * Check to see if an intersectio is about to occur between the two
				 * objects within the next time tick.... if so, we need to adjust the
				 * position of first object to ensure it's in the correct position so
				 * our elastic collision angles are precise.
				 */
				colDelta = entity.predictIntersection(entity2, delta, 0, 1);
				if(colDelta) { entity.computeState(colDelta[0]); }

				/*
				 * Check intersection of the two objects if:
				 * 	1. The objects are collidable (per-entity setting)
				 * 	2. The owner of one object is not the other
				 * 	3. The entity will intersect on its current trajectory and...
				 * 	4. If the above is true, they are actually colliding
				 */
				if(entity.collidable && entity2.collidable && entity.owner !== entity2.id &&
					entity2.owner !== entity.id && collisionType !== 'bulletbullet' &&
					entity.willIntersect(entity2) && entity.intersects(entity2)) {

					// Handle different collision types
					handled = false;
					switch(entity.type+entity2.type) {
						// Player collides with a bullet
						case 'bulletplayer': case 'bulletobject':
						case 'playerbullet': case 'objectbullet':
							entity.handleHit(entity2);
							break;

						// Player collides with a power up
						case 'powerupplayer':
						case 'playerpowerup':
							entity2.activate && entity2.activate(entity);
							entity.activate && entity.activate(entity2);
							handled = true;
							break;
					}

					// If the collision wasn't handled... collide!
					if(!handled) { this._handleCollision(entity, entity2); }
				}
			}

			// Otherwise just compute the new state using our delta
			entity.computeState(delta);

			// Loop entitys round the world
			if( (outside = entity.outsideWorld(this.WIDTH, this.HEIGHT)) ) {
				if(outside[0] !== 0) { entity.pos[0] += (outside[0] < 0 ? 1 : -1) * this.WIDTH }
				if(outside[1] !== 0) { entity.pos[1] += (outside[1] < 0 ? 1 : -1) * this.HEIGHT }
			}

			// Add entities to new array and mapping
			newMap[ entity.id ] = newEntities.push(entity) - 1;
		}

		// Reset objects
		this.state.entities = newEntities.concat();
		this.state.entityMap = newMap;
	};

	/*
	 * Elastic collision calculator
	 *
	 * Derived from the Vobarian Software article
	 * http://www.vobarian.com/collisions/2dcollisions2.pdf
	 */
	Game.prototype._handleCollision = function(entity1, entity2) {
		var m1 = entity1.mass, m2 = entity2.mass, ms = m1 + m2,
			v1 = entity1.velocity, v2 = entity2.velocity,
			normal, distance, tangent, v1n, v1t, v2n, v2t, vd1n, vd2n,
			adjust, adjust1, adjusted2;

		/*
		 * Calculate our uni normal vector, which is the difference between the two
		 * center positions of our circles (entity radius'), divided by its magnitude.
		 */
		normal = vec3.subtract(entity1.pos, entity2.pos, vec3.create());
		vec3.normalize(normal);

		// Using the unit normal vector above, calculate the unit tangent vector
		tangent = vec3.create([ -normal[1], normal[0], 0 ]);

		// Resolve velocity vectors into unit normal/tangent scalars via dot products
		v1n = vec3.dot(normal, v1); v1t = vec3.dot(tangent, v1);
		v2n = vec3.dot(normal, v2); v2t = vec3.dot(tangent, v2);

		// Calculate the new normal velocities using the 1-dimensional elastic body equations
		vd1n = (v1n*(m1 - m2) + 2*(m2 * v2n)) / ms; vd2n = (v2n*(m2 - m1) + 2*(m1 * v1n)) / ms;

		/*
		 * Final velocities are then calculated by adding together one unit vector
		 * scaled by the uni normal and one by the unit tangent
		 */
		vec3.add( vec3.scale(normal, vd1n, []), vec3.scale(tangent, v1t, []), v1);
		vec3.add( vec3.scale(normal, vd2n, []), vec3.scale(tangent, v2t, []), v2);

		// Calculate health/shield adjustment based on the velocities and masses
		adjust = -Math.abs((m2 / m1) * (v2n / v2n));

		// Adjust entity shield strengths if possible
		adjusted1 = entity1.adjustShield && entity1.adjustShield(adjust * 3);
		adjusted2 = entity2.adjustShield && entity2.adjustShield((1 / adjust) * 3);

		// Adjust entity health if possible (and we haven't adjusted anything else)
		entity1.adjustHealth && !adjusted1 && entity1.adjustHealth(adjust * 3);
		entity2.adjustHealth && !adjusted2 && entity2.adjustHealth((1 / adjust) * 3);

		// Register velocity changes
		entity1.registerChange('velocity');
		entity2.registerChange('velocity');

		// Register event
		entity1.registerEvent('collision', entity2.id);
	}

	Game.prototype.queueEntity = function(entity) {
		return this.entityBuffer.push(entity), entity;
	};

	Game.prototype._addEntity = function(entity) {
		return this.state.entityMap[ entity.id ] = this.state.entities.push(entity) - 1, entity;
	};

	Game.prototype._addPlayer = function(type, data) {
		var entities = this.state.entities, player;

		// Create player
		player = this._instantiateType('player', type, data);

		// Find the next closest slot available and map it
		return this._addEntity(player);
	};

	Game.prototype.join = function(id, data) {
		return this._addPlayer('user', data || {
			id: id,
			pos: vec3.create([
				random(0, this.WIDTH),
				random(0, this.HEIGHT),
				0
			])
		});
	};

	Game.prototype.addBot = function(id) {
		var e = this._addPlayer('bot', {
			id: id,
			pos: vec3.create([
				random(0, this.WIDTH),
				random(0, this.HEIGHT),
				0
			]),
			velocity: vec3.create([
				random(-2, 2) / 10,
				random(-2, 2) / 10,
				0
			]),
			angle: random(0, Math.PI / 2)
		});

		// Register it
		e.registerChange( e.toJSON() );

		return e;
	};

	Game.prototype.leave = function(id) {
		var entity = this.getPlayerById(id);

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
	Game.prototype.load = function(state) {
		var entities = state.entities,
			entityMap = state.entityMap,
			me, me2, i = -1, j,
			stateBuffer = this.stateBuffer,
			state, entity, len, me, e;

		// Setup new state
		this.state = state = {
			entities: [],
			entityMap: {},
			timeStamp: state.timeStamp.valueOf()
		}

		while(entities[++i]) {
			entity = entities[i];

			// If it was a vlid entity type...
			if((e = this._instantiate(entity))) {
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
			stateBuffer = this.stateBuffer,
			callback, i, e;

		// Push the delta state onto the buffer
		len = stateBuffer.push(delta);
		if(len > (this.STATE_BUFFER_TIME / this.TICK_RATE)) { stateBuffer.shift(); }

		// Process entity changes
		for(i in deltaEntities) {
			deltaEntity = deltaEntities[i];
			entity = entities[ entityMap[ i ] ];

			// If we're removing the entity... go!
			if(entity && deltaEntity.remove) {
				// Destory the entity and remove it from the entity map
				entity.remove = true;
				delete entityMap[i];
			}
			
			// Create new entity if we haven't seen it before
			else if(!entity) {
				entity = deltaEntity;

				// Make sure we aren't re-creating an entity
				if(!state.entityMap[ entity.id ]) {
					// Push into state entity array if type was valid
					if((e = this._instantiate(entity))) {
						entityMap[ entity.id ] = entities.push(e) - 1;
					}
				}
			}

			// Merge the delta state into our entity object
			else { entity.mergeDelta(deltaEntity); }
		}

		// Process events
		i = events.length;
		while((event = events[--i])) {
			this.eventHandler.fire(event.shift(), event, this);
		}
	};

	Game.prototype.getEntityById = function(id) {
		return this.state.entities[ this.state.entityMap[id] ] || false;
	};

	Game.prototype.getPlayerById = function(id) {
		var entity = this.getEntityById(id);
		return entity && entity.type === 'player' ? entity : false;
	};

	Game.prototype.entityExists = function(id) { return !!this.getEntityById(id); };
	Game.prototype.playerExists = function(id) { return !!this.getPlayerById(id); };

	exports.Game = Game;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');
