var Powerups = require('../common/powerup');

function random(min, max) {
	return (Math.random() * (max - min + 1)) + min;
}

function Level() { }

Level.generate = function(game) {
	var state = {
		entities: [],
		entityMap: {},
		timeStamp: Date.now()
	},
	i, j, id;

	// Add some power ups
	for(i in Powerups) {
		for(j = 0; j < random(2, 20); j++) {
			id = 'powerup_' + (game.lastID++);
			state.entityMap[id] = -1 + state.entities.push(
				new Powerups[i]({
					id: id,
					pos: [
						random(0, game.WIDTH),
						random(0, game.HEIGHT),
						0
					]
				},
				game)
			)
		}
	}

	return state;
}

exports.Level = Level;