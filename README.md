# **Spry** (spry.js)
## Full JavaScript Serverside Template Engine

Remember the good old PHP days, when you could just write your PHP directly into webpages?
Well, Spry aims to do that with JavaScript.

Most template engines require you to learn their *usually tedious* API. Using Spry, all you need to know is HTML and JavaScript.

## Useage

#### Create a template file:

```html
<html>
  <head>
  </head>
  <body>
    <div>
      <$ for(var i in scope): $>
        <$ print(scope[i]); $>
      <$ endfor; $>
    </div>
  </body>
</html>
```

#### Render the template:

```javascript
// Grab the spry object
var spry = require('spry');

// Set your options, and scope to pass into the template
var options = { style: 'compressed' };
var scope = {
  
  foo: 'foo',
  bar: 'bar',

  // etc. etc.
}

// Create the template
var template = spry.new('test.html', options, scope);
var output1 = template.render();

scope.foo = 'baz';

// Now, change scope.foo and re-render
var output2 = template.render();

// Do whatever with output... perhaps, pass it to the request.
console.log(output1, output2);
```

> output1: ```html <html><head></head><body><div> foo bar </div></body></html>```
> output2: ```hmtl <html><head></head><body><div> baz bar </div></body></html>```

### Options
A list of keys for the 'options' object.
- **delimiterStart**:
  The starting tag to begin parsing JavaScript *(default: "<$")*.
- **delimiterEnd**:
  The end tag to stop parsing JavaScript *(default: "$>")*.
- **useAbsolutePaths**:
  Use absolute path when information is output to the console? *(default: false)*
- **code**:
  Used to render snippets rather than files. If code is true, Spry will render the string provided rather than try to load a file. *(default: false)*
- **reporting**:
  Level of console information output to the stdout. Takes an interger value. (default: 2)
  0. Report nothing.
  1. Report errors to the console.
  2. Report warnings and errors to the console.
  3. Report everything (errors, warnings, and notices).
- **style**:
  The output style. *(default: 'compressed')*
  1. compressed: The smallest output possible. No newlines, tabs, returns, etc. All spaces are truncated to a single space. Special HTML characters are escaped.
  2. compact: Sames as compressed, except that spaces are maintained.
  3. htmlified: Only HTML Escaping.
  4. *anything else*: Output is delievered the way it was given (newlines, tabs, etc. retained). No HTML Escaping.
- **haltOnError**:
  Setting this to true will throw an error, rather than ignoring it. It is recommended to set this to true. However, if a sub-template (partial) were to fail, the parent would still render. *(default: true)*
- **partialCacheLifetime**: 
  The time (ms) to return a partial render (just executing the template's javascript function), rather than performing a full-render. *(default: Number.INFINITY)*
- **fullCacheLifetime**
  The time (ms) that Spry will return the static cached output of a template rather than re-render it. Takes an integer value from 5 - Number.INFINITY. Note: The lower this setting, the higher the risk of an infinite loop if two template circularly reference each other (although unlikely). *(default: 2)*
- **output**:
  Write the template output to file? *(default: false)*
- **outputFormat**:
  The format of how the output file will be named as an array. *(default: ['atid', filename', 'ext'])*
  Options:
    1. atid: Truncated checksum (truncated template id)
    2. tid: The template id
    3. type: The type of render (full, partial, or static)
    4. filename: The base filename
    5. time: The time this render was completed
    6. ext: The file extension as defined by *options.outputExt*
- outputExt:
  The file extension of the output file. *(default: 'html')*