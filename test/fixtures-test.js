var Mappersmith = require('../index');
var Promise = require('promise');

var Utils = Mappersmith.Utils;
var Gateway = Mappersmith.Gateway;

describe('Fixture', function() {
  var manifest,
      client;

  beforeEach(function() {
    Mappersmith.Env.Promise = Promise;
    Mappersmith.Gateway.__set__('Promise', Mappersmith.Env.Promise);

    manifest = {
      host: 'http://full-url',
      rules: [{
        match: /v1\/books\.json/,
        values: {
          gateway: {headers: {Authorization: 'token'}}
  			}
  		}],
      resources: {
        Book: {
          all:  {path: '/v1/books.json'},
          byId: {path: '/v1/books/{id}.json'}
        }
      }
    }

    Mappersmith.Env.Fixture = require('../src/fixture');
    Mappersmith.Env.USE_FIXTURES = true;
    Mappersmith.Env.USE_PROMISES = true;
    client = Mappersmith.forge(manifest);

    Mappersmith.Env.Fixture.clear();
  });

  afterEach(function() {
    Mappersmith.Env.Fixture = null;
    Mappersmith.Env.USE_FIXTURES = false;
    Mappersmith.Env.USE_PROMISES = false;
  });

  it('allows the use of fixtures matching url', function(done) {
    var data = {a: 1, b: true, c: 'value'};

    Mappersmith.Env.Fixture.
      define('get').
      matching({url: /full-url\/v1\/books\.json/}).
      response(data);

    client.Book.all().then(function(result) {
      expect(result.data).to.deep.eql(data);
      done();

    }).catch(function(err) {
      done(new Error(err));
    });
  });

  it('allows the use of fixtures matching host', function(done) {
    var data = {a: 1, b: true, c: 'value'};

    Mappersmith.Env.Fixture.
      define('get').
      matching({host: /full-url/}).
      response(data);

    client.Book.all().then(function(result) {
      expect(result.data).to.deep.eql(data);
      done();

    }).catch(function(err) {
      done(new Error(err));
    });
  });

  it('allows the use of fixtures matching path', function(done) {
    var data = {a: 1, b: true, c: 'value'};

    Mappersmith.Env.Fixture.
      define('get').
      matching({path: '/v1/books.json'}).
      response(data);

    client.Book.all().then(function(result) {
      expect(result.data).to.deep.eql(data);
      done();

    }).catch(function(err) {
      done(new Error(err));
    });
  });

  it('allows the use of fixtures matching params', function(done) {
    var data = {a: 1, b: true, c: 'value'};

    Mappersmith.Env.Fixture.
      define('get').
      matching({params: {args: 1}}).
      response(data);

    client.Book.all({args: 1}).then(function(result) {
      expect(result.data).to.deep.eql(data);
      done();

    }).catch(function(err) {
      done(new Error(err));
    });
  });

  it('allows the use of fixtures matching headers', function(done) {
    Mappersmith.Env.Fixture.
      define('get').
      matching({headers: {Authorization: 'token'}}).
      response();

    client.Book.all().then(function(result) {
      expect(result.stats.headers).to.deep.eql({Authorization: 'token'});
      done();

    }).catch(function(err) {
      done(new Error(err));
    });
  });

  it('allows fixtures for failed requests, default status error 400', function(done) {
    Mappersmith.Env.Fixture.
      define('get').
      matching({path: '/v1/books.json'}).
      failure().
      response('error');

    client.Book.all().then(function(result) {
      done(new Error('should have called "catch"'));

    }).catch(function(err) {
      try {
        expect(err.err).to.eql(['error']);
        expect(err.request.status).to.eql(400);
        done();

      } catch(e) {
        done(e);
      }
    });
  });

  it('allows fixtures for failed requests with custom status', function(done) {
    Mappersmith.Env.Fixture.
      define('get').
      matching({path: '/v1/books.json'}).
      failure({status: 503}).
      response('error');

    client.Book.all().then(function(result) {
      done(new Error('should have called "catch"'));

    }).catch(function(err) {
      try {
        expect(err.err).to.eql(['error']);
        expect(err.request.status).to.eql(503);
        done();

      } catch(e) {
        done(e);
      }
    });
  });

  ['post', 'put', 'delete', 'patch'].forEach(function(method) {

    it('allows fixtures for "' + method + '"', function() {
      manifest = {
        host: 'http://full-url',
        resources: {Book: {test:  {path: 'test.json', method: method}}}
      }

      client = Mappersmith.forge(manifest);

      Mappersmith.Env.Fixture.
        define(method).
        matching({path: 'test.json'}).
        response(method);

      client.Book.test().then(function(result) {
        expect(result.data).to.eql(method);
        done();

      }).catch(function(err) {
        done(new Error(err));
      });
    });

  });

  describe('instance', function() {
    it('can be removed', function(done) {
      Mappersmith.Env.Fixture.
        define('get').
        matching({path: '/v1/books.json'}).
        response('data1');

      var fixture2 = Mappersmith.Env.Fixture.
        define('get').
        matching({path: '/v1/books.json'}).
        response('data2');

      client.Book.all().
        then(function(result) {
          expect(result.data).to.eql('data2');
          expect(fixture2.remove()).to.eql(true);
        }).
        catch(function(err) { done(err) }).
        then(function() { return client.Book.all() }).
        then(function(result) {
          expect(result.data).to.eql('data1');
          done();
        }).
        catch(function(err) {
          done(err);
        });
    });

    it('can return the most recent call', function(done) {
      var fixture = Mappersmith.Env.Fixture.
        define('get').
        matching({path: /v1\/books\.json/}).
        response('data1');

      expect(fixture.mostRecentCall()).to.eql(null);

      Promise.all([
        client.Book.all({param1: true}),
        client.Book.all({param2: true})

      ]).then(function() {
        var args = fixture.mostRecentCall();
        expect(args).to.not.deep.equal(fixture.firstCall());
        expect(args).to.have.property('url', 'http://full-url/v1/books.json?param2=true');
        expect(args).to.have.property('host', 'http://full-url');
        expect(args).to.have.property('path', '/v1/books.json?param2=true');
        expect(args).to.have.property('params').that.deep.equals({param2: true});
        done();

      }).catch(function(err) {
        done(new Error(err));
      });
    });

    it('can return the first call', function(done) {
      var fixture = Mappersmith.Env.Fixture.
        define('get').
        matching({path: /v1\/books\.json/}).
        response('data1');

      expect(fixture.mostRecentCall()).to.eql(null);

      Promise.all([
        client.Book.all({param1: true}),
        client.Book.all({param2: true})

      ]).then(function() {
        var args = fixture.firstCall();
        expect(args).to.not.deep.equal(fixture.mostRecentCall());
        expect(args).to.have.property('url', 'http://full-url/v1/books.json?param1=true');
        expect(args).to.have.property('host', 'http://full-url');
        expect(args).to.have.property('path', '/v1/books.json?param1=true');
        expect(args).to.have.property('params').that.deep.equals({param1: true});
        done();

      }).catch(function(err) {
        done(new Error(err));
      });
    });

    it('can return all calls', function(done) {
      var fixture = Mappersmith.Env.Fixture.
        define('get').
        matching({path: /v1\/books\.json/}).
        response('data1');

      expect(fixture.mostRecentCall()).to.eql(null);

      Promise.all([
        client.Book.all({param1: true}),
        client.Book.all({param2: true})

      ]).then(function() {
        expect(fixture.calls().length).to.eql(2);

        var args = fixture.calls()[0];
        expect(args).to.have.property('url', 'http://full-url/v1/books.json?param1=true');
        expect(args).to.have.property('host', 'http://full-url');
        expect(args).to.have.property('path', '/v1/books.json?param1=true');
        expect(args).to.have.property('params').that.deep.equals({param1: true});

        args = fixture.calls()[1];
        expect(args).to.have.property('url', 'http://full-url/v1/books.json?param2=true');
        expect(args).to.have.property('host', 'http://full-url');
        expect(args).to.have.property('path', '/v1/books.json?param2=true');
        expect(args).to.have.property('params').that.deep.equals({param2: true});
        done();

      }).catch(function(err) {
        done(new Error(err));
      });
    });

    it('can return calls count', function(done) {
      var fixture = Mappersmith.Env.Fixture.
        define('get').
        matching({path: /v1\/books\.json/}).
        response('data1');

      expect(fixture.mostRecentCall()).to.eql(null);

      Promise.all([
        client.Book.all({param1: true}),
        client.Book.all({param2: true})

      ]).then(function() {
        expect(fixture.callsCount()).to.eql(2);
        done();

      }).catch(function(err) {
        done(new Error(err));
      });
    });
  });

  describe('for JSON responses', function() {
    it('returns a new object', function(done) {
      var data = {a: 1, b: true, c: 'value'};

      Mappersmith.Env.Fixture.
        define('get').
        matching({path: '/v1/books.json'}).
        response(data);

      client.Book.all().
        then(function(result) { result.data.b = false; }). // modify result
        then(function() { return client.Book.all() }). // grab fixture data again
        then(function(result) { // check if it's equal to the original value
          expect(result.data).to.deep.eql(data);
          done();

        }).catch(function(err) {
          done(new Error(err));
        });
    });
  });

  describe('without promises', function() {
    beforeEach(function() {
      Mappersmith.Env.USE_PROMISES = false;
    });

    it('allows the use of fixtures', function(done) {
      var data = {a: 1, b: true, c: 'value'};

      Mappersmith.Env.Fixture.
        define('get').
        matching({path: '/v1/books.json'}).
        response(data);

      client.Book.all(function(resultData) {
        expect(data).to.deep.eql(data);
        done();

      }).fail(function(request, err) {
        done(new Error(err));
      });
    });

    it('allows fixtures for failed requests, default status error 400', function(done) {
      Mappersmith.Env.Fixture.
        define('get').
        matching({path: '/v1/books.json'}).
        failure().
        response('error');

      client.Book.all(function() {
        done(new Error('should have called "fail"'));

      }).fail(function(request, err) {
        try {
          expect(err).to.eql('error');
          expect(request.status).to.eql(400);
          done();

        } catch(e) {
          done(e);
        }
      });
    });

    it('allows fixtures for failed requests with custom status', function(done) {
      Mappersmith.Env.Fixture.
        define('get').
        matching({path: '/v1/books.json'}).
        failure({status: 503}).
        response('error');

      client.Book.all(function() {
        done(new Error('should have called "fail"'));

      }).fail(function(request, err) {
        try {
          expect(err).to.eql('error');
          expect(request.status).to.eql(503);
          done();

        } catch(e) {
          done(e);
        }
      });
    });
  });

  describe('#clear', function() {
    beforeEach(function() {
      Mappersmith.Env.Fixture.clear();
      Mappersmith.Env.Fixture.
        define('get').
        matching({path: '/v1/books.json'}).
        response('data');

      Mappersmith.Env.Fixture.
        define('get').
        matching({path: '/v1/books.json?different=true'}).
        response('data');

      Mappersmith.Env.Fixture.
        define('post').
        matching({path: '/v1/books.json'}).
        response('data');
    });

    it('without arguments, remove all fixture data', function() {
      expect(Mappersmith.Env.Fixture.count()).to.eql(3);
      expect(Mappersmith.Env.Fixture.clear()).to.eql(true);
      expect(Mappersmith.Env.Fixture.count()).to.eql(0);
    });

    it('with method, remove all specific method data', function() {
      expect(Mappersmith.Env.Fixture.count()).to.eql(3);
      expect(Mappersmith.Env.Fixture.clear('get')).to.eql(true);
      expect(Mappersmith.Env.Fixture.count()).to.eql(1);
    });

    it('with method and matching params, remove the last match', function() {
      var matchingParams = {path: '/v1/books.json?different=true'};
      expect(Mappersmith.Env.Fixture.count()).to.eql(3);
      expect(Mappersmith.Env.Fixture.clear('get', matchingParams)).to.eql(true);
      expect(Mappersmith.Env.Fixture.count()).to.eql(2);
    });
  });
});
