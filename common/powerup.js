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
	Powerup._mergeProps = ['id', 'pos', 'type', 'subtype', 'powerup', 'radius', 'remove'];

	// Simply inform the server of this position
	Powerup.prototype.computeState = function(delta) {
		this.registerChange( this.toJSON() );
	}

	// Activates a powerup (destroys it)
	Powerup.prototype.activate = function(player) {
		this.registerEvent('powerup', this.subtype, player.id);
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
		this.subtype = 'shield';
		this.pos = vec3.create(params.pos);

		this.power = 30;
		this.radius = 5;
	}

	// Merge properties
	Shield._mergeProps = Powerup._mergeProps.concat([ 'power' ]);

	// Inherit from Entity
	Shield.prototype = new Powerup();
	Shield.prototype._super = Powerup.prototype;
	Shield.prototype.constructor = Shield;

	// Activates the power up on a particular player
	Shield.prototype.activate = function(player) {
		// Increase players shield (not above 100)
		if(player.shield + this.power <= 100) {
			player.adjustShield(this.power);
		};

		// Call super-class method
		this._super.activate.apply(this, arguments);
	}


	/**
	 * Shield power increase
	 *
	 * Increases your maximum shield power temporarily
	 */
	function ShieldUp(params, game) {
		// Internals
		this._game = game;

		this.id = params.id;
		this.subtype = 'shieldup';
		this.pos = vec3.create(params.pos);

		this.increase = 30;
		this.radius = 7;
	}

	// Merge properties
	ShieldUp._mergeProps = Powerup._mergeProps.concat([ 'increase' ]);

	// Inherit from Entity
	ShieldUp.prototype = new Powerup();
	ShieldUp.prototype._super = Powerup.prototype;
	ShieldUp.prototype.constructor = ShieldUp;

	// Activates the power up on a particular player
	ShieldUp.prototype.activate = function(player) {
		// Increase players shield to a new max based on increase
		player.setShield(
			player.shieldMax = 100 + this.increase
		);

		// Call super-class method
		this._super.activate.apply(this, arguments);
	}
	
	//exports.Powerup = Powerup;
	exports = CLIENT ? (exports.Powerups = {}) : exports;
	exports.Shield = Shield;
	exports.ShieldUp = ShieldUp;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');
