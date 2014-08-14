/**
 * @file    - notpl.js
 * @author  - Jason James Pollman
 * @created - 8/13/14
 *
 * > NoTpl: A fast, simple JavaScript templating solution.
 * ----------------------------------------------------------------------------------------------
 * This project's aim is to mimic the flexibility of PHP's ability to insert code directly into
 * HMTL — that is, to start and stop the parser. It is also an attempt to create a *simple*
 * JavaScript templating solution — where you don't have to learn, esentially, another
 * language or API.
 * 
 * NoTpl does this. Like PHP, you can insert Javascript directly into the code by using
 * delimiter tags (<$ and $> by default). Unlike using <script> tags, this can be done in
 * node from the backend. You also don't have to know anything other than js and html.
 *
 * > How it works:
 * ----------------------------------------------------------------------------------------------
 * As a template file is scanned, NoTpl breaks the template down into static (html) and 
 * dynamic (js) parts. The static parts are inserted into the js parts as they are parsed
 * as arguments to a "print" function which simply adds to the template output.
 * Once the file scanning is complete, the js parts molded into a single function
 * and is executed (rendered) to produce the output.
 *
 * Once the template has been scanned once, it no longer has to be scanner again until a file
 * change is detected. This will reduce render time, as the js function can simply be executed
 * again to render the template, with values changed.
 *
 *
 * > Example Useage:
 * ----------------------------------------------------------------------------------------------
 * // Grab the NoTpl object
 * var NoTpl = require('NoTpl');
 *
 * var options = {}   // See options below...
 * var scope = {}     // variables to pass into the template
 *
 * // Create the template
 * var template = NoTpl.new('path/to/template.html', options, scope);
 *
 * // Render the template
 * var output = template.render();
 *
 * // Do stuff with the output...
 *
 * ----------------------------------------------------------------------------------------------
 */

"use strict"

// Node core modules
var fs     = require('fs');
var crypto = require('crypto');
var path   = require('path');

// Dependencies
var cli = require('cli-color');

// A scanner to iterate throught files/strings
// one character at a time.
var scanner = require('./scanner.js');


/**
 * Computes the checksum of 'str'
 */
function checksum (str, algorithm, encoding) {
  return crypto
  .createHash(algorithm || 'md5')
  .update(str, 'utf8')
  .digest(encoding || 'hex')
}

/**
 * Encodes each character of param str with it's HTML equivalent code.
 */
function HTMLEncode (str) {

    var strArr = str.split('');

    var chars = {
      '"' : '&quot;',
      '&' : '&amp;',
      '<' : '&lt;',
      '>' : '&gt;',
    }

    for(var i = 0; i < strArr.length; i++) {
      if(chars[strArr[i]]) strArr[i] = chars[strArr[i]];
    }

    return strArr.join('');
}


/**
 * Returns the time in the HH:MM:SS format, with a trailing colon and space.
 */
function timestamp () {
  var now = new Date();
  return (pad(now.getHours(), 2) + ":" + pad(now.getMinutes(), 2) + ":" + pad(now.getSeconds(), 2) + " > ");
}


/**
 * Prefixes 'num' with 'size' zeroes.
 */
function pad (num, size) {
    var s = "000000000000000000000000000000000000000000000000" + num;
    return s.substr(s.length - size);
}

/**
 * Clones an object (deep copy)...
 * Untested on circular-referencing objects — it will loop forever.
 * YOU HAVE BEEN WARNED!
 */
function clone (obj) {

  var copy;

  if(obj == null || typeof obj != 'object') return obj;

  // Handle Date
  if(obj instanceof Date) {
    copy = new Date();
    return copy.setTime(obj.getTime());
  }

  // Handle Array
  if(obj instanceof Array) {
    copy = [];
    for(var i in obj) copy[i] = clone(obj[i]);
    return copy;
  }

  // Handle Object
  if(obj instanceof Object) {
    copy = {};
    for(var i in obj) if(obj.hasOwnProperty(i)) copy[i] = clone(obj[i]);
    return copy;
  }

  throw new Error("There was an unexpected error trying to clone" + obj.toString());

} // End clone function


/* -------------------------------------------------------------------
 * CLASS NoTpl
 * A full javascript/html templating solution...
 *
 * For all practical purposes the phrase 'tpl' means 'template'
 * and the phrase 'opts' means 'options' throughout this script.
 * ------------------------------------------------------------------- */
var NoTpl = function (tpl, opts, scope) {

  // For scope resolution
  var self = this;

  /* -------------------------------------------------------------------
   * CONFIG OBJECT
   * Various class configurations, unexposed to the end user,
   * e.g. the app's name, and version.
   * ------------------------------------------------------------------- */
  var config = {

    APPNAME:  'NoTpl',
    VERSION:  '0.1.0',

    // Output messages to the stdout.
    // Depending on the options.reporting parameter, messages may or may not print,
    // as defined by the end user. See: 'var log' below.
    messages: {

      get MSG_RENDER_SUCCESS () {
        log('notice', self.toString() + ' has been fully rendered (' + stats.lastRenderTime + ' ms).');
      },

      get MSG_PARTIAL_SUCCESS () {
        log('notice', self.toString() + ' has been partially rendered (' + stats.lastRenderTime + ' ms).');
      },

      get MSG_STATIC_SUCCESS () {
        log('notice', self.toString() + ' has been returned statically (' + stats.lastRenderTime + ' ms).');
      },

      get MSG_RENDER_FAILURE_UNEXPECTED () {
        log('error', 'Rendering of ' + self.toString() + ' has unexpectely failed (line:' + s.line()[0] + ').');
      },

      MSG_FUNCTION_SYNTAX_ERROR_DETECTED_FIXED: function (e) {
        log('warning', 'Syntax Error detected and repaired in ' + self.toString() + '.\n' + e + '.\n');
      },

      MSG_FUNCTION_ERROR_CAUGHT: function (e) {
        log('error', e.name + ' in ' + self.toString() + '. Rendering skipped, with message: \'' + e.message + '\'.');
      },

      MSG_RENDER_RECURSIVE_LOOP: function (template) {
        log('warning', self.toString() + ' and ' + template.toString() + ' recursively reference each other.\nInfinite loop detected and avoided.');
      },

    } // End messages object

  } // End config


  /* -------------------------------------------------------------------
   * OPTIONS OBJECT
   * The default template options, which can be modified during either
   * object instantiation, or before rendering (by passing arguments to
   * the options parameter in this.render()).
   * ------------------------------------------------------------------- */
  var options = {

    // The start/stop tags to signify that the user is writing js.
    // This should be atleast 2 characters long, and avoid the following
    // sequences ['{{', '}}, '((', '))', '{[', ']}']... or anything else 
    // that could break js syntax.
    delimiterStart   : "<$",
    delimiterStop    : "$>",

    // Ouput relative or absolute paths to the console when
    // giving user feedback? 
    // true = absolute, false = relative
    useAbsolutePaths : false,

    // Is this template a "code" string? This must be true,
    // otherwise you'll get a 'EONENT' (file not found) error.
    code             : false,

    // The level of console reporting
    // 0: None
    // 1: Errors Only
    // 2: Warnings & Errors
    // 3: Everything (Notices, Errors, & Warnings)
    reporting        : 3,

    // The output style
    // compressed : The smallest output possible. No newlines, tabs, returns, etc. All spaces are truncated to a single space.
    //              Special HTML characters are escaped.
    // compact    : Sames as compressed, except that spaces are maintained.
    // htmlified  : Only HTML Escaping.
    // (.*)?      : Output is delievered the way it was given (newlines, tabs, etc. retained). No HTML Escaping.
    style            : 'compressed',

    // Halt template rendering on error?
    // RECOMMENDED SETTING: true.
    // This could save a parent template, should a child template called with render() from within the
    // template fail, however, that still will not produce the desired output.
    haltOnError      : false,

    // *** Template Cache Types: Partial & Full ***
    // ------------------------------------------------------------------------------------------------------
    // Not Cached: Will scan the template file (or code) and render the template, executing the js (dynamic).
    // Partial   : Will re-render only the js portions of the template (faster, still dynamic).
    // Full      : Will return the previously rendered output (fastest, static).

    // *** Set these to 0 to disable caching and perform a full render each time this.render() is called ***

    // Will return a partial cache (partial render) of the template if the last render was less than
    // partialCacheLifetime ms.
    partialCacheLifetime: 1000,

    // Will return a full cache copy (static render) of the template if the last render was less than
    // fullCacheLifetime ms.
    fullCacheLifetime: 2,

    // Write the output to file after each render?
    output: false,

    // *** Format for the output filename ***
    // ------------------------------------------------------------------------------------------------------
    // This will concatenate the following items with a '-',
    // except for 'ext' which it will join with a '.'.
    //
    // 'tid'      => The template tid.
    // 'atid'     => The shortened version of the tid (e.g. tid.slice(-7))
    // 'time'     => The time of the rendering
    // 'filename' => The filename of the template
    // 'ext'      => The file extension (options.outputExt)
    // 'type'     => The render type (full, partial, static)
    //
    outputFormat: ['atid', 'type', 'filename', 'ext'],
    outputExt: 'html',

  } // End options


  /* -------------------------------------------------------------------
   * STATS OBJECT
   * Provides stats about the template, and its previous renderings.
   * Calling self.stats() returns a clone of this.
   * ------------------------------------------------------------------- */
  var stats = {

    get path() { return filename; },
    get lastFullRender () { return lastFullRender; },
    get lastRender() { return lastRender; },
    get lastRenderType() { return lastRenderType; },
    
    // Template stats
    templateInit: Date.now(),

    // The life of the template (ms).
    get lifetime() { return Date.now() - stats.templateInit },

    // *** Render stats *** //

    // The options used to render the template, during the last render.
    renderOptions: {},

    // The start and end times of the last render (unix timestamp)
    lastRenderStartTime : 0,
    lastRenderStopTime  : 0,

    // An array containing all of the render times.
    // Provides an array of 2 element arrays. With index 0 as the time, and index 1
    // as the type of render ('f' => full, 'p' => partial, 's' => static).
    renderTimes: [],

    get rendertimes () { 
      var ret = [];

      for(var i in this.renderTimes) {
        ret.push(this.renderTimes[i][0]);
      }

      return ret;

    }, // End rendertimes

    // The last render duration (ms).
    get lastRenderTime() { return stats.lastRenderStopTime - stats.lastRenderStartTime; },

    // The number of times each of the following types of rendering were performed.
    get renderCount () {
      return {
        'full'    : fullRenderCount,
        'partial' : partialRenderCount,
        'static'  : staticRenderCount,
      }
    }, // End renderCount getter

  } // End stats

  // Add the options to the stats object, so the end user can
  // identify "how" the template was rendered.
  for(var i in options) stats.renderOptions[i] = options[i];


  /*
   * Logs a message to the console, using a color based on the 'msg' type.
   */
  var log = function (type, msg) {

    var color;
    var typeOutput = ""

    switch(type) {

      case 'notice':
        if(options.reporting < 3) return;
        color = 122;
        typeOutput = '[Notice] ';
        break;

      case 'notice 2':
        if(options.reporting < 3) return;
        color = 33;
        typeOutput = '[Notice] ';
        break;

      case 'notice 3':
        if(options.reporting < 3) return;
        color = 92;
        typeOutput = '[Notice] ';
        break;

      case 'notice 4':
        if(options.reporting < 3) return;
        color = 22;
        typeOutput = '[Notice] ';
        break;

      case 'warn':
      case 'warning':
        if(options.reporting < 2) return;
        color = 220;
        typeOutput = '[Warning] ';
        break;

      case 'error':
      case 'failure':
        if(options.reporting < 1) return;
        color = 160;
        typeOutput = '[Error] ';
        break;

      default:
        if(options.reporting < 3) return;
        color = 122;
        typeOutput = '[Notice] ';

    } // End switch block

    console.log(cli.xterm(color)(typeOutput + timestamp() + msg));

  } // End log(type, msg)


  var filename = (options.code) ? '[native code]' : tpl;

  // Try to read the template file, if it is a file, otherwise use the
  // code provided (if options.code is true).
  tpl = (!options.code) ? fs.readFileSync(tpl).toString() : tpl;

  // The template's ID (File checksum)...
  var tid = checksum(tpl);

  // The rendered output, once the template is rendered,
  // the results will reside here.
  var rendered = [];

  // The array that will hold the static html portions of the template file.
  var html = [];

  // The array that will hold the js portions of the template file.
  var js = [];

  // The current dynamic block...
  var jsBlock = 0;

  // The current html block
  var htmlBlock = 0;

  // A temp to gather html strings while not listening only.
  var htmlString = "";

  // A temp to gather js strings while listening only.
  var jsString = "";

  // Add the template to the template cache,
  // so if the checksum of the file is the same,
  // we can just execute the template js function,
  // rather than perform a scan all over again.
  NoTplMgr.cache[tid] = {
    get tid() { return tid; },
    get path() { return filename; },
    get tpl() { return self; },
    get output() { return cleanupOutput(); },
    get lastFullRender () { return lastFullRender; },
    get lastRender() { return lastRender; },
    get lastRenderType() { return lastRenderType; }
  }

  // Will hold the scanner object, to tokenize the template input.
  var s;

  // Are we listening for js or html, i.e. are we inside the delimiters?
  // false = <html><div>...
  // true  = <% var i = ...
  var l = false;

  // To prevent the detection of opening/closing delimeters within quotes inside of of js,
  // these variables are true when within their respective (single or double) quotes.
  // This only applies when listening for js, as when not listening... a quote can 
  // (and should) be output to the rendered array (end results).
  var inquotesDouble = false;
  var inquotesSingle = false;

  // Alias for config.messages...
  var report = config.messages;

  // For all temp stuff...
  var temp;

  // For the stats object, the number of times:
  // 1. Fully Rendered.
  // 2. Partial Rendered (js function execution only).
  // 3. The output was simply returned (static render).
  var fullRenderCount    = 0;
  var partialRenderCount = 0;
  var staticRenderCount  = 0;
  var lastFullRender     = 'Never';
  var lastRender         = 'Never';
  var lastRenderType     = null;

  /*
   * Get the stats object...
   */
  self.stats = self.getStats = function () { return clone(stats); }

  /**
   * The constructor...
   * Note: this will be called below... see the very end of this script.
   */
  self.init = function () {

    // Adjust options with the user passed options (i.e. 'opts')
    setOptions(opts);

    // If we were passed a file, then inject the scanner with the file contents,
    // otherwise, just pass the code value into the scanner.
    s = new scanner(tpl);

  } // End self.init()


  /**
   * Returns the template id, or template alias if param 'alias' is true...
   */
  self.toString = function (alias) {
    return ((alias) ?
      tid.slice(-5) :
      'Template:' + tid.slice(-5) + ' (' + ((options.code == false) ?
        ((options.useAbsolutePaths != false) ? path.resolve(filename) : filename) :
        'native code') + ')');

  } // End self.toString()


  /**
   * Get the rendered output as a string
   */
  self.output = function() { return cleanupOutput() }

  /**
   * Render the template
   * @param opts: overrides the options set when creating the template object.
   */
  self.render = function (opts) {

    // If the template is in cache, and has been rendered once before, and we are within the full cache lifetime,
    // then return the static output from the last render.
    if(NoTplMgr.cache[tid] && (stats.renderCount.full > 0) && (Date.now() - lastFullRender < options.fullCacheLifetime)) {
      
      // Start the render timer.
      stats.lastRenderStartTime = Date.now();

      staticRenderCount++;
      lastRenderType = 's';

      // End the render timer.
      stats.lastRenderStopTime = Date.now();
      stats.renderTimes.push([stats.lastRenderTime, 's']);

      // Log the successful render to the console, if options.reporting > 2
      report.MSG_STATIC_SUCCESS;

    } // End if block

    // If the template is in cache, and has been rendered once before, and we are within the partial cache lifetime,
    // then execute the js function again, and return the new rendered output.
    else if(NoTplMgr.cache[tid] && stats.renderCount.full > 0 && Date.now() - lastFullRender < options.partialCacheLifetime) {

      // Start the render timer.
      stats.lastRenderStartTime = Date.now();

      // Execute the function again, to produce the partial output.
      functify();

      partialRenderCount++;
      lastRenderType = 'p';

      // End the render timer.
      stats.lastRenderStopTime = Date.now();
      stats.renderTimes.push([stats.lastRenderTime, 'p']);

      // Log the successful render to the console, if options.reporting > 2
      report.MSG_PARTIAL_SUCCESS;

    }
    
    // <------------------------------------- PERFORM A FULL RENDER -------------------------------------> //

    else {
      // Add the new user options, if any.
      setOptions(opts);

      // Start the render timer.
      stats.lastRenderStartTime = Date.now();

      // Flush any variables set by the last render.
      renderReset();

      // Begin scanning the template file
      while(!s.eof()) {

        // Determine if we are listening for js at the current token
        listening();

        // We have to check this again, since listening() can advance
        // the scanner.
        if(s.eof()) break;

        // We have to call this *again* in the case that we have 2 scripts back-to-back...
        listening();

        // We have to check this again, since listening() can advance
        // the scanner.
        if(s.eof()) break;

        // If listening, add the token to the jsString,
        // otherwise add it to the htmlString.
        (l) ? jsString += s.peek() : htmlString += s.peek();

        // Advance the scanner
        s.next();

      } // End while(!scanner.eof())

      // Flush out any remaining html string
      if(htmlString != "") {
        html.push(htmlString);
        pushJs(printString());
      }

      // Flush out any remaining js string
      if(jsString) pushJs(jsString + '\n', true);

      // Create a function from the js array, and execute it.
      functify();

      lastFullRender = Date.now();

      // Increment the times the template has been rendered.
      fullRenderCount++;
      lastRenderType = 'f';

      // Stop the render timer.
      stats.lastRenderStopTime = Date.now();
      stats.renderTimes.push([stats.lastRenderTime, 'f']);

      // Report the successful render to the end user if options.reporting > 2
      report.MSG_RENDER_SUCCESS;
    }

    lastRender = Date.now();

    var clean = cleanupOutput();

    if(options.output && options.outputFormat) {
      var destination = options.outputFormat.join('-');

      destination = destination
        .replace(/^tid/, tid)
        .replace(/^atid/, tid.slice(-7))
        .replace(/filename/, path.basename(filename).replace(path.extname(filename), ''))
        .replace(/time/, lastRender)
        .replace(/type/, lastRenderType)
        .replace(/-ext/, '.' + options.outputExt);

      fs.writeFileSync(destination, clean);
    }

    // Return the cleaned up rendered result.
    return clean;

  } // End self.render()


  /**
   * Set and validate options
   */
  var setOptions = function (opts) {
    for(var i in opts) {

      switch(i) {
        case 'fullCacheLifetime':

          if(opts[i] < options.fullCacheLifetime) {
            log('warn', 'The full cache liftime must be >= ' + options.fullCacheLifetime + 'ms. This option has been ignored.');
            delete opts[i];
          }

          if(opts[i] > 600000) log('notice 2', 'The full cache liftime is > 600000 (10 Minutes). Output will appear static for this duration.');

          break;

        case 'delimiterStart':
        case 'delimiterStop' :

          if(opts[i] == '}}' ||
             opts[i] == '{{' ||
             opts[i] == '))' ||
             opts[i] == '((' ||
             opts[i] == '{(' ||
             opts[i] == ')}' ||
             opts[i] == '({' ||
             opts[i] == '})' ||
             opts[i] == '((' ||
             opts[i] == '}}')

          log('warn', 'Using \'' + opts[i] + '\' as a delimiter is not recommended. *** This can potentially break your code! ***');
          break;

      } // End switch block

      options[i] = opts[i];

    } // End for loop

  } // End setOptions()


  /**
   * Determines if the scanner has detected an opening delimiter, or a closing one.
   * @return boolean (true: listening, false: not listening).
   * If the scanner is listening, output is added to the jsString until it stops listening.
   * Otherwise output is added to the htmlString, until the scanner begins listening again.
   */
  var listening = function () {

    if(!l) { // We are currently not listening

      // If we see the start delimiter upahead, start "listening" for js.
      if(s.lookahead(options.delimiterStart.length - 1) == options.delimiterStart) {

        l = true;

        // Push the gathered static tokens to the html array
        if(htmlString) {
          html.push(htmlString);
          pushJs(printString());
        }

        // Skip the delimiter.
        s.next(options.delimiterStart.length);

      } // End if block

    }
    else { // We are currently listening

      // Look for a single or double quote. If found, we will either be in, or out of the quotes.
      if(!inquotesDouble && s.peek() == "'") inquotesSingle = !inquotesSingle;
      if(!inquotesSingle && s.peek() == '"') inquotesDouble = !inquotesDouble;

      // If we see the stop delimiter upahead, stop "listening" for js.
      if(s.lookahead(options.delimiterStop.length - 1) == options.delimiterStop && !inquotesDouble && !inquotesSingle) {

        l = false;

        // Push the gathered static tokens to the html array
        if(jsString) pushJs(jsString + '\n', true);

        // Skip the delimiter
        s.next(options.delimiterStop.length);

      }

    } // End if(!l)/else

    return l; // Return boolean l, true = listening, false = not listening.

  } // End listening()


  /**
   * Push code to the js array, with optional flush.
   */
  var pushJs = function (code, flush) {
    js.push(code);
    if(flush) jsString = "";
    jsBlock++;

  } // End pushJs()


  /**
   * Clean up the rendered output based on user preference.
   * See options.style above for more info.
   */
  var cleanupOutput = function () {

    var output = rendered.join('');

    switch(options.style) {

      case 'compressed':
        output = output
          // Remove whitespace from text within tags and HTML Encode the text.
          .replace(/(<.+?>)(.*?)(<.+?>)/g, function($1, $2, $3, $4) { return $2 + ($3 ? HTMLEncode($3) : '') + $4; })
          // Remove any space between tags
          .replace(/>\s+</g, '><')
          // Make more than a single space, a single space.
          .replace(/\s\s+/g, ' ')
          // Trim whitespace around quotes.
          .replace(/(\")(\s+)?(.*?)(\s+)?(\")/g, '$1$3$1')
          // Remove newlines, tabs, returns, etc.
          .replace(/[\n\t\r]/g, '');
        break;

      case 'compact':
        break;

    } // End switch block

    return output;

  } // End cleanupOutput()


  /**
   * Clean up the js array before executing it...
   */
  var getJsString = function () {
    
    var jsPreRender = js
      .join('')
      // Replace 'elseif(.*):' with 'else if(.*) {'
      .replace(/else(\s)?if(\s+)?\((.*?)\)(\s+)?:/g, '} else if($3) {')
      // Replace 'if|for|while(.*):' with 'if|for|while(.*) {'
      .replace(/(if|for|while)(\s+)?\((.*?)\)(\s+)?:/g, '$1($3) {')
      // Replace 'else:' with 'else {'
      .replace(/else(?!(\s+)?if)(:)?/, '} else {')
      // Replace 'endif|endwhile|endfor;' with '}'
      .replace(/end(\s)?(if|for|while)(\s+)?(;)?/g, '}')
      // Remove space before and after semi-colons.
      .replace(/(\s+)?;(\s+)?/g, ';')
      // Strip Comments...
      .replace(/(\/\/(.*?)\n)|(\/\*(.*?)\*\/)/g, '')
      // Remove Empty Prints
      .replace(/(\s+)?print(\s+)?\('(\s+)'\)(\s+)?;(\s+)?/g, '')
      // Remove unnecessary semi-colons
      .replace(/(\{|\});/g, '$1')
      // Remove superflorious semi-colons
      .replace(/;+/g, ';')
      // Remove spacing from around curly brackets
      .replace(/(\s+)?(\{|\})(\s+)?/g, '$2')

    return jsPreRender;

  } // End getJsString()


  /**
   * Reset variables for a fresh full render.
   */
  var renderReset = function() {

    // Make sure we didn't finish a previous render "inquotes."
    inquotesSingle = inquotesDouble = false;

    // Reset the scanner.
    s.reset();

    // Flush the rendered array
    rendered = [];

    // Reset the js array and html arrays
    js = []; html = [];

    // Reset the jsString and htmlStrings
    jsString = htmlString = "";

    // Adjust options with the user passed options (i.e. 'opts')
    for(var i in opts) options[i] = opts[i];

    // Add the options to the stats object, so the end user can
    // identify "how" the template was rendered.
    for(var i in options) stats.renderOptions[i] = options[i];

  } // End renderReset()


  /*
   * Create a function from the 'js' array, and execute it.
   * Any print() or echo() calls from the function will be
   * passed onto the rendered array as they are executed.
   *
   */
  var functify = function() {

    // Clear the rendered array, JIC...
    rendered = [];

    // Clean up the js array, and retrieve it as a string...
    var jsPreRender = getJsString();

    // Bind 'this' to the 'scope' variable, or if omitted, an empty object.
    // Note the use of "use strict" and setting 'global' to undefined (in this scope)
    // for security reasons. Also note that the functions print, render, require, and echo are
    // frozen so the end user cannot 'accidentally' overwrite them.
    try { 
      new Function('print, scope, render, require, echo', '"use strict"\nObject.freeze(print, render, require, echo);\nvar global = undefined;' + jsPreRender).bind(scope || {})(print, scope, render, require, echo);
    }
    catch(e) {

      // Attempt to repair any forgotten colons or open curly braces after conditional clauses.
      jsPreRender = jsPreRender
        .replace(/((else if|if|for|while)(\s+)?\((\s+)?(.*?)(\s+)?\)(\s+)?)(?!((.*)?(;)|(\s+)?\{))/g, function($1, $2, $3, $4) {

          // Alert the user about the syntax error
          report.MSG_FUNCTION_SYNTAX_ERROR_DETECTED_FIXED('Missing colon/open-curly-bracket after \'' + $1.trim() + '\'');
          
          return (arguments[2] == 'else if') ? '} ' + $1 + ' {' : $1 + ' {';

        }); // End jsPreRender.replace()

      try {
        new Function('print, scope, render, require, echo', '"use strict"\nvar global = undefined;' + jsPreRender).bind(scope || {})(print, scope, render, require, echo);
      }
      catch(ee) {

        // If the user wants to completely stop rendering on error (i.e. options.haltOnError)
        // is set throw the error. Otherwise, try to keep rendering, but report the error.
        if(!options.haltOnError) { ee.message += ' in ' + filename; throw ee } else { report.MSG_FUNCTION_ERROR_CAUGHT(ee); }

      } // End try/catch block

    } // End outer try/catch block

  } // End functify()


  /**
   * Print:
   * Push all arguments onto the rendered array ('rendered') for output.
   */
  var print = function () { 
    for(var i in arguments) rendered.push(arguments[i].toString());

  } // End print()

  // Alias for print...
  var echo = print;
  

  /**
   * Render a template within a template.
   *
   * @param  newTpl   - The new template to be rendered
   * @param  newOpts  - The user specified options for this template, if omitted '
   *                   the current options' will be passed. 
   * @param  newScope - The scope object to be passed to the new template.
   *
   */
  var render = function (newTpl, newOpts, newScope) {
    
    if(!newOpts) { newOpts = options; }

    // Get the new template's id.
    var newTplId = (!newOpts.code) ? checksum(fs.readFileSync(newTpl).toString()) : checksum(newTpl);

    // Warn the user about circular rendering...
    // It's okay, the render cache will stop the infinite loop,
    // but still kind of pointless, right?
    if(NoTplMgr.cache[newTplId] && !NoTplMgr.cache[newTplId].warned) {
      report.MSG_RENDER_RECURSIVE_LOOP(NoTplMgr.cache[newTplId].tpl);
      NoTplMgr.cache[newTplId].warned = true;
    }

    // If the template is in the cache, push the cached-copy.render() to the output,
    // otherwise create a new template.
    rendered.push((NoTplMgr.cache[newTplId]) ?
      NoTplMgr.cache[newTplId].tpl.render() :
      NoTplMgr.new(newTpl, newOpts, newScope).render());

  } // End render()


  /**
   * A simple function that formats the htmlString string
   */
  var printString = function () {

    var str = '; print(\'' + htmlString.replace(/([\'\"\n\r\t])/g, '\\$1') + '\');'
    htmlString = "";
    htmlBlock++;
    return str;

  } // End printString()


  // Call constructor...
  self.init();


  // So we can chain...
  return this;

} // End NoTpl


/* -------------------------------------------------------------------
 * OBJECT NoTplMgr
 * A wrapper for the NoTpl class.
 *
 * Stores the template cache, and abstracts the NoTpl class into
 * basic CRUD operations.
 * ------------------------------------------------------------------- */
var NoTplMgr = {

  // Stores all templates that have been rendered.
  cache: {},

  // Gets the stats object for all templates.
  get stats() {
    var statsObj = {};
    for(var i in this.cache) statsObj[i] = this.cache[i].tpl.stats();
    return statsObj;
  },

  // Retrieve a template by path (or code)
  get: function (tpl, code) {

    var template = (!code) ? fs.readFileSync(tpl).toString() : tpl;
    return ((this.cache[checksum(template)]) ? this.cache[checksum(template)].tpl : null);

  }, // End get()

  // Create a template, or if one exists, overwrite it.
  new: function (tpl, opts, scope) {
    var template = (opts && !opts.code) ? fs.readFileSync(tpl).toString() : tpl;
    return ((this.cache[checksum(template)]) ? this.cache[checksum(template)].tpl : new NoTpl(tpl, opts, scope));

  }, // End new()

  // Remove a template from the cache
  kill: function (tpl) {

    for(var i in this.cache) {
      if(this.cache[i] == tpl) {
        delete this.cache[i];
      }

    } // End for loop

  }, // End delete()

} // End NoTplMgr

module.exports = NoTplMgr;
