'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BreezeObservationAdapter = exports.BreezeObjectObserver = exports.BreezePropertyObserver = exports.Deferred = exports.Q = exports.AjaxAdapter = exports.HttpResponse = undefined;

var _dec, _class;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.configure = configure;

var _breeze = require('breeze-client');

var _breeze2 = _interopRequireDefault(_breeze);

var _aureliaBinding = require('aurelia-binding');

var _aureliaHttpClient = require('aurelia-http-client');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var extend = _breeze2.default.core.extend;

var HttpResponse = exports.HttpResponse = function () {
  function HttpResponse(aureliaResponse, config) {
    _classCallCheck(this, HttpResponse);

    this.config = config;
    this.status = aureliaResponse.statusCode;
    this.data = aureliaResponse.content;
    this.headers = aureliaResponse.headers;
  }

  HttpResponse.prototype.getHeader = function getHeader(headerName) {
    if (headerName === null || headerName === undefined || headerName === '') {
      return this.headers.headers;
    }
    return this.headers.get(headerName);
  };

  return HttpResponse;
}();

var AjaxAdapter = exports.AjaxAdapter = function () {
  function AjaxAdapter() {
    _classCallCheck(this, AjaxAdapter);

    this.name = 'aurelia';
    this.requestInterceptor = null;
  }

  AjaxAdapter.prototype.setHttpClientFactory = function setHttpClientFactory(createHttpClient) {
    this.createHttpClient = createHttpClient;
  };

  AjaxAdapter.prototype.initialize = function initialize() {};

  AjaxAdapter.prototype.ajax = function ajax(config) {
    var requestInfo = {
      adapter: this,
      config: extend({}, config),
      zConfig: config,
      success: config.success,
      error: config.error
    };
    requestInfo.config.request = this.httpClient.createRequest();
    requestInfo.config.headers = extend({}, config.headers);

    if (_breeze2.default.core.isFunction(this.requestInterceptor)) {
      this.requestInterceptor(requestInfo);
      if (this.requestInterceptor.oneTime) {
        this.requestInterceptor = null;
      }
      if (!requestInfo.config) {
        return;
      }
    }
    config = requestInfo.config;

    var request = config.request;

    request.withUrl(config.url);

    var method = config.dataType && config.dataType.toLowerCase() === 'jsonp' ? 'jsonp' : config.type.toLowerCase();
    method = 'as' + method.charAt(0).toUpperCase() + method.slice(1);
    request[method]();

    request.withParams(config.params);

    if (config.contentType) {
      request.withHeader('Content-Type', config.contentType);
    }
    for (var header in config.headers) {
      if (config.headers.hasOwnProperty(header)) {
        request.withHeader(header, config.headers[header]);
      }
    }

    if (config.hasOwnProperty('data')) {
      request.withContent(config.data);
    }

    request.send().then(function (r) {
      return requestInfo.success(new HttpResponse(r, requestInfo.zConfig));
    }, function (r) {
      return requestInfo.error(new HttpResponse(r, requestInfo.zConfig));
    });
  };

  _createClass(AjaxAdapter, [{
    key: 'httpClient',
    get: function get() {
      return this.client || (this.client = this.createHttpClient());
    }
  }]);

  return AjaxAdapter;
}();

_breeze2.default.config.registerAdapter('ajax', AjaxAdapter);

var Q = exports.Q = function () {
  function Q() {
    _classCallCheck(this, Q);
  }

  Q.defer = function defer() {
    return new Deferred();
  };

  Q.resolve = function resolve(data) {
    return Promise.resolve(data);
  };

  Q.reject = function reject(reason) {
    return Promise.reject(reason);
  };

  return Q;
}();

var Deferred = exports.Deferred = function Deferred() {
  _classCallCheck(this, Deferred);

  var self = this;
  this.promise = new Promise(function (resolve, reject) {
    self.resolve = resolve;
    self.reject = reject;
  });
};

var BreezePropertyObserver = exports.BreezePropertyObserver = (_dec = (0, _aureliaBinding.subscriberCollection)(), _dec(_class = function () {
  function BreezePropertyObserver(obj, propertyName) {
    _classCallCheck(this, BreezePropertyObserver);

    this.obj = obj;
    this.propertyName = propertyName;
  }

  BreezePropertyObserver.prototype.getValue = function getValue() {
    return this.obj[this.propertyName];
  };

  BreezePropertyObserver.prototype.setValue = function setValue(newValue) {
    this.obj[this.propertyName] = newValue;
  };

  BreezePropertyObserver.prototype.subscribe = function subscribe(context, callable) {
    if (this.addSubscriber(context, callable)) {
      this.oldValue = this.obj[this.propertyName];
      this.obj.__breezeObserver__.subscriberAdded();
    }
  };

  BreezePropertyObserver.prototype.unsubscribe = function unsubscribe(context, callable) {
    if (this.removeSubscriber(context, callable)) {
      this.obj.__breezeObserver__.subscriberRemoved();
    }
  };

  return BreezePropertyObserver;
}()) || _class);


function handleChange(change) {
  var object = change.entity;
  var propertyName = change.propertyName;
  var objectObserver = object.__breezeObserver__;
  if (propertyName === null) {
    var observers = objectObserver.observers;
    for (propertyName in observers) {
      if (observers.hasOwnProperty(propertyName)) {
        change.propertyName = propertyName;
        handleChange(change);
      }
    }
    return;
  }

  var observer = objectObserver.observers[propertyName];
  var newValue = object[propertyName];
  if (!observer || newValue === observer.oldValue) {
    return;
  }
  observer.callSubscribers(newValue, observer.oldValue);
  observer.oldValue = newValue;
}

var BreezeObjectObserver = exports.BreezeObjectObserver = function () {
  function BreezeObjectObserver(obj) {
    _classCallCheck(this, BreezeObjectObserver);

    this.obj = obj;
    this.observers = {};
    this.subscribers = 0;
  }

  BreezeObjectObserver.prototype.subscriberAdded = function subscriberAdded() {
    if (this.subscribers === 0) {
      this.subscription = this.obj.entityAspect.propertyChanged.subscribe(handleChange);
    }

    this.subscribers++;
  };

  BreezeObjectObserver.prototype.subscriberRemoved = function subscriberRemoved(propertyName, callback) {
    this.subscribers--;

    if (this.subscribers === 0) {
      this.obj.entityAspect.propertyChanged.unsubscribe(this.subscription);
    }
  };

  BreezeObjectObserver.prototype.getObserver = function getObserver(propertyName) {
    return this.observers[propertyName] || (this.observers[propertyName] = new BreezePropertyObserver(this.obj, propertyName));
  };

  return BreezeObjectObserver;
}();

function createObserverLookup(obj) {
  var value = new BreezeObjectObserver(obj);

  Object.defineProperty(obj, '__breezeObserver__', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: value
  });

  return value;
}

function createCanObserveLookup(entityType) {
  var value = {};
  var properties = entityType.getProperties();
  for (var i = 0, ii = properties.length; i < ii; i++) {
    var property = properties[i];

    value[property.name] = property.isDataProperty || property.isScalar;
  }

  Object.defineProperty(entityType, '__canObserve__', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: value
  });

  return value;
}

var BreezeObservationAdapter = exports.BreezeObservationAdapter = function () {
  function BreezeObservationAdapter() {
    _classCallCheck(this, BreezeObservationAdapter);
  }

  BreezeObservationAdapter.prototype.getObserver = function getObserver(object, propertyName, descriptor) {
    var type = object.entityType;
    if (!type || !(type.__canObserve__ || createCanObserveLookup(type))[propertyName]) {
      return null;
    }

    var observerLookup = object.__breezeObserver__ || createObserverLookup(object);
    return observerLookup.getObserver(propertyName);
  };

  return BreezeObservationAdapter;
}();

function configure(frameworkConfig) {
  _breeze2.default.config.initializeAdapterInstance('modelLibrary', 'backingStore');

  _breeze2.default.config.setQ(Q);

  frameworkConfig.container.get(_aureliaBinding.ObserverLocator).addAdapter(new BreezeObservationAdapter());

  var adapter = _breeze2.default.config.initializeAdapterInstance('ajax', 'aurelia', true);
  adapter.setHttpClientFactory(function () {
    return frameworkConfig.container.get(_aureliaHttpClient.HttpClient);
  });
}