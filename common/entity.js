(function(exports, CLIENT) {
	// Import modules as needed
	if(!CLIENT) { require('./glmatrix.min.js'); }

	/**
	 * Entity class - Represents an object within the game
	 */
	function Entity(params) {
		this.deltaScope = 'entities';
	};

	/**
	 * This must be overriden
	 */
	Entity.prototype.computeState = function(delta) {};

	/**
	 * Determines which properties get merged when calling
	 * the .merge() method below.
	 */
	Entity._mergeProps = ['id', 'type', 'pos', 'lastPos', 'velocity', 'acceleration', 'remove'];

	/**
	 * Merges two Entitys of the same constructor together.
	 * 
	 * Only properties defined in the constructors _mergeProps
	 * array are copied over, due to the "caching" nature of this
	 * function.
	 */
	Entity.prototype.merge = function(entity, callbacks) {
		var cons = this.constructor,
			props, p, i, func;

		// Ensure both objects have the same constructor
		if(!(this instanceof entity.constructor)) { return; }

		// Create the merge function if one isn't already defined
		if(!cons._mergeFunc) {
			props = cons._mergeProps; i = props.length;

			func = 'if(!callbacks) { callbacks = {}; };';
			while((p = props[--i])) {
				func += 'if(typeof obj2.'+p+' !== "undefined") { ' +
					'obj.'+p+' = obj2.'+p+';' +
					'callbacks.'+p+' && callbacks.'+p+'(obj, "'+p+'", obj2.'+p+');' +
				"}\n";
			}

			// Create the new function
			cons._mergeFunc = new Function('obj', 'obj2', 'callbacks', func);
		}

		// Run the merge function
		cons._mergeFunc(this, entity, callbacks);
	}

	/**
	 * Copies the Entity to a JSON format
	 */
	Entity.prototype.toJSON = function() {
		var copy = {}, prop;
		for(var i in this) {
			if(this.hasOwnProperty(i) && i[0] !== '_') {
				if((prop = this[i])) {
					copy[i] = prop.toJSON ? prop.toJSON() :
						prop.buffer ? [prop[0], prop[1], prop[2]] :
						prop;
				}
			}
		}

		return copy;
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
		var r = this.radius,
			minX = this.pos[0] < r, maxX = this.pos[0] + r > width,
			minY = this.pos[1] < r, maxY = this.pos[1] + r > height;

		// If any of the conditions are true... return array
		if(minX || maxX || minY || maxY) {
			return [
				minX ? -1 : maxX ? 1 : 0,
				minY ? -1 : maxY ? 1 : 0
			];
		}

		return false;
	};

	Entity.prototype._registerChange = function(prop, val) {
		this._game.registerChange(this.deltaScope, this.id, prop, val);
	};
	
	Entity.prototype.destroy = function() {
		this.remove = true;
		this._registerChange('remove', true);
	};

	exports.Entity = Entity;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');