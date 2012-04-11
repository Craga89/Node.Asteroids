(function(exports, CLIENT) {
	// Import vec3 class if needed
	if(!CLIENT) { require('./glmatrix.min.js'); }

	/**
	 * Bullet class
	 *
	 * Represent an object within the game
	 */
	function Bullet(params) {
		params = params || defaults;

		this.id = params.id;
		this.type = 'bullet';
		this.owner = params.owner;

		this.pos = vec3.create(params.pos);
		this.lastPos = vec3.create(params.lastPos || params.pos);
		this.velocity = vec3.create(params.velocity);

		this.radius = 2;
		this.angle = params.angle;
		this.strength = 5;
		
		this.remove = params.remove || false;
	};

	Bullet.prototype.computeState = function(delta) {
		var pos = this.pos,
			vel = this.velocity,
			outside, player;

		// Set last pos
		vec3.set(pos, this.lastPos);

		// Calculate new position based on velocity
		vec3.add(pos, [ vel[0] * delta, vel[1] * delta, 0 ]);
	};

	Bullet.prototype.toJSON = function() {
		var copy = {}, prop;
		for(var i in this) {
			if(this.hasOwnProperty(i)) {
				prop = this[i];
				copy[i] = prop.toJSON ? prop.toJSON() :
					prop.buffer ? [prop[0], prop[1], prop[2]] :
					prop;
			}
		}

		return copy;
	};

	Bullet.prototype.distanceTo = function(entity) {
		return vec3.dist(this.pos, entity.pos);
	};

	Bullet.prototype.intersects = function(entity) {
		return this.distanceTo(entity) < (this.radius + entity.radius);
	};

	Bullet.prototype.outsideWorld = function(width, height) {
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

	exports.Bullet = Bullet;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');