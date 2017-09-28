var Dynamic = function() {
  var self = this;
  if (!self.wasInstantiated) {
    self.wasInstantiated = true;
    Dynamic.prototype.inheritSelection = function(parent) {
      var self = this;
      self.app = parent;
    };
    Dynamic.prototype.makeSelection = function() {
      var self = this;
      self.$specificContent = self.app.$dynamicContent;
      self.$mscrollContainer = self.$specificContent.find('.mscroll-container');
      self.$mscrollArea = self.$mscrollContainer.find('.mscroll-area');
      self.$mscrollGroups = self.$mscrollArea.find('.mscroll-group');
      self.$mscrollItems = self.$mscrollGroups.find('.mscroll-item');
      self.$imageGroups = self.$specificContent.find('.image-group');
      self.$images = self.$specificContent.find('img');
      self.$imagesPreLoad = (function(){
        var set = [];
        self.$images.each(function() {
          if ($(this).index() === 0) {
            set.push(this);
          }
        });
        return $(set);
      })();
      self.$figures = self.$mscrollItems.find('figure');
      self.$figCaptions = self.$figures.find('figcaption a');
      self.$figDescriptions = self.$figures.find('.figdescription');
    };
    Dynamic.prototype.initialize = function(parent) {
      var self = this;
      if (parent) {
        self.inheritSelection(parent);
      }
      self.makeSelection();
      self.setMscroll();
      self.$imageGroups.makeSlider({
        timing: self.app.timingUnit
      });
      self.$mscrollItems.each(function() {
        var $thisMscrollItem = $(this);
        $thisMscrollItem.viewportCheck({
          $toBind: self.$mscrollContainer,
          // $viewport: self.app.$viewport,
          onIn: function() {
            self.loadImages($thisMscrollItem.find('img')); /* flag: deal with the clones.. + stop on out */
          }
        });
        var $thisFigCaption = $thisMscrollItem.find('figcaption a').html(function(){
      		var text = $(this).text().split(' ');
      		var last = text.pop();
      		return text.join(' ') + ' <span>' + last + '</span>';
      	});
        var $thisFigCaptionLastWord = $thisFigCaption.find('span');
        var $thisFigDescription = $thisMscrollItem.find('.figdescription');
        $thisFigCaption.$icon = new Icon({timing: self.app.timingUnit}).morphTo('plus', false);
        $thisFigCaption.$icon.appendTo($thisFigCaptionLastWord); /* basically returns the element pasted, not copied */
        $thisFigCaption.makeToggler({
          $toggled: $thisFigDescription,
          onToggleOn: function($toggler, $toggled) {
            $thisFigCaption.$icon.morphTo('minus', true);
            $toggled.toggleVisibility(true, self.app.timingUnit * 1);
            $toggled.clickCheck({
              $toBind: self.$document,
              toIgnore: [$toggler, self.getMscrollClones($toggler)],
              onOut: function(event) {
                if (self.getMscrollClones($toggled).get().indexOf(event.target) === -1) { /* flag: eventTarget doesn't take the children in account! */
                  $toggler.makeToggler('toggle');
                }
              }
            })/*.viewportCheck({
              $toBind: self.$mscrollContainer,
              $viewport: self.app.$viewport,
              onOut: function() {
                if (!self.getMscrollClones($toggled).isInViewport({ viewport: self.app.$viewport }).length) {
                  $toggler.makeToggler('toggle');
                }
              }
            })*/;
          },
          onToggleOff: function($toggler, $toggled) {
            $thisFigCaption.$icon.morphTo('plus', true);
            $toggled.toggleVisibility(false, self.app.timingUnit * 1, function() {
              $toggled.scrollTop(0);
            });
            $toggled.clickCheck('stop')/*.viewportCheck('stop')*/;
          }
        });
      });
      return self;
    };
    Dynamic.prototype.resize = function() {
      var self = this;
      self.resizeMscroll();
      return self;
    };
    Dynamic.prototype.render = function() {
      var self = this;
      // console.log('showing dynamic content...');
      self.$specificContent.toggleVisibility(true, self.app.timingUnit * 4, function() {
        // console.log('dynamic content visible.');
      });
      return self;
    };
    Dynamic.prototype.hideOld = function(callback) {
      var self = this;
      // console.log('hiding dynamic content...');
      self.$specificContent.toggleVisibility(false, self.app.timingUnit * 2, function() {
        // console.log('dynamic content hidden.');
        callback.call();
      });
    };
    Dynamic.prototype.loadNew = function(url) {
      var self = this;
      // console.log('loading new dynamic content');
      self.$specificContent.load(url + ' .dynamic-content-inner', function() {
        self.app.currentUrl = url;
        self.initialize();
        self.loadImages(self.$imagesPreLoad, {
          beforeLoadStart: function(callback) {
            self.app.static.$loader.toggleVisibility(true, self.app.timingUnit * 2, function() {
              console.log('$loader visible.');
              callback();
            });
          },
          onLoadStart: function() {
            self.isPreLoading = true;
          },
          onLoadNew: function(percentLoaded, callback) {
            self.app.static.$loader.makeLoader('update', {
              percent: percentLoaded,
              animation: true,
              onComplete: function() {
                callback();
              }
            });
          },
          beforeLoadExit: function(callback) {
            self.app.static.$loader.toggleVisibility(false, self.app.timingUnit * 2, function() {
              console.log('$loader hidden.');
              self.app.static.$loader.makeLoader('update', {
                percent: 0,
                animation: false
              });
              callback();
            });
          },
          onLoadExit: function() {
            self.isPreLoading = false;
            self.resize().render();
          },
          // onLoadAbort: function() {
          //   self.app.dynamic.hideOld(callback);
          // } /* not operational */
        });
      });
    };
    Dynamic.prototype.loadImages = function($elements, a) {
      var self = this;
      var LoadingTask = function() {
        var self = this;
        if (!self.wasInstantiated) {
          self.wasInstantiated = true;
          LoadingTask.prototype.initialize = function($elements, userOptions) {
            var self = this;
            self.$imagesToLoad = $elements.not('.loaded');
            self.options = $.extend({
              onLoadEnter: function() {},
              beforeLoadStart: null,
              onLoadStart: function() {},
              onLoadNew: null,
              onLoadComplete: function() {},
              beforeLoadExit: null,
              onLoadExit: function() {},
              // onLoadAbort: function() {}
            }, userOptions);
            console.log('entering load.');
            console.log('self.$imagesToLoad count: ' + self.$imagesToLoad.length);
            if (self.$imagesToLoad.length !== 0) {
              self.imagesLoaded = [];
              self.percentLoaded = 0;
              if (self.options.beforeLoadStart !== null) {
                self.options.beforeLoadStart(self.startLoad);
              } else {
                self.startLoad();
              }
            } else {
              self.options.onLoadExit();
            }
            return self;
          };
          LoadingTask.prototype.startLoad = function() {
            self.options.onLoadStart();
            self.$imagesToLoad.each(function(i) {
              var image = this;
              image.file = new Image();
              console.log('waiting for file #' + i + ' to be loaded...');
              $(image.file).on('load', function() {
                console.log('loaded file #' + i + '.');
                self.imagesLoaded.push(image);
                self.injectFile(image);
                $(image).addClass('loaded');
                self.updatePercentLoaded();
                var checkProgress = function() {
                  if (self.percentLoaded == 100) {
                    console.log('loading complete!');
                    self.exitLoad();
                  }
                };
                if (self.options.onLoadNew !== null) {
                  self.options.onLoadNew(self.percentLoaded, checkProgress);
                } else {
                  checkProgress();
                }
              });
              console.log('loading file #' + i + '...');
              self.startFileLoad(image);
            });
            return self;
          };
          LoadingTask.prototype.startFileLoad = function(image) {
            console.log('starting load for: ' + image.file.src + '...');
            image.file.src = $(image).attr('data-src');
            return self;
          };
          // LoadingTask.prototype.abortFileLoad = function(image) {
          //   console.log('stopping load for: ' + image.file.src + '.');
          //   image.file.src = $(image).attr('src');
          //   image.file.onerror = null;
          //   image.file.remove();
          //   return self;
          // };
          LoadingTask.prototype.injectFile = function(image) {
            $(image).attr('src', image.file.src);
            return self;
          };
          LoadingTask.prototype.updatePercentLoaded = function() {
            self.percentLoaded = (self.imagesLoaded.length / self.$imagesToLoad.length * 100).toFixed();
            console.log('loaded ' + self.percentLoaded + '%.');
            return self;
          };
          // LoadingTask.prototype.abortLoad = function() {
          //   console.log('stopping to load.');
          //   self.$imagesToLoad.each(function() {
          //     self.abortFileLoad(this);
          //   });
          //   self.options.onLoadAbort();
          //   if (self.options.withLoader) {
          //     TweenLite.killTweensOf(self.app.static.$loader.find('span > span'));
          //   }
          //   return self;
          // };
          LoadingTask.prototype.exitLoad = function(userOptions) {
            console.log('exiting load.');
            var doExit = function() {
              self.options.onLoadExit();
            };
            if (self.options.beforeLoadExit !== null) {
              self.options.beforeLoadExit(doExit);
            } else {
              doExit();
            }
            return self;
          };
        }
      };

      if (!self.loadingTasks) { /* sticked on dynamic */
        self.loadingTasks = [];
      }
      if (!a || typeof a === 'object') {
        var loadingTask = new LoadingTask().initialize($elements, a);
        self.loadingTasks.push(loadingTask);
      // } else if (typeof a === 'string') {
      //   if (a === 'abort') {
      //     self.abortLoad();
      //     self.exitLoad();
      //     // + delete loading task!
      //   }
      }
      return $elements;
    };
    Dynamic.prototype.getMscrollPath = function($element) {
      var nthChild = $element.index() + 1; /* to be overridden */
      var path = [':nth-child(' + nthChild + ')'];
      $element.parentsUntil('.mscroll-group').each(function() {
        nthChild = $(this).index() + 1;
        path.push(':nth-child(' + nthChild + ')');
      });
      return '> ' + path.reverse().join(' > ');
    };
    Dynamic.prototype.getMscrollClones = function($element) {
      var $mscrollGroup = $element.parents('.mscroll-group');
      var path = self.getMscrollPath($element);
      var $clones = $mscrollGroup.siblings().find(path);
      return $clones;
    };
    Dynamic.prototype.syncMscrollEvent = function(type, $elements, method) {
      $elements.on(type, $.debounce(300, function() {
        var original = this;
        self.getMscrollClones($(original)).each(function() {
          // console.log('syncMscrollEvent: "' + type + '" for ' + $elements[0].className);
          method(original, this);
        });
      }));
    };
    Dynamic.prototype.syncMscrollEvents = function() {
      self.syncMscrollEvent('click', self.$imageGroups, function(original, clone) {
        $(clone).makeSlider('next');
      });
      self.syncMscrollEvent('click', self.$figCaptions, function(original, clone) {
        $(clone).makeToggler('toggle');
      });
      self.syncMscrollEvent('scroll', self.$figDescriptions, function(original, clone) {
        $(clone).scrollTop($(original).scrollTop());
      });
    };
    Dynamic.prototype.cloneMscrollGroupOriginal = function() {
      self.$mscrollGroupCloneBefore = self.$mscrollGroupOriginal.clone().prependTo(self.$mscrollArea).addClass('clone').removeClass('original').attr('id', 'before');
      self.$mscrollGroupCloneAfter = self.$mscrollGroupOriginal.clone().appendTo(self.$mscrollArea).addClass('clone').removeClass('original').attr('id', 'after');
      self.$mscrollGroupClones = self.$mscrollArea.find('.clones');
      self.makeSelection();
    };
    Dynamic.prototype.loopMscroll = function() {
      var lastPos = 0;
      var currPos = 0;
      var minPos = 0;
      var maxPos = 0;
      var traveled = 0;
      self.$mscrollContainer.on('scroll', function() {
        if (self.mscrollDir === 'y') {
          currPos = self.$mscrollContainer.scrollTop();
          maxPos = self.$mscrollAreaHeight - self.app.windowHeight;
          if (currPos >= maxPos) { /* scrolling down */
            self.$mscrollContainer.scrollTop(minPos + 1);
          } else if (currPos <= minPos) { /* scrolling up */
            self.$mscrollContainer.scrollTop(maxPos - 1);
          }
        } else if (self.mscrollDir === 'x') {
          currPos = self.$mscrollContainer.scrollLeft();
          maxPos = self.$mscrollAreaWidth - self.app.windowWidth;
          if (currPos >= maxPos) { /* scrolling to the right */
            self.$mscrollContainer.scrollLeft(minPos + 1);
          } else if (currPos <= minPos) { /* scrolling to the left */
            self.$mscrollContainer.scrollLeft(maxPos - 1);
          }
        }
        lastPos = currPos;
      });
    };
    Dynamic.prototype.convertYMscroll = function() {
      self.$mscrollArea.on('mousewheel', function(event) {
        var authorized = true;
        var $parents = $(event.target).parentsUntil(self.$mscrollArea);
        $parents.each(function() {
          if (this.scrollHeight != this.offsetHeight) {
            authorized = false;
          }
        });
        if (authorized) {
          var oldPos = $(self.$mscrollContainer).scrollLeft();
          var newPos = oldPos - event.deltaY * event.deltaFactor;
          $(self.$mscrollContainer).scrollLeft(newPos);
        }
      });
    };
    Dynamic.prototype.setMscroll = function() {
      var self = this;
      self.mscrollDir = !self.$mscrollContainer.is('.mscroll-x') ? 'y' : 'x';
      self.mscrollLoop = self.$mscrollContainer.is('.mscroll-loop') && !self.app.isIos ? true : false;
      if (self.mscrollDir === 'x') {
        // self.convertYMscroll();
      }
      self.$mscrollGroupOriginal = self.$mscrollGroups.addClass('original');
      if (self.mscrollLoop) {
        self.cloneMscrollGroupOriginal();
        self.loopMscroll();
        self.syncMscrollEvents();
      }
    };
    Dynamic.prototype.resizeMscroll = function() {
      var self = this;
      var offsetMscrollGroupClones = function() {
        if (self.mscrollDir === 'y') {
          self.$mscrollGroupCloneBefore.css({
            top: (-Math.max(self.app.windowHeight, self.$mscrollGroupsHeight) + self.$mscrollItemsSpacing) + 'px'
          });
          self.$mscrollGroupCloneAfter.css({
            top: (Math.max(self.app.windowHeight, self.$mscrollGroupsHeight) - self.$mscrollItemsSpacing) + 'px'
          });
        } else if (self.mscrollDir === 'x') {
          self.$mscrollGroupCloneBefore.css({
            left: (-Math.max(self.app.windowWidth, self.$mscrollGroupsWidth) + self.$mscrollItemsSpacing) + 'px'
          });
          self.$mscrollGroupCloneAfter.css({
            left: (Math.max(self.app.windowWidth, self.$mscrollGroupsWidth) - self.$mscrollItemsSpacing) + 'px'
          });
        }
      };
      if (self.mscrollLoop) {
        if (self.mscrollDir === 'y') {
          self.$mscrollGroupsHeight = self.$mscrollGroupOriginal.height();
          self.$mscrollItemsSpacing = parseFloat(self.$mscrollItems.first().css('margin-top'));
          self.$mscrollAreaHeight = Math.max(self.app.windowHeight * 2, self.$mscrollGroupsHeight + self.app.windowHeight) - self.$mscrollItemsSpacing;
          self.$mscrollArea.css({
            height: self.$mscrollAreaHeight + 'px'
          });
        } else if (self.mscrollDir === 'x') {
          self.$mscrollGroupsWidth = Math.ceil( self.$mscrollGroupOriginal.width() );
          self.$mscrollItemsSpacing = Math.ceil( parseFloat(self.$mscrollItems.first().css('margin-left')) );
          self.$mscrollAreaWidth = Math.max(self.app.windowWidth * 2, self.$mscrollGroupsWidth + self.app.windowWidth) - self.$mscrollItemsSpacing;
          self.$mscrollArea.css({
            width: self.$mscrollAreaWidth + 'px'
          });
        }
        offsetMscrollGroupClones();
      }
    };
  }
};

var Static = function() {
  var self = this;
  if (!self.wasInstantiated) {
    self.wasInstantiated = true;
    Static.prototype.inheritSelection = function(parent) {
      var self = this;
      self.app = parent;
    };
    Static.prototype.makeSelection = function() {
      var self = this;
      self.$specificContent = self.app.$staticContent;
      self.$menu = self.$specificContent.find('.menu ul');
      self.$loader = self.$specificContent.find('.loader');
    };
    Static.prototype.initialize = function(parent) {
      var self = this;
      self.inheritSelection(parent);
      self.makeSelection();
      self.$loader.makeLoader({
        barSelector: 'span > span',
        timing: self.app.timingUnit * 4
      });
      self.$menu.makeDropdown({
        timing: self.app.timingUnit,
        currentUrl: self.app.currentUrl,
        $document: self.app.$document, /* for clickCheck to check against */
        getLineHeight: function($listItem) {
          return $listItem.find('p').height();
          // return parseFloat($listItem.find('p').css('line-height')) + parseFloat($listItem.find('p').css('padding-top')) + parseFloat($listItem.find('p').css('padding-bottom'));
        },
        onChange: function(element, callback) {
          if (self.app.dynamic.isPreLoading) {
            // self.app.dynamic.loadImages(self.app.dynamic.$imagesPreLoad, 'abort');
          } else {
            self.app.dynamic.hideOld(callback);
          }
          if (Modernizr.history) {
            history.pushState(null, null, $(element).attr('data-href'));
          }
        },
        afterChange: function(element) {
          self.app.dynamic.loadNew($(element).attr('data-href'));
        }
      });
      if (Modernizr.history) {
        self.app.$window.on('popstate', function() {
          _link = location.pathname;
          self.app.$body.toggleVisibility(false, self.app.timingUnit * 1, function() {
            location.href = _link;
          });
        });
      }
      return self;
    };
    Static.prototype.resize = function() {
      var self = this;
      // self.$menu.resize();
      self.$menu.makeDropdown('resize');
      return self;
    };
    Static.prototype.render = function() {
      var self = this;
      // console.log('showing static content...');
      self.$specificContent.toggleVisibility(true, self.app.timingUnit * 4, function() {
        // console.log('dynamic content visible.');
      });
      return self;
    };
  }
};

var App = function() {
  var self = this;
  if (!self.wasInstantiated) {
    self.wasInstantiated = true;
    App.prototype.docReady = false;
    App.prototype.winLoaded = false;
    App.prototype.isIos = false;
    App.prototype.timingUnit = 0.15;
    App.prototype.windowRef = {
      minHeight: 320,
      maxHeight: 900,
      minWidth: 320,
      maxWidth: 1440
    };
    App.prototype.windowRef.minSurface = self.windowRef.minHeight * self.windowRef.minWidth;
    App.prototype.windowRef.maxSurface = self.windowRef.maxHeight * self.windowRef.maxWidth;
    App.prototype.measureWindow = function() {
      var self = this;
      var h = self.$window.innerHeight();
      var w = self.$window.innerWidth();
      self.windowHeight = h;
      self.windowWidth = w;
      self.windowSurface = h * w;
    };
    App.prototype.makeSelection = function() {
      var self = this;
      self.$window = $(window);
      self.$document = $(document);
      self.$html = $('html');
      self.$body = self.$html.find('body');
      self.$staticContent = self.$body.find('.static-content');
      self.$dynamicContent = self.$body.find('.dynamic-content');
      self.$viewport = self.$body.find('.viewport');
    };
    App.prototype.initialize = function() {
      var self = this;
      self.currentUrl = window.location.pathname /*.replace('.html', '')*/ ;
      var iOS = (navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false);
      if (iOS) {
        self.isIos = true;
      }
      // create js elements
      self.static = new Static();
      self.dynamic = new Dynamic();
      self.makeSelection();
      // wait for the page to be ready then initialize them
      self.$document.ready(function() {
        self.docReady = true;
        if (self.winLoaded) {
          self.load();
        }
      });
      self.$window.on('load', function() {
        self.winLoaded = true;
        if (self.docReady) {
          self.load();
        }
      });
      self.$window.on('resize', $.debounce(100, function() {
        self.resize();
      }));
    };
    App.prototype.load = function() {
      var self = this;
      self.measureWindow();
      self.resizeVgrid();
      self.static.initialize(self).resize().render();
      self.dynamic.initialize(self).loadImages(self.dynamic.$imagesPreLoad, {
        beforeLoadStart: function(callback) {
          self.static.$loader.toggleVisibility(true, self.timingUnit * 2, function() { /* "before starting" */
            console.log('$loader visible.');
            callback();
          });
        },
        onLoadStart: function() {
          self.dynamic.isPreLoading = true;
        },
        onLoadNew: function(percentLoaded, callback) {
          self.static.$loader.makeLoader('update', {
            percent: percentLoaded, /* where do i get it?! */
            animation: true,
            onComplete: function() {
              callback();
            }
          });
        },
        beforeLoadExit: function(callback) {
          self.static.$loader.toggleVisibility(false, self.timingUnit * 2, function() {
            console.log('$loader hidden.');
            self.static.$loader.makeLoader('update', {
              percent: 0,
              animation: false
            });
            callback();
          });
        },
        onLoadExit: function() {
          self.dynamic.isPreLoading = false;
          self.dynamic.resize().render();
        },
        // onLoadAbort: function() {
        //   self.app.dynamic.hideOld(callback);
        // } /* not operational */
      });
      objectFitImages();
    };
    App.prototype.resize = function() {
      var self = this;
      self.measureWindow();
      self.resizeVgrid();
      self.static.resize();
      self.dynamic.resize();
    };
    App.prototype.resizeVgrid = function() {
      var vgridHeight = Math.round(self.windowSurface.mapRange(self.windowRef.minSurface, self.windowRef.maxSurface, 24, 35));
      self.$html.css({
        fontSize: vgridHeight
      });
    };
    App.prototype.attrDataRand = function(elements) {
      var self = this;
      var arr = [],
        i = 0;
      while (i++ < elements.length) {
        arr.push(i);
      }
      arr.shuffle();
      elements.each(function() {
        var j = $(this).index();
        $(this).attr(('data-rand'), arr[j]);
      });
    };
  }
};

var app = new App().initialize();

$.fn.toggleVisibility = function(value, timing, callback) {
  var self = this;
  var alpha = value ? 1 : 0;
  return self.each(function() {
    TweenLite.to($(this), timing, {
      ease: Power1.easeInOut,
      autoAlpha: alpha,
      onComplete: function() {
        if (callback) {
          callback();
        }
      }
    });
  });
};

$.fn.viewportCheck = function(a) {
  var self = this;
  var ViewportChecker = function() {
    var self = this;
    if (!self.wasInstantiated) {
      self.wasInstantiated = true;
      ViewportChecker.prototype.doCheck = function() {
        if ($(self.element).isInViewport({
            viewport: self.options.$viewport
          }).length) {
          // console.log('"' + self.element.classList[0] + '" (' + $(self.element).closest('.mscroll-group')[0].classList + ') is inside of viewport.');
          self.options.onIn();
        } else {
          // console.log('"' + self.element.classList[0] + '" (' + $(self.element).closest('.mscroll-group')[0].classList + ') is outside of viewport.');
          self.options.onOut();
        }
        return self;
      };
      ViewportChecker.prototype.bind = function() {
        var self = this;
        // console.log('binding viewportCheck');
        if (self.options.debounce) {
          self.options.$toBind.on('scroll resize', $.debounce(300, self.doCheck));
        } else {
          self.options.$toBind.on('scroll resize', $.throttle(50, self.doCheck));
        }
        return self;
      };
      ViewportChecker.prototype.unBind = function() {
        var self = this;
        // console.log('unBinding viewportCheck');
        self.options.$toBind.off('scroll resize', self.doCheck);
        return self;
      };
      ViewportChecker.prototype.initialize = function(element, userOptions) {
        var self = this;
        self.element = element;
        self.options = $.extend({
          $toBind: $(document),
          $viewport: $(window),
          debounce: true,
          onIn: function() {},
          onOut: function() {}
        }, userOptions);
        return self;
      };
    }
    return self;
  };
  return self.each(function() {
    if (typeof a === 'object') {
      this.viewportChecker = new ViewportChecker().initialize(this, a).doCheck().bind();
    } else if (typeof a === 'string') {
      if (a === 'stop') {
        this.viewportChecker.unBind();
        delete this.viewportChecker;
      }
    }
  });
};

$.fn.clickCheck = function(a) {
  var self = this;
  var ClickChecker = function() {
    var self = this;
    if (!self.wasInstantiated) {
      self.wasInstantiated = true;
      ClickChecker.prototype.doCheck = function(event) {
        var isAnySame = (function(){
          var result = false;
          if (self.options.toIgnore.indexOf(event.target) > -1) {
            result = true;
          }
          return result;
        })();
        var isAnyDescendant = (function(){
          var result = false;
          for (var i = 0; i < self.options.toIgnore.length; i++) {
            if (self.options.toIgnore[i].contains(event.target)) {
              result = true;
              break;
            }
          }
          return result;
        })();
        if (!isAnySame && !isAnyDescendant) {
          if (self.element.isSameNode(event.target) || self.element.contains(event.target)) {
            // console.log('"' + self.element.classList[0] + '" is clicked in.');
            self.options.onIn(event);
          } else {
            // console.log('"' + self.element.classList[0] + '" is clicked out.');
            self.options.onOut(event);
          }
        }
      };
      ClickChecker.prototype.bind = function() {
        var self = this;
        // console.log('binding clickCheck');
        self.options.$toBind.on('click', self.doCheck);
        return self;
      };
      ClickChecker.prototype.unBind = function() {
        var self = this;
        // console.log('unBinding clickCheck');
        self.options.$toBind.off('click', self.doCheck);
        return self;
      };
      ClickChecker.prototype.formatToIgnore = function() {
        var self = this;
        if (self.options.toIgnore instanceof Array === false) {
          self.options.toIgnore = [self.options.toIgnore];
        }
        for (var i = 0; i < self.options.toIgnore.length; i++) {
          if (self.options.toIgnore[i] instanceof jQuery) {
            self.options.toIgnore[i] = self.options.toIgnore[i].get();
          }
        }
        self.options.toIgnore = [].concat.apply([], self.options.toIgnore);
        return self;
      };
      ClickChecker.prototype.initialize = function(element, userOptions) {
        var self = this;
        self.element = element;
        self.options = $.extend({
          $toBind: $(document),
          toIgnore: [],
          onIn: function(event) {},
          onOut: function(event) {}
        }, userOptions);
        self.formatToIgnore();
        return self;
      };
    }
    return self;
  };
  return self.each(function() {
    if (typeof a === 'object') {
        this.clickChecker = new ClickChecker().initialize(this, a).bind();
    } else if (typeof a === 'string') {
      if (a === 'stop') {
        this.clickChecker.unBind();
        delete this.clickChecker;
      }
    }
  });
};

$.fn.makeLoader = function(a, b) {
  var self = this;
  var Loader = function() {
    var self = this;
    if (!self.wasInstantiated) {
      self.wasInstantiated = true;
      Loader.prototype.initialize = function(element, userOptions) {
        var self = this;
        self.$loader = $(element);
        self.options = $.extend({
          barSelector: self.$loader,
          timing: 0.5
        }, userOptions);
        self.bar = self.$loader.find(self.options.barSelector);
        return self;
      };
      // FUCKING FLAG
      Loader.prototype.updateLoader = function(options) {
        var self = this;
        if (options.animation) {
          // console.log('setting $loader to ' + options.percent + '%...');
          TweenLite.to(self.bar, self.options.timing, {
            ease: Power1.easeInOut,
            width: options.percent + '%',
            onComplete: function() {
              // console.log('$loader set to ' + options.percent + '%.');
              if (options.onComplete) {
                options.onComplete.call();
              }
            }
          });
        } else {
          self.bar.css({
            width: options.percent + '%'
          });
          // console.log('$loader set to ' + options.percent + '%.');
        }
        return self;
      };
    }
  };
  return self.each(function() {
    if (typeof a === 'object') {
      this.loader = new Loader().initialize(this, a);
    } else if (typeof a === 'string') {
      if (a === 'update') {
        this.loader.updateLoader(b);
      } else if (a === 'delete') {
        delete this.loader;
      }
    }
  });
};

$.fn.makeDropdown = function(a) {
  var self = this;
  var Dropdown = function() {
    var self = this;
    if (!self.wasInstantiated) {
      self.wasInstantiated = true;
      Dropdown.prototype.isOpen = false;
      Dropdown.prototype.isAnimating = false;
      Dropdown.prototype.isChanging = false;
      Dropdown.prototype.makeSelection = function() {
        var self = this;
        self.$currentListItem = $(self.$listItems[self.currentItemIndex]);
        self.$currentLink = self.$currentListItem.find(self.options.linkSelector);
        return self;
      };
      Dropdown.prototype.teleportIcon = function() {
        var self = this;
        self.$oldIcon = self.$icon;
        self.$icon = new Icon({timing: self.options.timing}).morphTo('plus', false);
        self.$icon.appendTo(self.$currentLink);
        var iconWidth = self.$oldIcon.innerWidth();
        TweenLite.from(self.$icon, self.options.timing, {
          ease: Power3.easeOut,
          autoAlpha: 0,
          marginLeft: -iconWidth
        });
        TweenLite.to(self.$oldIcon, self.options.timing, {
          ease: Power3.easeOut,
          autoAlpha: 0,
          marginLeft: -iconWidth,
          onComplete: function() {
            self.$oldIcon.remove(); /* deletes the $oldIcon.$body  */
            delete self.$oldIcon; /* deletes the key '$oldIcon' of self which is this instance of the Dropdown function */
          }
        });
        return self;
      };
      Dropdown.prototype.initialize = function(element, userOptions) {
        var self = this;
        self.$list = $(element).addClass('dropdown');
        self.$listItems = self.$list.children();
        self.options = $.extend({
          currentUrl: '/',
          timing: 1,
          itemSelector: 'li',
          linkSelector: 'a',
          $document: $(document),
          getLineHeight: function($listItem) {
            return $listItem.height();
          },
          onOpen: function() {},
          onClose: function() {},
          onChange: function() {},
          afterChange: function() {}
        }, userOptions);
        self.currentItemIndex = self.$list.find('a[data-href="' + self.options.currentUrl + '"]').parents(self.options.itemSelector).index();
        self.makeSelection();
        self.$icon = new Icon({timing: self.options.timing}).morphTo('plus', false);
        self.$icon.appendTo(self.$currentLink);
        self.arrangeTo('closed', false);
        self.$list.on('click', self.options.linkSelector, function(event) {
          if (!self.isAnimating) {
            self.isAnimating = true;
            var i = $(this).parents(self.options.itemSelector).index();
            if (i === self.currentItemIndex) {
              self.toggle();
            } else {
              self.isChanging = true;
              self.currentItemIndex = i;
              self.makeSelection();
              self.reorder();
              self.teleportIcon();
            }
          }
        });
        return self;
      };
      Dropdown.prototype.arrangeTo = function(targetState, animation, callback) {
        var self = this;
        self.lineHeight = self.options.getLineHeight(self.$currentListItem);
        self.$listItems.each(function() {
          var $thisListItem = $(this);
          var defaultPos = $(this).index();
          var easing, alpha, targetPos, afterLast;
          if (targetState === 'closed') {
            easing = Power1.easeInOut;
            alpha = defaultPos === self.currentItemIndex ? 1 : 0;
            targetPos = 0;
            afterLast = function() {
              self.isAnimating = false;
              if (self.isChanging) {
                self.isChanging = false;
                self.options.afterChange(self.$currentLink);
              }
            };
          } else if (targetState === 'open') {
            easing = Power1.easeOut;
            alpha = 1;
            if (defaultPos === self.currentItemIndex) {
              targetPos = 0;
            } else if (defaultPos < self.currentItemIndex) {
              targetPos = defaultPos + 1;
            } else if (defaultPos > self.currentItemIndex) {
              targetPos = defaultPos;
            }
            afterLast = function() {
              if (callback) {
                callback.call();
              }
            };
          }
          var offset = (targetPos - defaultPos) * self.lineHeight;
          if (!animation) {
            TweenLite.set($thisListItem, {
              autoAlpha: alpha,
              y: offset
            });
          } else {
            TweenLite.to($thisListItem, self.options.timing, {
              ease: easing,
              autoAlpha: alpha,
              y: offset,
              onComplete: function() {
                if (defaultPos === (self.$listItems.length - 1)) {
                  afterLast();
                }
              }
            });
          }
        });
        return self;
      };
      Dropdown.prototype.toggle = function() {
        var self = this;
        if (!self.isOpen) {
          self.$list.clickCheck({
            $toBind: self.options.$document,
            onOut: function(event) {
              self.toggle();
            }
          });
          self.$icon.morphTo('minus', true);
          self.open();
          self.isOpen = true;
        } else {
          self.$list.clickCheck('stop');
          self.$icon.morphTo('plus', true);
          self.close();
          self.isOpen = false;
        }
        return self;
      };
      Dropdown.prototype.open = function() {
        var self = this;
        self.options.onOpen();
        self.arrangeTo('open', true, function() {
          self.isAnimating = false;
        });
        return self;
      };
      Dropdown.prototype.close = function() {
        var self = this;
        self.options.onClose();
        self.arrangeTo('closed', true);
        return self;
      };
      Dropdown.prototype.reorder = function() {
        var self = this;
        self.arrangeTo('open', true, function() {
          self.options.onChange(self.$currentLink, function() {
            self.toggle();
          });
        });
        return self;
      };
      Dropdown.prototype.resize = function() {
        var self = this;
        if (!self.isOpen) {
          self.arrangeTo('closed', false);
        } else {
          self.arrangeTo('open', false);
        }
        return self;
      };
    }
    return self;
  };
  return self.each(function() {
    if (typeof a === 'object') {
      this.dropdown = new Dropdown().initialize(this, a);
    } else if (typeof a === 'string') {
      if (a === 'resize') {
        this.dropdown.resize();
      } else if (a === 'delete') {
        delete this.dropdown;
      }
    }
  });
};

$.fn.makeSlider = function(a) {
  var self = this; /* self = the jQuery object on which the method was attached */
  var Slider = function() {
    var self = this; /* self = this function */
    if (!self.wasInstantiated) {
      self.wasInstantiated = true;
      Slider.prototype.isAnimating = false;
      Slider.prototype.initialize = function(element, userOptions) {
        var self = this;
        self.$imageGroup = $(element).addClass('slider').on('click', function() {
          self.next();
        });
        self.$images = self.$imageGroup.children().addClass('slide').each(function() {
          var i = -$(this).index();
          $(this).css({
            zIndex: i
          });
          if (i < -1) {
            TweenLite.set($(this), {
              autoAlpha: 0
            });
          }
        });
        self.options = $.extend({
          timing: 1
        }, userOptions);
        return self;
      };
      Slider.prototype.next = function() {
        var self = this;
        if (self.$images.length > 1) {
          self.$images.each(function() {
            if ($(this).css('z-index') === '0') {
              TweenLite.to($(this), self.options.timing, {
                ease: Power1.easeOut,
                autoAlpha: 0,
                onComplete: function() {
                  TweenLite.set($(this), {
                    autoAlpha: 0
                  });
                  self.$images.each(function() {
                    var i = parseInt($(this).css('z-index'));
                    i = i === 0 ? -(self.$images.length - 1) : i + 1;
                    $(this).css({
                      zIndex: i
                    });
                    if (i === -1) {
                      TweenLite.set($(this), {
                        autoAlpha: 1
                      });
                    }
                  });
                }
              });
            }
          });
        }
        return self;
      };
    }
    return self;
  };
  return self.each(function() {
    if (typeof a === 'object') {
      this.slider = new Slider().initialize(this, a);
    } else if (typeof a === 'string') {
      if (a === 'next') {
        this.slider.next();
      } else if (a === 'delete') {
        delete this.slider;
      }
    }
  });
};

$.fn.makeToggler = function(a) {
  var self = this;
  var Toggler = function() {
    var self = this;
    if (!self.wasInstantiated) {
      self.wasInstantiated = true;
      Toggler.prototype.isToggledOn = false;
      Toggler.prototype.doToggle = function() {
        if (!self.isToggledOn) {
          self.isToggledOn = true;
          self.options.onToggleOn(self.$toggler, self.$toggled);
        } else {
          self.isToggledOn = false;
          self.options.onToggleOff(self.$toggler, self.$toggled);
        }
        return self;
      };
      Toggler.prototype.initialize = function(element, userOptions) {
        self.$toggler = $(element).addClass('toggler');
        self.options = $.extend({
          $toggled: null,
          onToggleOn: function() {},
          onToggleOff: function() {},
        }, userOptions);
        self.$toggled = self.options.$toggled.addClass('toggled');
        self.$toggler.on('click', self.doToggle);
        return self;
      };
    }
    return self;
  };
  return self.each(function() {
    if (typeof a === 'object') {
      this.toggler = new Toggler().initialize(this, a);
    } else if (typeof a === 'string') {
      if (a === 'toggle') {
        this.toggler.doToggle();
      } else if (a === 'delete') {
        delete this.toggler;
      }
    }
  });
};

var Icon = function(userOptions) {
  var self = this;
  if (!self.wasInstantiated) {
    self.wasInstantiated = true;
    Icon.prototype.html = '<svg viewbox="-5 -5 10 10"><line x1="-5" y1="0" x2="5" y2="0"/><line x1="-5" y1="0" x2="5" y2="0"/></svg>';
    Icon.prototype.initialize = function(userOptions) {
      self.options = $.extend({
        timing: 1,
        invertRotation: false
      }, userOptions);
      self.$element = $(self.html).addClass('icon');
      self.$lineA = self.$element.children().eq(0);
      self.$lineB = self.$element.children().eq(1);
      self.rotate = function($element, angle) {
        var sign = self.options.invertRotation ? -1 : 1;
        if (!self.animation) {
          TweenLite.set($element, {
            rotation: angle * sign
          });
        } else {
          TweenLite.to($element, self.options.timing, {
            ease: Power1.easeOut,
            rotation: angle * sign
          });
        }
        return self;
      };
      self.scale = function($element, factor) {
        if (!self.animation) {
          TweenLite.set($element, {
            scaleX: factor
          });
        } else {
          TweenLite.to($element, self.options.timing, {
            ease: Power1.easeOut,
            scaleX: factor
          });
        }
        return self;
      };
      self.morphTo = function(shape, animation) {
        self.animation = animation;
        switch (shape) {
          case 'plus':
            self.rotate(self.$lineA, 0).scale(self.$lineA, 1);
            self.rotate(self.$lineB, -90).scale(self.$lineB, 1);
            break;
          case 'minus':
            self.rotate(self.$lineA, -180).scale(self.$lineA, 0.87);
            self.rotate(self.$lineB, -180).scale(self.$lineB, 0.87);
            break;
          case 'times':
            self.rotate(self.$lineA, -135).scale(self.$lineA, 1.14);
            self.rotate(self.$lineB, -225).scale(self.$lineB, 1.14);
            break;
          default:
            break;
        }
        return self.$element;
      };
      return self.$element;
    };
  }
  self.initialize(userOptions);
  return $.extend(self.$element, {
    morphTo: self.morphTo
  });
};

var setProperty = function(object, key, value) {
  var attribute = {};
  attribute[key] = value;
  return $.extend(object, attribute);
};

Number.prototype.mapRange = function(loInput, hiInput, loOutput, hiOutput) {
  var input = this;
  if (input < loInput) {
    output = loOutput;
  } else if (input > hiInput) {
    output = hiOutput;
  } else {
    output = loOutput + (hiOutput - loOutput) * (input - loInput) / (hiInput - loInput);
  }
  return output;
};

Array.prototype.shuffle = function() {
  var i = this.length,
    j, temp;
  while (--i > 0) {
    j = Math.floor(Math.random() * (i + 1));
    temp = this[j];
    this[j] = this[i];
    this[i] = temp;
  }
  return this;
};
