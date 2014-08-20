# **NoTpl** (notpl.js)
#### The "No Template" Javascript Templating Engine

> **Remember the "good old days" when PHP reigned supreme and you could write your code directly into webpages?**
NoTpl aims to do just that with Node & JavaScript.

> Most js template engines require you to learn their *typically tedious* API. Using NoTpl, all you need to know is HTML and JavaScript.


## Contents:

* [Install](#install)
* [Updates](#updates)
* [About NoTpl](#about)
* [Useage](#useage)
  - [Create a Template](#create)
  - [Render a Template](#render)
  - [Examples](#examples)
  - [NoTpl Helper Functions](#functions)
  - [The NoTplMgr Object](#notplmgr)
    * [Properties](#notplmgr-properties)
    * [Methods](#notplmgrclass-methods)
  - [The NoTpl Class](#notpl)
    * [Properties](#notpl-properties)
    * [Methods](#notpl-methods)
* [Options](#options)
* [To Do...](#todo)
* [Developers](#dev)


## <a name="install"></a>Install:
> $ npm install notpl

## <a name="updates"></a>Updates:
 * 8/21/14
  - Bugfixes
    * Fixed a bug that prevented changing the delimiters between renders.
    * Forced full render when delimiters are changed.
    * Fixed an bug that started parsing when the delimiter was found within quotes.
    * Testing for server-side (node) use.
 * 8/20/14
  - **Added support for client side rendering.**
    * Moved the scanner class inside the notpl.js file for client side purpose.
    * Added notpl.min.js
  - Bugfixes
    * Fixed setting 'options.code = true' from throwing error.
    * Fixed an bug that gave syntax errors when using the '//' comment notation.
    * Fixed detection of mismatched open/closing delimiters.
  - Documentation for client side coming soon.

## <a name="about"></a>About NoTpl:
Most JavaScript template engines require a special "templating syntax." Lexing and parsing these special syntaxes takes execution time and requires you to learn new markup.

NoTpl's philsophy is: *since a page is rendered by the browser in HTML, it should be (at least partially) written in HTML.* NoTpl removes "the middle man" and allows you to write **full** JavaScript within HTML documents (similar to PHP).

######How does it work?
Before a template is redered it is scanned by a scanner (see: scanner.js). As it scans the file, chunks of the file are inserted into an array. If a chunk is HTML it is wrapped within a `print()` function call. Once the file has been scanned, the array is joined, creating a string, and then a function is created from that string. The function is then executed to produce the template's rendered output.

Once a template has been scanned once, it doesn't need to be scanned again unless a file change is detected. Rather than re-scanning the whole file, the template's js function can simply be executed again to produce the "same output with different results," i.e. if a variable has been modified within the template's scope.

Additionally, you can use node modules from within templates using `require()`.


## <a name="useage"></a>Useage:

#### <a name="create"></a>1. Create a template file:

```
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

```
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
// Grab the notpl object
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
| --------------------- | --------------------- |
| ```<html><head></head><body><div> foo bar </div></body></html>``` | ```<html><head></head><body><div> baz bar </div></body></html>``` |


#### 3. Enjoy...
###### Use js anywhere in the template!

```
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
        print(fs.readFileSync('somefile.txt').toString());
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

### <a name="functions"></a>NoTpl Helper Functions
Within each template NoTpl provides a few pre-defined helper functions. **Do not reassign these variables!** Doing so could potentially break a template.

- **print(string)**:
  * Output *string* to the template. Works just like `print` or `echo` in php.
- **echo(string)**:
  * Alias for `print`
- **render(templateFilename, renderOptions, scope)**
  * Render another template from within this template. Note that the scope from the current template will be unavailable to the new template unless you explicitly pass it the `scope` object.


###<a name="examples"></a> Examples
###### Using `print`:
```
<!-- helloworld.html -->
<div>
  <$ print('hello world!'); $>
</div>
```
Rendering this template will produce:
> `<div>hello world!</div>`

###### Render a template from within another template:
```
<!-- Template #1 (people.html): -->
<!DOCTYPE html>
<html>
  <head>
  </head>
  <body id="page-people">
    <$ 
      var people = [
        { id: 0, name : { first: 'John',  last: 'Doe'   }, sex: 'male' },
        { id: 1, name : { first: 'Bruce', last: 'Wayne' }, sex: 'male' },
        { id: 2, name : { first: 'Bill',  last: 'Gates' }, sex: 'male' }
      ];

      // Note that we passed the scope as the third parameter...
      render('names.html', {}, people);
    $>
  </body>
</html>

<!-- Template #2 (names.html): -->
<div id="people">
  <$ var people = scope; $>
  <$ for(var i in people) print('<div id="name-' + people[i].id + '">', people[i].name.last, ', ', people[i].name.first, '</div>'); $>
</div>
```
```javascript
// Render people.html...
var notpl = require('./notpl.js');
var output = notpl.new('people.html').render();
console.log(output);
```

**Rendering this template will produce:**
```
<!DOCTYPE html>
<html>
  <head>
  </head>
  <body id="page-people">
    <div id="people">
      <div id="name-0">Doe, John</div>
      <div id="name-1">Wayne, Bruce</div>
      <div id="name-2">Gates, Bill</div>
    </div>
  </body>
</html>
```



### <a name="notplmgr"></a>The NoTplMgr Object
The `NoTplMgr` object is what is actually exported when you call `require` within node. It creates a CRUD like wrapper around the NoTpl class.

##### <a name="notplmgr-properties"></a>Properties:
- cache
  * An object that holds a reference to each template.
- stats
  * Returns an object that contains stats about each template in the cache, such as the last render duration, the last render type, the number of renders, etc.

##### <a name="notplmgr-methods"></a>Methods:
- **new(templateFilename, renderOptions, scope)**
  * Create a new template object (NoTpl object).
- **get(templateFilename)**
  * Returns the template with the filename `templateFilename`.
- **kill(templateObject)**
  * Remove a template object from the template cache (`NoTplMgr.cache`).


### <a name="notpl"></a>The NoTpl Class
The `NoTpl` class is the actual template class.

##### <a name="notpl-properties"></a>Properties:
*None accessible from outside the class scope*

##### <a name="notpl-methods"></a>Methods:
- **render(renderOptions)**
  * Renders the template with `renderOptions`
- **getStats()**
  * Return the `stats` object for this template.
- **toString()**
  * Returns the template's tid and filename.
- **update()**
  * Returns a partial render of the template if it has been fully rendered already, null otherwise.
- **output()**
  * Returns the output of the last render.


### <a name="options"></a>Options
A list of keys for the 'options' object.
- **delimiterStart**:
  * The starting tag to begin parsing JavaScript *(default: "<$")*.
- **delimiterEnd**:
  * The end tag to stop parsing JavaScript *(default: "$>")*.
- **useAbsolutePaths**:
  * Use absolute path when information is output to the console? *(default: false)*
- **code**:
  * Used to render snippets rather than files. If code is true, NoTpl will render the string provided rather than try to load a file. *(default: false)*
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
  * The time (ms) that NoTpl will return the static cached output of a template rather than re-render it. Takes an integer value *(default: 0 [0 = Never send just static, unless a circular reference is found])*
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
- **forceRender**
  * Force the template to render fully. *(default: undefined)*
- **name**
  * Give the template a name for technical purposes, replaces '[native code]' when rendering code. *(default: undefined)*
- **strict**
  * Gives the options to set "use strict" in the render function call. Note, this was added for client side support since many browsers behave badly in strict mode. *(default: true)*

### <a name="todo"></a>To Do...
* Better Error Handling:
  - Figure out a way to print template line numbers in thrown errors.
  - Better error detection/repair.
* Figure out a way to make the arguments `print`,`render`, and `echo` un-reassignable (immutable).
* Fix HTMLEscape() function (as of now, subsequent renders will "double escape" tokens turning the already escaped `&amp;` into `&amp;amp;`, for example... so escaping is currently unenabled.)

### <a name="dev"></a>Developer(s)?
* Jason "PuffNStuff" Pollman
  - <JPPuffNStuff@gmail.com>
  - https://github.com/PuffNStuff
