var expect = require("chai").expect;
var notpl  = require("../notpl.js");

describe("NoTpl Server Side Tests\n", function () {

   describe("Rendering: #render()", function () {

      it("Should properly render '[native code]' templates.", function () {
        var tpl = notpl.new('<div>hello world</div>', { code: true }, {});
        var output = tpl.render();
 
        expect(output).equal("<div>hello world</div>");

        tpl = notpl.new('<div>hello world <$ print(\'foo bar\'); $></div>', { code: true }, {});
        output = tpl.render();
 
        expect(output).equal("<div>hello world foo bar</div>");

      });

      it("Should respond to 'options.delimiter' changes.", function () {
        var tpl = notpl.new('<div>hello world <$ print("baz") $><: print("foo bar"); :></div>', { code: true, delimiterStart: "<:", delimiterStop: ":>" }, {});
        var output = tpl.render();

        expect(output).equal('<div>hello world <$ print("baz") $>foo bar</div>');

        output = tpl.render({ delimiterStart: '<$', delimiterStop: '$>' });
        expect(output).equal("<div>hello world baz<: print(\"foo bar\");:></div>");

        tpl = notpl.new('<div>hello world <$ print("baz"); render(\"<: print(\' foo bar\'); :>\", { code: true, delimiterStart: \"<:\", delimiterStop: \":>\"}) $></div>', { code: true, delimiterStart: "<$", delimiterStop: "$>" }, {});
        output = tpl.render();
        expect(output).equal("<div>hello world baz foo bar</div>");

      });

      it("Should properly render nested '[native code]' templates.", function () {
        var tpl = notpl.new('<div>hello world</div> <$ render("foo bar <$ render(\'razzle dazzle\', { code: true }); $>", { code: true }); $>', { code: true }, {});
        var output = tpl.render();
 
        expect(output).equal("<div>hello world</div> foo bar razzle dazzle");

      });

      it("Should throw syntax errors.", function () {
        var tpl;
        tpl = notpl.new('<$<div>hello world</div>', { code: true }, {});
        expect(tpl.render).to.throw(Error);

        tpl = notpl.new('<div>hello world</div>$>', { code: true }, {});
        expect(tpl.render).to.throw(Error);

        tpl = notpl.new('<$<div>$><$hello world</div>', { code: true }, {});
        expect(tpl.render).to.throw(Error);

        tpl = notpl.new('<$<div>$><$hello$> world</div>', { code: true }, {});
        expect(tpl.render).to.throw(Error);

        tpl = notpl.new('<$ print(\'<div>\'); $><$ print(\'hello\'); $> world</div>', { code: true }, {});
        expect(tpl.render).to.not.throw(Error);

      });

      it("Should properly render '/html/helloworld-server.html'.", function () {
        var tpl = notpl.new('./html/helloworld-server.html', {}, {});
        var output = tpl.render();
 
        expect(output).equal("<!DOCTYPE html><html><head></head><body> hello world </body></html>");
      });

      it("Should properly render '/html/changescope-server.html', before & after changing the 'scope' object.", function () {

        var people = [
          { id: 0, name : { first: 'John',  last: 'Doe'   }, sex: 'male' },
          { id: 1, name : { first: 'Bruce', last: 'Wayne' }, sex: 'male' },
          { id: 2, name : { first: 'Bill',  last: 'Gates' }, sex: 'male' }
        ];

        var tpl = notpl.new('./html/changescope-server.html', {}, people);
        var output1 = tpl.render();

        people[0].name.first = "Jack";
        people[0].name.last  = "Sparrow";

        var output2 = tpl.render();

        expect(output1).equal("<div> John Doe, Bruce Wayne, Bill Gates, </div>");
        expect(output2).equal("<div> Jack Sparrow, Bruce Wayne, Bill Gates, </div>");
      });

      it("Should properly render '/html/partial-parent-server.html', by including '/html/partial-child-server.html'.", function () {

        var tpl = notpl.new('./html/partial-parent-server.html', {}, {});
        var output = tpl.render();

        expect(output).equal("<div id=\"parent\"> Check out this file! <div id=\"child\"> This file is awesome! We were passed: 'foobar!' as the scope.</div></div>");
      });

  });

  describe("Template Stats: #stats()", function () {
    it('Should return a stats object, with the correct properties.', function () {
      var tpl = notpl.new('<div>hello world</div>', { code: true }, {});
      expect(typeof tpl.stats()).to.equal('object');

      var props = ['path', 'lastFullRender', 'lastRender', 'lastRenderType', 'templateInit', 'lifetime', 'renderOptions', 'renderTimes', 'rendertimes', 'lastRenderStartTime', 'lastRenderStopTime', 'lastRenderTime', 'renderCount'];
      for(var i in props) {
         expect(tpl.stats()).to.have.a.property(props[i]);
      }
     

    });
  });


  describe("Template Cache, NoTplMgr Stats: #notpl.cache, #notpl.stats", function () {
    it("Should have the following templates in the template cache:\n\t\t> helloworld-server.html,\n\t\t> changescope-server.html,\n\t\t> partial-parent-server.html,\n\t\t> partial-child-server.html", function () {
      expect(notpl.cache).to.have.a.property('463259B45BD6BE47A75A329AF17270CB'.toLowerCase());
      expect(notpl.cache).to.have.a.property('4C257742F2D6B2301F109B944EB5189B'.toLowerCase());
      expect(notpl.cache).to.have.a.property('337451D7D1C10EAEDB14A2F075E3BFDF'.toLowerCase());
      expect(notpl.cache).to.have.a.property('104C5BF7B1C2D29EA09935BB36EC93C9'.toLowerCase());
            
    });


    it("Should have the correct number of render times and types in the 'stats' object", function () {
      var stat = notpl.stats['463259B45BD6BE47A75A329AF17270CB'.toLowerCase()];
      expect(stat).to.have.a.property('rendertimes');
      expect(stat.rendertimes.length).to.equal(1);
      notpl.get('./html/partial-parent-server.html').render();
      notpl.get('./html/partial-parent-server.html').render();

      expect(stat.renderTimes.length).to.equal(3);
      expect(stat.renderTimes[stat.renderTimes.length - 1][1]).to.equal('p');
      
    });

    it("A re-render of 'helloworld-server.html' should return a partial render.", function () {
      var helloworld = notpl.get('./html/helloworld-server.html');
      helloworld.render();

      expect(helloworld.stats().renderTimes.length).to.equal(2);
      expect(helloworld.stats().renderTimes[helloworld.stats().renderTimes.length - 1][1]).to.equal('p');
    });

    it("A re-render of 'helloworld-server.html' should return a full render, if we set the render option 'forceFullRender' to true.", function () {
      var helloworld = notpl.get('./html/helloworld-server.html');

      helloworld.render({ forceFullRender: true });
      expect(helloworld.stats().renderTimes.length).to.equal(3);
      expect(helloworld.stats().renderTimes[helloworld.stats().renderTimes.length - 1][1]).to.equal('f');

    });

  });

});