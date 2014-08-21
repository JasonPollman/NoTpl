/**
 * @file    - notpl.js
 * @author  - Jason James Pollman
 * @created - 8/13/14
 *
 * > NoTpl: A fast, simple JavaScript client/serve side templating engine.
 * ----------------------------------------------------------------------------------------------
 * See https://github.com/PuffNStuff/NoTpl for more information.
 * ----------------------------------------------------------------------------------------------
 */

(function (g) {
  "use strict"

  // Detect Node or Browser
  var isNode = (typeof module !== 'undefined' && g.module !== module);

  // JS Regular Expression Special Characters which need escaping.
  var regexpSpecialChars = ['.', '^', '\\', '?', '{', '}', '[', ']', '*', '!', '|', '+', '/'];

  if(isNode) {
    // Node core modules
    var fs     = require('fs');
    var crypto = require('crypto');
    var path   = require('path');

    // Dependencies
    var cli = require('cli-color');
  }
  else if(window) { // We are in the browser

    var files = {};

    var fs = {

      // The browser version of fs.readFileSync()
      readFileSync: function(file) {

        if(!files[file]) {
          var request = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
          request.open("GET", file, false);
          request.send();
          files[file] = request.responseText;
        }

        return files[file];

      }, // End readFileSync

      writeFileSync: function (dest, msg) {
        console.log(msg);
      }

    } // End fs object

  } // End if(isNode) block


  /**
   * Computes the checksum of 'str'
   */
  function checksum (str, algorithm, encoding) {

    if(!isNode) { // Compute a "manual checksum," since we don't have node modules in the browser.

      if(!str || str == "") return undefined;

      var chr = str.split('');
      var csum = 0;

      for(var i in chr) {
        if(chr.hasOwnProperty(i)) csum += chr[i].charCodeAt(0);
      }

      return csum.toString(16);

    } // End if(!isNode)
   
    return crypto
    .createHash(algorithm || 'md5')
    .update(str, 'utf8')
    .digest(encoding || 'hex')

  } // End checksum()

  /**
   * Encodes each character of param str with it's HTML equivalent code.
   */
  function HTMLEncode (str, unencode) {

      var strArr = str.split('');
      var chars = {
          '"' : '&quot;',
          '&' : '&amp;',
          '<' : '&lt;',
          '>' : '&gt;',
        }

      if(!unencode) { // User wants HTML encoded

        for(var i = 0; i < strArr.length; i++) if(chars[strArr[i]]) strArr[i] = chars[strArr[i]];
        return strArr.join('');

      }
      else { // User wants HTML decoded

        for(var i in chars) var str = str.replace(RegExp(chars[i], 'g'), i);
        return str;
      }

  } // End HTMLEncode()


  /**
   * Returns the time in the HH:MM:SS format, with a trailing colon and space.
   */
  function timestamp () {
    var now = new Date();
    return (pad(now.getHours(), 2) + ":" + pad(now.getMinutes(), 2) + ":" + pad(now.getSeconds(), 2) + ":" + pad(now.getMilliseconds(), 2) + " > ");
  }


  /**
   * Prefixes 'num' with 'size' zeroes.
   */
  function pad (num, size) {
      var s = "000000000000000000000000000000000000000000000000" + num;
      return s.substr(s.length - size);
  }


  /* -------------------------------------------------------------------
   * CLASS Scanner
   * Tokenize and scan through 'source'.
   *
   * 8/18/2014 - Moved the scanner class into this document for client
   *             side use (so we don't have to send 2 files).
   * ------------------------------------------------------------------- */
  var scanner = function (source) {
    
    // For global scoping
    var scanner = this;

    // An array of the tokenized source string
    var tokens = Array();

    // The array pointer
    var pointer = 0;

    var newlines = Array();

    // Initiate the tokens array
    scanner.init = scanner.value = function (source) {

      if(!source) source = "";

      var regexp = /\n/g;
      var needle;
      while (needle = regexp.exec(source)) newlines.push(needle.index);

      tokens = source.toString().split('');
      tokens.push('EOF'); 
      scanner.reset();

      return scanner;

    } // End scanner.init()

    scanner.last = function() {
      return scanner.tokens[tokens.length - 2];
    }

    scanner.length = function() {
      return tokens.length - 1;
    }

    scanner.pos = scanner.position = function() { return pointer; }

    // Return the token value at pointer
    scanner.peek = function () { return (tokens[pointer] === 'EOF') ? tokens[pointer - 1] : tokens[pointer] }

    // Move the token pointer to 'pos.'
    scanner.goto = function (pos) {
      pointer = (pos >= tokens.length) ? tokens.length - 1 : pos;
      return scanner
    }

    // Get the line and column number as an array
    scanner.line = function() {

      var i = 0;
      while(newlines[i] < pointer) i++;
      i--;

      var col = (pointer - (newlines[i] || 0)) + ((i < 0) ? 1 : 0);
      return [i + 2, col];
    }

    // Get the source as a string again.
    scanner.source = scanner.toString = function () {
      var temp = tokens.slice(0);
      temp.pop();
      return temp.join('')
    }

    // Set pointer to 0.
    scanner.reset = function () { pointer = 0; return this }

    // Return from the pointer to the EOF
    scanner.rest = function () {
      return tokens.slice(pointer, tokens.length - 1).join('');
    }

    // Return a portion of the scanner
    scanner.range = function (x, y) {
      return tokens.slice(x, y).join('');
    }


    // Check to see if we have reached the end of the tokens array
    scanner.end = scanner.eof = function () {
      return tokens[pointer] == 'EOF' ? true : false;
    }

    // Move the pointer forward by 'value' || 1, if no value is given.
    scanner.next = function (value) {

      if(value != undefined) { // Increment by 'value'

        // Check that we didn't get a negative value.
        if(value < 0) throw new Error("Parameter 'value' must be greater than or equal to 0.");

        // Make sure that we got a number.
        if(typeof value !== 'number') throw new Error("Parameter 'value' must be an integer value.");

        // Make sure we haven't incremented past the end of the tokens array, if so, make the pos the
        // end of the tokens array.
        if(pointer + value > tokens.length - 1) value = tokens.length - pointer - 1;


        // Increment the scanner's position by 'value.'
        scanner.goto(pointer += value);
      }
      else { // Increment by 1

        scanner.goto(++pointer);

      } // End if/else block

      return scanner;

    } // End scanner.next()

    // Move the pointer backward by 'value' || 1, if no value is given.
    scanner.previous = function (value) {

      if(value != undefined) { // Increment by 'value'

        // Check that we didn't get a negative value.
        if(value < 0) throw new Error("Parameter 'value' must be greater than or equal to 0.");

        // Make sure that we got a number.
        if(typeof value !== 'number') throw new Error("Parameter 'value' must be an integer value.");

        // Make sure we haven't incremented past the beginning of the tokens array, if so, make the pos 0.
        if(pointer - value < 0) value = 0;

        // Decrement the scanner's position by 'value.'
        scanner.goto(pointer -= value);
      }
      else { // Decrement by 1

        scanner.goto(--pointer);

      } // End if/else block

      return scanner;

    } // End scanner.previous()

    // Lookahead from the pointer value to 'value (including the pointer)
    scanner.lookahead = function (value) {
      if(value > tokens.length - 2) value = tokens.length - 2;

      if(pointer < tokens.length - 2) {
          return tokens.slice(pointer, pointer + value + 1).join('')
      }
      else {
        return tokens.slice(pointer, tokens.length - 1).join('');
      }

    } // End scanner.lookahead()

    // Look behind from the 'value' to the pointer value (excluding the pointer)
    scanner.lookbehind = function (value) {

      if(value < 0) value = 0;

      if(pointer < tokens.length - 2) {
        return tokens.slice(pointer - value, pointer).join('')
      }
      else {
        return tokens.slice(value, pointer).join('');
      }

    } // End scanner.lookbehind()


    source !== undefined ? scanner.init(source) : null;
    return this;

  } // End scanner Object Function


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
      VERSION:  '0.1.2',

      // Output messages to the stdout.
      // Depending on the options.reporting parameter, messages may or may not print,
      // as defined by the end user. See: 'var log' below.
      messages: {

        get RENDER_BEGIN () {
          log('notice 3', '---------> Render of ' + self.toString() + ' started.');
        },

        get RENDER_END () {
          log('notice 3', '---------> Render of ' + self.toString() + ' completed (' + stats.lastRenderTime + ' ms).\n');
        },

        get MSG_RENDER_SUCCESS () {
          log('notice', self.toString() + ' has been fully rendered (' + stats.lastRenderTime + ' ms).');
        },

        get MSG_PARTIAL_SUCCESS () {
          log('notice', self.toString() + ' has been partially rendered (' + stats.lastRenderTime + ' ms).');
        },

        get MSG_STATIC_SUCCESS () {
          log('notice', self.toString() + ' has been returned statically (' + stats.lastRenderTime + ' ms).');
        },

        get MSG_DELIMITER_TOO_SHORT () {
          log('warn', 'Using a single character as a delimiter is not recommended! Please use 2 or more characters.\n*** This can potentially break your code! ***');
        },

        get MSG_DELIMITER_MISMATCH_NO_STOP_DELIMITER () {
          log('error', "Expecting '" + ((isNode) ? options.delimiterStop : HTMLEncode(options.delimiterStop, true)) + "'. Reached the end of file without matching closing tag.");
        },

        get MSG_DELIMITER_MISMATCH_STOP_WITHOUT_START () {
          log('error', "Unexpected '" + ((isNode) ? options.delimiterStop : HTMLEncode(options.delimiterStop, true)) + "'. Found closing tag, without matching opening tag.");
        },

        get MSG_DELIMITER_MISMATCH_START_WITHOUT_STOP () {
          log('error', "Unexpected '" + ((isNode) ? options.delimiterStart : HTMLEncode(options.delimiterStart, true)) + "'. Found opening tag, without matching closing tag.");
        },

        MSG_DELIMITER_POTENTIAL_BREAK: function (delim) {
          log('warn', 'Using \'' + delim + '\' as a delimiter is not recommended.\n*** This can potentially break your code! ***');
        },

        MSG_FUNCTION_SYNTAX_ERROR_DETECTED_FIXED: function (e) {
          log('warning', 'Syntax Error detected and repaired in ' + self.toString() + '.\n' + e + '.\n');
        },

        MSG_FUNCTION_ERROR_CAUGHT: function (e) {
          log('error', e.name + ' in ' + self.toString() + '. Rendering skipped, with message:\n\'' + e.message + '\'.');
        },

        MSG_RENDER_RECURSIVE_LOOP: function (template) {
          log('warning', self.toString() + ' and ' + template.toString() + ' circularly reference each other. Infinite loop detected.');
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
      // This should be at least 2 characters long, and avoid the following
      // sequences ['{{', '}}, '((', '))', '{[', ']}']... or anything else 
      // that could break js syntax.
      delimiterStart   : "<$",
      delimiterStop    : "$>",

      // Output relative or absolute paths to the console when
      // giving user feedback? 
      // true = absolute, false = relative
      useAbsolutePaths : false,

      // Is this template a "code" string? This must be true,
      // otherwise you'll get a 'EONENT' (file not found) error.
      code : false,

      // The level of console reporting
      // 0: None
      // 1: Errors Only
      // 2: Warnings & Errors
      // 3: Everything (Notices, Errors, & Warnings)
      reporting : 2,

      // The output style
      // compressed : The smallest output possible. No newlines, tabs, returns, etc. All spaces are truncated to a single space.
      //              Special HTML characters are escaped.
      // compact    : Sames as compressed, except that spaces are maintained.
      // htmlified  : Only HTML Escaping.
      // (.*)?      : Output is delivered the way it was given (newlines, tabs, etc. retained). No HTML Escaping.
      style : 'compressed',

      // Halt template rendering on error?
      // RECOMMENDED SETTING: true.
      // This could save a parent template, should a child template called with render() from within the
      // template fail, however, that still will not produce the desired output.
      haltOnError      : true,

      // *** Template Cache Types: Partial & Full ***
      // ------------------------------------------------------------------------------------------------------
      // Not Cached: Will scan the template file (or code) and render the template, executing the js (dynamic).
      // Partial   : Will re-render only the js portions of the template (faster, still dynamic).
      // Full      : Will return the previously rendered output (fastest, static).

      // *** Set these to 0 to disable caching and perform a full render each time this.render() is called ***

      // Will return a partial cache (partial render) of the template if the last render was less than
      // partialCacheLifetime ms.
      partialCacheLifetime: 30000,

      // Will return a full cache copy (static render) of the template if the last render was less than
      // fullCacheLifetime ms.
      fullCacheLifetime: 0,

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

      // "use strict" in the template function?
      // Recommended: true for Node, false for Client Browser...
      strict: true,

      // Give the template a name... will replace [native code] where code is used.
      name: undefined

    } // End options


    /**
     * Set and validate options
     */
    var setOptions = function (opts) {
      for(var i in opts) {

        if(typeof opts[i] == 'string') opts[i] = opts[i].trim();

        // Check for configuration setting issues:
        switch(i) {

          // Check types on all options.
          case 'reporting':
            if(typeof opts[i] != 'number') {
              log('warn', "Option 'reporting' should be an integer, not '" + opts[i].toString() + "'. This option has been ignored.");
              opts[i] = options[i];
            }
            break;

          case 'style':
            if(typeof opts[i] != 'string') {
              log('warn', "Option 'style' should be a string, not '" + opts[i].toString() + "'. This option has been ignored.");
              opts[i] = options[i];
            }
            break;

          case 'partialCacheLifetime':
          case 'fullCacheLifetime':
            if(typeof opts[i] != 'number') {
              log('warn', "Option '" + i + "' should be an integer, not '" + opts[i].toString() + "'. This option has been ignored.");
              opts[i] = options[i];
            }
            break;

          case 'outputFormat': 
            if(!(opts[i] instanceof Array)) {
              log('warn', "Option '" + i + "' should be an array, not '" + opts[i].toString() + "'. This option has been ignored.");
              opts[i] = options[i];
            }
        }

        // More options checking...
        switch(i) {

          // Make sure fullCacheLifetime is >= 1 or we could end up with an infinite loop if 2 templates reference
          // each other.
          case 'fullCacheLifetime':

            if(opts[i] < options.fullCacheLifetime) {
              log('warn', 'The full cache liftime must be >= ' + options.fullCacheLifetime + 'ms. This option has been ignored.');
              opts[i] = options[i];
            }

            if(opts[i] > 600000) log('notice 2', 'The full cache liftime is > 600000 (10 Minutes). Output will appear *static* for this duration.');

            break;

          // Make sure we have a delimiter that won't break the code...
          case 'delimiterStart':
          case 'delimiterStop' :

            var jsKeywords = ['break', 'case', 'class', 'catch', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield'];

            if(opts[i].length < 2) report.MSG_DELIMITER_TOO_SHORT;
            // The following character sequences could break this script:
            // {{, }}, ((, )), ;;, ==, ++, --, 
            if(opts[i].match(/(\{{2,})|(\}{2,})|(\({2,})|(\){2,})|(;{2,})|(={2,})|(\+{2,})|(-{2,})/)) report.MSG_DELIMITER_POTENTIAL_BREAK(opts[i]);
            // Javascript Operators
            if(opts[i].match(/<=|=>|\+=|-=|\\=|\*=|%=|""|''/)) report.MSG_DELIMITER_POTENTIAL_BREAK(opts[i]);
            // Javascript Keywords
            if(jsKeywords.indexOf(opts[i]) > -1) report.MSG_DELIMITER_POTENTIAL_BREAK(opts[i]);


            // If we're in a browser, we need to encode the delimiters.
            if(!isNode) opts[i] = HTMLEncode(opts[i]);
            break;

        } // End switch block

        options[i] = opts[i];

      } // End for loop

    } // End setOptions()


    /* -------------------------------------------------------------------
     * STATS OBJECT
     * Provides stats about the template, and its previous renderings.
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

      if(type == 'error' && options.haltOnError) {
        if(isNode) {
          throw new Error(cli.xterm(color)(typeOutput + timestamp() + msg));
        }
        else {
          throw new Error(typeOutput + timestamp() + msg);
        }
      }
      else {
        (isNode) ? console.log(cli.xterm(color)(typeOutput + timestamp() + msg)) :
                   console.log(typeOutput + timestamp() + msg);
      }

    } // End log(type, msg)

    // Adjust options with the user passed options (i.e. 'opts')
    setOptions(opts);

    var filename = (options.code) ? ((options.name) ? options.name : 'native code') : tpl;

    // Try to read the template file, if it is a file, otherwise use the
    // code provided (if options.code is true).
    tpl = (!options.code) ? fs.readFileSync(tpl).toString() : tpl;

    // If we were passed a file, then inject the scanner with the file contents,
    // otherwise, just pass the code value into the scanner.
    s = new scanner(tpl);

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

    // To detect circular referencing of templates
    // when render() is called within this template,
    // the child template's tid will be pushed here.
    // If both have each other in their children arrays
    // then there is an infinite rendering loop =>
    // return static content to stop loop.
    var children = [];

    // Add the template to the template cache,
    // so if the checksum of the file is the same,
    // we can just execute the template js function,
    // rather than perform a scan all over again.
    NoTplMgr.cache[tid] = {

      get tid()             { return tid; },
      get path()            { return filename; },
      get tpl()             { return self; },
      get children()        { return children; },
      get output()          { return cleanupOutput(); },
      get lastFullRender () { return lastFullRender; },
      get lastRender()      { return lastRender; },
      get lastRenderType()  { return lastRenderType; }

    } // End NoTplMgr.cache[tid]

    // Will hold the scanner object, to tokenize the template input.
    var s;

    // Are we listening for js or html, i.e. are we inside the delimiters?
    // false = <html><div>...
    // true  = <% var i = ...
    var l = false;

    // To prevent the detection of opening/closing delimiters within quotes inside of of js,
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
    self.stats = self.getStats = function () { return stats; }


    /**
     * Returns the template id, or template alias if param 'alias' is true...
     */
    self.toString = function (alias) {

      if(alias) {
        return tid.slice(-5);
      }
      else {
        var str = "Template [";
        if(options.code == false) {

          if(options.useAbsolutePaths != false && isNode) {
            str += path.resolve(filename);
          }
          else {
            str += filename;
          }
        }
        else {
          str += 'native code';
        }
        str += ']';

      } // End outermost if block

      return str;

    } // End self.toString()


    /**
     * Get the template's ID
     */
    self.tid = function() { return tid; }


    /**
     * Manually perform a partial render
     */
    self.update = function () { return partialRender() }


    /**
     * Get the rendered output as a string
     */
    self.output = function() { return cleanupOutput() }


    /**
     * Render the template
     * @param opts: overrides the options set when creating the template object.
     */
    self.render = function (opts) {

      if(!opts) opts = {};

      // If the user changes the delimiters, we must force a full render.
      if((opts.delimiterStart && opts.delimiterStart != options.delimiterStart) || (opts.delimiterStop && opts.delimiterStop != options.delimiterStop)) {
        options.forceFullRender = true;
      }

      // Add the new user options, if any.
      setOptions(opts);

      var outputString = "";

      if(!options.rRender) report.RENDER_BEGIN;

      // If the template is in cache, and has been rendered once before, and we are within the full cache lifetime,
      // then return the static output from the last render.
      if((options.recursiveReference == true) || (!options.forceFullRender && NoTplMgr.cache[tid] && (stats.renderCount.full > 0) && (Date.now() - lastFullRender < options.fullCacheLifetime))) {
        
        // Perform a static render
        outputString = staticRender()

      } // End if block

      // If the template is in cache, and has been rendered once before, and we are within the partial cache lifetime,
      // then execute the js function again, and return the new rendered output.
      else if(!options.forceFullRender && NoTplMgr.cache[tid] && (stats.renderCount.full > 0 && Date.now() - lastFullRender < options.partialCacheLifetime)) {

        // Perform a partial render
        outputString = partialRender();

      }
      else {
        
        // Perform a full render
        outputString = fullRender();

      } // End if/else block

      lastRender = Date.now();

      if(options.output && options.outputFormat) {
        var destination = options.outputFormat.join('-');

        destination = destination
          .replace(/\btid\b/, tid)
          .replace(/\batid\b/, tid.slice(-7))
          .replace(/filename/, path.basename(filename).replace(path.extname(filename), ''))
          .replace(/time/, lastRender)
          .replace(/type/, lastRenderType)
          .replace(/-ext/, '.' + options.outputExt);

        fs.writeFileSync(destination, outputString);
      }

      if(!options.rRender) report.RENDER_END;

      // Return the cleaned up rendered result.
      return outputString;

    } // End self.render()


    /**
     * Perform a full render
     */
    var fullRender = function() {

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
        listening(true);

        // We have to check this again, since listening() can advance
        // the scanner.
        if(s.eof()) break;

        // If listening, add the token to the jsString,
        // otherwise add it to the htmlString.
        (l) ? jsString += s.peek() : htmlString += s.peek();

        // Advance the scanner
        s.next();

      } // End while(!scanner.eof())

      // Got a start delimeter, but no end to match it.
      if(l && s.eof()) report.MSG_DELIMITER_MISMATCH_NO_STOP_DELIMITER;


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

      // Return the cleaned up rendered result.
      return cleanupOutput();

    } // End fullRender()


    /**
     * Perform a partial render
     */
    var partialRender = function () {

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

      // Return the cleaned up rendered result.
      return cleanupOutput();

    } // End partialRender()


    /**
     * Perform a static render
     */
    var staticRender = function () {

      // Start the render timer.
      stats.lastRenderStartTime = Date.now();

      staticRenderCount++;
      lastRenderType = 's';

      // End the render timer.
      stats.lastRenderStopTime = Date.now();
      stats.renderTimes.push([stats.lastRenderTime, 's']);

      // Log the successful render to the console, if options.reporting > 2
      report.MSG_STATIC_SUCCESS;

      // Return the cleaned up rendered result.
      return cleanupOutput();

    } // End staticRender()


    /**
     * Determines if the scanner has detected an opening delimiter, or a closing one.
     * @return boolean (true: listening, false: not listening).
     * If the scanner is listening, output is added to the jsString until it stops listening.
     * Otherwise output is added to the htmlString, until the scanner begins listening again.
     */
    var listening = function (ignoreQuotes) {

      if(!l) { // We are currently not listening

        // Got a closing delimeter, without an opening one...
        if(s.lookahead(options.delimiterStop.length - 1) == options.delimiterStop &&
           !(s.lookbehind(1) == '\\' && regexpSpecialChars.indexOf(s.peek()) > -1)) report.MSG_DELIMITER_MISMATCH_STOP_WITHOUT_START;

        var unencoded = (s.lookahead(options.delimiterStart.length - 1) == options.delimiterStart);
        var coded = !isNode && (s.lookahead(HTMLEncode(options.delimiterStart, true).length - 1) == HTMLEncode(options.delimiterStart, true))
        
        // If we see the start delimiter upahead, start "listening" for js.
        if(unencoded || coded) {

          l = true;

          // Push the gathered static tokens to the html array
          if(htmlString) {
            html.push(htmlString);
            pushJs(printString());
          }

          // Skip the delimiter. ?? HERE IS THE PROBLEM <<<<<<<<<<<<<<<<<<<<<<<<<<<<
          s.next(unencoded ? options.delimiterStart.length : HTMLEncode(options.delimiterStart, true).length);

        } // End if block

      }
      else { // We are currently listening

        // Got an opening delimiter, without a matching closing one...
        if(s.lookahead(options.delimiterStart.length - 1) == options.delimiterStart &&
          !(s.lookbehind(1) == '\\' && regexpSpecialChars.indexOf(s.peek()) > -1) &&
          !(inquotesSingle || inquotesDouble)) report.MSG_DELIMITER_MISMATCH_START_WITHOUT_STOP;

        // Look for a single or double quote. If found, we will either be in, or out of the quotes.
        if(!ignoreQuotes) {

          if(!inquotesSingle && !inquotesDouble && s.lookbehind(1) != '\\' && s.peek() == "'") {
            inquotesSingle = true;
          }
          else if(inquotesSingle && !inquotesDouble && s.lookbehind(1) != '\\' && s.peek() == "'") {
            inquotesSingle = false;
          }

          if(!inquotesDouble && !inquotesSingle && s.lookbehind(1) != '\\' && s.peek() == '"') {
            inquotesDouble = true;
          }
          else if(inquotesDouble && !inquotesSingle && s.lookbehind(1) != '\\' && s.peek() == '"') {
            inquotesDouble = false; }

        } // End if(!ignoreQuotes)

        var unencoded = (s.lookahead(options.delimiterStop.length - 1) == options.delimiterStop);
        var coded = !isNode && (s.lookahead(HTMLEncode(options.delimiterStop, true).length - 1) == HTMLEncode(options.delimiterStop, true))
        // If we see the stop delimiter up-ahead, start "listening" for js.
        if((unencoded || coded) && !(inquotesDouble || inquotesSingle)) {

          l = false;

          // Push the gathered static tokens to the HTML array
          if(jsString) pushJs(jsString + '\n', true);

          // Skip the delimiter
          s.next(unencoded ? options.delimiterStop.length : HTMLEncode(options.delimiterStop, true).length);

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
            .replace(/(<.+?>)(.*?)(<.+?>)/g, function($1, $2, $3, $4) { 
              // DONT HTML ENCODE <script> or <style> tag bodies
              return $2 + ($3 ? ($2.match(/script|style/g) ? $3 : $3) : '') + $4; // FIX HTML ENCODE!!!
            })
            // Remove any space between tags
            .replace(/>\s+</g, '><')
            // Make more than a single space, a single space.
            .replace(/\s\s+/g, ' ')
            // Trim whitespace around quotes.
            .replace(/(\")(\s+)?(.*?)(\s+)?(\")/g, '$1$3$1')
            // Remove newlines, tabs, returns, etc.
            .replace(/[\n\t\r]/g, '')
            // Strip comments
            .replace(/<\!--.*?-->/gm, '')

        case 'compact':
            // Strip out comments
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
        // Strip Comments...
        .replace(/(\/\/(.*?)\n)|(\/\*(.*?)\*\/)/g, '')
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

      if(!isNode) var require = undefined;

      // Bind 'this' to the 'scope' variable, or if omitted, an empty object.
      // Note the use of "use strict" and setting 'global' to undefined (in this scope)
      // for security reasons. Also note that the functions print, render, require, and echo are
      // frozen so the end user cannot 'accidentally' overwrite them.
      try { 
        var jsFunction = new Function('print, scope, render, require, echo', '"use strict"\nvar global = undefined;' + jsPreRender).bind(scope || {});
        jsFunction(print, scope, render, require, echo);
      }
      catch(e) {

        // Attempt to repair any forgotten colons or open curly braces after conditional clauses.
        jsPreRender = jsPreRender
          .replace(/((else if|if|for|while)(\s+)?\((.*?)\))(?!((.*?)(;(?!((\s+)?print)))|(\s+)?\{))/g, function($1, $2, $3, $4) {

            // Alert the user about the syntax error
            report.MSG_FUNCTION_SYNTAX_ERROR_DETECTED_FIXED('Missing colon/open-curly-bracket after \'' + $1.trim() + '\'');
            
            return (arguments[2] == 'else if') ? '} ' + $1 + ' {' : $1 + ' {';

          }); // End jsPreRender.replace()

        try { // Try again now that syntax error was detected.
          var jsFunction = new Function('print, scope, render, require, echo', ((options.strict) ? 'use strict\n' : '') + 'var global = undefined;' + jsPreRender).bind(scope || {});
          jsFunction(print, scope, render, require, echo);
        }
        catch(ee) {

          // If the user wants to completely stop rendering on error (i.e. options.haltOnError)
          // is set throw the error. Otherwise, try to keep rendering, but report the error.
          if(!options.haltOnError) {
            report.MSG_FUNCTION_ERROR_CAUGHT(ee);
          }
          else {
            ee.message = ((isNode) ? cli.xterm(160)(e.message) : e.message);
            throw(ee);
          }

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

      if(!newOpts || (newOpts && Object.keys(newOpts).length == 0)) newOpts = options;

      if(!isNode) {

        // If we're in a browser, we need to decode the delimiters.
        newOpts.delimiterStart = HTMLEncode(newOpts.delimiterStart, true);
        newOpts.delimiterStop  = HTMLEncode(newOpts.delimiterStop, true);
        newOpts.reporting = 2;  // Force logging errors only
        newOpts.code = false;

      }

      // Get the new template's id.
      var newTplId = (!newOpts.code) ? checksum(fs.readFileSync(newTpl).toString()) : checksum(newTpl);


      // Warn the user about circular rendering...
      // It's okay, the render cache will stop the infinite loop,
      // but still kind of pointless, right?
      if(NoTplMgr.cache[newTplId]) {

        // Add the template as a child to this one.
        if(children.indexOf(newTplId) < 0) children.push(newTplId);

        // Both templates have each other as children, stop infinite loop by returning static on next render.
        if((NoTplMgr.cache[newTplId].children.indexOf(tid) > -1) && (NoTplMgr.cache[tid].children.indexOf(newTplId) > -1)) {

          // Warn the end user:
          if(!NoTplMgr.cache[newTplId].warned) {
            report.MSG_RENDER_RECURSIVE_LOOP(NoTplMgr.cache[newTplId].tpl);
            NoTplMgr.cache[newTplId].warned = true;
            NoTplMgr.cache[tid].warned = true;
          }

          rendered.push(NoTplMgr.cache[newTplId].tpl.render({ rRender: true, recursiveReference: true }));
        }
        // The template is in cache, render it from cache
        else if(NoTplMgr.cache[newTplId]) {
          rendered.push(NoTplMgr.cache[newTplId].tpl.render({ rRender: true }));
        }

      }
      else { // It is a new template, fully render it.
        rendered.push(NoTplMgr.new(newTpl, newOpts, newScope).render({ rRender: true }));

      } // End if(NoTplMgr.cache[newTplId]) block

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

  if(isNode) {
    // Export the NoTplMgr Object:
    module.exports = NoTplMgr;
  }
  else if(window) { // We are running in a browser...

    // <------------------------------------- docReady() ------------------------------------> //

    // Borrowed from https://github.com/jfriend00/docReady/blob/master/docready.js,
    // jQuery $(document).ready() equivalent:

    (function(funcName, baseObj) {
      // The public function name defaults to window.docReady
      // but you can pass in your own object and own function name and those will be used
      // if you want to put them in a different namespace
      funcName = funcName || "docReady";
      baseObj = baseObj || window;
      var readyList = [];
      var readyFired = false;
      var readyEventHandlersInstalled = false;
      
      // call this when the document is ready
      // this function protects itself against being called more than once
      function ready() {
        if (!readyFired) {
          // this must be set to true before we start calling callbacks
          readyFired = true;
          for (var i = 0; i < readyList.length; i++) {
            // if a callback here happens to add new ready handlers,
            // the docReady() function will see that it already fired
            // and will schedule the callback to run right after
            // this event loop finishes so all handlers will still execute
            // in order and no new ones will be added to the readyList
            // while we are processing the list
            readyList[i].fn.call(window, readyList[i].ctx);
          }
          // allow any closures held by these functions to free
          readyList = [];
        }
      }
      
      function readyStateChange() {
        if ( document.readyState === "complete" ) ready();
      }
      
      // This is the one public interface docReady(fn, context);
      // the context argument is optional - if present, it will be passed as an argument to the callback
      baseObj[funcName] = function(callback, context) {
        // If ready has already fired, then just schedule the callback to fire asynchronously, but right away
        if (readyFired) {
          setTimeout(function() {callback(context);}, 1);
          return;
        } else {
          // Add the function and context to the list
          readyList.push({fn: callback, ctx: context});
        }
        // If document already ready to go, schedule the ready function to run
        if (document.readyState === "complete") {
          setTimeout(ready, 1);
        } else if (!readyEventHandlersInstalled) {
          // Otherwise if we don't have event handlers installed, install them
          if (document.addEventListener) {
              // First choice is DOMContentLoaded event
              document.addEventListener("DOMContentLoaded", ready, false);
              // Backup is window load event
              window.addEventListener("load", ready, false);
          } else {
              // Must be IE
              document.attachEvent("onreadystatechange", readyStateChange);
              window.attachEvent("onload", ready);
          }
          readyEventHandlersInstalled = true;
        }
      }
    })("docReady", window);

    // <----------------------------------- End docReady() ----------------------------------> //

    // A default error msg that will show if the template fails to render...
    var errorMsg = "<strong>Template Error:</strong><br /><em>Oops! Something went wrong...<br/>If you are the page administrator, check the console for technical information.<em>";
    var browserOptions = { code: true, delimiterStart: "<$", delimiterStop: "$>", reporting: 2, name: location.href.substring(location.href.lastIndexOf("/") + 1, location.href.length) }

    // This must be explicitly called to render the template from the client side.
    // The document.ready function will automatically be called, so no need to do that.
    var firstRun = true;
    var pageTpl = null;
    var error = false;
    var rendered = "";

    // Add notpl to the browser window global:
    window.notpl = function(opts, scope, cb, msg) {

      // Set options
      for(var i in opts) browserOptions[i] = opts[i];

      // Set the error message that will display if the template fails to render.
      // You can set this to be another template, if you wish, however, I recommend passing a function, so you can redirect or something.
      switch(typeof msg) {

        case 'object':
          errorMsg = NoTplMgr.new(msg.file, { reporting: 1 }, scope).render();
          break;

        case 'string':
        case 'function':
          errorMsg = msg;
          break;

        default:
          console.log('[Warning]', "Error message must be a string value, parameter 'msg' ignored.")
      
      } // End switch block

      // If first run is true, the output is assigned to the document.documentElement.innerHTML,
      // otherwise, the output is simply returned so you can do whatever with it.
      if(firstRun) {

        docReady(function() {

          var markup = document.documentElement.innerHTML;

          // Set this to an empty string so the user doesn't see the notpl code.
          document.documentElement.innerHTML = "";

          pageTpl = new NoTpl(markup, browserOptions, scope);
          
          // Try to render the template, if there is an error, it will be passed to the callback as well.
          try {
            rendered = pageTpl.render();
          }
          catch(e) {
            rendered = undefined; 
            error = true;
          }

          document.documentElement.innerHTML = rendered || ((typeof errorMsg == 'function') ? errorMsg() : errorMsg);

          // Execute the callback function
          if(cb && cb instanceof Function) cb(error, pageTpl);

          // firstRun = false, so after now, output will simply be returned when rendered is called.
          firstRun = false;

        }); // End docReady()

      }
      else {
        return pageTpl.render();
      
      } // End if/else block

    } // End window.notpl

    window.notplStats = function() { return NoTplMgr.stats; }

  } // End if/else block

})(this); // End anon function
