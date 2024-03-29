(function(exports) {
	// Array Remove - By John Resig (MIT Licensed)
	function arrRemove(array, from, to) {
		var rest = array.slice((to || from) + 1 || array.length);
		array.length = from < 0 ? array.length + from : from;
		return array.push.apply(array, rest);
	};

	/**
	 * Event handler calss
	 *
	 * Represents a power up in the game
	 */
	function EventHandler(events) {
		this._callbacks = {};
		
		this._handlers = {};
		this._handlerTemplate = ['var result;'];
		this._lastID = 0;

		// Bind the initial events if passed
		if(events) {
			for(i in events) { this.bind(i, events[i]); }
		}
	}

	/**
	 * Adds a new event listener for a parcticular event. The
	 * cumulative callbacks are cached and called as first as
	 * possible.
	 *
	 * Very similar to the Entity.merge system in Entity.js
	 */
	EventHandler.prototype.bind = function(event, callback) {
		var callbacks = this._callbacks,
			handlers = this._handlers,
			template = this._handlerTemplate,
			namespace, i;

		// Grab namespace if there is one
		namespace = event.split('.');
		event = namespace[0];
		namespace = namespace[1];

		// Add new handler
		if(typeof callbacks[event] === 'undefined') { callbacks[event] = []; }
		callbacks[event].push(callback)

		// Set callback ID and namespace
		i = callback._cid = this._lastID++;
		callback._ns = namespace;

		// Push callback into template
		template.push('if(typeof callbacks['+i+'] === "function") { result = callbacks['+i+'].apply(this, args); }');
		
		// Create our handler function
		handlers[event] = new Function( 'callbacks', 'args', template.join("\n") + '; return result' );

		return this;
	};

	EventHandler.prototype.fire = function(event, arguments, scope) {
		if(typeof this._handlers[event] === 'function') {
			this._handlers[event].call(scope || this, this._callbacks[event], arguments);
		}

		return this;
	};

	EventHandler.prototype.unbind = function(event) {
		var handlers = this._handlers,
			callbacks = this._callbacks,
			template = this._handlerTemplate,
			funcs, namespace;

		// Grab namespace if there is one
		namespace = event.split('.');
		event = namespace[0];
		namespace = namespace[1];

		// If we're removing a whole event, reset the properties
		if(!namespace) { callbacks[event] = []; delete handlers[event]; }

		// Otherwise only remove those events that match the namespace
		else {
			funcs = callbacks[event]; i = funcs.length;
			while(i--) {
				if(funcs[i]._ns === namespace) { arrRemove(funcs, i); }
			}
		}

		return this;
	}

	exports.EventHandler = EventHandler;

})(window);