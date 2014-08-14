# **NoTpl** (notpl.js)
#### The "No Template" Javascript Templating Engine

> **Remember the good old days when PHP reigned supreme and you could write your code directly into webpages?**
NoTpl aims to do just that with Node & JavaScript.

> Most js template engines require you to learn their *typically tedious* API. Using NoTpl, all you need to know is HTML and JavaScript.


## Contents:

* [About NoTpl](#about)
* [Useage](#useage)
  - [Create a template](#create)
  - [Render a template](#render)
* [Options](#options)
* [Developers](#dev)


## <a name="about"></a>About NoTpl:
Most JavaScript template engines such as Jade, doT, or Mustache require a special "templating syntax." Lexing and parsing these special syntaxes takes execution time and requires you to learn new markup.

NoTpl's philsophy is: *since a page is rendered by the browser in HTML, it should be (at least partially) written in HTML.* NoTpl removes "the middle man" and allows you to write **full** JavaScript within HTML documents (similar to PHP).

######How does it work?
Before a template is redered it is scanned by a scanner (see: scanner.js). As it scans the file, chunks of the file are inserted into an array. If a chunk is HTML it is wrapped within a `print()` function call. Once the file has been scanned, the array is joined, creating a string, and then a function is created from that string. The function is then executed to produce the template's rendered output.

Once a template has been scanned once, it doesn't need to be scanned again unless a file change is detected. Rather than re-scanning the whole file, the template's js function can simply be executed again to produce the "same output with different results," i.e. if a variable has been modified within the template's scope.

Additionally, you can use node modules from within templates using `require()`.


## <a name="useage"></a>Useage:

#### <a name="create"></a>1. Create a template file:

```HTML
<html>
  <head>
  </head>
  <body>
    <div>
      <$ for(var i in scope) {
        print(scope.i);
      } $>
    </div>
  </body>
</html>
```

#### ...or using the alternate syntax:

```HTML
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

#### <a name="render"></a>2. Render the template:

```JavaScript
// Grab the spry object
var notpl = require('notpl');

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
```

| *var output1 results* | *var output2 results* |
| ------------ | ----------- |
| ```HTML <html><head></head><body><div> foo bar </div></body></html>``` | ```HTML <html><head></head><body><div> baz bar </div></body></html>``` |


#### 3. Enjoy...
###### Use js anywhere in the template!

```HTML
<!-- Sample Useage -->
<html>
  <head>
    <$ print(scope.scripts) $>
    <$ print(scope.styles)  $>
  </head>
  <body>
    <div id="<$ print('foo-bar'); $>">
      <$ for(var i in scope) {
        print(scope.i);
      } $>
    </div>
    <div id="some-file-content">
      <$ // Read a file's contents and print it within this div..
        var fs = require('fs');
        print(fs.readSync('somefile.txt').toString());
      $>
    </div>
    <$ for(var i in scope.users): ?>
      <div id="user-<$ print(scope.users[i].id) $>">
        <$ print(scope.users[i].name); $>
      </div>
    <$ endfor; $>
  </body>
</html>
```

### <a name="options"></a>Options
A list of keys for the 'options' object.
- **delimiterStart**:
  * The starting tag to begin parsing JavaScript *(default: "<$")*.
- **delimiterEnd**:
  * The end tag to stop parsing JavaScript *(default: "$>")*.
- **useAbsolutePaths**:
  * Use absolute path when information is output to the console? *(default: false)*
- **code**:
  * Used to render snippets rather than files. If code is true, Spry will render the string provided rather than try to load a file. *(default: false)*
- **reporting**:
  * Level of console information output to the stdout. Takes an interger value. (default: 2)
  * Options:
    - *0* = Report nothing.
    - *1* = Report errors to the console.
    - *2* = Report warnings and errors to the console.
    - *3* = Report everything (errors, warnings, and notices).
- **style**:
  * The output style. *(default: 'compressed')*
  * Options
    - *compressed*: The smallest output possible. No newlines, tabs, returns, etc. All spaces are truncated to a single space. Special HTML characters are escaped.
    - *compact*: Sames as compressed, except that spaces are maintained.
    - *htmlified*: Only HTML Escaping.
    - *anything else*: Output is delievered the way it was given (newlines, tabs, etc. retained). No HTML Escaping.
- **haltOnError**:
  * Setting this to true will throw an error, rather than ignoring it. It is recommended to set this to true. However, if a sub-template (partial) were to fail, the parent would still render. *(default: true)*
- **partialCacheLifetime**: 
  * The time (ms) to return a partial render (just executing the template's javascript function), rather than performing a full-render. *(default: Number.INFINITY)*
- **fullCacheLifetime**
  * The time (ms) that Spry will return the static cached output of a template rather than re-render it. Takes an integer value from 5 - Number.INFINITY. Note: The lower this setting, the higher the risk of an infinite loop if two template circularly reference each other (although unlikely). *(default: 2)*
- **output**:
  * Write the template output to file? *(default: false)*
- **outputFormat**:
  * The format of how the output file will be named as an array. *(default: ['atid', filename', 'ext'])*
  * Options:
    - *atid*: Truncated checksum (truncated template id)
    - *tid*: The template id
    - *type*: The type of render (full, partial, or static)
    - *filename*: The base filename
    - *time*: The time this render was completed
    - *ext*: The file extension as defined by *options.outputExt*
- **outputExt**:
  * The file extension of the output file. *(default: 'html')*

## <a name="dev"></a>Developers
* "Jason Pollman"
  - <JPPuffNStuff@gmail.com>
  - https://github.com/PuffNStuff

