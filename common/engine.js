(function(exports, CLIENT) {
	var Timer = (CLIENT ? exports : require('./timer')).Timer,
		Player = (CLIENT ? exports : require('./player')).Player;

	function Game() {
		var game = this;

		/* Constants */
		this.WIDTH = 640;
		this.HEIGHT = 480;
		this.STATES = 300;
		this.TICK_RATE = Math.round(1000 / 10);
		this.CMD_RATE = Math.round(1000 / 30);
		this.LERP_RATE = Math.round(1000/ 100);
		this.MAX_LATENCY = 100;

		// State specific
		this.state = { entities: [], entityMap: {} };
		this.deltaState = {};
		this.updateCount = 0;

		// User command buffers
		this.commandBuffer = {};

		// Trackers
		this.me = null;

		// Setup accurate game timer
		this.timer = new Timer(this.TICK_RATE, function(date) {
			game.update(date);
			game.onTick && game.onTick(date);
		});

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

	Game.prototype.registerChange = function(type) {
		var delta = this.deltaState;

		switch(type) {
			case 'remove':
				delta.remove = delta.remove || [];
				delta.remove.push( arguments[1] );
				break;

			case 'entity':
				delta.entities = delta.entities || [];
				delta.entities.push( arguments[1] );
				break;
		}
	};

	Game.prototype.queueCommand = function(id, data) {
		return (this.commandBuffer[id] = (this.commandBuffer[id] || []).concat(data)), this;
	};

	Game.prototype.computeState = function(delta) {
		var state = this.state,
			entities = state.entities,
			entityCount = entities.length,
 			i = entities.length, k = 0, j, commands,
			entity, entity2, outside, velocity,
			collision, distance, aci, bci;

		// Reset the delta state
		this.deltaState = {};

		// Set the state timestamp
		state.timeStamp = this.state.timeStamp + delta;

		// Check for entity intersections
		entityCount = entities.length;
		for(i = 0; i < entityCount; i++) {
			if(!(entity = entities[i])) { continue; }

			// Remove entity if needed
			if(entity.remove) {
				delete entities[i];
				this.registerChange('remove', entity);
				continue;
			}

			// Execute user commands
			if((commands = this.commandBuffer[entity.id])) {
				for(k = 0; k < commands.length; k++) {
					entity.handleCmd( commands.shift() );
				}
			}

			// Compute new state and register it
			entity.computeState(delta);
			this.registerChange('entity', entity.toJSON());

			// Check for collisions with other objects
			for(j = i + 1; j < entityCount; j++) {
				if(!(entity2 = entities[j])) { continue; }

				if(entity.intersects(entity2) ) {
					/*
					 * Calculate difference vector based on each entities position.
					 * Scale the result by the combined radius of each object
					 */
					collision = vec3.subtract(entity.pos, entity2.pos, vec3.create());
					distance = vec3.length(collision);

					// Make sure the distance is within bounds and normalize collision vector
					if(distance === 0) { collision = vec3.create([ 1, 1, 0 ]); }
					vec3.normalize(collision);

					// Calculate impulses via dot product
					aci = vec3.dot(entity.velocity, collision);
					bci = vec3.dot(entity2.velocity, collision);

					// Scale velocity using impulse/forces above
					vec3.scale(collision, bci - aci, entity.velocity);
					vec3.scale(collision, aci - bci, entity2.velocity);
				}
			}

			// Check if entity is heading outside the world boundaries...
			if( (outside = entity.outsideWorld(this.WIDTH, this.HEIGHT)) ) {
				velocity = entity.velocity;

				// Bounce back
				if((velocity[0] > 0 && outside[0] > 0) || (velocity[0] < 0 && outside[0] < 0)) {
					velocity[0] *= -entity.rebound;
				}
				if((velocity[1] > 0 && outside[1] > 0) || (velocity[1] < 0 && outside[1] < 0)) {
					velocity[1] *= -entity.rebound;
				}
			}
		}
	};

	Game.prototype.join = function(id, data) {
		var entities = this.state.entities, player, i = 0;

		function random(min, max) {
			return Math.floor(Math.random() * (max - min + 1)) + min;
		}

		player = new Player(data || {
			id: id,
			pos: vec3.create([
				random(0, this.WIDTH),
				random(0, this.HEIGHT),
				0
			])
		});

		// Find the next closest slot available and map it
		while(entities[i++]); i-=1;
		this.state.entityMap[ id ] = i;

		return this.state.entities[i] = player;
	};

	Game.prototype.leave = function(id) {
		var entity = this.playerExists(id);

		// If entity exists, set remove flag and delete map
		if(entity) {
			delete this.state.entityMap[id];
			entity.remove = true;
		}
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
	 * @param {object} gameState JSON of the game state
	 */
	Game.prototype.load = function(state) {
		var entities = state.entities,
			i = entities.length, j,
			state, entity;

		this.state = state = {
			entities: [],
			entityMap: {},
			timeStamp: state.timeStamp.valueOf()
		}

		while(entities[--i]) {
			entity = entities[i];

			// Depending on type, instantiate.
			j = state.entities.push(
				entity.type === 'player' ? new Player(entity, this) :
				undefined
			);
			state.entityMap[ entity.id ] = j - 1;
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