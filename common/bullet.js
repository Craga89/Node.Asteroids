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
		this.type = 'bullet';
		this.owner = params.owner;

		this.pos = vec3.create(params.pos);
		this.lastPos = vec3.create(params.lastPos || params.pos);
		this.velocity = vec3.create(params.velocity);

		this.radius = 2;
		this.angle = params.angle;
		this.strength = 30;
		
		this.remove = params.remove || false;
	};

	// Inherit from Entity
	Bullet.prototype = new Entity();
	Bullet.prototype._super = Entity.prototype;
	Bullet.prototype.constructor = Bullet;

	// Setup merge properties
	Bullet._mergeProps = Entity._mergeProps.concat([
		'owner', 'radius', 'angle', 'strength'
	]);

	Bullet.prototype.computeState = function(delta) {
		var game = this._game,
			id = this.id,
			pos = this.pos,
			vel = this.velocity,
			outside, player;

		// Set last pos
		vec3.set(pos, this.lastPos);

		// Calculate new position based on velocity
		vec3.add(pos, [ vel[0] * delta, vel[1] * delta, 0 ]);

		// Register delta changes
		game.registerChange(this.deltaScope, id, 'pos', pos, 2);
	};

	Bullet.prototype.destroy = function() {
		this.remove = true;
		this._game.registerChange(this.deltaScope, this.id, 'remove', true);
	};

	exports.Bullet = Bullet;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');