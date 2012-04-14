(function(exports, CLIENT) {
	var Entity = (CLIENT ? exports : require('./entity')).Entity;

	// Import modules as needed
	if(!CLIENT) { require('./glmatrix.min.js'); }

	/**
	 * Asteroid class
	 *
	 * Represents an asteroid in the game
	 */
	function Asteroid(params, game) {
		// Internal properties
		this._game = game;

		// Main properties
		this.id = params.id;
		this.type = 'object';
		this.subtype = 'asteroid';

		// Vectors
		this.pos = vec3.create(params.pos);
		this.lastPos = vec3.create(params.lastPos || params.pos);
		this.velocity = vec3.create(params.velocity);

		// Angle properties
		this.angularVel = params.angularVelocity || (Math.PI / 8);
		this.angle = params.angle || 0;

		// Set properties
		this.radius = params.radius || 18;
		this.health = this.radius * 10;
	};

	// Inherit from Entity
	Asteroid.prototype = new Entity();
	Asteroid.prototype._super = Entity.prototype;
	Asteroid.prototype.constructor = Asteroid;

	// Merge properties
	Asteroid._mergeProps = Entity._mergeProps.concat([ 'angle', 'angularVelocity', 'health' ]);

	Asteroid.prototype.computeState = function(delta) {
		var pos = this.pos,
			vel = this.velocity;

		// Set last pos
		vec3.set(pos, this.lastPos);

		// Add rotation
		this.angle += this.angularVel;
		this.registerChange('angle');

		// Calculate new position based on velocity
		vec3.add(pos, [ vel[0] * delta, vel[1] * delta, 0 ]);
		this.registerChange('pos');
	};


	Asteroid.prototype.handleCollision = function(entity) {
		var collision, distance, aci, bci;

		/*
		 * Calculate difference vector based on each entities position.
		 * Scale the result by the combined radius of each object
		 */
		collision = vec3.subtract(this.pos, entity.pos, vec3.create());
		distance = vec3.length(collision);

		// Make sure the distance is within bounds and normalize collision vector
		if(distance === 0) { collision = vec3.create([ 1, 1, 0 ]); }
		vec3.normalize(collision);

		// Calculate impulses via dot product
		aci = vec3.dot(this.velocity, collision);
		bci = vec3.dot(entity.velocity, collision);

		// Adjust shield strength of player if it was one
		if(entity.type === 'player') {
			entity.adjustShield( -((1 - Math.abs(bci)) * 15) );
		}
		else if(entity.subtype === 'asteroid') {
			entity.adjustHealth( -((1 - Math.abs(bci)) * 15) );
		}

		// Adjust asteroid health
		this.adjustHealth( -((1 - Math.abs(aci)) * 15) );

		// Scale velocity using impulse/forces above
		vec3.scale(collision, bci - aci, this.velocity);
		vec3.scale(collision, aci - bci, entity.velocity);

		// Register velocity changes
		this.registerChange('velocity');
		entity.registerChange('velocity');

		// Register event
		this.registerEvent('collision', entity.id);
	};

	Asteroid.prototype.setHealth = function(val) {
		if(val !== this.health) {
			this.health = val;
			this.registerChange('health', Math.floor(val));
		}
	};

	Asteroid.prototype.adjustHealth = function(amount) {
		var newHealth = this.health + amount;

		// Set shield strength
		this.setHealth(Math.max(Math.min(100, newHealth), 0));
	};

	Asteroid.prototype.handleHit = function(bullet) {
		var health = this.health,
			amount = bullet.strength * (1 / this.radius);

		// If shield is zero and we got hit... die!
		if((health - amount) <= 0) { this.destroy(); }

		// Reduce shield strength until zero...
		else{ this.adjustHealth(-amount); }

		// Remove bullet
		bullet.destroy();

		// Register event
		this.registerEvent('hit', bullet.id);
	};

	exports.Asteroid = Asteroid;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');