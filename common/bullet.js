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
		// Internals
		this._game = game;

		this.id = params.id;
		this.type = this.subtype = 'bullet';
		this.owner = params.owner;

		this.pos = vec3.create(params.pos);
		this.initialPos = vec3.create(params.initialPos || params.pos);
		this.lastPos = vec3.create(params.lastPos || params.pos);
		this.velocity = vec3.create(params.velocity);
		this.angle = params.angle;

		this.range = params.range || 200;
		this.strength = params.strength || 30;
		this.radius = 2;
	};

	// Inherit from Entity
	Bullet.prototype = new Entity();
	Bullet.prototype._super = Entity.prototype;
	Bullet.prototype.constructor = Bullet;

	// Setup merge properties
	Bullet._mergeProps = Entity._mergeProps.concat([
		'owner', 'radius', 'angle', 'strength', 'range'
	]);

	Bullet.prototype.computeState = function(delta) {
		var game = this._game,
			id = this.id,
			pos = this.pos,
			vel = this.velocity,
			outside, player;

		// Set last pos
		vec3.set(pos, this.lastPos);

		// If we're outside the weapons range... destroy it
		if( vec3.dist(this.pos, this.initialPos) > this.range ) {
			return this.destroy();
		}

		// Calculate new position based on velocity
		vec3.add(pos, [ vel[0] * delta, vel[1] * delta, 0 ]);

		// Register delta changes
		this.registerChange('pos');
	};

	exports.Bullet = Bullet;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');