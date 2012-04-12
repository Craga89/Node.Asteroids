(function(exports, CLIENT) {
	var Entity = (CLIENT ? exports : require('./entity')).Entity;

	/**
	 * Powerup class
	 *
	 * Represents a power up in the game
	 */
	function Powerup() {
		this.type = 'powerup';
		this.deltaScope = 'entities';
		this.remove = false;

		this.sent = false;
	};

	// Inherit from Entity
	Powerup.prototype = new Entity();
	Powerup.prototype._super = Entity.prototype;
	Powerup.prototype.constructor = Powerup;

	// Merge properties
	Powerup._mergeProps = ['type', 'deltaScope', 'powerup', 'remove'];

	// Simply inform the server of this position
	Powerup.prototype.computeState = function(delta) {
		this.registerChange( this.toJSON() );
	}

	// Activates a powerup (destroys it)
	Powerup.prototype.activate = function(player) {
		this.registerEvent('powerup', player.id);
		this.destroy();
	}

	
	/**
	 * Shield regeneration
	 *
	 * Regenerates your shield by a given amount
	 */
	function Shield(params, game) {
		// Internals
		this._game = game;

		this.id = params.id;
		this.powerup = 'shield';
		this.pos = vec3.create(params.pos);

		this.power = 30;
		this.radius = 5;
	}

	// Merge properties
	Shield._mergeProps = Powerup._mergeProps.concat([
		'id', 'pos', 'power', 'radius'
	]);

	// Inherit from Entity
	Shield.prototype = new Powerup();
	Shield.prototype._super = Powerup.prototype;
	Shield.prototype.constructor = Shield;

	// Activates the power up on a particular player
	Shield.prototype.activate = function(player) {
		// Increase players shield
		player.adjustShield( this.power );

		// Call super-class method
		this._super.activate.apply(this, arguments);
	}

	//exports.Powerup = Powerup;
	if(CLIENT) { exports = exports.Powerups = {}; }

	exports.Shield = Shield;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');