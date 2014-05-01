'use strict';

var request = require('supertest');
var AnyFetchProvider = require('anyfetch-provider');
require('should');

var config = require('../config/configuration.js');
var serverConfig = require('../lib/');



describe("Workflow", function () {
  before(AnyFetchProvider.debug.cleanTokens);

  // Create a fake HTTP server
  var apiServer = AnyFetchProvider.debug.createTestApiServer();
  apiServer.listen(1337);

  before(function(done) {
    AnyFetchProvider.debug.createToken({
      anyfetchToken: 'fake_gc_access_token',
      datas: {
        refreshToken: config.test_refresh_token,
        mail : config.test_account
      },
      cursor: {
        reverse: false,
        uid: 1
      },
    }, done);
  });

  it("should upload datas to AnyFetch", function (done) {
    var nbMailsChecked = 0;

    var originalQueueWorker = serverConfig.queueWorker;

    serverConfig.queueWorker = function(task, anyfetchClient, refreshToken, cb) {
      originalQueueWorker(task, anyfetchClient, refreshToken, function(err, document) {
        if(err) {
          throw err;
        }

        try {
          document.should.have.property('document_type');
          document.should.have.property('identifier');
          document.should.have.property('actions');
          document.should.have.property('metadatas');

          if(document.document_type === "email") {
            document.metadatas.should.have.property('from');
            document.metadatas.should.have.property('subject');
            document.metadatas.should.have.property('text');
            document.should.have.property('datas');
            document.should.have.property('document_type', 'email');
          }
          else {
            document.metadatas.should.have.property('path');
            document.should.have.property('related');
            document.should.have.property('document_type', 'file');
          }
        }
        catch(e) {
          return done(e);
        }

        nbMailsChecked += 1;
        cb();

        if(nbMailsChecked === 10) {
          done();
        }

      });
    };

    var server = AnyFetchProvider.createServer(serverConfig);

    request(server)
      .post('/update')
      .send({
        access_token: 'fake_gc_access_token',
        api_url: 'http://localhost:1337'
      })
      .expect(202)
      .end(function(err) {
        if(err) {
          throw err;
        }
      });
  });
});
