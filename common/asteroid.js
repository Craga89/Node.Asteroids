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
		this._game = game;

		// Set our parameters
		this.setup(params);

		// It's mass should be a function of it's radius
		this.mass = this.radius * 5;
	};

	// Defaults
	Asteroid.defaults = {
		type: 'object',
		subtype: 'asteroid',

		angularVel: Math.PI / 8,
		health: 100
	};

	// Inherit from Entity
	Asteroid.prototype = new Entity(Asteroid);
	Asteroid.prototype._super = Entity.prototype;
	Asteroid.prototype.constructor = Asteroid;

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