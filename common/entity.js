(function(exports, CLIENT) {
	// Import modules as needed
	if(!CLIENT) { require('./glmatrix.min.js'); }

	/**
	 * Entity class - Represents an object within the game
	 */
	function Entity(subclass) {
		// Merge Entity defaults with subclasses
		Entity._merge(Entity, subclass.defaults, Entity.defaults, subclass.defaults);
	};

	/**
	 * World entity defaults
	 */
	Entity.defaults = {
		'id': 'Unknown',
		'type': 'entity',
		'subtype': 'unknown',
		'deltaScope': 'entities',
 
		'pos': [ 0, 0, 0],
		'lastPos': [ 0, 0, 0 ],
		'velocity': [ 0, 0, 0 ],
		'acceleration': [ 1, 1, 0 ],
		'collidable': true, // Setting this to false is lulz
 
		'angle': 0,
		'angularVel': 0,
 
		'mass': 10,
		'radius': 5,
 
		'remove': false
	};

	/**
	 * Merges two Entitys of the same constructor together.
	 *
	 */
	Entity._merge = function(cons, dest, obj, obj2) {
		var func = cons._mergeFunc, props, p, i;

		// Create the merge function if one isn't already defined
		if(!func) {
			func = '';

			// Merge the properties
			if((props = cons.defaults)) {
				for(p in props) {
					func += 'val = obj3 && typeof obj3.'+p+' !== "undefined" ? obj3.'+p+' : obj2.'+p+';' +
						'if(typeof val !== "undefined") {' +
							'obj.'+p+' = val.splice || val.buffer ? [ val[0], val[1], val[2] ] : val;' +
						'} ';
				}
			}

			// Create and set the new function
			func = cons._mergeFunc = new Function('obj', 'obj2', 'obj3', func);
		}

		// Run the merge function and return this object
		return func(dest, obj, obj2), dest;
	};

	/**
	 * Sets up the entity with the pass parameters
	 * and entity default values
	 */
	Entity.prototype.setup = function(params) {
		var cons = this.constructor;
		return Entity._merge(cons, this, cons.defaults, params);
	}
	
	/**
	 * Sets entity parameters to passed values
	 *
	 * This only effects the Entity defaults for the
	 * particular subclass (Player, Bullet etc)
	 */
	Entity.prototype.set = function(params) {
		return Entity._merge(this.constructor, this,  params);
	}

	/**
	 * This must be overriden
	 */
	Entity.prototype.computeState = function(delta) {};

	/**
	 * Collision handler... override this ideally
	 */
	Entity.prototype.handleCollision = function(entity) {
		// Pawn off the collision to the other entity if it has a handler
		if(entity.handleCollision !== this.handleCollision) {
			entity.handleCollision(this);
		}
	};

	/**
	 * Collision handler... override this ideally
	 */
	Entity.prototype.handleHit = function(entity) {
		// Pawn off the collision to the other entity if it has a handler
		if(entity.handleHit !== this.handleHit) {
			entity.handleHit(this);
		}
	};

	/**
	 * Merges properties from a delta entity
	 */
	Entity.prototype.mergeDelta = function(delta) {
		return Entity._merge(this.constructor, this, delta);
	}

	/**
	 * Copies this Entity to a new JSON Object
	 */
	Entity.prototype.toJSON = function() {
		return Entity._merge(this.constructor, {}, this);
	};

	/**
	 * Calculcates the distance to another entity
	 */
	Entity.prototype.distanceTo = function(entity) {
		return vec3.dist(this.pos, entity.pos);
	};

	/*
	 * Determines if this Entity intersects with the passed Entity
	 */
	Entity.prototype.intersects = function(entity) {
		return this.distanceTo(entity) < (this.radius + entity.radius) + 0.01;
	};

	/*
	 * Determines if two balls are going to intersect at current speed/angle
	 */
	Entity.prototype.willIntersect = function(entity) {
		var p1 = this.pos, p2 = entity.pos, v1 = this.velocity, v2 = entity.velocity;
		return (p2[0] - p1[0]) * (v1[0] - v2[0]) + (p2[1] - p1[1]) * (v1[1] - v2[1]) > 0;
	};

	/**
	 * Determines if the Entity is outside the world parameters
	 */
	Entity.prototype.outsideWorld = function(width, height) {
		var r = this.radius, adjust = 0,
			minX = this.pos[0] + adjust < r, maxX = this.pos[0] + r - adjust > width,
			minY = this.pos[1] + adjust < r, maxY = this.pos[1] + r - adjust > height;

		// If any of the conditions are true... return array
		if(minX || maxX || minY || maxY) {
			return [
				minX ? -1 : maxX ? 1 : 0,
				minY ? -1 : maxY ? 1 : 0
			];
		}

		return false;
	};

	Entity.prototype.registerChange = function(prop, val) {
		if(typeof val === 'undefined' && typeof prop === 'string') { val = this[prop]; }
		this._game.registerChange(this.deltaScope, this.id, prop, val);
	};

	Entity.prototype.registerEvent = function() {
		var args = [].splice.call(arguments, 0); args.splice(1, 0, this.id);
		this._game.registerEvent(args);
	}
	
	Entity.prototype.destroy = function() {
		this.remove = true;
		this.registerChange('remove', true);
		this.registerEvent('destroy', this.id);
	};

	exports.Entity = Entity;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');