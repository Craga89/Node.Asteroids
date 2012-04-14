(function(exports, CLIENT) {
	// Import modules as needed
	if(!CLIENT) { require('./glmatrix.min.js'); }

	/**
	 * Entity class - Represents an object within the game
	 */
	function Entity() {
		this.deltaScope = 'entities';
		this.remove = false;
	};

	/**
	 * This must be overriden
	 */
	Entity.prototype.computeState = function(delta) {};

	/**
	 * Determines which properties get merged when calling
	 * the .merge() method below.
	 */
	Entity._mergeProps = ['id', 'type', 'subtype', 'pos', 'lastPos', 'velocity', 'acceleration', 'radius', 'remove'];

	/**
	 * Merges two Entitys of the same constructor together.
	 * 
	 * Only properties defined in the constructors _mergeProps
	 * array are copied over, due to the "caching" nature of this
	 * function.
	 */
	Entity.prototype.merge = function(entity) {
		var cons = this.constructor,
			entityCons = entity.constructor,
			copy = entityCons === Object,
			func = cons._mergeFunc,
			props, p, i;

		// Ensure both objects have the same constructor
		if(!(this instanceof cons)) { return false; }

		// Create the merge function if one isn't already defined
		if(!func) {
			func = '';

			// Merge the properties
			if((props = cons._mergeProps || entityCons._mergeProps) && (i = props.length)) {
				while((p = props[--i])) {
					func += 'if(typeof obj2.'+p+' !== "undefined") { ' +
						'obj.'+p+' = obj2.'+p+';' +
						//'callbacks.'+p+' && callbacks.'+p+'(obj, "'+p+'", obj2.'+p+');' +
					"}\n";
				}
			}

			// Create and set the new function
			func = cons._mergeFunc = new Function('obj', 'obj2', func);
		}

		// Run the merge function and return this object
		return func(this, entity), this;
	}

	/**
	 * Copies the to a new JSON Object
	 */
	Entity.prototype.toJSON = function() {
		return Entity.prototype.merge.call({}, this);
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
		return this.distanceTo(entity) < (this.radius + entity.radius);
	};

	/**
	 * Determines if the Entity is outside the world parameters
	 */
	Entity.prototype.outsideWorld = function(width, height) {
		var r = this.radius, adjust = r + r,
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