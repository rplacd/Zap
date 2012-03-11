// Manage the UI - miscellaneous functionality, the "upper window" (or "status line"),
// and the "chat log", given a DOM element.
// Things that are ignored by the machine loop in the name of the UI (and the fact that we only
// support up to Zm standard V5) aren't implemented here.
function ZapLog(jqBsModalNode, jqChatLog, jqTopWindow) {
	// First off, set up the input buffering system...

	// Simple modal notification. Simple wrapper around Bootstrap - so it's's actually async!
	this.modalDialog = function(text) {
		jqBsModalNode.children(".modal-body").text(text);
		jqBsModalNode.modal({
			backdrop: true,
			keyboard: true
		});
	};
	
	// the "chat log".
	// *Very* basic input-output - but how do we plug in line-by-line input into per-character streams
	// as seen by the VM?
	// Simple - on an "enter":
	// - top up the text buffer
	// - demote the input area into the "archive" zone. (the z-machines v1-5 don't echo themselves.)
	// - add a new input area.
	// This should fit the normal use case - user inputs one line, VM reads it, chugs, outputs and
	// reads again without having to deal with the cognitive dissonance that comes from always-available input.
	this.lower_class = function() {	

		// First, first first - set up the screen - add the introductory text and the input field.
		// The input row is always assumed to always be the last item in the container.
		$("#log-container").append(Mustache.render(templates.computerEntry, {
			text: "Welcome to Zap - yet another Z-machine (versions 1 to 5, at least) implementation in JS! You'll see text from the computer written like this..."
		}));
		$("#log-container").append(Mustache.render(templates.userEntry, {
			text: "...and user input fed back to the screen like this. To get started, drag a story file into the top-right-hand drop zone."
		}));
		$("#log-container").append(Mustache.render(templates.inputRow, {
			text: "You'll want to start typing in this box."
		}));

		this.buffer = "";

		// A helper function that demotes the current inputRow, and adds a new one to the bottom.
		// !!!!!HARDCODES CONVERSION FROM INPUTROW TO USERENTRY!!!!!
		this.shiftInputUp = function() {
			$("#log-container > .row > .user-container > .input").removeClass("input").addClass("user").attr("contenteditable", "false");
			$("#log-container").append(Mustache.render(templates.inputRow, {
				text: ""
			}));
		};

		//InputRows bind this function to their onkeypress events - we trap enters.
		this.onKeyPressInInput = function(evt) {
            if (evt.keyCode == 13) {
            	//a-ha - now do something!

            	//absolute reference here - there doesn't seem to be a clear standard way of getting an event's original target.
            	var text = $("#log-container > .row > .user-container > .input").text();

            	//right now, we're just echoing.
            	this.shiftInputUp();
            	this.writeComputerLine(text);
				$("#log-container > .row > .user-container > .input").focus();

				//voodoo javascript!
	            evt.stopPropagation();
	            evt.preventDefault();
	            return false;
            } else {
            	return true;
            }
		};

		this.writeComputerLine = function(line) {
			//write a new line in before the row->user-container->input.
			$(".row>.user-container>.input").parent().parent().before(Mustache.render(templates.computerEntry, {text: line}));	
		};
		
		this.getChar = function() {
			if(this.buffer.length > 0) {
				return this.buffer.shift();
			} else {
				return "\u0004";
			}
		};
		
		this.eraseWindow = function() {
		
		};
	};
	this.lower = new this.lower_class();
	
	this.upper_class = function() {
		// the "upper window" (or "status line")
		// Curses-like access, does seem like a straight implementation of some ZM opcodes, doesn't it?
		// Start, though, at 0 height.
		
		this.cursorX = 0;
		this.cursorY = 0;
		// Width 80, height variable.
		this.linesArray = new Array();
		//jqTopWindow.height(0);
		
		this._redisplay = function() {
			//shouldn't be an expensive operation - shouldn't have to care whether we do this unnecessarily.
		
			// this leaves an errant "\n" at the end of the string displayed - but ignore that,
			// because it doesn't determine height and it's probably too expensive to remove anyway.
			var newText = _.flatten(_.map(this.linesArray, function(line) {
				return [line, "\n"];
			}));
			jqTopWindow.text(newText);
		};
		
		this.setHeight = function(height) {
			// First set the height... (very dependent on CSS!)
			jqTopWindow.height(18 * Math.max(height, 0));
			
			// Now carve the text array to fit.
			var tentative = this.linesArray.slice(0, height - 1);
			if(tentative.length != height) {
				var toppedUp = _.map(_.range(0, height), function(idx) {
					if(tentative[idx] != undefined) {
						tentative[idx];
					} else {
						"                                                                                "; // 80 chars - please let this not be a compile-time constant
					}
				});
				this.linesArray = toppedUp;
			} else {
				this.linesArray = tentative;
			}
			
			// And redisplay.
			this._redisplay();
		};
		
		this.setCursorPosition = function(x, y) {
			// Clamp if out of bounds.
			this.cursorX = Math.max(0, Math.min(x, 80));
			this.cursorY = Math.max(0, Math.min(y, linesArray.length - 1));
		};
		
		this.eraseLine = function() {
			var line = this.linesArray[this.cursorY];
			// Erase from the current position to the end of the line...
			for(var i = this.cursorX; i < 80; ++i) {
				line[i] = " ";
			}
		};
		
		this.eraseWindow = function() {
			this.linesArray = _.map(_range(this.linesArray.length), function(_idx) {
				return "                                                                                ";
			});;
		};
	}
	this.upper = new this.upper_class();
}