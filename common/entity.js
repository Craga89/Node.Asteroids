(function(exports, CLIENT) {
	// Import modules as needed
	if(!CLIENT) { require('./glmatrix.min.js'); }

	/**
	 * Entity class
	 *
	 * Represent an object within the game
	 */
	function Entity(params) {

	};

	// Merge properties
	Entity._mergeProps = ['id', 'type', 'pos', 'lastPos', 'velocity', 'acceleration', 'remove'];

	/**
	 * Special entity merge function
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

	Entity.prototype.toJSON = function() {
		var copy = {}, prop;
		for(var i in this) {
			if(this.hasOwnProperty(i) && i[0] !== '_') {
				prop = this[i];
				copy[i] = prop.toJSON ? prop.toJSON() :
					prop.buffer ? [prop[0], prop[1], prop[2]] :
					prop;
			}
		}

		return copy;
	};

	Entity.prototype.distanceTo = function(entity) {
		return vec3.dist(this.pos, entity.pos);
	};

	Entity.prototype.intersects = function(entity) {
		return this.distanceTo(entity) < (this.radius + entity.radius);
	};

	Entity.prototype.overlap = function(entity) {
		return this.radius + entity.radius - this.distanceTo(entity);
	};

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
	}

	exports.Entity = Entity;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');