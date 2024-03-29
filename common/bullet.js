(function(exports, CLIENT) {
	var Entity = (CLIENT ? exports : require('./entity')).Entity;

	// Import modules as needed
	if(!CLIENT) { require('./glmatrix.min.js'); }

	/**
	 * Bullet class
	 *
	 * Represent an object within the game
	 */
	function Bullet(params, game) {
		this._game = game;

		// Set our parameters
		this.setup(params);
	};

	// Defaults
	Bullet.defaults = {
		type: 'bullet',
		subtype: 'bullet',
		owner: 'Unknown',

		duration: 750,
		lifespan: 750,
		strength: 30,

		mass: 0.5,
		radius: 2
	};

	// Inherit from Entity
	Bullet.prototype = new Entity(Bullet);
	Bullet.prototype._super = Entity.prototype;
	Bullet.prototype.constructor = Bullet;

	Bullet.prototype.computeState = function(delta) {
		var game = this._game,
			id = this.id,
			pos = this.pos,
			vel = this.velocity;

		// Set last pos
		vec3.set(pos, this.lastPos);

		// If we're outside the weapons range... destroy it
		if((this.lifespan -= delta) <= 0) { return this.destroy(); }
		this.registerChange('lifespan');

		// Calculate new position based on velocity
		vec3.add(pos, [ vel[0] * delta, vel[1] * delta, 0 ]);

		// Register delta changes
		this.registerChange('pos');
	};

	exports.Bullet = Bullet;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');