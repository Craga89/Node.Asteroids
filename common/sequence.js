(function(exports) {

	var Sequence = {},
		sequenceNo = 0,
		max  = 4000;

	Sequence.create = function(data) {
		return [
			(sequenceNo = sequenceNo++ > max ? 0 : sequenceNo), data
		];
	};

	Sequence.reply = function(seq, data) {
		return [
			seq, data
		];
	};

	exports.Sequence = Sequence;

})(typeof global === 'undefined' ? window : exports);