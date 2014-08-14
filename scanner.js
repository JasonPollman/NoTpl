var Scanner = function (source) {
  
  // For global scoping
  var Scanner = this;

  // An array of the tokenized source string
  var tokens = Array();

  // The array pointer
  var pointer = 0;

  var newlines = Array();

  // Initiate the tokens array
  Scanner.init = Scanner.value = function (source) {

    var regexp = /\n/g;
    while (needle = regexp.exec(source)) newlines.push(needle.index);

    tokens = source.toString().split('');
    tokens.push('EOF'); 
    Scanner.reset();

    return Scanner;

  } // End Scanner.init()

  Scanner.last = function() {
    return Scanner.tokens[tokens.length - 2];
  }

  Scanner.length = function() {
    return tokens.length - 1;
  }

  Scanner.pos = Scanner.position = function() { return pointer; }

  // Return the token value at pointer
  Scanner.peek = function () { return (tokens[pointer] === 'EOF') ? tokens[pointer - 1] : tokens[pointer] }

  // Move the token pointer to 'pos.'
  Scanner.goto = function (pos) {
    pointer = (pos >= tokens.length) ? tokens.length - 1 : pos;
    return Scanner
  }

  // Get the line and column number as an array
  Scanner.line = function() {

    var i = 0;
    while(newlines[i] < pointer) i++;
    i--;

    var col = (pointer - (newlines[i] || 0)) + ((i < 0) ? 1 : 0);

    return [i + 2, col];
  }

  // Get the source as a string again.
  Scanner.source = Scanner.toString = function () {
    var temp = tokens.slice(0);
    temp.pop();
    return temp.join('')
  }

  // Set pointer to 0.
  Scanner.reset = function () { pointer = 0; return this }

  // Return from the pointer to the EOF
  Scanner.rest = function () {
    return tokens.slice(pointer, tokens.length - 1).join('');
  }

  // Return a portion of the scanner
  Scanner.range = function (x, y) {
    console.log("RANGE", x, y)
    return tokens.slice(x, y).join('');
  }


  // Check to see if we have reached the end of the tokens array
  Scanner.end = Scanner.eof = function () {
    return tokens[pointer] == 'EOF' ? true : false;
  }

  // Move the pointer forward by 'value' || 1, if no value is given.
  Scanner.next = function (value) {

    if(value != undefined) { // Increment by 'value'

      // Check that we didn't get a negative value.
      if(value < 0) throw new Error("Parameter 'value' must be greater than or equal to 0.");

      // Make sure that we got a number.
      if(typeof value !== 'number') throw new Error("Parameter 'value' must be an integer value.");

      // Make sure we haven't incremented past the end of the tokens array, if so, make the pos the
      // end of the tokens array.
      if(pointer + value > tokens.length - 1) value = tokens.length - pointer - 1;


      // Increment the Scanner's position by 'value.'
      Scanner.goto(pointer += value);
    }
    else { // Increment by 1

      Scanner.goto(++pointer);

    } // End if/else block

    return Scanner;

  } // End Scanner.next()

  // Move the pointer backward by 'value' || 1, if no value is given.
  Scanner.previous = function (value) {

    if(value != undefined) { // Increment by 'value'

      // Check that we didn't get a negative value.
      if(value < 0) throw new Error("Parameter 'value' must be greater than or equal to 0.");

      // Make sure that we got a number.
      if(typeof value !== 'number') throw new Error("Parameter 'value' must be an integer value.");

      // Make sure we haven't incremented past the beginning of the tokens array, if so, make the pos 0.
      if(pointer - value < 0) value = 0;

      // Decrement the Scanner's position by 'value.'
      Scanner.goto(pointer -= value);
    }
    else { // Decrement by 1

      Scanner.goto(--pointer);

    } // End if/else block

    return Scanner;

  } // End Scanner.previous()

  // Lookahead from the pointer 'value' values (including the pointer)
  Scanner.lookahead = function (value) {
    if(value > tokens.length - 2) value = tokens.length - 2;

    if(pointer < tokens.length - 2) {
        return tokens.slice(pointer, pointer + value + 1).join('')
    }
    else {
      return tokens.slice(pointer, tokens.length - 1).join('');
    }
  } 


  source !== undefined ? Scanner.init(source) : null;
  return this;

} // End Scanner Object Function

module.exports = Scanner;