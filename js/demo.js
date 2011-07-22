'use strict';

goog.provide('demo');

goog.require('Modernizr');
goog.require('Scd');
goog.require('goog.debug.Console');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');

/**
 * @preserve Video Demo for Mozilla's Dev Derby of July 2011
 * Description:
 * - Create a column of canvas elements with the video tag at top, depending on document height.
 * - When video plays, update each canvas 1s before the following (reel effect).
 * - When a scene cut is detected, extract an image from video and place it on one of the sides.
 * - Change background gradient depending on video main colors.
 * Challenges:
 * - What to do on window resize?
 *
 * Notes:
 * - No IE support at all (have no way to test it).
 * - Better not to resize window.
 */

// @todo: Change "?" background according to page bkg using goog.color.highContrast().
// @todo: CSS Lint + CSS minifier.
// @todo: Bug on FF.

var demo = function() {
  /**
   * Page body.
   * @type {Element}
   */
  var body = document.body || goog.dom.getElementsByTagNameAndClass('body')[0];

  /**
   * The video DOM element.
   * @type {HTMLVideoElement}
   */
  var videoEl = /** @type {HTMLVideoElement} */ (goog.dom.getElement('video'));

  /**
   * Video tag width.
   * @const
   * @type {number}
   */
  var width = 320 /*videoEl.width*/;

  /**
   * Video tag width.
   * @type {number}
   */
  var height = /** @type {number} */ (videoEl.height);

  /**
   * Left offset of the video tag.
   * @const
   * @type {number}
   */
  var srcLeftOffset = videoEl.offsetLeft;

  /**
   * Top offset of the video tag.
   * @const
   * @type {number}
   */
  var srcTopOffset = 0;

  /**
   * The element where the main reel elements will be added.
   * @type {Element}
   */
  var reelEl = goog.dom.getElement('reel');

  /**
   * Horizontal padding of video frames.
   * @const
   * @type {number}
   */
  var padding = 35;

  /**
   * How many frames fit on a page.
   * @type {number}
   */
  var canvasNb;

  /**
   * An array of all frames of the reel.
   * @type {Array.<HTMLCanvasElement>}
   */
  var canvas = [];

  /**
   * The same above for canvas contexts.
   * @type {Array.<CanvasRenderingContext2D>}
   */
  var ctxs = [];

  /**
   * CSS3 transform property.
   * @type {string}
   */
  var transform = Modernizr.prefixed('transform');

  /**
   * The container holding the background cycling interval.
   * @type {number}
   */
  var interval;

  // Videos selector
  /**
   * The parent of video switcher.
   * @type {Element}
   */
  var videosEl = goog.dom.getElement('videos');

  // Page elements
  /**
   * The background overlay used to cycle colors.
   * @type {Element}
   */
  var overlayEl = goog.dom.getElement('overlay');

  /**
   * Whether the overlay is visible or not.
   * @type {boolean}
   */
  var overlayOpacity = true;

  /**
   * The '?' element.
   * @type {Element}
   */
  var aboutEl = goog.dom.getElement('about');

  /**
   * 1x1 pixel canvas to get the average color of the current frame.
   * @type {CanvasRenderingContext2D}
   */
  var bkgCtx = goog.dom.createDom('canvas', {width: 1, height: 1}).getContext('2d');

  // SCD.js vars
  /**
   * The scene change detector object.
   * @type {Scd}
   */
  var scd;

  /**
   * Whether the video is currently playing.
   * @type {boolean}
   */
  var isPlaying = false;

  // Misc vars
  var /** @type {number} */ i;

  /**
   * Set the text of the popin.
   * @param {string} html The new HTML content of the popin.
   */
  var setPopinHTML = function(html) {

    /**
     * @type {Element}
     */
    var popinEl = goog.dom.getElement('popin');

    goog.dom.removeChildren(popinEl);
    popinEl.appendChild(goog.dom.htmlToDocumentFragment(html));

  };

  /**
   * The background color is updated.
   * We use an overlay because background gradient transition is not
   * supported on Firefox.
   * @type {Function}
   */
  var changeBackground = function() {

    bkgCtx.drawImage(videoEl, 0, 0, width, height, 0, 0, 1, 1);

    // We leave the job of computing the image average color to the canvas.
    /**
     * The image data holding the average color of the frame.
     * @type {CanvasPixelArray}
     */
    var color = bkgCtx.getImageData(0, 0, 1, 1).data;

    /**
     * A CSS representation of the color variable.
     * @type {string}
     */
    var rgb = 'rgb(' + [color[0], color[1], color[2]].join(',') + ')';

    /**
     * The element that need to have its opacity swapped.
     * @type {Element}
     */
    var element = overlayOpacity ? body : overlayEl;

    // The overlay takes the new color and its opacity is inverted.
    Modernizr._prefixes.forEach(function(prefix) {
      element.style.backgroundImage =
          prefix + 'linear-gradient(#fff, ' + rgb + ')';
    });

    overlayEl.style.opacity = overlayOpacity ? 1 : 0;
    overlayOpacity = !overlayOpacity;

    aboutEl.style.color = rgb;
    aboutEl.style.textShadow = '0 0 2px ' + rgb;

  };

  /**
   * Things to do when a scene cut is detected.
   * @type {Function}
   */
  var onSceneCut = function() {

    if (goog.DEBUG) {
      goog.global.console['info']('scenecut');
    }

    /**
     * Left offset of the newly created frame.
     * @type {number}
     */
    var tgtLeftOffset = Math.floor(Math.random() * 2) ?
        // Rightside of the reel.
        Math.random() * (srcLeftOffset - (width + padding * 2))
        :
        // Leftside of the reel.
        (srcLeftOffset + (width + padding * 2) + (Math.random() *
        (body.offsetWidth - srcLeftOffset - (width * 2 + padding * 4))));

    /**
     * Top offset of the newly created frame.
     * @type {number}
     */
    var tgtTopOffset = Math.random() * (body.offsetHeight - height);

    /**
     * The new frame element.
     * @type {Element}
     */
    var frame = goog.dom.createDom('canvas', {
      width: width,
      height: height,
      'class': 'movie frame',
      style: 'left:' + srcLeftOffset + 'px;top:' + srcTopOffset
    });

    /**
     * CSS3 transform value.
     * @type {string}
     */
    var rotate = 'rotate(' + ((Math.random() * 30) - 15) + 'deg)';

    frame.getContext('2d').drawImage(videoEl, 0, 0, width, height);
    goog.dom.appendChild(body, frame);
    goog.dom.classes.add(frame, 'animate');

    // Add the CSS transition class.
    // Setting timeout to 20ms as suggested by
    // http://www.mikechambers.com/blog/2011/07/20/timing-issues-when-animating-with-css3-transitions/
    setTimeout(function() {
      frame.style.left = tgtLeftOffset + 'px';
      frame.style.top = tgtTopOffset + 'px';
      frame.style[transform] = rotate;
    }, 20);

    changeBackground();

  };

  /**
   * When the video stops or is paused.
   * @type {Function}
   * @param {Event} e The event triggered.
   */
  var onStop = function(e) {

    if (goog.DEBUG) {
      goog.global.console['info'](e.type);
    }

    clearInterval(interval);

  };

  // Let's add a bit of i18n (very very basic).
  switch (navigator.language) {
    case 'fr':
      setPopinHTML(
          '<p>J\'ai développé cette démo pour le Mozilla Dev Derby de Juillet 2011 sur le thème de la vidéo.' +
          '<p>Le concept est une page qui réagit au contenu d\'une vidéo.' +
          '<p>Le fond change selon la dominance de l\'image en cours. A chaque nouvelle scène, un morceau de pellicule est extrait depuis la vidéo.' +
          '<p>Ces différents évènements contribuent à la création d\'une expérience visuelle qui enrichisse la vidéo.'
      );
      break;
    case 'ja':
      setPopinHTML(
          '<p>これは２０１１年7月のMozilla Dev Derbyコンテストのために作ったデモです。' +
          '<p>ウェブページの中のコンテンツが動画によって変えると言うコンセプトです。' +
          '<p>色が動画に合わせて変えたり、客カットにフレーム1枚がエクストラクトされたりします。' +
          '<p>そう言うできごとが挿入された動画をより楽しいビジュアル体験になります。'
      );
      break;
  }

  goog.events.listen(videosEl, goog.events.EventType.CLICK, function(e) {

    if (goog.DEBUG) {
      goog.global.console['info'](e.type);
    }

    videoEl.pause();
    videoEl.currentTime = 0;
    videoEl.src = e.target.getAttribute('data-src');

  });

  /**
   * Various initialization when we have enough data.
   */
  goog.events.listen(videoEl, 'durationchange', function(e) {

    if (goog.DEBUG) {
      goog.global.console['info'](e.type);
    }

    // We remove previous event listeners, if any.
    if (scd) {
      scd['events'].removeListener('scenecut', onSceneCut);
    }

    // Initialize variables.
    scd = new Scd(videoEl, {
      'mode': 'PlaybackMode',
      'step_width': 50,
      'step_height': 37,
      'minSceneDuration': 0.75,
      'threshold': 7,
      'debug': goog.DEBUG
    });

    isPlaying = false;

    scd['events']['addListener']('scenecut', onSceneCut);

  });

  /**
   * When we have enough data, we initialize the canvas with the 1st frame of the video.
   */
  goog.events.listen(videoEl, 'loadeddata', function(e) {

    if (goog.DEBUG) {
      goog.global.console['info'](e.type);
    }

    // We resize the video tag height to keep video file ratio.
    height = videoEl.videoHeight / videoEl.videoWidth * width;
    videoEl.height = /** @type {string} */ (height);

    goog.dom.removeChildren(reelEl);

    canvasNb = Math.ceil(goog.dom.getDocumentHeight() / height) - 2;

    for (i = 0; i <= canvasNb; i++) {
      canvas[i] = /** @type {HTMLCanvasElement} */ (goog.dom.createDom('canvas', {
        width: width,
        height: height,
        'class': 'movie'
      }));
      ctxs[i] = /** @type {CanvasRenderingContext2D} */ (canvas[i].getContext('2d'));

      goog.dom.appendChild(reelEl, canvas[i]);
    }

    ctxs.forEach(function(ctx) {
      ctx.drawImage(videoEl, 0, 0, width, height);
    });

  });

  /**
   * When ready to play, action!
   */
  goog.events.listen(videoEl, 'canplay', function(e) {

    if (goog.DEBUG) {
      goog.global.console['info'](e.type);
    }

    if (!isPlaying) {
      scd['start']();
    }

    isPlaying = true;

  });

  /**
   * Main loop begins when the video start to play.
   */
  goog.events.listen(videoEl, 'play', function(e) {

    if (goog.DEBUG) {
      goog.global.console['info'](e.type);
    }

    interval = setInterval(changeBackground, 3000);

  });

  /**
   * Each time a new frame is displayed, we update the reel.
   */
  goog.events.listen(videoEl, 'timeupdate', function(e) {

    if (goog.DEBUG) {
      goog.global.console['info'](e.type);
    }

    // The canvas take the content of their previous sibling...
    i = canvasNb;
    while (i--) {
      ctxs[i + 1].drawImage(canvas[i], 0, 0, width, height);
    }

    // ... while the first canvas takes a snapshot from the video.
    ctxs[0].drawImage(videoEl, 0, 0, width, height);

  });

  /**
   * Whenever the video is paused, we stop the timer.
   */
  goog.events.listen(videoEl, 'pause', onStop);
  goog.events.listen(videoEl, 'ended', onStop);

};

goog.exportSymbol('demo', demo);
