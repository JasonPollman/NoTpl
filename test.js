// Grab the spry object
var notpl = require('./notpl.js');

// Set your options, and scope to pass into the template
var options = { style: 'compressed' };
var scope = {
  
  foo: 'foo',
  bar: 'bar',

  // etc. etc.
}

// Create the template
var template = notpl.new('test.html', options, scope);
var output1 = template.render();

scope.foo = 'baz';

// Now, change scope.foo and re-render
var output2 = template.render();

// Do whatever with output... perhaps, pass it to the request.
console.log(output1, output2);
